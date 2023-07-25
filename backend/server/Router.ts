import { lookup } from "../../deps.ts";
import { RouteRender, RouteRequest } from "./RouteRequest.ts";
import { Route, RouteInit, RouteName } from "./Route.ts";
import { ServerTiming } from "./ServerTiming.ts";
import { Renderer } from "./Renderer.ts";
import { APP_DATA } from "../constants.ts";

export class Router {
  #renderer = new Renderer();
  #routes: RouteMap = new Map();
  cache?: Cache;
  useStatic: boolean;

  constructor(options?: RouterOptions) {
    this.cache = options?.cache;
    this.useStatic = typeof options?.useStatic === "boolean"
      ? options.useStatic
      : true;
  }

  add({ pattern, render, useCache }: RouteAdd<`/${string}`, string>) {
    const route = new Route(pattern, render, useCache);
    this.#routes.set(route.name, route);
  }

  addAll(routes: Iterable<RouteAdd<`/${string}`, string>>) {
    for (const route of routes) {
      this.add(route);
    }
  }

  respond(): Deno.ServeHandler {
    if (this.useStatic) {
      this.#routes.set(STATIC_ROUTE.name, STATIC_ROUTE);
    }
    return async (request: Request, info: Deno.ServeHandlerInfo) => {
      const timing = ServerTiming.get(request);
      timing.start("CPU");
      const routeRequest = this.#routeRequest(request, info);
      if (routeRequest.useCache) {
        const cacheMeasure = timing.start("Cache");
        const cached = await this.cache?.match(request);
        cacheMeasure.finish();
        if (cached) {
          const response = cached.clone();
          response.headers.set("Server-Timing", timing.toString());
          return response;
        }
      }
      const response = await routeRequest.render(this.#renderer);

      if (response) {
        response.headers.set("Server-Timing", timing.toString());
        if (routeRequest.useCache) {
          await this.cache?.put(request, response.clone());
        }
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
  useStatic?: boolean;
};
export type RouteMap = Map<
  RouteName<`/${string}`, string>,
  Route<`/${string}`, string>
>;
export type RouteAdd<P extends `/${string}` = "/", M extends string = "*"> = {
  pattern: RouteInit<P, M>;
  useCache?: boolean;
  render: RouteRender;
};

const STATIC_ROUTE = new Route("GET:/static/(.*)", async (request) => {
  const path = "." + request.url.pathname
    .replace(
      /^\/static/gui,
      APP_DATA.STATIC.startsWith("/") ? APP_DATA.STATIC : `/${APP_DATA.STATIC}`,
    );
  let content: string | Uint8Array;
  let contentType: string;
  let status: number;
  try {
    content = await Deno.readFile(path);
    contentType = lookup(path) ?? "text/plain";
    status = 200;
  } catch (_err) {
    content = "404: File not found.";
    contentType = "text/html";
    status = 404;
  }
  return new Response(content, {
    status,
    headers: { "Content-Type": contentType },
  });
});
