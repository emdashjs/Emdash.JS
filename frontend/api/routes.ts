import { RouteAdd } from "../../backend/server/mod.ts";
import { login } from "./login.ts";

export const apiRoutes: RouteAdd<`/api/${string}`, string>[] = [
  {
    pattern: "POST:/api/login",
    useCache: false,
    render: login,
  },
  {
    pattern: "GET:/api/user",
    useCache: false,
    render: () => {},
  },
];
