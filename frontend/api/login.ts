import { Session, User } from "../../backend/auth/mod.ts";
import { AUTH_ERROR } from "../../backend/constants.ts";
import { RouteRender } from "../../backend/server/mod.ts";

export const login = async function login(request, renderer) {
  const body = await request.formData();
  const email = body.get("email") as string;
  const password = body.get("password") as string;
  const user = await User.get(email);
  try {
    await user.authenticate(password);
  } catch (error) {
    const serverErrror = renderer.json({ error: `${error?.message}` }, {
      status: error?.message === AUTH_ERROR.NOT_AUTHENTICATED ? 401 : 500,
    });
    serverErrror.headers.set(
      "WWW-Authenticate",
      'Basic realm="User Visible Realm", charset="UTF-8"',
    );
    return serverErrror;
  }
  const session = new Session(user);
  const uuid = await session.getUuid();
  const redirect = `${request.origin}${
    request.url.searchParams.get("landing") ?? ""
  }`;
  const response = Response.redirect(redirect, 302);
  response.headers.set("Cookie", `session=${uuid}; user=${user.id}`);
  return response;
} as RouteRender;
