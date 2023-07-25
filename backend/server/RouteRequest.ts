import { ServerTiming } from "./ServerTiming.ts";

export class RouteRequest {
  url: RouteURL;
  original: Request;
  params: Record<string, string | string[] | undefined> = {};
  #info: Deno.ServeHandlerInfo;
  #renderFunc: RouteRender;

  constructor(
    request: Request,
    info: Deno.ServeHandlerInfo,
  ) {
    this.original = request;
    this.#info = info;
    this.url = new RouteURL(request.url, { method: request.method });
    this.#renderFunc = DEFAULT_RENDER;
  }

  get headers(): Headers {
    return this.original.headers;
  }

  get method(): string {
    return this.original.method;
  }

  get origin(): string {
    return this.url.origin;
  }

  get referrer(): string {
    return this.original.referrer;
  }

  get remote(): RouteRemote {
    return {
      host: `${this.#info.remoteAddr.hostname}:${this.#info.remoteAddr.port}`,
      hostname: this.#info.remoteAddr.hostname,
      port: this.#info.remoteAddr.port,
      transport: this.#info.remoteAddr.transport,
    };
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

export type RouteRender = (
  request: RouteRequest,
) => Response | void | Promise<Response | void>;
export type RouteRemote = {
  host: string;
  hostname: string;
  port: number;
  transport: "tcp" | "udp";
};

export const DEFAULT_RENDER = async (
  _request: RouteRequest,
): Promise<Response | void> => {};

export class RouteURL extends URL {
  method: string;
  constructor(
    url: string | URL | RouteURL,
    options?: { base?: string | URL; method?: string },
  ) {
    super(url, options?.base);
    this.method = options?.method ?? "";
  }
}
