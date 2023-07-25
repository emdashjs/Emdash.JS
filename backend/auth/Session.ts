import { APP_DATA, USER_ERROR } from "../constants.ts";
import { KvRecord } from "../deno_kv/KvRecord.ts";
import { User } from "./User.ts";

export class Session extends KvRecord<"session"> {
  uuid: string;
  internal: undefined;

  constructor(user: User) {
    super({
      id: user.id,
      type: "session",
    });
    this.uuid = "";
  }

  get expired(): boolean {
    return Date.now() - this.created.getTime() > Session.ttl();
  }

  async getUuid(): Promise<string> {
    await this.get();
    if (this.expired) {
      return this.uuid = "";
    }
    if (!this.uuid) {
      this.uuid = crypto.randomUUID();
      await this.set();
    }
    return this.uuid;
  }

  async authenticate(uuid: string): Promise<User> {
    if (await this.get() && this.uuid === uuid) {
      if (!this.expired) {
        return User.get(this.id);
      }
      this.uuid = "";
      await this.delete();
    }
    throw new Error(USER_ERROR.NOT_AUTHENTICATED);
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
