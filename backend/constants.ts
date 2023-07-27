import { getStrengthOptions } from "./auth/isStrongPassword.ts";

export const APP_COLLECTION = {
  COUNT: "count",
  NONE: "none",
  POST: "post",
  SESSION: "session",
  USER: "user",
} as const;

const defaultRules =
  "minLength:12;minLowercase:2;minUppercase:2;minNumbers:2;minSymbols:2";
const providedRules = Deno.env.get("APP_DATA_PASSWORD_RULES")?.trim();
const firstUser = Deno.env.get("APP_DATA_FIRST_USER")?.toLowerCase() ?? "true";
export const APP_DATA = {
  FIRST_USER: firstUser === "true",
  FOLDER: Deno.env.get("APP_DATA_FOLDER") ?? "",
  STATIC: Deno.env.get("APP_DATA_STATIC") ?? "static",
  SESSION_TTL: Deno.env.get("APP_DATA_SESSION_TTL") ?? "7d",
  NAME: Deno.env.get("APP_DATA_NAME") ?? "blogger.js",
  UUID: Deno.env.get("APP_DATA_UUID") ?? "bab51817-3eac-4726-8d3b-0a57f886e8bf",
  EMAIL: Deno.env.get("APP_DATA_EMAIL") ?? "",
  PASSWORD_RULES: providedRules
    ? getStrengthOptions(providedRules)
    : getStrengthOptions(defaultRules),
} as const;

export type ERROR = typeof ERROR;
export const ERROR = {
  AUTH: {
    NOT_AUTHENTICATED: "user cannot be authenticated.",
    FORBIDDEN: "access is forbidden to this resource.",
    PASSWORD_STRENGTH: "password does not meet strength requirements.",
  },
  RESOURCE: {
    NOT_FOUND: "resource could not be found.",
  },
  SERVER: {
    INTERNAL: "server encountered an unspecified error.",
  },
} as const;
export type HTTP_CODE = typeof HTTP_CODE;
export const HTTP_CODE = {
  AUTH: {
    NOT_AUTHENTICATED: 401,
    FORBIDDEN: 403,
    PASSWORD_STRENGTH: 422,
  },
  REDIRECT: {
    SEE_OTHER: 303,
    TEMPORARY: 307,
  },
  RESOURCE: {
    OK: 200,
    NOT_FOUND: 404,
  },
  SERVER: {
    INTERNAL: 500,
  },
} as const satisfies ERROR_CODE;
type ERROR_CODE =
  & {
    [K in keyof ERROR]:
      & {
        [P in keyof ERROR[K]]: number;
      }
      & {
        [S: string]: number;
      };
  }
  & Record<string, Record<string, number>>;
