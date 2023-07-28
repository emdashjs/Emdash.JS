import { Renderer, RouteRender } from "../server/mod.ts";
import { APP_DATA, ERROR, HTTP_CODE } from "../constants.ts";
import { User } from "./User.ts";
import { Session } from "./Session.ts";

export function protectRoute(routeRender: RouteRender): RouteRender {
  return async (request) => {
    if (!(APP_DATA.FIRST_USER && await User.count() === 0)) {
      const clone = request.clone();
      const auth = getUserAuth(clone.headers.get("Authorization"));
      const user = await User.get(auth.email ?? clone.session?.id ?? "@");

      if (user.internal.state === "enabled") {
        let authenticated = false;
        if (request.session) {
          try {
            const result = await request.session.authenticate(
              request.session.token,
            );
            authenticated = User.is(result, user);
          } catch (error) {
            // Skip NOT_AUTHENTICATED to try a password authentication.
            if (error?.message !== ERROR.AUTH.NOT_AUTHENTICATED) {
              return unauthorizedResponse(clone.respondWith, error);
            }
          }
        }
        if (!authenticated && auth.email && auth.password) {
          try {
            await user.authenticate(auth.password);
            request.session = new Session(user);
            await request.session.createToken();
            authenticated = true;
          } catch (error) {
            return unauthorizedResponse(clone.respondWith, error);
          }
        }
        if (!authenticated) {
          return unauthorizedResponse(clone.respondWith);
        }
      } else {
        return forbiddenResponse(clone.respondWith);
      }
    }
    return await routeRender(request);
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
