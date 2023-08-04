import { CookieMap } from "../../deps.ts";
import { APP_COLLECTION, ERROR } from "../constants.ts";
import { count, countBigInt, database } from "../deno_kv/database.ts";
import { Mutable, PartialByKey } from "../deno_kv/types.ts";
import { Token, TokenOptions } from "./Token.ts";
import { User } from "./User.ts";

type RecordType = typeof RecordType;
const RecordType = APP_COLLECTION.SESSION;
const COOKIE_NAME = "app_session";

export type SessionOptions = Mutable<
  PartialByKey<TokenOptions, "id" | "type"> & { userId?: string }
>;

export class SessionToken extends Token<RecordType> {
  userId: string;
  constructor(options?: SessionOptions) {
    super({
      ...options,
      id: options?.id ?? crypto.randomUUID(),
      type: RecordType,
    });
    this.userId = options?.userId ?? "";
  }

  async createToken(
    user: User,
  ): Promise<string> {
    this.userId = user.id;
    return await super.createToken(user.toPublic());
  }

  async authenticate(user: User): Promise<User> {
    await this.get();
    const data = Token.tokenData(this.token);
    if (!this.expired && await Token.verify(data)) {
      const userId = User.id(data.claim.payload.email);
      if (this.userId === userId && user.id === userId) {
        return user;
      }
    }
    // Throw unauthenticed if no user returned.
    throw new Error(ERROR.AUTH.NOT_AUTHENTICATED);
  }

  async set(): Promise<boolean> {
    const kv = await database();
    const key = [this.type, this.id];
    this.modified = new Date();
    const atomic = kv.atomic();
    await atomic
      .check({ key, versionstamp: null })
      // Increment counter if not exist
      .sum([APP_COLLECTION.COUNT, this.type], 1n)
      .commit();
    const setAtomic = kv.atomic();
    const result = await setAtomic
      .set([this.type, this.id], this)
      .set([this.type, this.userId, this.id], this)
      .commit();
    return result.ok ?? false;
  }

  setCookie(response: Response) {
    const cookieMap = new CookieMap(new Headers(), { response, secure: true });
    cookieMap.set(COOKIE_NAME, this.token, {
      httpOnly: true,
      secure: true,
    });
  }

  async delete(): Promise<boolean> {
    const kv = await database();
    const key = [this.type, this.id];
    const result = await kv.get<SessionToken>(key);
    // Delete and decrement counter if exist
    if (result.versionstamp) {
      const count = await countBigInt(this.type);
      let newCount = count - 1n;
      newCount = newCount < 0n ? 0n : newCount;
      const atomic = kv.atomic();
      await atomic
        .delete(key)
        .delete([this.type, this.userId, this.id])
        .set([APP_COLLECTION.COUNT, this.type], new Deno.KvU64(newCount))
        .commit();
      return true;
    }
    return false;
  }

  static async count(): Promise<number> {
    return await count(RecordType);
  }

  static fromCookie(cookies: CookieMap) {
    const cookie = cookies.get(COOKIE_NAME)?.trim();
    if (cookie) {
      return SessionToken.fromToken(cookie);
    }
  }

  static fromToken(token: string) {
    const data = Token.tokenData(token);
    return new SessionToken({
      id: data.claim.id,
      created: data.claim.created,
      expires: data.claim.expires,
      token,
    });
  }

  static async revokeAll(user: User, current?: SessionToken): Promise<boolean> {
    const kv = await database();
    const atomic = kv.atomic();
    const results = kv.list<SessionToken>({ prefix: [RecordType, user.id] });
    for await (const result of results) {
      if (current && result.value.id === current.id) {
        continue;
      }
      atomic.delete([RecordType, result.value.id]).delete(result.key);
    }
    const result = await atomic.commit();
    return result.ok ?? false;
  }
}
