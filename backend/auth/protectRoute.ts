import { AUTH_ERROR } from "../constants.ts";
import { RouteRender } from "../server/RouteRequest.ts";
import { Session } from "./Session.ts";
import { User } from "./User.ts";

export function protectRoute(routeRender: RouteRender): RouteRender {
  return async (request, renderer) => {
    // deno-lint-ignore no-explicit-any
    function unauthorizedResponse(error?: any): Response {
      if (!error || error?.message === AUTH_ERROR.NOT_AUTHENTICATED) {
        const response = renderer.json(
          { error: AUTH_ERROR.NOT_AUTHENTICATED },
          { status: 401 },
        );
        response.headers.set(
          "WWW-Authenticate",
          'Basic realm="User Visible Realm", charset="UTF-8"',
        );
        return response;
      }
      return renderer.json({ error: `${error?.message}` }, { status: 500 });
    }
    const clone = request.clone();
    const sessionUuid = clone.cookies.get("session");
    const sessionEmail = clone.cookies.get("email");
    if (sessionUuid && sessionEmail) {
      const user = await User.get(sessionEmail);
      if (user.internal.state === "enabled") {
        const session = new Session(user);
        try {
          await session.authenticate(sessionUuid);
        } catch (error) {
          return unauthorizedResponse(error);
        }
      } else {
        return renderer.json({ error: AUTH_ERROR.FORBIDDEN }, { status: 403 });
      }
    } else {
      const authorization = clone.headers.get("Authorization");
      if (authorization) {
        const base64 = authorization.slice(5).trim();
        const decoded = atob(base64);
        const [email, ...passwordParts] = decoded.split(":");
        const password = passwordParts.join(":");
        if (email && password) {
          const user = await User.get(email);
          if (user.internal.state === "enabled") {
            try {
              await user.authenticate(password);
            } catch (error) {
              return unauthorizedResponse(error);
            }
          } else {
            return renderer.json({ error: AUTH_ERROR.FORBIDDEN }, {
              status: 403,
            });
          }
        }
      } else {
        return unauthorizedResponse();
      }
    }
    return await routeRender(request, renderer);
  };
}
