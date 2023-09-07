// deno-lint-ignore-file ban-types
import { ActiveRecord } from "../database/ActiveRecord.ts";
import {
  getStrengthOptions,
  type StrengthOptions,
} from "../auth/isStrongPassword.ts";
import type { PasswordAlgorithm, SecurityLevel } from "../auth/PasswordAes.ts";
import type {
  AuthConfig,
  SupportedProvider,
  ThirdPartyProvider,
} from "../auth/providers.ts";
import type { FunctionKeys, Precise } from "../types.ts";

export class AppData extends ActiveRecord<"AppData"> {
  constructor(appData?: AppDataStore) {
    super({ ...appData, id: "AppData" });
    appData = appData ?? {};
    const store = {} as AppDataStore;
    DATA.set(this, store);
    for (const key of KEYS) {
      assignValue(key, FALLBACK, store);
      assignValue(key, appData, store);
      Object.defineProperty(this, key, {
        configurable: false,
        enumerable: true,
        get: () => {
          if (key === "first_user") {
            return Deno.env.get(KEY_MAP[key])?.trim().toLowerCase() ===
                "true" ||
              DATA.get(this)![key];
          }
          if (key === "password_rules") {
            const value = Deno.env.get(KEY_MAP[key])?.trim();
            return value ? getStrengthOptions(value) : DATA.get(this)![key];
          }
          return Deno.env.get(KEY_MAP[key]) || DATA.get(this)![key];
        },
      });
    }
  }

  get collection(): "AppData" {
    return "AppData";
  }

  /** Only required for Auth0 or Okta. */
  readonly auth_client_domain?: string;
  /** Required for any third-party provider. */
  readonly auth_client_id?: string;
  /** Required for any third-party provider. */
  readonly auth_client_secret?: string;
  /** Used only for internal auth provider */
  readonly auth_security?: SecurityLevel;
  /** Used only for internal auth provider */
  readonly auth_algorithm?: PasswordAlgorithm;
  readonly auth_provider!: SupportedProvider | (string & {});
  readonly db!: `${string}://${string}`;
  readonly email!: string;
  readonly first_user!: boolean;
  readonly folder?: string;
  readonly name!: string;
  readonly password_rules!: StrengthOptions;
  readonly port?: number;
  readonly secret_key?: string;
  readonly session_ttl!: string;
  readonly static!: string;
  readonly uuid!: string;

  authConfig(): AuthConfig {
    if (this.auth_provider !== "internal") {
      const config: AuthConfig = {
        type: this.auth_provider as ThirdPartyProvider,
        clientId: this.auth_client_id!,
        clientSecret: this.auth_client_secret!,
      };
      if (this.auth_provider === "auth0") {
        const baseURL = `https://${this.auth_client_domain}/oauth2`;
        config.authorizationEndpointUri = `${baseURL}/authorize`;
        config.tokenUri = `${baseURL}/oauth/token`;
      } else if (this.auth_provider === "okta") {
        const baseURL = `https://${this.auth_client_domain}/oauth2`;
        config.authorizationEndpointUri = `${baseURL}/v1/authorize`;
        config.tokenUri = `${baseURL}/v1/token`;
      }
      return config;
    } else {
      const platform = AppData.platform;
      switch (platform.runtime) {
        case "deno-deploy":
        case "netlify-edge":
        case "supabase-edge": {
          return {
            type: "internal",
            level: this.auth_security ?? "LOW",
            algorithm: this.auth_algorithm ?? "pbkdf2",
          };
        }
        case "aws-lambda": {
          return {
            type: "internal",
            level: this.auth_security ?? "MID",
            algorithm: this.auth_algorithm ?? "bcrypt",
          };
        }
        case "azure-function": {
          return {
            type: "internal",
            level: this.auth_security ?? "HIGH",
            algorithm: this.auth_algorithm ?? "argon2",
          };
        }
      }
      return {
        type: "internal",
        level: this.auth_security ?? "MAX",
        algorithm: this.auth_algorithm ?? "argon2",
      };
    }
  }

  async destroy(): Promise<boolean> {
    const collection = ActiveRecord.getCollectionOf(AppData);
    return await collection?.delete(this.id) ?? false;
  }

  merge(appData: Partial<AppDataStore>) {
    const store = DATA.get(this)!;
    for (const key of KEYS) {
      assignValue(key, appData, store);
    }
  }

  async save(): Promise<boolean> {
    const collection = ActiveRecord.getCollectionOf(AppData);
    const store = DATA.get(this)!;
    return await collection?.set({
      ...store,
      ...this,
      // NEVER SAVE SECRETS TO DATABASE!!
      secret_key: undefined,
      auth_client_secret: undefined,
      db: undefined,
    }) ?? false;
  }

  static get platform() {
    const awsLambda = Deno.env.get("AWS_LAMBDA_FUNCTION_NAME") !== undefined;
    const azureFunction =
      Deno.env.get("EXECUTION_CONTEXT_FUNCTIONNAME") !== undefined;
    const netlifyEdge = typeof Netlify !== "undefined" &&
      typeof Netlify.env !== undefined;
    const supabaseEdge = Deno.env.get("SUPABASE_URL") !== undefined &&
      Deno.env.get("SUPABASE_ANON_KEY") !== undefined &&
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") !== undefined;
    const denoDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined &&
      !supabaseEdge && !netlifyEdge;
    const runtime = supabaseEdge
      ? "supabase-edge" as const
      : netlifyEdge
      ? "netlify-edge" as const
      : awsLambda
      ? "aws-lambda" as const
      : azureFunction
      ? "azure-function" as const
      : denoDeploy
      ? "deno-deploy" as const
      : "deno" as const;

    return {
      awsLambda,
      azureFunction,
      denoDeploy,
      netlifyEdge,
      runtime,
      supabaseEdge,
      supported: runtime === "deno" || runtime === "deno-deploy",
      version: Deno.version,
    };
  }

  static get env() {
    return KEY_MAP;
  }
}

// deno-lint-ignore no-explicit-any
declare let Netlify: any;

type AppDataLike = Omit<
  AppData,
  FunctionKeys<AppData> | keyof ActiveRecord
>;

type AppDataStore = {
  -readonly [K in keyof AppDataLike]?: AppData[K];
};

type AppDataKeyMap = {
  [K in keyof Required<AppDataLike>]: `${typeof PRE}${Uppercase<K>}`;
};

const PRE = "EMDASH_" as const;
const DATA = new WeakMap<AppData, AppDataStore>();
const FALLBACK = {
  auth_provider: "internal",
  db: "denokv://:default:",
  first_user: true,
  name: "Emdash.js",
  password_rules: getStrengthOptions(
    "minLength:12;minLowercase:2;minUppercase:2;minNumbers:2;minSymbols:2",
  ),
  session_ttl: "7d",
  static: "static",
  uuid: "bab51817-3eac-4726-8d3b-0a57f886e8bf",
} satisfies AppDataStore;
const KEY_MAP = {
  auth_algorithm: `${PRE}AUTH_ALGORITHM`,
  auth_client_domain: `${PRE}AUTH_CLIENT_DOMAIN`,
  auth_client_id: `${PRE}AUTH_CLIENT_ID`,
  auth_client_secret: `${PRE}AUTH_CLIENT_SECRET`,
  auth_provider: `${PRE}AUTH_PROVIDER`,
  auth_security: `${PRE}AUTH_SECURITY`,
  db: `${PRE}DB`,
  email: `${PRE}EMAIL`,
  first_user: `${PRE}FIRST_USER`,
  folder: `${PRE}FOLDER`,
  name: `${PRE}NAME`,
  password_rules: `${PRE}PASSWORD_RULES`,
  port: `${PRE}PORT`,
  secret_key: `${PRE}SECRET_KEY`,
  session_ttl: `${PRE}SESSION_TTL`,
  static: `${PRE}STATIC`,
  uuid: `${PRE}UUID`,
} as const satisfies AppDataKeyMap;
const KEYS = Object.keys(KEY_MAP) as (keyof typeof KEY_MAP)[];
function isValue<T extends (Precise.Value | undefined)>(
  value: T,
): value is Exclude<T, undefined> {
  return typeof value !== "undefined";
}
function assignValue(
  key: string,
  data: Record<string, Precise.Value | undefined>,
  // deno-lint-ignore no-explicit-any
  store: Record<string, any>,
) {
  const value = data[key];
  if (key in data && isValue(value)) {
    store[key] = value;
  }
}
