import { Application, Router } from "https://deno.land/x/oak@v12.6.0/mod.ts";
import { ServerTiming } from "./backend/server/ServerTiming.ts";
import { MemoryCache } from "./backend/server/Cache.ts";

class FakeConn implements Deno.Conn {
  static rid = 0;
  localAddr: Deno.Addr;
  remoteAddr: Deno.Addr;
  rid: number;
  constructor(
    remoteAddr: Deno.NetAddr,
    localAddr?: Omit<Deno.NetAddr, "transport"> & {
      transport?: Deno.NetAddr["transport"];
    },
  ) {
    this.remoteAddr = remoteAddr;
    this.localAddr = {
      hostname: "127.0.0.1",
      port: 8000,
      ...localAddr,
      transport: localAddr?.transport ?? "tcp",
    };
    this.rid = FakeConn.rid++;
  }
  closeWrite(): Promise<void> {
    throw new Error("Method not implemented in class FakeConn.");
  }
  ref(): void {
    throw new Error("Method not implemented in class FakeConn.");
  }
  unref(): void {
    throw new Error("Method not implemented in class FakeConn.");
  }
  get readable(): ReadableStream<Uint8Array> {
    throw new Error("Property not implemented in class FakeConn.");
  }
  get writable(): WritableStream<Uint8Array> {
    throw new Error("Property not implemented in class FakeConn.");
  }
  read(_p: Uint8Array): Promise<number | null> {
    throw new Error("Method not implemented in class FakeConn.");
  }
  write(_p: Uint8Array): Promise<number> {
    throw new Error("Method not implemented in class FakeConn.");
  }
  close(): void {
    throw new Error("Method not implemented in class FakeConn.");
  }
}

class MainRouter extends Router {
  merge(routers: Router[] | Router) {
    routers = Array.isArray(routers) ? routers : [routers];
    for (const router of routers) {
      for (const route of router.values()) {
        this.add(
          route.methods,
          route.name!,
          route.path,
          ...route.middleware,
        );
      }
    }
  }
}

const app = new Application();
const cache = new MemoryCache();
const router = new Router();

router.prefix("/jinx");
router.use(async (context, next) => {
  // deno-lint-ignore no-explicit-any
  const { request } = context.request.originalRequest as any;
  const timing = ServerTiming.get(request);
  const cacheMeasure = timing.start("Cache");
  const cached = await cache.match(request);
  if (cached) {
    const response = cached.clone();
    context.response.body = response.body;
    context.response.headers = response.headers;
    context.response.status = response.status;
    cacheMeasure.finish();
  } else {
    cacheMeasure.finish();
    await next();
    const response = await context.response.toDomResponse();
    await cache.put(request, response.clone());
  }
});
router.get("/", (context) => {
  context.response.body = "Hello world!";
});
router.get("/:name", async (context) => {
  await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
  context.response.body = `Hello world, ${context.params.name}!`;
});

const main = new MainRouter();

main.merge(router);

app.use(main.routes());
app.use(main.allowedMethods());

Deno.serve((request, info) => {
  const timing = ServerTiming.get(request);
  timing.start("CPU");
  return app.handle(request, new FakeConn(info.remoteAddr))
    .then((response) => {
      response = response ?? new Response(null, { status: 500 });
      response.headers.set("Server-Timing", timing.toString());
      return response;
    });
});
