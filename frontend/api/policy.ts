import { PasswordPolicy } from "../../backend/auth/mod.ts";
import { APP_DATA } from "../../backend/constants.ts";
import { RouteRender } from "../../backend/server/mod.ts";

export const getPolicyPassword = function loginPolicy(request) {
  return request.respondWith.json(new PasswordPolicy(APP_DATA.PASSWORD_RULES));
} as RouteRender;
