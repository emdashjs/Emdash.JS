import { Base64Url, Member, Struct } from "../../deps.ts";
import { APP_DATA } from "../AppData.ts";
import { APP_COLLECTION } from "../constants.ts";
import { KvRecord } from "../deno_kv/KvRecord.ts";
import { count } from "../deno_kv/database.ts";

type RecordType = typeof APP_COLLECTION.ACCESS | typeof APP_COLLECTION.SESSION;
const TOKEN_TYPE = {
  [APP_COLLECTION.ACCESS]: 0,
  [APP_COLLECTION.SESSION]: 1,
  0: APP_COLLECTION.ACCESS,
  1: APP_COLLECTION.ACCESS,
} as const;

export type TokenOptions = {
  // A UUID string representation.
  id: string;
  // The token record type.
  type: RecordType;
  created?: Date | string;
  modified?: Date | string;
  token?: string;
  expires?: Date | string;
};

export class Token<T extends RecordType = RecordType> extends KvRecord<T> {
  internal: undefined;
  token: string;
  expires: Date;
  constructor(options: TokenOptions) {
    super({
      id: options.id,
      type: options.type,
      created: options.created,
      modified: options.modified,
      // deno-lint-ignore no-explicit-any
    } as any);
    this.token = options.token ?? "";
    this.expires = options.expires
      ? new Date(options.expires)
      : new Date(Date.now() - 3);
  }

  get expired(): boolean {
    return Date.now() > this.expires.getTime();
  }

  // deno-lint-ignore no-explicit-any
  async createToken(payload?: Record<any, any>, ttl?: number): Promise<string> {
    await this.get();
    if (this.expired) {
      ttl = ttl ?? Token.ttl();
      this.expires = new Date(Date.now() + ttl);
      this.token = "";
    }
    if (!this.token) {
      const signed = new TokenData();
      signed.claim.id = this.id;
      signed.claim.type = TOKEN_TYPE[this.type];
      signed.claim.created = this.created;
      signed.claim.expires = this.expires;
      signed.claim.payload = payload ?? {};
      signed.signature = await Token.sign(signed);
      this.token = Base64Url.encode(signed.truncate());
      await this.set();
    }
    return this.token;
  }

  static key?: CryptoKey;

  static async count() {
    return await count(APP_COLLECTION.ACCESS) +
      await count(APP_COLLECTION.SESSION);
  }

  static fromToken(token: string) {
    const data = Token.tokenData(token);
    return new Token({
      id: data.claim.id,
      type: TOKEN_TYPE[data.claim.type as 0 | 1],
      created: data.claim.created,
      expires: data.claim.expires,
      token,
    });
  }

  static async sign(data: TokenData): Promise<Uint8Array> {
    if (!Token.key) {
      Token.key = await importSessionKey();
    }
    const signed = await crypto.subtle.sign(
      { name: "HMAC", hash: "SHA-512" },
      Token.key,
      data.claim.truncate(),
    );
    return new Uint8Array(signed);
  }

  static tokenData(token: string): TokenData {
    const bytes = Base64Url.decode(token);
    return TokenData.fromTruncated(bytes);
  }

  static ttl(): number {
    let count = Number.parseFloat(APP_DATA.session_ttl.replace(/m|h|d/gui, ""));
    let kind = APP_DATA.session_ttl.replace(/\d/gui, "")
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

  static async verify(signed: TokenData): Promise<boolean> {
    if (!Token.key) {
      Token.key = await importSessionKey();
    }
    return await crypto.subtle.verify(
      { name: "HMAC", hash: "SHA-512" },
      Token.key,
      signed.signature,
      signed.claim.truncate(),
    );
  }
}

type ClaimData = Struct<typeof ClaimData>;
const ClaimData = Struct("ClaimData", {
  id: Member.uuid, // 0 - 15
  type: Member.number("uint16"), // 16-17
  version: Member.number("uint16"), // 18-19
  created: Member.date, // 20-27
  expires: Member.date, // 28-35
  random: Member.random(92), // 36-127
  payload: Member.json(320), // 128-447
}); // Byte length: 448
type TokenData = Struct<typeof TokenData>;
const TokenData = Struct("TokenData", {
  signature: Member.bytearray(64), // 0-63
  claim: ClaimData, // 64-511
}); // Byte length: 512
// Token data can be truncated to as little as 192 bytes

async function importSessionKey() {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(APP_DATA.secret_key || APP_DATA.uuid),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign", "verify"],
  );
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
