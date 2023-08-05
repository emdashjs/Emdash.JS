import { SessionToken, User } from "../../backend/auth/mod.ts";
import { ERROR, HTTP_CODE } from "../../backend/constants.ts";
import { Renderer } from "../../backend/server/mod.ts";
import { Context, REDIRECT_BACK } from "../../deps.ts";

export async function login(context: Context) {
  const render = new Renderer(context);
  const request = render.request();
  const body = await request.formData();
  const email = body.get("email") as string;
  const password = body.get("password") as string;
  const user = await User.get(email);
  try {
    await user.authenticate(password);
  } catch (error) {
    render.json(
      { error: `${error?.message}` },
      {
        status: error?.message === ERROR.AUTH.NOT_AUTHENTICATED
          ? HTTP_CODE.AUTH.NOT_AUTHENTICATED
          : HTTP_CODE.SERVER.INTERNAL,
      },
    );
    context.response.headers.set(
      "WWW-Authenticate",
      'Basic realm="User Visible Realm", charset="UTF-8"',
    );
    return;
  }
  if (context.request.url.searchParams.has("landing")) {
    const redirect = `${context.request.url.origin}${
      context.request.url.searchParams.get("landing") ?? ""
    }`;
    context.response.redirect(redirect);
  } else {
    context.response.redirect(REDIRECT_BACK, context.request.url.origin);
  }
  context.state.session = new SessionToken();
  await context.state.session.createToken(user);
}
