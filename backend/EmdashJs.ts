import { Server } from "./server/mod.ts";
import { APP_DATA } from "./constants.ts";
import { Database } from "./database/Database.ts";
import { AppData, EmdashModels } from "./models/mod.ts";
import { router } from "../frontend/routes.ts";

export class EmdashJs {
  appData: AppData;
  database: Database<EmdashModels>;

  constructor() {
    this.appData = APP_DATA;
    this.database = new Database({
      connectionString: Deno.env.get(AppData.env.db) as `${string}://`,
      models: EmdashModels,
    });
  }

  get canAuthenticate() {
    return !this.database.readonly;
  }

  async allowFirstUser() {
    return this.appData.first_user &&
      await this.database.collections.Identity.count() === 0;
  }

  /** Initialize EmdashJS; must be called before starting the server. */
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

  configure(object: Record<string, unknown>) {
    this.appData.merge(object);
  }

  serve(port?: number) {
    const server = new Server({
      port: this.appData.port ?? port,
      staticRoot: this.appData.static,
    });
    return server.noCache("/api").add(router).serve(this);
  }
}
