import { ContextState, MainRouter } from "../backend/server/mod.ts";
import { apiRouter } from "./api/routes.ts";
import { uiRouter } from "./ui/routes.tsx";

export const router = new MainRouter<ContextState>();

router.merge([
  uiRouter,
  apiRouter,
]);
