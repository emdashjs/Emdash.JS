import { ActiveRecord } from "../database/ActiveRecord.ts";
import { emailId, getUser } from "./helpers.ts";
import type { SupportedProvider } from "../auth/providers.ts";
import type { Session } from "./Session.ts";

/** The identity model. Not intended to be exposed to any external API. */
export class Identity extends ActiveRecord<"Identity"> {
  email!: string;
  /** The OAuth provider name or `internal` */
  provider!: SupportedProvider;
  /** The password hash and salt, if provider is `internal` */
  hash?: string;
  /** The session id for an internal session or an Oauth access token, if used. */
  sessionId?: string;
  enabled?: boolean;

  constructor(record: Partial<Identity>) {
    super({
      ...record,
      id: record.id ? record.id : emailId(record.email!),
    });
  }

  get userId() {
    return this.id;
  }

  getUser() {
    return getUser(this.id);
  }

  async getSession(): Promise<Session | undefined> {
    if (this.sessionId) {
      const sessions = ActiveRecord.getCollectionOf<Session>("Session");
      return await sessions?.get(this.sessionId) ?? undefined;
    }
  }

  get collection(): "Identity" {
    return "Identity";
  }
}
