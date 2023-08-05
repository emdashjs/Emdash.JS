import { Base64, Context, createHttpError } from "../../deps.ts";
import { Renderer } from "./Renderer.ts";
import { USER_BUILTIN } from "../auth/User.ts";
import { AccessToken, SessionToken, User } from "../auth/mod.ts";
import { ServerTiming } from "./ServerTiming.ts";
import { APP_DATA, ERROR, HTTP_CODE } from "../constants.ts";

export class ContextState {
  #context: Context<ContextState>;
  auth?: Auth;
  session?: SessionToken;
  user?: User;
  request: Request;
  render: Renderer;
  timing: ServerTiming;

  // deno-lint-ignore no-explicit-any
  constructor(context: Context<any>) {
    this.#context = context;
    this.auth = getAuth(this.#context.request.headers.get("Authorization"));
    this.request = getRequest(this.#context);
    this.render = new Renderer(this.#context);
    this.timing = ServerTiming.get(this.request);
  }

  async init() {
    this.session = await getSession(this.#context);
    this.user = await getUser(this.auth);
    return this;
  }

  async authenticate(): Promise<boolean> {
    if (!(APP_DATA.FIRST_USER && await User.count() === 0)) {
      if (this.user && this.user.internal.state !== "disabled") {
        let authenticated = false;
        if (this.session) {
          try {
            const result = await this.session.authenticate(this.user);
            authenticated = User.is(result, this.user);
          } catch (error) {
            // Skip NOT_AUTHENTICATED to try a password authentication.
            if (error?.message !== ERROR.AUTH.NOT_AUTHENTICATED) {
              throw handleAuthError(error);
            }
          }
        }
        if (!authenticated && this.auth?.type === "Basic") {
          try {
            await this.user.authenticate(this.auth.password);
            this.session = new SessionToken();
            await this.session.createToken(this.user);
            authenticated = true;
          } catch (error) {
            throw handleAuthError(error);
          }
        }
        if (!authenticated && this.auth?.type === "Bearer") {
          try {
            await this.auth.bearer.authenticate(this.auth.token);
            authenticated = true;
          } catch (error) {
            throw handleAuthError(error);
          }
        }
        if (!authenticated) {
          throw handleAuthError();
        }
      } else {
        throw createHttpError(
          HTTP_CODE.AUTH.FORBIDDEN,
          ERROR.AUTH.FORBIDDEN,
        );
      }
    }
    return true;
  }

  static async create(context: Context, next: () => Promise<unknown>) {
    context.state = await new ContextState(context).init();
    await next();
  }
}

export type Auth = BasicAuth | BearerAuth;
export type BearerAuth = {
  type: "Bearer";
  token: string;
  bearer: AccessToken;
};
export type BasicAuth = {
  type: "Basic";
  email: string;
  password: string;
};

const decoder = new TextDecoder();

function getAuth(raw?: string | null): Auth | undefined {
  if (raw) {
    if (raw.toLowerCase().startsWith("basic ")) {
      const base64 = raw.slice(5).trim();
      const decoded = decoder.decode(Base64.decode(base64));
      const [email, ...passwordParts] = decoded.split(":");
      const password = passwordParts.join(":");
      if (email && password) {
        return {
          type: "Basic",
          email,
          password,
        };
      }
    }
    if (raw.toLowerCase().startsWith("bearer ")) {
      const token = raw.slice(6).trim();
      return {
        type: "Bearer",
        token,
        bearer: AccessToken.fromToken(token),
      };
    }
  }
}

function getRequest(context: Context): Request {
  // deno-lint-ignore no-explicit-any
  const { request } = context.request.originalRequest as any;
  return request;
}

async function getSession(context: Context) {
  const token = await context.cookies.get(SessionToken.COOKIE_NAME);
  if (token) {
    const session = SessionToken.fromToken(token);
    return session;
  }
}

async function getUser(auth?: Auth) {
  if (auth) {
    const userId = auth.type === "Bearer"
      ? auth.bearer.userId
      : User.id(auth.email);
    const user = await User.get(userId);
    if (!User.is(user, USER_BUILTIN.NOT_EXIST)) {
      return user;
    }
  }
}

// deno-lint-ignore no-explicit-any
function handleAuthError(error?: any) {
  Error.captureStackTrace;
  if (!error || error?.message === ERROR.AUTH.NOT_AUTHENTICATED) {
    return createHttpError(
      HTTP_CODE.AUTH.NOT_AUTHENTICATED,
      ERROR.AUTH.NOT_AUTHENTICATED,
      { cause: error },
    );
  }
  return createHttpError(
    HTTP_CODE.SERVER.INTERNAL,
    ERROR.SERVER.INTERNAL,
    { cause: error },
  );
}
