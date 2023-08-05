import { Router } from "./backend/server/Router.ts";
import { MemoryCache } from "./backend/server/Cache.ts";
import { routes } from "./frontend/routes.tsx";
import { Application } from "./deps.ts";
import { ContextState } from "./backend/server/ContextState.ts";

const cache = new MemoryCache();
const app = new Application({
  contextState: "empty",
  state: {} as ContextState,
});
app.use(ContextState.create);
const router = new Router({ cache });
router.addAll(routes);

Deno.serve(router.respond());
