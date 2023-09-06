import { Base64, Context, createHttpError } from "../../deps.ts";
import { Renderer } from "./Renderer.ts";
import { ServerTiming } from "./ServerTiming.ts";
import { APP_DATA, ERROR, HTTP_CODE } from "../constants.ts";
import type { EmdashJs } from "../EmdashJs.ts";
import type { Session, Token, User } from "../models/mod.ts";
import {
  getSessionCookieName,
  OAuthProvider,
  PasswordAes,
} from "../auth/mod.ts";
import { emailId, getUser } from "../models/helpers.ts";

export class ContextState {
  #context: Context<ContextState>;
  core: EmdashJs;
  auth: Auth;
  session?: Session;
  user?: User;
  request: Request;
  render: Renderer;
  timing: ServerTiming;

  // deno-lint-ignore no-explicit-any
  constructor(context: Context<any>, core: EmdashJs) {
    this.#context = context;
    this.core = core;
    this.request = getRequest(this.#context);
    this.timing = ServerTiming.get(this.request);
    this.auth = getAuth(this.#context.request.headers.get("Authorization"));
    this.request = getRequest(this.#context);
    this.render = new Renderer(this.#context);
  }

  get collections() {
    return this.db.collections;
  }

  get db() {
    return this.core.database;
  }

  async init() {
    this.session = await getSession(this.#context, this.core);
    this.user = await getUserFrom(this.auth, this.session);
    return this;
  }

  async authorize(throwError?: boolean | "throw"): Promise<boolean> {
    const identities = this.core.database.getCollection("Identity");
    const skipAuth = this.core.appData.first_user &&
      await identities.count() === 0;
    if (skipAuth) {
      return true;
    } else {
      const identity = this.session
        ? await this.session.getIdentity()
        : this.user
        ? await await identities.get(this.user.id)
        : undefined;
      if (identity?.enabled) {
        switch (this.auth.type) {
          case "Basic": {
            // Perform full authentication, fail if user is not internal
            // Basic authentication is only supported for internal users
            if (identity.provider === "internal") {
              // Authenticate
              if (
                await PasswordAes.verify(this.auth.password, identity.hash!)
              ) {
                return true;
              }
            }
            break;
          }
          case "Bearer": {
            // TODO: api tokens; error for now.
            // Unauthorized
            break;
          }
          case "Session": {
            if (this.session) {
              if (
                APP_DATA.authConfig().type === "internal" &&
                this.session.verify(identity)
              ) {
                return true;
              } else {
                const { origin } = this.#context.request.url;
                const provider = await new OAuthProvider(origin).init();
                const token = await provider.getSessionAccessToken(
                  this.session.id,
                );
                if (
                  token !== null && token !== undefined &&
                  token.trim() !== ""
                ) {
                  return true;
                }
              }
            }
            break;
          }
        }
      }
    }
    if (throwError) {
      throw handleAuthError();
    }
    return false;
  }

  static create(core: EmdashJs) {
    return async (context: Context, next: () => Promise<unknown>) => {
      context.state = await new ContextState(context, core).init();
      await next();
    };
  }
}

export type Auth = BasicAuth | BearerAuth | SessionAuth;
/** Future implementation */
export type BearerAuth = {
  type: "Bearer";
  token: string;
  bearer?: Token;
};
export type BasicAuth = {
  type: "Basic";
  email: string;
  password: string;
};
export type SessionAuth = {
  type: "Session";
};

const decoder = new TextDecoder();

function getAuth(raw?: string | null): Auth {
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
      // TODO: Long-lived api tokens
      const token = raw.slice(6).trim();
      return {
        type: "Bearer",
        token,
        bearer: undefined,
      };
    }
  }
  return { type: "Session" };
}

function getRequest(context: Context): Request {
  // deno-lint-ignore no-explicit-any
  const { request } = context.request.originalRequest as any;
  return request;
}

async function getSession(context: Context, core: EmdashJs) {
  const cookieName = await getSessionCookieName(context.request.url.href);
  const sessionId = await context.cookies.get(cookieName);
  if (sessionId) {
    const col = core.database.getCollection("Session");
    return await col.get(sessionId) ?? undefined;
  }
}

async function getUserFrom(auth: Auth, session?: Session) {
  if (auth.type === "Session") {
    return await session?.getUser();
  } else {
    const userId = auth.type === "Bearer"
      ? auth.bearer?.userId
      : emailId(auth.email);
    if (userId) {
      return await getUser(userId);
    }
  }
}

// deno-lint-ignore no-explicit-any
function handleAuthError(error?: any) {
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
