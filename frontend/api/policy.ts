import { PasswordPolicy } from "../../backend/auth/mod.ts";
import { APP_DATA } from "../../backend/constants.ts";
import { Renderer } from "../../backend/server/mod.ts";
import { Context } from "../../deps.ts";

export function getPolicyPassword(context: Context) {
  const render = new Renderer(context);
  render.json(new PasswordPolicy(APP_DATA.PASSWORD_RULES));
}
