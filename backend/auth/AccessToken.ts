import { APP_COLLECTION, ERROR } from "../constants.ts";
import { count, database } from "../deno_kv/database.ts";
import { Mutable, PartialByKey } from "../deno_kv/types.ts";
import { Token, TokenOptions } from "./Token.ts";
import { User } from "./User.ts";

type RecordType = typeof RecordType;
const RecordType = APP_COLLECTION.ACCESS;

export type AccessOptions = Mutable<
  PartialByKey<TokenOptions, "id" | "type">
>;

export class AccessToken extends Token<RecordType> {
  userId: string;
  constructor(user: User | string, options?: AccessOptions) {
    super({
      ...options,
      id: options?.id ?? crypto.randomUUID(),
      type: RecordType,
    });
    this.userId = typeof user === "string" ? User.id(user) : user.id;
  }

  async authenticate(): Promise<User> {
    await this.get();
    const data = Token.tokenData(this.token);
    if (!this.expired && await Token.verify(data)) {
      const user = await User.get(this.userId);
      const userId = User.id(data.claim.payload.userId);
      if (this.userId === userId && this.userId === user.id) {
        return user;
      }
    }
    // Throw unauthenticed if no user returned.
    throw new Error(ERROR.AUTH.NOT_AUTHENTICATED);
  }

  async createToken(
    // deno-lint-ignore no-explicit-any
    attributes: Record<string, any> | undefined,
    ttl: number,
  ): Promise<string> {
    return await super.createToken({
      ...attributes,
      userId: this.userId,
    }, ttl);
  }

  async get(): Promise<boolean> {
    return await super.get([this.userId, this.id]);
  }

  async set(): Promise<boolean> {
    return await super.set([this.userId, this.id]);
  }

  async delete(): Promise<boolean> {
    return await super.delete([this.userId, this.id]);
  }

  // deno-lint-ignore no-explicit-any
  toPublic(): any {
    return {
      id: this.id,
      created: this.created,
      expires: this.expires,
    };
  }

  toJSON() {
    return this.toPublic();
  }

  static async count() {
    return await count(RecordType);
  }

  static fromToken(token: string) {
    const data = Token.tokenData(token);
    return new AccessToken(data.claim.payload.userId, {
      id: data.claim.id,
      created: data.claim.created,
      expires: data.claim.expires,
      token,
    });
  }

  static async get(user: User | string, id: string) {
    const token = new AccessToken(user, { id });
    await token.get();
    return token;
  }

  static async getAll(user: User | string) {
    const kv = await database();
    const userId = typeof user === "string" ? User.id(user) : user.id;
    const tokens: AccessToken[] = [];
    const results = kv.list<AccessToken>({ prefix: [RecordType, userId] });
    for await (const result of results) {
      tokens.push(new AccessToken(userId, result.value));
    }
    return tokens;
  }
}
