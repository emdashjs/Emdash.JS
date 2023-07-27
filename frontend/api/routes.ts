import { protectRoute } from "../../backend/auth/mod.ts";
import { Route, RouteAdd } from "../../backend/server/mod.ts";
import { login } from "./login.ts";
import { getPolicyPassword } from "./policy.ts";
import { getUser, postUser } from "./user.ts";

export const apiRoutes: RouteAdd<`/api/${string}`, string>[] = Route.skipCache([
  {
    pattern: "POST:/api/login",
    render: login,
  },
  {
    pattern: "GET:/api/policy/password",
    render: getPolicyPassword,
  },
  {
    pattern: "GET:/api/user/:id?",
    render: protectRoute(getUser),
  },
  {
    pattern: "POST:/api/user/:id?",
    render: protectRoute(postUser),
  },
]);
