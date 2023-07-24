export const APP_DATA = {
  FOLDER: Deno.env.get("APP_DATA_FOLDER") ?? "",
  NAME: Deno.env.get("APP_DATA_NAME") ?? "blogger.js",
} as const;
