import { APP_DATA } from "../constants.ts";
import { ActiveRecord } from "../database/ActiveRecord.ts";
import type { Identity } from "./mod.ts";

export class Session extends ActiveRecord<"Session"> {
  declare complexId: string;
  ip!: string;
  expiresAt!: string;

  constructor(record: Partial<Session>) {
    super(record);
    const { userId, identityId, complexId, expiresAt } = record;
    this.complexId = userId ?? identityId ?? complexId ?? "";
    this.expiresAt = expiresAt ??
      new Date(Date.now() + Session.ttl()).toISOString();
  }

  get collection(): "Session" {
    return "Session";
  }

  get expired(): boolean {
    return Date.now() >= (new Date(this.expiresAt)).getTime();
  }

  get identityId() {
    return this.complexId;
  }

  get userId() {
    return this.complexId;
  }

  authenticate(identity: Identity): boolean {
    return !this.expired && this.id === identity.sessionId &&
      this.identityId === identity.id;
  }

  async refresh(identity: Identity): Promise<void> {
    if (this.authenticate(identity)) {
      this.expiresAt = new Date(Date.now() + Session.ttl()).toISOString();
    } else {
      await this.expire();
    }
  }

  async expire() {
    this.expiresAt = new Date(Date.now() - Session.ttl()).toISOString();
    await this.destroy();
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
