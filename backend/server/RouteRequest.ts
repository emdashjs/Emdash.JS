import { RouteName } from "./Route.ts";
import { ServerTiming } from "./ServerTiming.ts";

export class RouteRequest {
  name: RouteName;
  url: RouteURL;
  original: Request;
  params: Record<string, string | string[] | undefined> = {};
  #renderFunc: RouteRender;

  constructor(
    request: Request,
    render?: RouteRender,
  ) {
    this.original = request;
    this.url = new RouteURL(request.url, { method: request.method });
    const [_, second] = this.url.pathname.split("/");
    this.name = `/${second}`;
    this.#renderFunc = render ?? DEFAULT_RENDER;
  }

  get render() {
    return () => {
      return this.#renderFunc(this);
    };
  }

  get timing(): ServerTiming {
    return ServerTiming.get(this.original);
  }

  setRender(render: RouteRender): void {
    this.#renderFunc = render;
  }
}

export type RouteRender = (request: RouteRequest) => Promise<Response | void>;

const DEFAULT_RENDER = async (
  _request: RouteRequest,
): Promise<Response | void> => {};

class RouteURL extends URL {
  method: string;
  constructor(
    url: string | URL | RouteURL,
    options?: { base?: string | URL; method?: string },
  ) {
    super(url, options?.base);
    this.method = options?.method ?? "";
  }
}
