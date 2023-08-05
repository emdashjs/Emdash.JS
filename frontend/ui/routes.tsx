/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { h, Router } from "../../deps.ts";
import { MemoryCache, ServerTiming } from "../../backend/server/mod.ts";

export const uiRouter = new Router();
const cache = new MemoryCache();

uiRouter.use(async (context, next) => {
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

uiRouter.get("/", (context, next) => {
});
