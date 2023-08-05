import { Renderer, RouteRender } from "../server/mod.ts";
import { APP_DATA, ERROR, HTTP_CODE } from "../constants.ts";
import { User } from "./User.ts";
import { SessionToken } from "./SessionToken.ts";
import { AccessToken } from "./AccessToken.ts";

export function protectRoute(routeRender: RouteRender): RouteRender {
  return async (request) => {
    if (!(APP_DATA.FIRST_USER && await User.count() === 0)) {
      const clone = request.clone();
      const bearerAuth = getBearerAuth(clone.headers.get("Authorization"));
      const userAuth = getUserAuth(clone.headers.get("Authorization"));
      await request.session?.get();
      const user = await User.get(
        bearerAuth?.record.userId ?? userAuth?.email ??
          request.session?.userId ?? "@",
      );

      if (user.internal.state === "enabled") {
        let authenticated = false;
        if (request.session) {
          try {
            const result = await request.session.authenticate(user);
            authenticated = User.is(result, user);
          } catch (error) {
            // Skip NOT_AUTHENTICATED to try a password authentication.
            if (error?.message !== ERROR.AUTH.NOT_AUTHENTICATED) {
              return unauthorizedResponse(clone.respondWith, { error });
            }
          }
        }
        if (!authenticated && userAuth?.email && userAuth?.password) {
          try {
            await user.authenticate(userAuth.password);
            request.session = new SessionToken();
            await request.session.createToken(user);
            authenticated = true;
          } catch (error) {
            return unauthorizedResponse(clone.respondWith, { error });
          }
        }
        if (!authenticated && bearerAuth) {
          try {
            await bearerAuth.record.authenticate(bearerAuth.token);
            authenticated = true;
          } catch (error) {
            return unauthorizedResponse(clone.respondWith, {
              error,
              hostname: clone.url.hostname,
              bearer: true,
            });
          }
        }
        if (!authenticated) {
          return unauthorizedResponse(clone.respondWith, {
            hostname: clone.url.hostname,
            bearer: bearerAuth !== undefined,
          });
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

function getBearerAuth(raw?: string | null) {
  if (raw && raw.toLowerCase().startsWith("bearer ")) {
    const token = raw.slice(6).trim();
    return {
      token,
      record: AccessToken.fromToken(token),
    };
  }
}

function getUserAuth(raw?: string | null) {
  if (raw && raw.toLowerCase().startsWith("basic ")) {
    const base64 = raw.slice(5).trim();
    const decoded = atob(base64);
    const [email, ...passwordParts] = decoded.split(":");
    const password = passwordParts.join(":");
    if (email && password) {
      return { email, password };
    }
  }
}

function unauthorizedResponse(
  renderer: Renderer,
  { error, hostname, bearer = false }: {
    bearer?: boolean;
    // deno-lint-ignore no-explicit-any
    error?: any;
    hostname?: string;
  },
): Response {
  if (!error || error?.message === ERROR.AUTH.NOT_AUTHENTICATED) {
    const response = renderer.json(
      { error: ERROR.AUTH.NOT_AUTHENTICATED },
      { status: HTTP_CODE.AUTH.NOT_AUTHENTICATED },
    );
    if (bearer) {
      response.headers.set(
        "WWW-Authenticate",
        hostname ? `Bearer realm="${hostname}"` : "Bearer",
      );
    } else {
      response.headers.set(
        "WWW-Authenticate",
        'Basic realm="User Visible Realm", charset="UTF-8"',
      );
    }
    return response;
  }
  return renderer.json(
    { error: error?.message ? `${error?.message}` : ERROR.SERVER.INTERNAL },
    { status: HTTP_CODE.SERVER.INTERNAL },
  );
}
