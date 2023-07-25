import { RouteRequest } from "./RouteRequest.ts";
import { RouteMap } from "./Route.ts";
import { ServerTiming } from "./ServerTiming.ts";

export class Router {
  #routes: RouteMap = new Map([]);
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
      const render = await routeRequest.render();

      if (render) {
        render.headers.set("Server-Timing", timing.toString());
        return render;
      }

      return Response.redirect(routeRequest.url.origin, 307);
    };
  }

  #routeRequest(request: Request, info: Deno.ServeHandlerInfo) {
    const measure = ServerTiming.get(request).start("Route");
    const routeRequest = new RouteRequest(request, info);
    const route = this.#routes.get(routeRequest.name);
    if (route) {
      route.exec(routeRequest);
    }
    measure.finish();
    return routeRequest;
  }
}

export type RouterOptions = {
  cache?: Cache;
};
