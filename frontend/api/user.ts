import { createHttpError } from "https://deno.land/std@0.193.0/http/http_errors.ts";
import { User, USER_BUILTIN, UserJson } from "../../backend/auth/mod.ts";
import { ERROR, HTTP_CODE } from "../../backend/constants.ts";
import { Server } from "../../backend/server/mod.ts";

export const getUser = Server.middleware(async (context) => {
  await context.state.authenticate();
  const id = context.params.id || context.request.url.searchParams.get("id") ||
    undefined;
  if (id) {
    const dbTiming = context.state.timing.start("Database");
    const user = await User.get(id);
    dbTiming.finish();
    if (!User.is(user, USER_BUILTIN.NOT_EXIST)) {
      context.state.timing.start("Render");
      context.state.render.json(user);
    }
  }
  throw createHttpError(
    HTTP_CODE.RESOURCE.NOT_FOUND,
    `user id ${id} does not exist.`,
  );
});

export const postUser = Server.middleware(async (context) => {
  await context.state.authenticate();
  // deno-lint-ignore no-explicit-any
  function assignUser(user1: User, user2: any) {
    for (const key of Object.keys(user1)) {
      const value = user2[key];
      if (value !== undefined) {
        // deno-lint-ignore no-explicit-any
        (user1 as any)[key] = value;
      }
    }
  }
  const contentType = context.request.headers.get("content-type")?.trim()
    .toLowerCase();
  const formTypes = [
    "application/x-www-form-urlencoded",
    "multipart/form-data",
  ];
  let userJson = {} as UserJson;
  if (contentType && formTypes.some((t) => contentType.startsWith(t))) {
    const formData = await context.state.request.formData();
    formData.forEach((rawValue, rawKey) => {
      const key = rawKey as Exclude<keyof UserJson, undefined>;
      if (key !== "type" && typeof rawValue === "string") {
        userJson[key] = rawValue;
      }
    });
  } else {
    userJson = await context.state.request.json();
  }
  if (typeof userJson.password === "string") {
    try {
      const user = await User.create(userJson, userJson.password);
      assignUser(user, userJson);
      await user.set();
      // TODO: Redirect on formdata submission? To where?
      context.state.render.json(user);
    } catch (error) {
      throw createHttpError(
        error?.message === ERROR.AUTH.PASSWORD_STRENGTH
          ? HTTP_CODE.AUTH.PASSWORD_STRENGTH
          : HTTP_CODE.SERVER.INTERNAL,
        `${error?.message}`,
      );
    }
  } else {
    const user = await User.get(userJson.email);
    if (User.is(user, USER_BUILTIN.NOT_EXIST)) {
      throw createHttpError(
        HTTP_CODE.RESOURCE.NOT_FOUND,
        ERROR.RESOURCE.NOT_FOUND,
      );
    }
    assignUser(user, userJson);
    await user.set();
    context.state.render.json(user);
  }
});
