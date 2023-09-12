import type { ThirdPartyStaticModuleInterface } from "npm:ses@0.18.7";

export class WrappedModule implements ThirdPartyStaticModuleInterface {
  imports: string[];
  exports: string[];
  execute: (
    // deno-lint-ignore ban-types
    proxiedExports: Object,
    compartment: Compartment,
    resolvedImports: Record<string, string>,
  ) => void;

  // deno-lint-ignore no-explicit-any
  constructor(namespace: any) {
    Object.freeze(this.imports = []);
    Object.freeze(this.exports = Object.keys(namespace));
    Object.freeze(
      // deno-lint-ignore no-explicit-any
      this.execute = (exported: any) => {
        for (const name of this.exports) {
          exported[name] = namespace[name];
        }
      },
    );
  }

  static async import(specifier: string) {
    const namespace = await import(specifier);
    return new WrappedModule(namespace);
  }

  static none() {
    return new WrappedModule(Object.create(null));
  }
}
