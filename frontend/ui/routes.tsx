/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { h, Router } from "../../deps.ts";
import {
  MemoryCache,
  Renderer,
  ServerTiming,
} from "../../backend/server/mod.ts";
import { App } from "./App.tsx";

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

uiRouter.get("/", (context) => {
  const render = new Renderer(context);
  render.html(<App>Hello, world!</App>);
});

uiRouter.get("/login", (context) => {
  const render = new Renderer(context);
  render.html(() => (
    <App>
      <form action="/api/login?redirect=/" method="post">
        <label for="email">
          Username
        </label>
        <input
          type="text"
          placeholder="email@example.com"
          name="email"
          required
        >
        </input>
        <label for="password">
          Password
        </label>
        <input
          type="password"
          name="password"
          required
        >
        </input>
        <button type="submit">Login</button>
      </form>
    </App>
  ));
});
