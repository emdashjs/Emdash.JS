/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { h } from "../../../deps.ts";
import { Server } from "../../../backend/server/mod.ts";
import { App } from "../../components/App.tsx";
import { FirstRun } from "./FirstRun.tsx";
import { Signin } from "./Signin.tsx";

export const userRouter = Server.router();

userRouter.prefix("/user");
userRouter.get("/first_run", async (context) => {
  await context.state.authorize("throw");
  context.state.render.html(() => (
    <App>
      <FirstRun />
    </App>
  ));
});

userRouter.get("/signin", (context) => {
  context.state.render.html(() => (
    <App>
      <Signin />
    </App>
  ));
});
