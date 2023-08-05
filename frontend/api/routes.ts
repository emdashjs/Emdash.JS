import { Router } from "../../deps.ts";
import { login } from "./login.ts";
import { getPolicyPassword } from "./policy.ts";
import { getUser, postUser } from "./user.ts";

const apiRouter = new Router();
apiRouter.prefix("/api");
apiRouter.post("/login", login);
apiRouter.get("/policy/password", getPolicyPassword);
apiRouter.get("/user/:id?", getUser);
apiRouter.post("/user/:id?", postUser);
