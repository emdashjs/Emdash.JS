/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { h } from "../deps.ts";
import { RouteAdd } from "../backend/server/Router.ts";
import { App } from "./ui/App.tsx";

export const routes: RouteAdd<`/${string}`, string>[] = [
  {
    pattern: "GET:/",
    render: (request, renderer) => {
      request.timing.start("Render");
      return renderer.html(<App>Hello, world!</App>);
    },
  },
  {
    pattern: "POST:/api/firstUser",
    useCache: false,
    render: async (request, renderer) => {
      const body = await request.original.formData();
      console.log(body.get("email"), body);
      request.timing.start("Render");
      return renderer.json({});
    },
  },
];
