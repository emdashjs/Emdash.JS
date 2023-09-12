// @deno-types="npm:ses@0.18.7"
import "https://unpkg.com/ses@0.18.7/dist/ses.umd.min.js";
import { transpile } from "https://deno.land/x/emit@0.27.0/mod.ts";
import { StaticModuleRecord } from "npm:@endo/static-module-record@0.8.1";
import { WrappedModule } from "./WrappedModule.ts";
import { allowedGlobals, allowedNodeModules } from "./allowLists.ts";

/** A compartment limited to an allow-listed sandbox for importing untrusted programs. */
export class Isolate {
  #internal: Compartment;

  constructor(name: string) {
    const globals = Object.fromEntries(
      // deno-lint-ignore no-explicit-any
      allowedGlobals.map((a) => [a, (globalThis as any)[a]] as const),
    );
    this.#internal = new Compartment(
      {
        ...globals,
        console: {
          debug: console.debug,
          info: console.info,
          log: console.log,
          warn: console.warn,
        },
      },
      {},
      {
        name,
        resolveHook(spec, _ref) {
          return spec;
        },
        async importHook(spec) {
          if (spec.startsWith("npm:") || allowedNodeModules.includes(spec)) {
            return await WrappedModule.import(spec);
          }
          if (spec.startsWith("node:")) {
            return WrappedModule.none();
          }
          const source = await tryTranspile(spec);
          return new StaticModuleRecord(source);
        },
      },
    );
  }

  get globalThis() {
    return this.#internal.globalThis;
  }

  get name(): string {
    return this.#internal.name;
  }

  async import(specifier: string) {
    const mod = await this.#internal.import(specifier);
    return mod.namespace;
  }
}

async function tryTranspile(specifier: string): Promise<string> {
  try {
    const transpiled = await transpile(specifier, { allowRemote: true });
    const source = transpiled.get(specifier);
    if (source) {
      return source;
    }
    throw new SyntaxError(`Could not transpile "${specifier}".`);
  } catch (error) {
    console.error("tryTranspile", error);
  }
  return "";
}
