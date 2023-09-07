/** @jsx h */
import { h, Helmet, RouteParams, RouterContext } from "../deps.ts";
import { ContextState } from "../backend/server/mod.ts";
import { App } from "./components/App.tsx";

// deno-lint-ignore no-explicit-any
export const HelmetAny = Helmet as any;

export function html(
  middleware: (
    context: RouterContext<string, RouteParams<string>, ContextState>,
    next: () => Promise<unknown>,
    // deno-lint-ignore no-explicit-any
  ) => any,
  protect?: boolean,
) {
  return async (
    context: RouterContext<string, RouteParams<string>, ContextState>,
    next: () => Promise<unknown>,
  ): Promise<void> => {
    if (protect) {
      await context.state.authorize("throw");
    }
    const Result = await middleware(context, next);
    if (Result) {
      const renderTime = context.state.timing.start("Render");
      context.state.render.html(() => (
        <App>
          <Result />
        </App>
      ));
      renderTime.finish();
    }
  };
}
