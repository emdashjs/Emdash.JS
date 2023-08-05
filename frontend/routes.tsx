/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { h } from "../deps.ts";
import { RouteAdd } from "../backend/server/Route.ts";
import { App } from "./ui/App.tsx";
import { apiRoutes } from "./api/routes.ts";

export const routes: RouteAdd<`/${string}`, string>[] = [
  {
    pattern: "GET:/",
    render: (request) => {
      request.timing.start("Render");
      return request.respondWith.html(<App>Hello, world!</App>);
    },
  },
  {
    pattern: "GET:/login",
    render: (request) => {
      request.timing.start("Render");
      return request.respondWith.html(() => (
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
    },
  },
  ...apiRoutes,
];
