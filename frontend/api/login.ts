import { PasswordAes } from "../../backend/auth/mod.ts";
import {
  getSessionCookieName,
  OAuthProvider,
} from "../../backend/auth/providers.ts";
import { emailId } from "../../backend/models/helpers.ts";
import { Server } from "../../backend/server/mod.ts";
import { APP_DATA, HTTP_CODE } from "../../mod.ts";

export const login = Server.middleware(async (context) => {
  const authConfig = APP_DATA.authConfig();
  if (authConfig.type === "internal") {
    const body = await context.state.request.formData();
    const email = body.get("email") as string;
    const password = body.get("password") as string;
    const identityId = emailId(email);
    const { origin, searchParams } = context.request.url;
    const { collections } = context.state;
    const identity = await collections.Identity.get(identityId);
    if (identity) {
      let verified = false;
      try {
        verified = await PasswordAes.verify(password, identity.hash!);
      } catch (_error) { /** Ignore for now. */ }
      if (!verified) {
        context.response.status = HTTP_CODE.REDIRECT.SEE_OTHER;
        context.response.redirect(Server.REDIRECT_BACK, `${origin}/signin`);
        return;
      }
      const redirect = `${origin}${searchParams.get("landing") ?? ""}`;
      (await identity.getSession())?.destroy();
      context.state.session = collections.Session.newRecord({
        complexId: identityId,
      });
      await context.state.session.save();
      identity.sessionId = context.state.session.id;
      await identity.save();
      const cookieName = await getSessionCookieName(origin);
      await context.cookies.set(cookieName, context.state.session.id);
      context.response.status = HTTP_CODE.REDIRECT.SEE_OTHER;
      context.response.redirect(redirect);
    }
  } else {
    const { origin } = context.request.url;
    const { request } = context.state;
    const provider = await new OAuthProvider(origin).init();
    const response = await provider.signIn(request);
    context.response.status = response.status;
    context.response.headers = response.headers;
    context.response.body = response.body;
  }
});

export const logout = Server.middleware(async (context) => {
  const authConfig = APP_DATA.authConfig();
  if (authConfig.type === "internal") {
    context.response.status = HTTP_CODE.REDIRECT.SEE_OTHER;
    context.response.redirect(context.request.url.origin);
  } else {
    const { origin } = context.request.url;
    const { request } = context.state;
    const provider = await new OAuthProvider(origin).init();
    const response = await provider.signOut({ request, redirectUri: origin });
    context.response.status = response.status;
    context.response.headers = response.headers;
    context.response.body = response.body;
  }
  if (context.state.session) {
    const cookieName = await getSessionCookieName(origin);
    const identity = await context.state.session.getIdentity();
    if (identity) {
      identity.sessionId = undefined;
      await identity.save();
    }
    await context.state.session.destroy();
    await context.cookies.set(cookieName, "");
  }
});

export const callback = Server.middleware(async (context) => {
  const authConfig = APP_DATA.authConfig();
  if (authConfig.type === "internal") {
    context.response.status = HTTP_CODE.REDIRECT.SEE_OTHER;
    context.response.redirect(context.request.url.origin);
    return;
  }
  const { origin } = context.request.url;
  const { request } = context.state;
  const provider = await new OAuthProvider(origin).init();
  const {
    response,
    sessionId,
    user,
  } = await provider.callback({ request, redirectUri: origin });
  const { collections } = context.state;
  const id = emailId(user.email!);
  const exists = await collections.Identity.get(id);
  const session = await collections.Session.newRecord({
    id: sessionId,
    complexId: id,
  });

  // TODO: Protect from spurious signups
  if (!exists) {
    const identity = collections.Identity.newRecord({
      id,
      sessionId,
      email: user.email!,
      userType: "Reader",
      provider: provider.provider,
    });
    if (await context.state.core.allowFirstUser()) {
      identity.userType = "Author";
      const author = collections.Author.newRecord({
        id,
        email: user.email!,
        firstName: "",
        lastName: "",
      });
      await author.save();
    } else {
      const reader = collections.Reader.newRecord({
        id,
        email: user.email!,
        firstName: "",
        lastName: "",
      });
      await reader.save();
    }
    await identity.save();
  }

  await session.save();

  context.response.status = response.status;
  context.response.headers = response.headers;
  context.response.body = response.body;
});
