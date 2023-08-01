import { Base64Url, StructJs } from "../../deps.ts";
import { APP_COLLECTION, APP_DATA } from "../constants.ts";
import { KvRecord } from "../deno_kv/KvRecord.ts";

type RecordType = typeof APP_COLLECTION.ACCESS | typeof APP_COLLECTION.SESSION;

type TokenOptions = {
  // A UUID string representation.
  id: string;
  // The token record type.
  type: RecordType;
  created?: Date | string;
  modified?: Date | string;
  token?: string;
  expires?: Date | string;
};

export class Token extends KvRecord<RecordType> {
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
    this.expires = options.expires ? new Date(options.expires) : new Date();
  }

  get expired(): boolean {
    return Date.now() > this.expires.getTime();
  }

  async createToken(ttl?: number): Promise<string> {
    await this.get();
    if (this.expired) {
      ttl = ttl ?? Token.ttl();
      this.expires = new Date(Date.now() + ttl);
      this.token = "";
    }
    if (!this.token) {
      const buffer = new ArrayBuffer(256);
      const signed = new TokenData(buffer);
      signed.payload.id = this.id;
      signed.payload.type = this.type;
      signed.payload.created = this.created;
      signed.payload.expires = this.expires;
      signed.signature = await Token.sign(signed.payload.arrayBuffer());
      this.token = Base64Url.encode(signed.arrayBuffer());
      await this.set();
    }
    return this.token;
  }

  static key?: CryptoKey;

  static fromToken(token: string) {
    const bytes = Base64Url.decode(token);
    const data = new Payload(bytes);
    return new Token({
      id: data.id,
      type: data.type as RecordType,
      created: data.created,
      expires: data.expires,
      token,
    });
  }

  static async sign(data: BufferSource): Promise<Uint8Array> {
    if (!Token.key) {
      Token.key = await importSessionKey();
    }
    const signed = await crypto.subtle.sign(
      { name: "HMAC", hash: "SHA-512" },
      Token.key,
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

  static async verify(token: string): Promise<boolean> {
    if (!Token.key) {
      Token.key = await importSessionKey();
    }
    const bytes = Base64Url.decode(token);
    const signed = new TokenData(bytes);
    return await crypto.subtle.verify(
      { name: "HMAC", hash: "SHA-512" },
      Token.key,
      signed.payload.arrayBuffer(),
      signed.signature,
    );
  }
}

const Payload = StructJs.Struct("Payload", {
  id: StructJs.uuid,
  type: StructJs.string(20),
  created: StructJs.date,
  expires: StructJs.date,
  reserved: StructJs.random(100),
  random: StructJs.random(40),
});
const TokenData = StructJs.Struct("TokenData", {
  payload: Payload,
  signature: StructJs.bytearray(64),
});

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
