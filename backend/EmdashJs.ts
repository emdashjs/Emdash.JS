import { APP_DATA } from "./constants.ts";
import { Database } from "./database/Database.ts";
import { AppData, EmdashModels, models } from "./models/mod.ts";

export class EmdashJs {
  appData: AppData;
  database: Database<EmdashModels>;

  constructor() {
    this.appData = APP_DATA;
    this.database = new Database({
      connectionString: Deno.env.get(AppData.env.db) as `${string}://`,
      models,
    });
  }

  async init(): Promise<this> {
    const appDataCol = this.database.getCollection("AppData");
    const record = await appDataCol.get("AppData") ?? appDataCol.newRecord({});
    this.appData.merge(record);
    if (!this.appData.secret_key && !this.database.readonly) {
      const secret_key = crypto.randomUUID().replaceAll("-", "");
      this.appData.merge({ secret_key });
      console.warn("!! NO SECRET KEY SET, ALL USER SESSIONS ARE INSECURE. !!");
      console.warn('!! SET ENVIRONMENT "EMDASH_SECRET_KEY" IMMEDIATELY.   !!');
      console.warn(`!! ROTATING SECRET: "${secret_key}" !!`);
    }
    return this;
  }

  get canAuthenticate() {
    return !this.database.readonly;
  }
}
