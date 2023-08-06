import { Server } from "../../backend/server/Server.ts";
import { login } from "./login.ts";
import { getPolicyPassword } from "./policy.ts";
import { getUser, postUser } from "./user.ts";

export const apiRouter = Server.router();
apiRouter.prefix("/api");
apiRouter.post("/login", login);
apiRouter.get("/policy/password", getPolicyPassword);
apiRouter.get("/user/:id?", getUser);
apiRouter.post("/user/:id?", postUser);
