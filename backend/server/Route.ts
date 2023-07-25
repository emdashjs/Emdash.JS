import { RouteRender, RouteRequest } from "./RouteRequest.ts";
import { URLPatternPlus } from "./URLPatternPlus.ts";

export class Route<T extends string = string> {
  name: RouteName<T>;
  matcher: URLPatternPlus | true;
  render: RouteRender;

  constructor(
    name: RouteName<T>,
    options: { render: RouteRender; matcher?: URLPatternPlus },
  ) {
    this.name = name;
    this.matcher = options.matcher ?? true;
    this.render = options.render;
  }

  test(request: RouteRequest) {
    if (this.name === request.name) {
      if (this.matcher === true) {
        return this.matcher;
      }
      return this.matcher.test(request.url);
    }
    return false;
  }

  exec(request: RouteRequest) {
    if (this.matcher && this.matcher !== true) {
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
    }
    request.setRender(this.render);
    return request;
  }
}

export type RouteName<T extends string = string> = `/${T}`;
export type RouteMap = Map<RouteName, Route>;
