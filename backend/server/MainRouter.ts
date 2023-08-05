import { Router } from "../../deps.ts";

export class MainRouter extends Router {
  merge(routers: Router[] | Router) {
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
