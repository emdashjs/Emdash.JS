/** @jsx h */
import { h, RouteParams, RouterContext } from "../deps.ts";
import { ContextState } from "../backend/server/mod.ts";
import { App } from "./components/App.tsx";

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
