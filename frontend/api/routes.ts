import { DEFAULT_POST } from "../../backend/blog/Post.ts";
import { Server } from "../../backend/server/Server.ts";
import { login, logout } from "./login.ts";
import { getPolicyPassword } from "./policy.ts";
import { getUser, postUser } from "./user.ts";

export const apiRouter = Server.router();
apiRouter.prefix("/api");
apiRouter.post("/login", login);
apiRouter.get("/logout", logout);
apiRouter.get("/policy/password", getPolicyPassword);
apiRouter.get("/user/:id?", getUser);
apiRouter.post("/user/:id?", postUser);
apiRouter.get("/post/:id", (context) => {
  if (context.params.id === DEFAULT_POST.id) {
    context.state.render.json(DEFAULT_POST);
  }
});
