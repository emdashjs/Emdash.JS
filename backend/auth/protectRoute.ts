import { Renderer, RouteRender } from "../server/mod.ts";
import { APP_DATA, ERROR, HTTP_CODE } from "../constants.ts";
import { Session } from "./Session.ts";
import { User } from "./User.ts";

export function protectRoute(routeRender: RouteRender): RouteRender {
  return async (request, renderer) => {
    if (!(APP_DATA.FIRST_USER && await User.count() === 0)) {
      const clone = request.clone();
      const sessionId = clone.cookies.get("session");
      const auth = getUserAuth(clone.headers.get("Authorization"));
      const email = auth.email ?? clone.cookies.get("email");
      const user = await User.get(email ?? "@");

      if (user.internal.state === "enabled") {
        if (sessionId) {
          const session = new Session(user);
          try {
            await session.authenticate(sessionId);
          } catch (error) {
            // Skip NOT_AUTHENTICATED to try a password authentication.
            if (error?.message !== ERROR.AUTH.NOT_AUTHENTICATED) {
              return unauthorizedResponse(renderer, error);
            }
          }
        }
        if (email && auth.password) {
          try {
            await user.authenticate(auth.password);
          } catch (error) {
            return unauthorizedResponse(renderer, error);
          }
        } else {
          return unauthorizedResponse(renderer);
        }
      } else {
        return forbiddenResponse(renderer);
      }
    }
    return await routeRender(request, renderer);
  };
}

function forbiddenResponse(renderer: Renderer) {
  return renderer.json(
    { error: ERROR.AUTH.FORBIDDEN },
    { status: HTTP_CODE.AUTH.FORBIDDEN },
  );
}

function getUserAuth(
  raw?: string | null,
): { email?: string; password?: string } {
  if (raw) {
    const base64 = raw.slice(5).trim();
    const decoded = atob(base64);
    const [email, ...passwordParts] = decoded.split(":");
    const password = passwordParts.join(":");
    if (email && password) {
      return { email, password };
    }
  }
  return {};
}

// deno-lint-ignore no-explicit-any
function unauthorizedResponse(renderer: Renderer, error?: any): Response {
  if (!error || error?.message === ERROR.AUTH.NOT_AUTHENTICATED) {
    const response = renderer.json(
      { error: ERROR.AUTH.NOT_AUTHENTICATED },
      { status: HTTP_CODE.AUTH.NOT_AUTHENTICATED },
    );
    response.headers.set(
      "WWW-Authenticate",
      'Basic realm="User Visible Realm", charset="UTF-8"',
    );
    return response;
  }
  return renderer.json(
    { error: error?.message ? `${error?.message}` : ERROR.SERVER.INTERNAL },
    { status: HTTP_CODE.SERVER.INTERNAL },
  );
}
