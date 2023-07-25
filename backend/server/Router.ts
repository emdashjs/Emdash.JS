import { RouteRequest } from "./RouteRequest.ts";
import { Route, RouteName } from "./Route.ts";
import { ServerTiming } from "./ServerTiming.ts";

export class Router {
  #routes: RouteMap = new Map();
  cache?: Cache;

  constructor(options?: RouterOptions) {
    this.cache = options?.cache;
  }

  respond(cache?: Cache): Deno.ServeHandler {
    this.cache = cache;
    return async (request: Request, info: Deno.ServeHandlerInfo) => {
      const timing = ServerTiming.get(request);
      timing.start("CPU");
      const cacheMeasure = timing.start("Cache");
      const cached = await cache?.match(request);
      cacheMeasure.finish();
      if (cached) {
        const response = cached.clone();
        response.headers.set("Server-Timing", timing.toString());
        return response;
      }
      const routeRequest = this.#routeRequest(request, info);
      const response = await routeRequest.render();

      if (response) {
        response.headers.set("Server-Timing", timing.toString());
        return response;
      }

      return Response.redirect(routeRequest.url.origin, 307);
    };
  }

  #routeRequest(request: Request, info: Deno.ServeHandlerInfo) {
    const measure = ServerTiming.get(request).start("Route");
    const routeRequest = new RouteRequest(request, info);
    for (const route of this.#routes.values()) {
      if (route.test(routeRequest)) {
        route.exec(routeRequest);
        measure.finish();
        return routeRequest;
      }
    }
    measure.finish();
    return routeRequest;
  }
}

export type RouterOptions = {
  cache?: Cache;
};
export type RouteMap = Map<RouteName, Route>;
