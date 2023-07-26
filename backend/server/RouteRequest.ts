import { Renderer } from "./Renderer.ts";
import { ServerTiming } from "./ServerTiming.ts";

export class RouteRequest implements Body {
  url: RouteURL;
  native: Request;
  params: Record<string, string | string[] | undefined> = {};
  useCache: boolean;
  #info: Deno.ServeHandlerInfo;
  #renderFunc: RouteRender;

  constructor(
    request: Request,
    info: Deno.ServeHandlerInfo,
  ) {
    this.native = request;
    this.#info = info;
    this.url = new RouteURL(request.url, { method: request.method });
    this.#renderFunc = DEFAULT_RENDER;
    this.useCache = true;
  }

  get body() {
    return this.native.body;
  }

  get bodyUsed() {
    return this.native.bodyUsed;
  }

  get arrayBuffer() {
    return this.native.arrayBuffer;
  }

  get blob() {
    return this.native.blob;
  }

  get formData() {
    return this.native.formData;
  }

  get json() {
    return this.native.json;
  }

  get text() {
    return this.native.text;
  }

  get headers(): Headers {
    return this.native.headers;
  }

  get method(): string {
    return this.native.method;
  }

  get origin(): string {
    return this.url.origin;
  }

  get referrer(): string {
    return this.native.referrer;
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
    return (renderer: Renderer) => {
      return this.#renderFunc(this, renderer);
    };
  }

  get timing(): ServerTiming {
    return ServerTiming.get(this.native);
  }

  setRender(render: RouteRender): void {
    this.#renderFunc = render;
  }
}

export type RouteRender = (
  request: RouteRequest,
  renderer: Renderer,
) => Response | void | Promise<Response | void>;

export type RouteRemote = {
  host: string;
  hostname: string;
  port: number;
  transport: "tcp" | "udp";
};

export const DEFAULT_RENDER = async (
  _request: RouteRequest,
  _renderer: Renderer,
) => {};

export class RouteURL extends URL {
  #method: string;
  constructor(
    url: string | URL | RouteURL,
    options?: { base?: string | URL; method?: string },
  ) {
    super(url, options?.base);
    this.#method = options?.method ?? "";
  }
  get method() {
    return this.#method;
  }
}
