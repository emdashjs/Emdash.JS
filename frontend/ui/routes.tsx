/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { h } from "../../deps.ts";
import { App } from "./App.tsx";
import { Server } from "../../backend/server/Server.ts";
import { Login } from "./page/Login.tsx";

export const uiRouter = Server.router();

uiRouter.get("/", (context) => {
  context.state.render.html(<App>Hello, world!</App>);
});

uiRouter.get("/login", (context) => {
  context.state.render.html(() => (
    <App>
      <Login />
    </App>
  ));
});
