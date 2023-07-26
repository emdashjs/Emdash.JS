import { AUTH_ERROR } from "../constants.ts";
import { RouteRender } from "../server/RouteRequest.ts";
import { Session } from "./Session.ts";
import { User } from "./User.ts";

export function protectRoute(render: RouteRender): RouteRender {
  return async (request, renderer) => {
    // deno-lint-ignore no-explicit-any
    function unauthorizedResponse(error: any): Response {
      return renderer.json({ error: `${error?.message}` }, {
        status: error?.message === AUTH_ERROR.NOT_AUTHENTICATED ? 401 : 500,
      });
    }
    const clone = request.clone();
    const sessionUuid = clone.cookies.get("session");
    const sessionEmail = clone.cookies.get("email");
    if (sessionUuid && sessionEmail) {
      const user = await User.get(sessionEmail);
      const session = new Session(user);
      try {
        await session.authenticate(sessionUuid);
      } catch (error) {
        return unauthorizedResponse(error);
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
          try {
            await user.authenticate(password);
          } catch (error) {
            return unauthorizedResponse(error);
          }
        }
      } else {
        return renderer.json({ error: AUTH_ERROR.NOT_AUTHENTICATED }, {
          status: 401,
        });
      }
    }
    return await render(request, renderer);
  };
}
