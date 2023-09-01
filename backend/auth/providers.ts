import { DenoKvOauth } from "../../deps.ts";
import { APP_DATA } from "../constants.ts";
import type { PasswordAlgorithm, SecurityLevel } from "./PasswordAes.ts";

export type AuthConfig = {
  type: ThirdPartyProvider;
  clientId: string;
  clientSecret: string;
  authorizationEndpointUri?: string;
  tokenUri?: string;
} | {
  type: "internal";
  level: SecurityLevel;
  algorithm: PasswordAlgorithm;
};

type IsOpenId = typeof IsOpenId[number];
const IsOpenId = [
  "auth0",
  "dropbox",
  "gitlab",
  "google",
  "okta",
  "slack",
] as const;
type NotOpenId = typeof NotOpenId[number];
const NotOpenId = [
  "discord",
  "facebook",
  "github",
  "patreon",
  "spotify",
  "twitter",
] as const;
export type ThirdPartyProvider = IsOpenId | NotOpenId;
export const ThirdPartyProvider = [
  ...IsOpenId,
  ...NotOpenId,
] as const;
export type SupportedProvider = "internal" | ThirdPartyProvider;
export const SupportedProvider = [
  "internal",
  ...ThirdPartyProvider,
] as const;

export function createOauth2Client(origin: string): ProviderClient | undefined {
  const config = APP_DATA.authConfig();
  const provider = config.type;
  if (config.type !== "internal") {
    switch (provider) {
      case "auth0": {
        const oauth2 = createOauth2Config(origin, provider, config);
        return {
          provider,
          client: DenoKvOauth.createAuth0OAuth2Client(oauth2),
        };
      }
      case "discord": {
        const oauth2 = createOauth2Config(origin, provider, config);
        return {
          provider,
          client: DenoKvOauth.createDiscordOAuth2Client(oauth2),
        };
      }
      case "dropbox": {
        const oauth2 = createOauth2Config(origin, provider, config);
        return {
          provider,
          client: DenoKvOauth.createDropboxOAuth2Client(oauth2),
        };
      }
      case "facebook": {
        const oauth2 = createOauth2Config(origin, provider, config);
        return {
          provider,
          client: DenoKvOauth.createFacebookOAuth2Client(oauth2),
        };
      }
      case "github": {
        const oauth2 = createOauth2Config(origin, provider, config);
        return {
          provider,
          client: DenoKvOauth.createGitHubOAuth2Client(oauth2),
        };
      }
      case "gitlab": {
        const oauth2 = createOauth2Config(origin, provider, config);
        return {
          provider,
          client: DenoKvOauth.createGitLabOAuth2Client(oauth2),
        };
      }
      case "google": {
        const oauth2 = createOauth2Config(origin, provider, config);
        return {
          provider,
          client: DenoKvOauth.createGoogleOAuth2Client(oauth2),
        };
      }
      case "okta": {
        const oauth2 = createOauth2Config(origin, provider, config);
        return { provider, client: DenoKvOauth.createOktaOAuth2Client(oauth2) };
      }
      case "patreon": {
        const oauth2 = createOauth2Config(origin, provider, config);
        return {
          provider,
          client: DenoKvOauth.createPatreonOAuth2Client(oauth2),
        };
      }
      case "slack": {
        const oauth2 = createOauth2Config(origin, provider, config);
        return {
          provider,
          client: DenoKvOauth.createSlackOAuth2Client(oauth2),
        };
      }
      case "spotify": {
        const oauth2 = createOauth2Config(origin, provider, config);
        return {
          provider,
          client: DenoKvOauth.createSpotifyOAuth2Client(oauth2),
        };
      }
      case "twitter": {
        const oauth2 = createOauth2Config(origin, provider, config);
        return {
          provider,
          client: DenoKvOauth.createTwitterOAuth2Client(oauth2),
        };
      }
    }
  }
}

export async function handleOauth2Callback(
  { request, oauth2: { client, provider }, redirectUri }: {
    request: Request;
    oauth2: ProviderClient;
    redirectUri?: string;
  },
): Promise<Oauth2Callback> {
  const { accessToken, response, sessionId } = await DenoKvOauth.handleCallback(
    request,
    client,
    redirectUri,
  );
  const user = await getUser(provider, accessToken);
  return {
    user,
    response,
    sessionId,
  };
}

export type Oauth2Callback = {
  user: Oauth2User;
  response: Response;
  sessionId: string;
};

type ProviderClient = {
  provider: ThirdPartyProvider;
  client: Oauth2Client;
};
type Oauth2Client = ReturnType<typeof DenoKvOauth["createAuth0OAuth2Client"]>;
type Oauth2User = {
  email: string | undefined;
};
type Oauth2ConfigBase = {
  authorizationEndpointUri?: string;
  tokenUri?: string;
  redirectUri: string;
};
type Oauth2ConfigScoped = Oauth2ConfigBase & {
  defaults: {
    scope: string[];
  };
};
type Oauth2Config = Oauth2ConfigBase | Oauth2ConfigScoped;

function createOauth2Config(
  origin: string,
  provider: "github",
  // deno-lint-ignore ban-types
  config: {},
): Oauth2ConfigBase;
function createOauth2Config(
  origin: string,
  provider: ThirdPartyProvider,
  // deno-lint-ignore ban-types
  config: {},
): Oauth2ConfigScoped;
function createOauth2Config(
  origin: string,
  provider: ThirdPartyProvider,
  // deno-lint-ignore ban-types
  config: {},
): Oauth2Config {
  const redirectUri = `${origin}/api/user/oauth2/callback`;
  switch (provider) {
    case "discord": {
      return {
        ...config,
        redirectUri,
        defaults: { scope: ["email", "identify"] },
      };
    }
    case "facebook": {
      return {
        ...config,
        redirectUri,
        defaults: { scope: ["email"] },
      };
    }
    case "github": {
      return {
        ...config,
        redirectUri,
      };
    }
    case "patreon": {
      return {
        ...config,
        redirectUri,
        defaults: { scope: ["identity", "identity[email]"] },
      };
    }
    case "slack": {
      return {
        ...config,
        authorizationEndpointUri: "https://slack.com/openid/connect/authorize",
        tokenUri: "https://slack.com/api/openid.connect.token",
        redirectUri,
        defaults: { scope: ["openid", "email", "profile"] },
      };
    }
    case "spotify": {
      return {
        ...config,
        redirectUri,
        defaults: { scope: ["user-read-private", "user-read-email"] },
      };
    }
    case "twitter": {
      return {
        ...config,
        redirectUri,
        defaults: { scope: ["users.read"] },
      };
    }
  }

  return {
    ...config,
    redirectUri,
    defaults: { scope: ["openid", "email", "profile"] },
  };
}

async function getUser(
  provider: ThirdPartyProvider,
  accessToken: string,
): Promise<Oauth2User> {
  const resp = await fetch(getUserEndpoint(provider), {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    await resp.body?.cancel();
    return {
      email: undefined,
    };
  }

  if (provider === "patreon") {
    const json = await resp.json();
    return json?.data?.attributes as (Oauth2User | undefined) ??
      { email: undefined };
  }

  return await resp.json() as Oauth2User;
}

// deno-lint-ignore ban-types
function getUserEndpoint(provider: ThirdPartyProvider | (string & {})): string {
  switch (provider) {
    case "auth0": {
      return `https://${APP_DATA.auth_client_domain}/userinfo`;
    }
    case "discord": {
      return "https://discord.com/api/users/@me";
    }
    case "dropbox": {
      return "https://api.dropboxapi.com/2/openid/userinfo";
    }
    case "facebook": {
      return "https://graph.facebook.com/me?fields=email";
    }
    case "github": {
      return "https://api.github.com/user";
    }
    case "gitlab": {
      return "https://gitlab.com/oauth/userinfo";
    }
    case "google": {
      return "https://openidconnect.googleapis.com/v1/userinfo";
    }
    case "okta": {
      return `https://${APP_DATA.auth_client_domain}/v1/userinfo`;
    }
    case "patreon": {
      return "https://www.patreon.com/api/oauth2/v2/identity?fields[user]=email";
    }
    case "slack": {
      return "https://slack.com/api/openid.connect.userInfo";
    }
    case "spotify": {
      return "https://api.spotify.com/v1/me";
    }
    case "twitter": {
      return "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true";
    }
  }
  return "unsupported";
}
