import { createHttpError } from "../../deps.ts";
import { ERROR, HTTP_CODE } from "../../backend/constants.ts";
import { Server } from "../../backend/server/mod.ts";
import { emailId } from "../../backend/models/helpers.ts";
import { APP_DATA } from "../../mod.ts";
import { PasswordAes } from "../../backend/auth/PasswordAes.ts";
import { Author, type User } from "../../backend/models/mod.ts";

export const getUser = Server.middleware(async (context) => {
  await context.state.authorize("throw");
  let id = context.params.id ||
    context.request.url.searchParams.get("id") ||
    undefined;
  if (id) {
    if (id.includes("@")) {
      id = emailId(id);
    }
    const { collections } = context.state;
    const dbTiming = context.state.timing.start("Database");
    const identity = await collections.Identity.get(id);
    const user = await identity?.getUser();
    dbTiming.finish();
    if (user) {
      context.state.timing.start("Render");
      context.state.render.json(user);
      return;
    }
  }
  throw createHttpError(
    HTTP_CODE.RESOURCE.NOT_FOUND,
    `user id ${id} does not exist.`,
  );
});

export const postUser = Server.middleware(async (context) => {
  await context.state.authorize("throw");
  const { collections } = context.state;
  const contentType = context.request.headers.get("content-type")?.trim()
    .toLowerCase();
  const formTypes = [
    "application/x-www-form-urlencoded",
    "multipart/form-data",
  ];
  // deno-lint-ignore no-explicit-any
  let userJson = {} as Record<string, any>;
  if (contentType && formTypes.some((t) => contentType.startsWith(t))) {
    const formData = await context.state.request.formData();
    formData.forEach((rawValue, rawKey) => {
      const key = rawKey;
      if (key !== "collection" && key !== "id") {
        userJson[key] = rawValue;
      }
    });
  } else {
    userJson = await context.state.request.json();
  }
  const emailOrId: string | undefined = context.params.id || userJson.id ||
    userJson.email;
  if (emailOrId) {
    const id = emailOrId.includes("@") ? emailId(emailOrId) : emailOrId;
    const changeType = !context.params.id
      ? "newUser" as const
      : userJson.newPassword
      ? "newPassword" as const
      : "updateUser" as const;
    const dbTiming = context.state.timing.start("Database");
    switch (changeType) {
      case "newUser": {
        const provider = APP_DATA.authConfig().type;
        const allowFirstUser = await context.state.core.allowFirstUser();
        const userType: User["collection"] =
          userJson.userType?.toLowerCase() === "author" || allowFirstUser
            ? "Author"
            : "Reader";
        const identity = collections.Identity.newRecord({
          id,
          userType,
          provider,
          email: userJson.email,
        });
        if (provider === "internal") {
          identity.hash = await PasswordAes.hash(userJson.password);
        }
        const user = userType === "Author"
          ? collections.Author.newRecord({ id })
          : collections.Reader.newRecord({ id });
        for (const field of Author.allowedFields) {
          user[field] = userJson[field];
        }
        await identity.save();
        await user.save();
        context.state.render.json(user);
        return;
      }
      case "newPassword": {
        const identity = await collections.Identity.get(id);
        if (identity) {
          identity.hash = await PasswordAes.hash(userJson.newPassword);
          await identity.save();
          context.state.render.json(await identity.getUser());
          return;
        }
        break;
      }
      case "updateUser": {
        const identity = await collections.Identity.get(id);
        if (identity) {
          const user = await identity.getUser();
          if (user) {
            for (const field of Author.allowedFields) {
              user[field] = userJson[field];
            }
            await user.save();
            context.state.render.json(user);
            return;
          }
        }
        break;
      }
    }
    dbTiming.finish();
  }
  throw createHttpError(
    HTTP_CODE.RESOURCE.NOT_FOUND,
    ERROR.RESOURCE.NOT_FOUND,
  );
});
