import { APP_COLLECTION, APP_DATA, ERROR } from "../constants.ts";
import {
  KvCollection,
  KvJsonExclude,
  KvJsonPartial,
  KvRecord,
} from "../deno_kv/KvRecord.ts";
import { count, database } from "../deno_kv/database.ts";
import { User } from "./User.ts";
import { Base64 } from "../../deps.ts";
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
// TODO: more robust session handling such as sending cookie as base64 email:token
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
      return this.token = "";
    }
    if (!this.token) {
      const idBytes = UUID.parse(this.id);
      const dateBytes = dateToBytes(this.created);
      const randomBytes = crypto.getRandomValues(new Uint8Array(135));
      const bytes = new Uint8Array([
        ...idBytes,
        ...dateBytes,
        ...randomBytes,
      ]);
      this.token = Base64.encode(bytes);
      await this.set();
    }
    return this.token;
  }

  async authenticate(token: string): Promise<User> {
    if (await this.get() && this.token === token) {
      if (!this.expired) {
        return User.get(this.id);
      }
      this.token = "";
      await this.delete();
    }
    throw new Error(ERROR.AUTH.NOT_AUTHENTICATED);
  }

  static async count(): Promise<number> {
    return await count(APP_COLLECTION.USER);
  }

  static async fromToken(token: string) {
    const bytes = Base64.decode(token);
    const id = UUID.unsafeStringify(bytes.slice(0, 16));
    return await newSession(id);
  }

  static async get(idOrEmail: string) {
    const id = User.id(idOrEmail);
    return await newSession(id);
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
async function newSession(id: string): Promise<Session> {
  const kv = await database();
  const result = await kv.get<Session>([RecordType, id]);
  return result.value ? new Session(result.value) : new Session({ id });
}
