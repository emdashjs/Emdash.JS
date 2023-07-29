import { MediaType } from "../../deps.ts";
import { RouteRequest } from "./RouteRequest.ts";
import { Route, RouteAdd, RouteName } from "./Route.ts";
import { ServerTiming } from "./ServerTiming.ts";
import { Renderer } from "./Renderer.ts";
import { APP_DATA, ERROR, HTTP_CODE } from "../constants.ts";

export type RouterOptions = {
  /** Provide a Cache API for serving previously rendered responses. */
  cache?: Cache;
  /** Use the built-in static file resolution. Defaults to true. */
  useStatic?: boolean;
  /** Choose the behavior of route mismatches. Defaults to 404 Not Found. */
  mismatch?:
    | typeof HTTP_CODE.REDIRECT.TEMPORARY
    | typeof HTTP_CODE.RESOURCE.NOT_FOUND
    | typeof HTTP_CODE.SERVER.INTERNAL;
};

export class Router {
  #renderer = new Renderer();
  #routes: RouteMap = new Map();
  cache?: Cache;
  useStatic: boolean;
  mismatch: Exclude<RouterOptions["mismatch"], undefined>;

  constructor(options?: RouterOptions) {
    this.cache = options?.cache;
    this.useStatic = typeof options?.useStatic === "boolean"
      ? options.useStatic
      : true;
    this.mismatch = options?.mismatch ?? HTTP_CODE.RESOURCE.NOT_FOUND;
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
          routeRequest.session?.setCookie(response);
          return response;
        }
      }
      const response = await routeRequest.render();

      if (response) {
        response.headers.set("Server-Timing", timing.toString());
        routeRequest.session?.setCookie(response);
        if (routeRequest.useCache) {
          await this.cache?.put(request, response.clone());
        }
        return response;
      }

      switch (this.mismatch) {
        case 307: {
          return Response.redirect(
            routeRequest.url.origin,
            HTTP_CODE.REDIRECT.TEMPORARY,
          );
        }
        case 500: {
          return Response.json(
            { error: ERROR.SERVER.INTERNAL },
            { status: HTTP_CODE.SERVER.INTERNAL },
          );
        }
        case 404:
        default: {
          return Response.json(
            { error: ERROR.RESOURCE.NOT_FOUND },
            { status: HTTP_CODE.RESOURCE.NOT_FOUND },
          );
        }
      }
    };
  }

  #routeRequest(request: Request, info: Deno.ServeHandlerInfo) {
    const measure = ServerTiming.get(request).start("Route");
    const routeRequest = new RouteRequest(request, {
      info,
      renderer: this.#renderer,
    });
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

export type RouteMap = Map<
  RouteName<`/${string}`, string>,
  Route<`/${string}`, string>
>;

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
    contentType = MediaType.lookup(path) ?? "text/plain";
    status = HTTP_CODE.RESOURCE.OK;
  } catch (_err) {
    content = "404: File not found.";
    contentType = "text/html";
    status = HTTP_CODE.RESOURCE.NOT_FOUND;
  }
  return new Response(content, {
    status,
    headers: { "Content-Type": contentType },
  });
});
