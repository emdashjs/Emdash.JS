import { RequestMeasure } from "./RequestMeasure.ts";
import { RouteName } from "./Route.ts";

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

  setRender(render: RouteRender): void {
    this.#renderFunc = render;
  }

  get render() {
    return (measures: RequestMeasure[]) => {
      return this.#renderFunc(this, measures);
    };
  }
}

export type RouteRender = (
  request: RouteRequest,
  measures: RequestMeasure[],
) => Promise<Response | void>;

const DEFAULT_RENDER = async (
  _request: RouteRequest,
  _measures: RequestMeasure[],
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
