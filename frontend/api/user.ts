import { User, USER_BUILTIN } from "../../backend/auth/mod.ts";
import { RouteRender } from "../../backend/server/mod.ts";

export const getUser = async function getUser(request, renderer) {
  const id = request.routeParams.get("id") || request.searchParams.get("id") ||
    undefined;
  if (id) {
    const dbTiming = request.timing.start("Database");
    const user = await User.get(id);
    dbTiming.finish();
    if (user !== USER_BUILTIN.NOT_EXIST) {
      request.timing.start("Render");
      return renderer.json(user);
    }
  }
  return renderer.json({ error: `user id ${id} does not exist.` }, {
    status: 404,
  });
} as RouteRender;
