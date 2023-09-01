import { APP_DATA } from "../constants.ts";
import { ActiveRecord } from "../database/ActiveRecord.ts";
import { uuidv5 } from "../database/uuidv5.ts";
import type { SupportedProvider } from "../auth/providers.ts";

/** The identity model. Not intended to be exposed to any external API. */
export class Identity extends ActiveRecord<"Identity"> {
  email!: string;
  /** The OAuth provider name or `internal` */
  provider!: SupportedProvider;
  /** The password hash and salt, if provider is `internal` */
  hash?: string;
  /** The session id for an Oauth access token, if used. */
  sessionId?: string;

  constructor(record: Partial<Identity>) {
    super({
      ...record,
      id: record.id ? record.id : uuidv5(record.email!, APP_DATA.uuid),
    });
  }

  get collection(): "Identity" {
    return "Identity";
  }
}
