import { PasswordPolicy } from "../../backend/auth/mod.ts";
import { APP_DATA } from "../../backend/constants.ts";
import { Server } from "../../backend/server/mod.ts";

export const getPolicyPassword = Server.middleware((context) => {
  context.state.render.json(new PasswordPolicy(APP_DATA.password_rules));
});
