import {
  getStrengthOptions,
  StrengthOptions,
} from "./auth/isStrongPassword.ts";

export class AppData {
  constructor(appData: Partial<AppDataStore> = {}) {
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

  readonly email?: string;
  readonly first_user!: boolean;
  readonly folder?: string;
  readonly name!: string;
  readonly password_rules!: StrengthOptions;
  readonly secret_key?: string;
  readonly session_ttl!: string;
  readonly static!: string;
  readonly uuid!: string;

  merge(appData: Partial<AppDataStore>) {
    const store = DATA.get(this)!;
    for (const key of KEYS) {
      assignValue(key, appData, store);
    }
  }
}

export const APP_DATA = new AppData();

type AppDataLike = Omit<AppData, "merge">;

type AppDataStore = {
  -readonly [K in keyof AppDataLike]: AppData[K];
};

type AppDataKeyMap = {
  [K in keyof Required<AppDataLike>]: `${typeof PRE}${Uppercase<K>}`;
};

const PRE = "APP_DATA_" as const;
const DATA = new WeakMap<AppData, AppDataStore>();
const FALLBACK = {
  first_user: true,
  name: "EmmaLou.js",
  session_ttl: "7d",
  static: "static",
  uuid: "bab51817-3eac-4726-8d3b-0a57f886e8bf",
  password_rules: getStrengthOptions(
    "minLength:12;minLowercase:2;minUppercase:2;minNumbers:2;minSymbols:2",
  ),
} satisfies AppDataStore;
const KEY_MAP = {
  email: `${PRE}EMAIL`,
  first_user: `${PRE}FIRST_USER`,
  folder: `${PRE}FOLDER`,
  name: `${PRE}NAME`,
  password_rules: `${PRE}PASSWORD_RULES`,
  secret_key: `${PRE}SECRET_KEY`,
  session_ttl: `${PRE}SESSION_TTL`,
  static: `${PRE}STATIC`,
  uuid: `${PRE}UUID`,
} as const satisfies AppDataKeyMap;
const KEYS = Object.keys(KEY_MAP) as (keyof typeof KEY_MAP)[];
// deno-lint-ignore ban-types
function isValue<T extends ({} | undefined)>(
  value: T,
): value is Exclude<T, undefined> {
  return typeof value !== "undefined";
}
function assignValue(
  key: string,
  // deno-lint-ignore ban-types
  data: Record<string, {} | undefined>,
  // deno-lint-ignore no-explicit-any
  store: Record<string, any>,
) {
  const value = data[key];
  if (key in data && isValue(value)) {
    store[key] = value;
  }
}
