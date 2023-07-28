import { CookieMap } from "../../deps.ts";
import { Session } from "../auth/mod.ts";
import { Renderer } from "./Renderer.ts";
import { ServerTiming } from "./ServerTiming.ts";

export class RouteRequest implements Body {
  native: Request;
  routeParams = new URLSearchParams();
  url: RouteURL;
  useCache: boolean;
  session?: Session;
  #info: Deno.ServeHandlerInfo;
  #renderFunc: RouteRender;
  #cookieMap: CookieMap;
  #renderer: Renderer;

  constructor(
    request: Request,
    { info, renderer }: {
      info: Deno.ServeHandlerInfo;
      renderer: Renderer;
    },
  ) {
    this.native = request;
    this.#info = info;
    this.url = new RouteURL(request.url, { method: request.method });
    this.#renderFunc = DEFAULT_RENDER;
    this.useCache = true;
    this.#cookieMap = new CookieMap(request);
    this.#renderer = renderer;
    this.session = Session.fromCookie(this.#cookieMap);
  }

  get cookies() {
    return this.#cookieMap;
  }

  get body() {
    return this.native.body;
  }

  get bodyUsed() {
    return this.native.bodyUsed;
  }

  get arrayBuffer() {
    return () => this.native.arrayBuffer();
  }

  get blob() {
    return () => this.native.blob();
  }

  get formData() {
    return () => this.native.formData();
  }

  get json() {
    return () => this.native.json();
  }

  get text() {
    return () => this.native.text();
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
    return () => this.#renderFunc(this);
  }

  get searchParams() {
    return this.url.searchParams;
  }

  get timing(): ServerTiming {
    return ServerTiming.get(this.native);
  }

  get respondWith(): Renderer {
    return this.#renderer;
  }

  setRender(render: RouteRender): void {
    this.#renderFunc = render;
  }

  clone(): RouteRequest {
    const clone = this.native.clone();
    Object.defineProperty(clone, "url", {
      configurable: true,
      enumerable: true,
      get: () => {
        return this.native.url;
      },
    });
    const request = new RouteRequest(clone, {
      info: this.#info,
      renderer: this.#renderer,
    });
    request.setRender(this.#renderFunc);
    return request;
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

export const DEFAULT_RENDER = async (_request: RouteRequest) => {};

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
