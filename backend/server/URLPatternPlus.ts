import { Path2RegExp } from "../../deps.ts";

const privates = new WeakMap<URLPatternPlus, URLSearchPattern>();
const MOD = {
  REQUIRED: "!", // default
  OPTIONAL: "?",
  ZERO_PLUS: "*",
  ONE_PLUS: "+",
} as const;

export class URLPatternPlus {
  #urlPattern: URLPattern;
  #methodRegExp: RegExp;
  #methodPattern: string;

  constructor(input: URLPatternPlusInput, baseURL?: string | undefined) {
    const isClean = typeof input === "string" || isCleanInput(input);
    this.#urlPattern = new URLPattern(
      isClean ? input : { ...input, search: undefined },
      baseURL,
    );
    if (!isClean) {
      privates.set(this, parseURLSearch(input.search ?? "(.*)"));
    }
    this.#methodPattern = (typeof input === "object")
      ? input.method ?? "*"
      : "*";
    const cleanPattern = this.#methodPattern === "*"
      ? "(.*)"
      : this.#methodPattern;
    this.#methodRegExp = Path2RegExp.pathToRegexp(cleanPattern);
  }

  test(input: URLPatternPlusInput, baseURL?: string | undefined): boolean {
    const result = this.#urlPattern.test(input, baseURL);
    if (result && privates.has(this)) {
      // Also test the search query.
      const pattern = privates.get(this)!;
      const searchParams = typeof input === "string"
        ? new URL(input, baseURL).searchParams
        : new URLSearchParams(input.search);
      for (const param of pattern.searchParams) {
        if (searchParams.has(param.name)) {
          const results = searchParams.getAll(param.name);
          for (const result of results) {
            if (!result.match(param.pattern)) {
              return false;
            }
          }
        } else if (
          param.modifier === MOD.REQUIRED || param.modifier === MOD.ONE_PLUS
        ) {
          return false;
        }
      }
    }
    const method = typeof input === "string" ? "GET" : input.method ?? "GET";
    if (!method.match(this.#methodRegExp)) {
      return false;
    }
    return result;
  }

  exec(
    input: URLPatternPlusInput,
    baseURL?: string | undefined,
  ): URLPatternPlusResult | null {
    const result = this.#urlPattern.exec(input, baseURL);
    if (result !== null && privates.has(this)) {
      // Also exec the search query.
      const pattern = privates.get(this)!;
      const searchUrl = typeof input === "string"
        ? new URL(input, baseURL)
        : undefined;
      const searchParams = searchUrl?.searchParams ??
        new URLSearchParams(input.search as string);
      const searchResult = result.search as URLSearchPatternResult;
      searchResult.input = searchParams.toString();
      for (const param of pattern.searchParams) {
        if (
          !searchParams.has(param.name) &&
          (param.modifier === MOD.REQUIRED || param.modifier === MOD.ONE_PLUS)
        ) {
          return null;
        }
        const value = searchParams.getAll(param.name);
        if (MOD.REQUIRED || MOD.OPTIONAL) {
          const [first] = value;
          searchResult.groups[param.parameter ?? param.name] = first;
        } else {
          searchResult.groups[param.parameter ?? param.name] = value;
        }
      }
    }
    const method = typeof input === "string" ? "GET" : input.method ?? "GET";
    const methodResult = method.match(this.#methodRegExp);
    if (!methodResult || !result) {
      return null;
    }
    return {
      ...result,
      method: {
        input: method,
      },
    };
  }

  get protocol(): string {
    return this.#urlPattern.protocol;
  }
  get username(): string {
    return this.#urlPattern.username;
  }
  get password(): string {
    return this.#urlPattern.password;
  }
  get hostname(): string {
    return this.#urlPattern.hostname;
  }
  get method(): string {
    return this.#methodPattern;
  }
  get port(): string {
    return this.#urlPattern.port;
  }
  get pathname(): string {
    return this.#urlPattern.pathname;
  }
  get search(): string {
    return privates.get(this)?.search ?? this.#urlPattern.search;
  }
  get hash(): string {
    return this.#urlPattern.hash;
  }
}

export interface URLPatternPlusInit extends URLPatternInit {
  method?: string;
}

export type URLPatternPlusInput = string | URLPatternPlusInit;

export interface URLPatternPlusResult extends Omit<URLPatternResult, "search"> {
  search: URLSearchPatternResult;
  method: {
    input: string;
  };
}

export interface URLSearchPatternResult {
  input: string;
  groups: Record<string, string | string[] | undefined>;
}

interface URLSearchPattern {
  search: string;
  searchParams: URLSearchPatternParam[];
}

interface URLSearchPatternParam {
  /** The named URL query parameter */
  name: string;
  /** The named pattern parameter if provided */
  parameter?: string;
  /** The provided pattern to match a value. */
  pattern: RegExp;
  modifier: typeof MOD[keyof typeof MOD];
}

function isCleanInput(input: URLPatternInput): boolean {
  return input.search === undefined || input.search === "" ||
    input.search === "*";
}

function parseURLSearch(search: string): URLSearchPattern {
  const skip = [" ", "?", "&"];
  const searchParams = new Map<string, URLSearchPatternParam>();
  const tokens = Path2RegExp.parse(search);
  const { length } = tokens;
  let name = "";
  for (let i = 0; i < length; i++) {
    let token = tokens[i];
    if (typeof token === "string") {
      if (!skip.includes(token)) {
        if (token.startsWith("&")) {
          token = token.slice(1, token.length);
        }
        if (token.endsWith("=")) {
          name = token.slice(0, token.length - 1);
        } else {
          const [queryName, ...rest] = token.split("=");
          searchParams.set(queryName, {
            name: queryName,
            pattern: new RegExp(`(?:^${rest.join("=")}$)`, "i"),
            modifier: "!",
          });
        }
      }
    } else {
      if (!skip.includes(token.prefix)) {
        name = name.length > 0 ? name : token.prefix;
      }
      if (name.endsWith("=")) {
        name = name.slice(0, name.length - 1);
      }
      if (typeof token.name === "string") {
        searchParams.set(name, {
          name,
          parameter: token.name,
          pattern: new RegExp(`(?:^${token.pattern}$)`, "i"),
          modifier: token.modifier === ""
            ? "!"
            : token.modifier as typeof MOD["OPTIONAL"],
        });
      } else {
        searchParams.set(name, {
          name,
          pattern: new RegExp(`(?:^${token.pattern}$)`, "i"),
          modifier: token.modifier === ""
            ? "!"
            : token.modifier as typeof MOD["OPTIONAL"],
        });
      }
      name = "";
    }
  }
  if (name.length > 1) {
    if (name.endsWith("=")) {
      name = name.slice(0, name.length - 1);
    }
    searchParams.set(name, {
      name,
      pattern: new RegExp("(?:^[^\\/#\\?]+?$)", "i"),
      modifier: "!",
    });
  }
  return {
    search,
    searchParams: Array.from(searchParams.values()),
  };
}
