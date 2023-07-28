import { APP_COLLECTION, APP_DATA, ERROR } from "../constants.ts";
import {
  KvCollection,
  KvJsonExclude,
  KvJsonPartial,
  KvRecord,
} from "../deno_kv/KvRecord.ts";
import { count, database } from "../deno_kv/database.ts";
import { User, USER_BUILTIN } from "./User.ts";
import { Base64, CookieMap } from "../../deps.ts";
import * as UUID from "./uuidv5.ts";
import { JsonLike } from "../deno_kv/types.ts";

type SessionJson = JsonLike<
  Omit<Session, "type"> & { type: KvCollection },
  KvJsonExclude | "expired",
  Exclude<KvJsonPartial, "id"> | "token"
>;
type SessionLike = Pick<Partial<Session>, "created" | "modified" | "token"> & {
  id: string;
  type?: KvCollection;
};
type RecordType = typeof APP_COLLECTION.SESSION;
const RecordType = APP_COLLECTION.SESSION;
const COOKIE_NAME = "app_session";

export class Session extends KvRecord<RecordType> {
  token: string;
  internal: undefined;

  constructor(userOrSession: SessionJson | SessionLike) {
    super({
      id: userOrSession.id,
      type: RecordType,
      created: userOrSession.created,
      modified: userOrSession.modified,
    } as KvRecord<RecordType>);
    this.token = userOrSession.token ?? "";
  }

  get expired(): boolean {
    return Date.now() - this.created.getTime() > Session.ttl();
  }

  async createToken(): Promise<string> {
    await this.get();
    if (this.expired) {
      this.created = new Date();
      this.modified = this.created;
      this.token = "";
    }
    if (!this.token) {
      const idBytes = UUID.parse(this.id);
      const dateBytes = dateToBytes(this.created);
      const randomness = 64 - idBytes.length - dateBytes.length;
      const randomBytes = crypto.getRandomValues(new Uint8Array(randomness));
      const dataBytes = new Uint8Array([
        ...idBytes,
        ...dateBytes,
        ...randomBytes,
      ]);
      const signedBytes = await Session.sign(dataBytes);
      const bytes = new Uint8Array([...dataBytes, ...signedBytes]);
      this.token = Base64.encode(bytes);
      await this.set();
    }
    return this.token;
  }

  setCookie(response: Response) {
    const cookieMap = new CookieMap(new Headers(), { response, secure: true });
    cookieMap.set(COOKIE_NAME, this.token, {
      httpOnly: true,
      secure: true,
    });
  }

  async validate(): Promise<boolean> {
    const user = await User.get(this.id);
    if (
      // User must exist in the system
      !User.is(user, USER_BUILTIN.NOT_EXIST) &&
      // User must be enabled
      user.internal.state === "enabled"
    ) {
      // Token must not be expired, not empty, and verified
      return !this.expired &&
        this.token !== "" &&
        await Session.verify(Base64.decode(this.token));
    }
    return false;
  }

  async authenticate(token: string): Promise<User> {
    if (
      // Token must exist in the system
      await this.get() &&
      // Received token must be verified
      await Session.verify(Base64.decode(token)) &&
      // And must match the retrieved token
      this.token === token
    ) {
      // Token must not be expired
      if (!this.expired) {
        return User.get(this.id);
      }
      // Delete token from system if expired
      this.token = "";
      await this.delete();
    }
    // Throw unauthenticed if no user returned.
    throw new Error(ERROR.AUTH.NOT_AUTHENTICATED);
  }

  static key?: CryptoKey;

  static async count(): Promise<number> {
    return await count(APP_COLLECTION.USER);
  }

  static fromCookie(cookies: CookieMap) {
    const cookie = cookies.get(COOKIE_NAME)?.trim();
    if (cookie) {
      return Session.fromToken(cookie);
    }
  }

  static fromToken(token: string) {
    const bytes = Base64.decode(token);
    const id = UUID.unsafeStringify(bytes.slice(0, 16));
    const created = bytesToDate(bytes.slice(16, 25));
    return new Session({
      id,
      created,
      token,
    });
  }

  static async get(idOrEmail: string) {
    const id = User.id(idOrEmail);
    const kv = await database();
    const result = await kv.get<Session>([RecordType, id]);
    return result.value ? new Session(result.value) : new Session({ id });
  }

  static async sign(data: Uint8Array): Promise<Uint8Array> {
    if (!Session.key) {
      Session.key = await importSessionKey();
    }
    const signed = await crypto.subtle.sign(
      { name: "HMAC", hash: "SHA-512" },
      Session.key,
      data,
    );
    return new Uint8Array(signed);
  }

  static ttl(): number {
    let count = Number.parseFloat(APP_DATA.SESSION_TTL.replace(/m|h|d/gui, ""));
    let kind = APP_DATA.SESSION_TTL.replace(/\d/gui, "")
      .toLowerCase() as TtlKind;
    if (!TTL_KEYS.includes(kind)) {
      kind = "d";
    }
    const [minimum, fallback] = TTL_KIND_CHECK[kind];
    if (Number.isNaN(count) || count < minimum) {
      count = fallback;
    }
    return TTL_KIND_MS[kind] * count;
  }

  static async verify(bytes: Uint8Array): Promise<boolean> {
    if (!Session.key) {
      Session.key = await importSessionKey();
    }
    return await crypto.subtle.verify(
      { name: "HMAC", hash: "SHA-512" },
      Session.key,
      bytes.slice(64),
      bytes.slice(0, 64),
    );
  }
}

export function dateToBytes(date: Date): Uint8Array {
  const bytes = new Uint8Array(9);
  let part = date.getUTCFullYear();
  bytes[0] = part & 0xFF;
  bytes[1] = (part >> 8) & 0xFF;
  bytes[2] = date.getUTCMonth();
  bytes[3] = date.getUTCDate();
  bytes[4] = date.getUTCHours();
  bytes[5] = date.getUTCMinutes();
  bytes[6] = date.getUTCSeconds();
  part = date.getUTCMilliseconds();
  bytes[7] = part & 0xFF;
  bytes[8] = (part >> 8) & 0xFF;

  return bytes;
}

export function bytesToDate(bytes: Uint8Array): Date {
  const date = new Date();

  date.setUTCFullYear((bytes[0] & 0xFF) | ((bytes[1] & 0xFF) << 8));
  date.setUTCMonth(bytes[2]);
  date.setUTCDate(bytes[3]);
  date.setUTCHours(bytes[4]);
  date.setUTCMinutes(bytes[5]);
  date.setUTCSeconds(bytes[6]);
  date.setUTCMilliseconds((bytes[7] & 0xFF) | ((bytes[8] & 0xFF) << 8));

  return date;
}

type TtlKind = keyof typeof TTL_KIND_MS;
const TTL_KIND_MS = {
  d: 86_400_000,
  h: 3_600_000,
  m: 60_000,
} as const;
const TTL_KIND_CHECK = {
  d: [1, 7],
  h: [1, 1],
  m: [10, 30],
} as const;
const TTL_KEYS = Object.keys(TTL_KIND_MS) as TtlKind[];
async function importSessionKey() {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(APP_DATA.SESSION_KEY || APP_DATA.UUID),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign", "verify"],
  );
}
