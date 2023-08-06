import { Router } from "../../deps.ts";

// deno-lint-ignore no-explicit-any
export class MainRouter<T extends Record<string, any> = Record<string, any>>
  extends Router<T> {
  merge(routers: Router<T>[] | Router<T>) {
    routers = Array.isArray(routers) ? routers : [routers];
    for (const router of routers) {
      for (const route of router.values()) {
        this.add(
          route.methods,
          route.name!,
          route.path,
          ...route.middleware,
        );
      }
    }
  }
}
