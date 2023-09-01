import { APP_DATA } from "./constants.ts";
import { Database } from "./database/Database.ts";
import { AppData, models } from "./models/mod.ts";

export class EmdashJs {
  appData: AppData;
  database: Database<typeof models>;

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
    return this;
  }
}
