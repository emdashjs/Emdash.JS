import { toHashString } from "https://deno.land/std@0.195.0/crypto/to_hash_string.ts";
import { APP_COLLECTION, APP_DATA, AUTH_ERROR } from "../constants.ts";
import { KvJsonExclude, KvJsonPartial, KvRecord } from "../deno_kv/KvRecord.ts";
import { BasicKvRecord, JsonLike } from "../deno_kv/types.ts";
import { uuidv5 } from "./uuidv5.ts";
import { count, database } from "../deno_kv/database.ts";
import isStrongPassword from "./isStrongPassword.ts";

type RecordType = typeof APP_COLLECTION.USER;
const RecordType = APP_COLLECTION.USER;

export type UserJson = JsonLike<
  User & {
    password?: string;
  },
  "name" | KvJsonExclude,
  KvJsonPartial
>;

export class User extends KvRecord<RecordType> {
  email: string;
  first_name: string;
  last_name: string;
  internal: {
    passwordHash: string;
    passwordSalt: string;
    roles: string[];
    state: "enabled" | "disabled";
  };

  constructor(record?: Partial<User> | UserJson) {
    super({
      id: record?.email ? User.id(record.email) : record?.id,
      type: record?.type ?? RecordType,
      created: record?.created,
      modified: record?.modified,
    } as UserJson);
    this.email = record?.email ?? "";
    this.first_name = record?.first_name ?? "";
    this.last_name = record?.last_name ?? "";
    this.internal = {
      passwordHash: "",
      passwordSalt: "",
      roles: [],
      state: "disabled",
    };
    if (record && "internal" in record) {
      this.internal = {
        passwordHash: record?.internal?.passwordHash ??
          this.internal.passwordHash,
        passwordSalt: record?.internal?.passwordSalt ??
          this.internal.passwordSalt,
        roles: record?.internal?.roles ?? this.internal.roles,
        state: record?.internal?.state ?? this.internal.state,
      };
    }
  }

  get name(): string {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  async authenticate(password: string): Promise<this> {
    if (!this.hydrated && !(await this.get())) {
      throw new Error(AUTH_ERROR.NOT_AUTHENTICATED);
    }
    const hash = await this.getHash(password);
    if (this.internal.passwordHash !== hash) {
      throw new Error(AUTH_ERROR.NOT_AUTHENTICATED);
    }
    return this;
  }

  async setPassword(password: string): Promise<this> {
    if (!isStrongPassword(password, APP_DATA.PASSWORD_RULES)) {
      throw new Error(AUTH_ERROR.PASSWORD_STRENGTH);
    }
    this.internal.passwordSalt = Array.from(
      crypto.getRandomValues(new Uint8Array(512)),
      (byte) => String.fromCharCode(byte),
    ).join("");
    this.internal.passwordHash = await this.getHash(password);
    await this.set();
    return this;
  }

  async getHash(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const pre = this.internal.passwordSalt.slice(0, 256);
    const post = this.internal.passwordSalt.slice(256);
    const salted = encoder.encode(pre + password + post);
    return toHashString(await crypto.subtle.digest("SHA-512", salted));
  }

  toPublic() {
    const pub = super.toPublic();
    pub.name = this.name;
    return pub;
  }

  static async create(
    user: UserJson,
    password: string,
  ) {
    const exists = await User.get(user.email);
    if (exists !== USER_BUILTIN.NOT_EXIST) {
      return exists;
    }
    const newUser = new User(user);
    await newUser.setPassword(password);
    newUser.internal.state = "enabled";
    return newUser;
  }

  static async count(): Promise<number> {
    return await count(APP_COLLECTION.USER);
  }

  static async get(idOrEmail: string) {
    const id = idOrEmail.includes("@") ? User.id(idOrEmail) : idOrEmail;
    const kv = await database();
    const result = await kv.get<User>([RecordType, id]);
    return result.value ?? USER_BUILTIN.NOT_EXIST;
  }

  static id(email: string): string {
    return uuidv5(email, APP_DATA.UUID);
  }

  static isUser(record: BasicKvRecord): record is User {
    return record instanceof User;
  }

  static isUserLike(record: BasicKvRecord): record is JsonLike<User> {
    return record.type === RecordType;
  }
}

export const USER_BUILTIN = {
  NOT_EXIST: new User({
    id: crypto.randomUUID(),
    first_name: "Not",
    last_name: "Exist",
  }),
  SYSTEM: new User({
    id: APP_DATA.UUID,
    first_name: "System",
    last_name: "User",
    email: APP_DATA.EMAIL,
  }),
} as const;
