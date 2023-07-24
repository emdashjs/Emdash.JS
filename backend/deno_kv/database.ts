/// <reference lib="deno.unstable" />
import { APP_DATA } from "../constants.ts";

let mutex: Promise<Deno.Kv> | undefined;
let kv: Deno.Kv | undefined;

export async function database() {
  if (typeof mutex === "undefined") {
    mutex = new Promise<Deno.Kv>((resolve) => {
      const id = setInterval(() => {
        if (kv) {
          clearInterval(id);
          resolve(kv);
        }
      }, 10);
    });
    let appDataFolder = APP_DATA.FOLDER;
    if (appDataFolder) {
      await Deno.mkdir(appDataFolder, { recursive: true });
      appDataFolder = appDataFolder.endsWith("/")
        ? appDataFolder
        : appDataFolder + "/";
    }
    return kv = await Deno.openKv(`${appDataFolder}${APP_DATA.NAME}.db`);
  }
  return await mutex;
}
