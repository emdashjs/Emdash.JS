import { AppData } from "./models/AppData.ts";

export const APP_DATA = new AppData();

// TODO: move into EmdashJS.init()
if (!APP_DATA.secret_key) {
  console.warn("!!   NO SECRET KEY SET, ALL USER SESSIONS ARE INSECURE.   !!");
  console.warn('!! SET ENVIRONMENT VAR "APP_DATA_SECRET_KEY" IMMEDIATELY. !!');
}

export const IS_DENO_DEPLOY = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

export const APP_COLLECTION = {
  ACCESS: "access_token",
  COUNT: "count",
  NONE: "none",
  POST: "post",
  SESSION: "session_token",
  USER: "user",
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
