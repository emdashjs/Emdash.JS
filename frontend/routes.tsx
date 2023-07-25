/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { RouteAdd } from "../backend/server/Router.ts";
import { Renderer } from "../backend/Renderer.ts";

const renderer = new Renderer();
export const routes: RouteAdd<`/${string}`, string>[] = [
  {
    pattern: "GET:/",
    render: () => {
      return renderer.html("Hello, world!");
    },
  },
];
