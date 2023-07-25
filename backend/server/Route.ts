import { RouteRender, RouteRequest } from "./RouteRequest.ts";
import { URLPatternPlus, URLPatternPlusInit } from "./URLPatternPlus.ts";

export class Route<P extends `/${string}` = "/", M extends string = "*"> {
  name: RouteName<P, M>;
  matcher: URLPatternPlus;
  render: RouteRender;
  useCache: boolean;

  constructor(
    init: RouteInit<P, M>,
    render: RouteRender,
    useCache?: boolean,
  ) {
    if (typeof init === "string") {
      this.name = init;
      const [method, ...paths] = init.split(":");
      const pathname = paths.join(":");
      this.matcher = new URLPatternPlus({
        pathname,
        method,
      });
    } else {
      this.name = `${init.method ?? "*" as M}:${init.pathname ?? "/" as P}`;
      this.matcher = new URLPatternPlus({
        ...init,
        pathname: init.pathname ?? "/",
      });
    }
    this.render = render;
    this.useCache = useCache === undefined ? true : useCache;
  }

  test(request: RouteRequest) {
    return this.matcher.test(request.url);
  }

  exec(request: RouteRequest) {
    const match = this.matcher.exec(request.url);

    if (match) {
      const entries = Object.entries(match.pathname.groups ?? {});
      for (const [key, value] of entries) {
        request.params[key] = value ? decodeURIComponent(value) : value;
      }
      const searchEntries = Object.entries(match.search.groups ?? {});
      for (const [key, value] of searchEntries) {
        request.params[key] = Array.isArray(value)
          ? value.map((item) => decodeURIComponent(item))
          : typeof value === "string"
          ? decodeURIComponent(value)
          : value;
      }
    }
    request.setRender(this.render);
    request.useCache = this.useCache;
    return request;
  }
}

export type RouteInit<P extends `/${string}` = "/", M extends string = "*"> =
  | RouteName<P, M>
  | RouteObject<P, M>;

export type RouteObject<P extends `/${string}` = "/", M extends string = "*"> =
  & Omit<URLPatternPlusInit, "method" | "pathname">
  & {
    pathname?: P;
    method?: M;
  };

export type RouteName<P extends `/${string}` = "/", M extends string = "*"> =
  `${M}:${P}`;
