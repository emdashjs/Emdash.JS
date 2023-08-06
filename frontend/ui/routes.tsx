/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { h } from "../../deps.ts";
import { Renderer } from "../../backend/server/mod.ts";
import { App } from "./App.tsx";
import { Server } from "../../backend/server/Server.ts";

export const uiRouter = Server.router();

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
