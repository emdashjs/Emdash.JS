import {
  Application,
  Context,
  REDIRECT_BACK,
  RouteParams,
  Router,
  RouterContext,
} from "../../deps.ts";
import { APP_DATA } from "../AppData.ts";
import { SessionToken } from "../auth/SessionToken.ts";
import { MemoryCache } from "./Cache.ts";
import { ContextState } from "./ContextState.ts";
import { FakeConn } from "./FakeConn.ts";
import { MainRouter } from "./MainRouter.ts";
import { ServerTiming } from "./ServerTiming.ts";

export type ServerOptions = {
  cache?: Cache;
  useCache?: boolean;
  useStatic?: boolean;
} & Deno.ServeOptions;
export class Server {
  cache: Cache;
  app: Application<ContextState>;
  router: MainRouter<ContextState>;
  #options: ServerOptions;
  #routes: Set<Router<ContextState>>;
  #serveOptions: RequiredByKey<Deno.ServeOptions, "hostname" | "port">;
  #noCache: string[];

  constructor(options?: ServerOptions) {
    this.cache = options?.cache ?? new MemoryCache();
    this.router = new MainRouter<ContextState>();
    this.#routes = new Set();
    this.#noCache = [];
    this.app = new Application({
      contextState: "empty",
      state: {} as ContextState,
    });
    this.#options = {
      ...options,
      useCache: typeof options?.cache === "object" ||
        (options?.useCache ?? true),
      useStatic: options?.useStatic ?? true,
    };
    this.#serveOptions = {
      hostname: options?.hostname ?? "127.0.0.1",
      onError: options?.onError,
      onListen: options?.onListen,
      port: options?.port ?? 8000,
      reusePort: options?.reusePort,
      signal: options?.signal,
    };
  }

  #handle = (
    request: Request,
    info: Deno.ServeHandlerInfo,
  ): Promise<Response> => {
    const timing = ServerTiming.get(request);
    timing.start("CPU");
    const conn = new FakeConn(info.remoteAddr, this.#serveOptions);
    return this.app.handle(request, conn)
      .then((response) => {
        response = response ?? new Response(null, { status: 500 });
        response.headers.set("Server-Timing", timing.toString());
        return response;
      });
  };

  #useStatic = async (context: Context<ContextState>) => {
    const { pathname } = context.request.url;
    await context.send({
      root: Server.STATIC_ROOT,
      path: pathname.startsWith("/static") ? pathname.slice(7) : pathname,
    });
  };

  #useCache = async (
    context: Context<ContextState>,
    next: () => Promise<unknown>,
  ) => {
    const cacheMeasure = context.state.timing.start("Cache");
    const cached = await this.cache.match(context.state.request);
    if (cached) {
      const response = cached.clone();
      context.response.body = response.body;
      context.response.headers = response.headers;
      context.response.status = response.status;
      await context.cookies.delete(SessionToken.COOKIE_NAME);
      if (context.state.session) {
        await context.cookies.set(
          SessionToken.COOKIE_NAME,
          context.state.session.token,
        );
      }
      cacheMeasure.finish();
    } else {
      cacheMeasure.finish();
      await next();
      const { pathname } = context.request.url;
      if (!this.#noCache.some((p) => pathname.startsWith(p))) {
        const response = await context.response.toDomResponse();
        this.cache.put(context.state.request, response.clone());
      }
    }
  };

  add(...routers: Router<ContextState>[]): this {
    for (const router of routers) {
      this.#routes.add(router);
    }
    return this;
  }

  noCache(...paths: string[]) {
    this.#noCache = [...new Set([...this.#noCache, ...paths])];
    return this;
  }

  serve() {
    if (this.#options.useStatic) {
      this.router.get("/static/(.*)", this.#useStatic);
    }
    this.router.merge([...this.#routes]);
    this.app.use(ContextState.create);
    if (this.#options.useCache) {
      this.app.use(this.#useCache);
    }
    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
    return Deno.serve(this.#serveOptions, this.#handle);
  }

  static REDIRECT_BACK: typeof REDIRECT_BACK = REDIRECT_BACK;
  static STATIC_ROOT = `${Deno.cwd()}${
    APP_DATA.static.startsWith("/") ? APP_DATA.static : `/${APP_DATA.static}`
  }`;

  static middleware(
    middleware: (
      context: RouterContext<string, RouteParams<string>, ContextState>,
      next: () => Promise<unknown>,
    ) => void | Promise<void>,
  ) {
    return middleware;
  }

  static router() {
    return new Router<ContextState>();
  }
}

type RequiredByKey<T, P extends keyof T> =
  & {
    [K in keyof Omit<T, P>]: T[K];
  }
  & {
    [K in keyof Pick<T, P>]-?: T[K];
  };
