/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { h } from "../../../deps.ts";
import { Server } from "../../../backend/server/mod.ts";
import { FirstRun } from "./FirstRun.tsx";
import { Signin } from "./Signin.tsx";
import { html } from "../../helpers.tsx";
import { Profile } from "./Profile.tsx";

export const userRouter = Server.router();

userRouter.prefix("/user");

userRouter.get("/first_run", html(() => <FirstRun />, true));

userRouter.get(
  "/profile",
  html((ctx) => <Profile user={ctx.state.user!} />, true),
);

userRouter.get("/signin", html(() => <Signin />));
