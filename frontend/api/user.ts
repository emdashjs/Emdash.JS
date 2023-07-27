import { User, USER_BUILTIN, UserJson } from "../../backend/auth/mod.ts";
import { RouteRender } from "../../backend/server/mod.ts";
import { ERROR, HTTP_CODE } from "../../mod.ts";

export const getUser = async function getUser(request) {
  const id = request.routeParams.get("id") || request.searchParams.get("id") ||
    undefined;
  if (id) {
    const dbTiming = request.timing.start("Database");
    const user = await User.get(id);
    dbTiming.finish();
    if (!User.is(user, USER_BUILTIN.NOT_EXIST)) {
      request.timing.start("Render");
      return request.respondWith.json(user);
    }
  }
  return request.respondWith.json(
    { error: `user id ${id} does not exist.` },
    { status: HTTP_CODE.RESOURCE.NOT_FOUND },
  );
} as RouteRender;

export const postUser = async function postUser(request) {
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
  const contentType = request.headers.get("content-type")?.trim().toLowerCase();
  const formTypes = [
    "application/x-www-form-urlencoded",
    "multipart/form-data",
  ];
  let userJson = {} as UserJson;
  if (contentType && formTypes.some((t) => contentType.startsWith(t))) {
    const formData = await request.formData();
    formData.forEach((rawValue, rawKey) => {
      const key = rawKey as Exclude<keyof UserJson, undefined>;
      if (key !== "type" && typeof rawValue === "string") {
        userJson[key] = rawValue;
      }
    });
  } else {
    userJson = await request.json();
  }
  if (typeof userJson.password === "string") {
    try {
      const user = await User.create(userJson, userJson.password);
      assignUser(user, userJson);
      await user.set();
      // TODO: Redirect on formdata submission? To where?
      return request.respondWith.json(user);
    } catch (error) {
      const serverErrror = request.respondWith.json({
        error: `${error?.message}`,
      }, {
        status: error?.message === ERROR.AUTH.PASSWORD_STRENGTH
          ? HTTP_CODE.AUTH.PASSWORD_STRENGTH
          : HTTP_CODE.SERVER.INTERNAL,
      });
      return serverErrror;
    }
  } else {
    const user = await User.get(userJson.email);
    if (User.is(user, USER_BUILTIN.NOT_EXIST)) {
      return request.respondWith.json(
        { error: ERROR.RESOURCE.NOT_FOUND },
        { status: HTTP_CODE.RESOURCE.NOT_FOUND },
      );
    }
    assignUser(user, userJson);
    await user.set();
    return request.respondWith.json(user);
  }
} as RouteRender;
