// deno-lint-ignore no-explicit-any
function guardEnv<T extends (...args: any[]) => any>(func: T): T {
  return ((...args) => {
    for (let i = 0; i < Math.min(args.length, 2); i++) {
      if (typeof args[i] !== "string") {
        throw new TypeError(`Expected string at position ${i}`);
      }
      if (i === 0 && args[i] === "") {
        throw new TypeError("Key is an empty string.");
      }
    }
    return func(...args);
  }) as T;
}

export class MutableEnv implements Deno.Env {
  #env: { [index: string]: string };
  #keys: { [index: string]: string };

  constructor() {
    const permission = Deno.permissions.requestSync({ name: "env" });
    if (permission.state === "granted") {
      this.#env = { ...Deno.env.toObject() };
      this.#keys = Object.fromEntries(
        Object.keys(this.#env).map((key) => [key.toLowerCase(), key]),
      );
    } else {
      this.#env = {};
      this.#keys = {};
    }
  }

  get = guardEnv((key: string): string | undefined => {
    return this.#env[this.#keys[key.toLowerCase()]] ?? undefined;
  });

  set = guardEnv((key: string, value: string) => {
    this.#env[key] = value;
    this.#env[key.toLowerCase()] = key;
  });

  delete = guardEnv((key: string) => {
    const normalized = key.toLowerCase();
    delete this.#env[this.#keys[normalized]];
    delete this.#keys[normalized];
  });

  has = guardEnv((key: string): boolean => {
    return Object.hasOwn(this.#env, this.#keys[key.toLowerCase()]);
  });

  toObject = (): { [index: string]: string } => {
    return { ...this.#env };
  };

  static realEnv = Deno.env;

  /** Replace the current Deno.env with a MutableEnv. */
  static replace(existing?: MutableEnv): MutableEnv {
    const env = existing ?? new MutableEnv();
    Object.defineProperty(Deno, "env", {
      enumerable: true,
      configurable: true,
      writable: false,
      value: env,
    });
    return env;
  }

  /** Restore the real Deno.env and return the MutableEnv if exists. */
  static restore(): MutableEnv | undefined {
    const mutableEnv = Deno.env instanceof MutableEnv ? Deno.env : undefined;
    Object.defineProperty(Deno, "env", {
      enumerable: true,
      configurable: true,
      writable: false,
      value: MutableEnv.realEnv,
    });
    return mutableEnv;
  }

  static replaceReadonly(): void {
    const key = "__EMDASH_TEST_ENV";
    const val = crypto.randomUUID();
    try {
      Deno.env.set(key, val);
      if (Deno.env.get(key) !== val) {
        MutableEnv.replace();
      }
      Deno.env.delete(key);
    } catch (_) {
      MutableEnv.replace();
    }
  }
}
