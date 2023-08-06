import { ContextState } from "../backend/server/ContextState.ts";
import { MainRouter } from "../backend/server/MainRouter.ts";
import { apiRouter } from "./api/routes.ts";
import { uiRouter } from "./ui/routes.tsx";

export const router = new MainRouter<ContextState>();

router.merge([
  uiRouter,
  apiRouter,
]);
