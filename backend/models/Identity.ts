import { ActiveRecord } from "../database/ActiveRecord.ts";
import { emailId, getUser } from "./helpers.ts";
import type { SupportedProvider } from "../auth/providers.ts";
import type { Session } from "./Session.ts";
import { User } from "./User.ts";

/** The identity model. Not intended to be exposed to any external API. */
export class Identity extends ActiveRecord<"Identity"> {
  declare email: string;
  /** The OAuth provider name or `internal` */
  declare provider: SupportedProvider;
  declare userType: User["collection"];
  /** The password hash and salt, if provider is `internal` */
  declare hash?: string;
  /** The session id for an internal session or an Oauth access token, if used. */
  declare sessionId?: string;
  declare enabled?: boolean;

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
    return getUser(this.id, this.userType);
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
