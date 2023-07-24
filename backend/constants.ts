import { getScoringOptions } from "./auth/isStrongPassword.ts";

const defaultRules =
  "minLength:12;minLowercase:2;minUppercase:2;minNumbers:2;minSymbols:2";
const providedRules = Deno.env.get("APP_DATA_PASSWORD_RULES")?.trim() ?? "";
export const APP_DATA = {
  FIRST_USER: Deno.env.get("APP_DATA_FIRST_USER") ?? "",
  FOLDER: Deno.env.get("APP_DATA_FOLDER") ?? "",
  NAME: Deno.env.get("APP_DATA_NAME") ?? "blogger.js",
  UUID: Deno.env.get("APP_DATA_UUID") ?? "bab51817-3eac-4726-8d3b-0a57f886e8bf",
  EMAIL: Deno.env.get("APP_DATA_EMAIL") ?? "",
  PASSWORD_RULES: providedRules
    ? getScoringOptions(providedRules)
    : getScoringOptions(defaultRules),
} as const;
export const USER_ERROR = {
  NOT_AUTHENTICATED: "user cannot be authenticated.",
  PASSWORD_STRENGTH: "password does not meet strength requirements.",
};
