import { APP_DATA } from "../constants.ts";
import { User } from "./User.ts";
import { Context } from "../../deps.ts";
import { ContextState } from "../server/ContextState.ts";

type Middleware = (
  context: Context<ContextState>,
  next: () => Promise<unknown>,
) => Promise<void> | void;

export function protectRoute<T extends Middleware>(routeRender: T): T {
  return async function protectRoute(context, next) {
    if (!(APP_DATA.FIRST_USER && await User.count() === 0)) {
      await context.state.authenticate();
    }
    await routeRender(context, next);
  } as T;
}
