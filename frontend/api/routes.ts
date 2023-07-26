import { Session, User } from "../../backend/auth/mod.ts";
import { RouteAdd } from "../../backend/server/mod.ts";
import { AUTH_ERROR } from "../../mod.ts";

export const apiRoutes: RouteAdd<`/api/${string}`, string>[] = [
  {
    pattern: "POST:/api/login",
    render: async (request, renderer) => {
      const body = await request.formData();
      const email = body.get("email") as string;
      const password = body.get("password") as string;
      const user = await User.get(email);
      try {
        await user.authenticate(password);
      } catch (error) {
        const serverErrror = renderer.json({ error: `${error?.message}` }, {
          status: error?.message === AUTH_ERROR.NOT_AUTHENTICATED ? 401 : 500,
        });
        return serverErrror;
      }
      const session = new Session(user);
      const uuid = await session.getUuid();
      const redirect = `${request.origin}${
        request.url.searchParams.get("landing") ?? ""
      }`;
      const response = Response.redirect(redirect, 302);
      response.headers.set("Cookie", `session=${uuid}; user=${user.id}`);
      return response;
    },
  },
  {
    pattern: "GET:/api/user",
    render: () => {},
  },
];
