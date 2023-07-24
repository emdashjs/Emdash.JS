export const APP_DATA = {
  FOLDER: Deno.env.get("APP_DATA_FOLDER") ?? "",
  NAME: Deno.env.get("APP_DATA_NAME") ?? "blogger.js",
  UUID: Deno.env.get("APP_DATA_UUID") ?? "bab51817-3eac-4726-8d3b-0a57f886e8bf",
  EMAIL: Deno.env.get("APP_DATA_EMAIL") ?? "",
} as const;
export const USER_ERROR = {
  NOT_AUTHENTICATED: "user cannot be authenticated.",
};
