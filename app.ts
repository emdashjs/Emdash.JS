import { Server } from "./backend/server/Server.ts";
import { router } from "./frontend/routes.ts";

const server = new Server();

server
  .noCache("/api")
  .add(router)
  .serve();
