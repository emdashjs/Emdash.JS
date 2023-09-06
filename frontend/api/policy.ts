import { PasswordPolicy } from "../../backend/auth/mod.ts";
import { APP_DATA, ERROR, HTTP_CODE } from "../../backend/constants.ts";
import { Server } from "../../backend/server/mod.ts";
import { createHttpError } from "../../deps.ts";

export const getPolicyPassword = Server.middleware((context) => {
  if (APP_DATA.authConfig().type === "internal") {
    context.state.render.json(new PasswordPolicy(APP_DATA.password_rules));
  } else {
    throw createHttpError(
      HTTP_CODE.RESOURCE.NOT_FOUND,
      ERROR.RESOURCE.NOT_FOUND,
    );
  }
});
