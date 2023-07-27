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
    render: (request, renderer) => {
      request.timing.start("Render");
      return renderer.html(<App>Hello, world!</App>);
    },
  },
  ...apiRoutes,
];
