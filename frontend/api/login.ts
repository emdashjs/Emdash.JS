import { SessionToken, User } from "../../backend/auth/mod.ts";
import { ERROR, HTTP_CODE } from "../../backend/constants.ts";
import { RouteRender } from "../../backend/server/mod.ts";

export const login = async function login(request) {
  const body = await request.formData();
  const email = body.get("email") as string;
  const password = body.get("password") as string;
  const user = await User.get(email);
  try {
    await user.authenticate(password);
  } catch (error) {
    const serverErrror = request.respondWith.json(
      { error: `${error?.message}` },
      {
        status: error?.message === ERROR.AUTH.NOT_AUTHENTICATED
          ? HTTP_CODE.AUTH.NOT_AUTHENTICATED
          : HTTP_CODE.SERVER.INTERNAL,
      },
    );
    serverErrror.headers.set(
      "WWW-Authenticate",
      'Basic realm="User Visible Realm", charset="UTF-8"',
    );
    return serverErrror;
  }
  const redirect = `${request.origin}${
    request.url.searchParams.get("landing") ?? ""
  }`;
  request.session = new SessionToken();
  await request.session.createToken(user);
  return new Response(null, {
    status: HTTP_CODE.REDIRECT.SEE_OTHER,
    headers: { Location: redirect },
  });
} as RouteRender;
