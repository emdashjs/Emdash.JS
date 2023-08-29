// deno-lint-ignore-file ban-types
import { APP_DATA } from "../AppData.ts";
import { ActiveRecord } from "../database/ActiveRecord.ts";
import { uuidv5 } from "../database/uuidv5.ts";

/** The identity model. Not intended to be exposed to any external API. */
export class Identity extends ActiveRecord {
  email!: string;
  /** The OAuth provider name or `internal` */
  provider!: "internal" | (string & {});
  /** The password hash and salt, if provider is `internal` */
  hash?: string;

  constructor(data: Partial<Identity>) {
    super({
      ...data,
      id: data.id ? data.id : uuidv5(data.email!, APP_DATA.uuid),
    });
  }
}
