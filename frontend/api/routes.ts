import { protectRoute } from "../../backend/auth/protectRoute.ts";
import { RouteAdd } from "../../backend/server/mod.ts";
import { login } from "./login.ts";
import { getUser } from "./user.ts";

export const apiRoutes: RouteAdd<`/api/${string}`, string>[] = [
  {
    pattern: "POST:/api/login",
    useCache: false,
    render: login,
  },
  {
    pattern: {
      method: "GET",
      pathname: "/api/user/:id?",
    },
    useCache: false,
    render: protectRoute(getUser),
  },
];
