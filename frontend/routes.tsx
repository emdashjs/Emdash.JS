/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { h } from "../deps.ts";
import { RouteAdd } from "../backend/server/Router.ts";
import { Renderer } from "../backend/Renderer.ts";
import { App } from "./ui/App.tsx";

const renderer = new Renderer();
export const routes: RouteAdd<`/${string}`, string>[] = [
  {
    pattern: "GET:/",
    render: (request) => {
      request.timing.start("Render");
      return renderer.html(<App>Hello, world!</App>);
    },
  },
];
