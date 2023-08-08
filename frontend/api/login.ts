import { SessionToken, User } from "../../backend/auth/mod.ts";
import { Server } from "../../backend/server/mod.ts";
import { HTTP_CODE } from "../../mod.ts";

export const login = Server.middleware(async (context) => {
  const body = await context.state.request.formData();
  const email = body.get("email") as string;
  const password = body.get("password") as string;
  const user = await User.get(email);
  try {
    await user.authenticate(password);
  } catch (_error) {
    context.response.status = HTTP_CODE.REDIRECT.SEE_OTHER;
    context.response.redirect(
      Server.REDIRECT_BACK,
      `${context.request.url.origin}/login`,
    );
    return;
  }
  const redirect = `${context.request.url.origin}${
    context.request.url.searchParams.get("landing") ?? ""
  }`;
  context.state.session = new SessionToken();
  const token = await context.state.session.createToken(user);
  await context.cookies.set(SessionToken.COOKIE_NAME, token);
  context.response.status = HTTP_CODE.REDIRECT.SEE_OTHER;
  context.response.redirect(redirect);
});

export const logout = Server.middleware(async (context) => {
  await context.state.session?.delete();
  await context.cookies.set(SessionToken.COOKIE_NAME, "");
  context.response.status = HTTP_CODE.REDIRECT.SEE_OTHER;
  context.response.redirect(context.request.url.origin);
});
