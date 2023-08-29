// deno-lint-ignore-file no-explicit-any
import { DenoKvOauth } from "../../deps.ts";
import { APP_DATA } from "../AppData.ts";

export type ThirdPartyProvider = typeof ThirdPartyProvider[number];
export const ThirdPartyProvider = [
  "auth0",
  "discord",
  "dropbox",
  "facebook",
  "github",
  "gitlab",
  "google",
  "notion",
  "okta",
  "patreon",
  "slack",
  "spotify",
  "twitter",
] as const;
export type SupportedProvider = typeof SupportedProvider[number];
export const SupportedProvider = [
  "internal",
  ...ThirdPartyProvider,
] as const;

export function createOauth2Client() {
  const name = APP_DATA.auth_provider;
  const config = APP_DATA.authConfig;
  if (config.type !== "internal") {
    switch (name) {
      case "auth0": {
        return DenoKvOauth.createAuth0OAuth2Client(config as any);
      }
      case "discord": {
        return DenoKvOauth.createDiscordOAuth2Client(config as any);
      }
      case "dropbox": {
        return DenoKvOauth.createDropboxOAuth2Client(config as any);
      }
      case "facebook": {
        return DenoKvOauth.createFacebookOAuth2Client(config as any);
      }
      case "github": {
        return DenoKvOauth.createGitHubOAuth2Client(config as any);
      }
      case "gitlab": {
        return DenoKvOauth.createGitLabOAuth2Client(config as any);
      }
      case "google": {
        return DenoKvOauth.createGoogleOAuth2Client(config as any);
      }
      case "notion": {
        return DenoKvOauth.createNotionOAuth2Client(config as any);
      }
      case "okta": {
        return DenoKvOauth.createOktaOAuth2Client(config as any);
      }
      case "patreon": {
        return DenoKvOauth.createPatreonOAuth2Client(config as any);
      }
      case "slack": {
        return DenoKvOauth.createSlackOAuth2Client(config as any);
      }
      case "spotify": {
        return DenoKvOauth.createSpotifyOAuth2Client(config as any);
      }
      case "twitter": {
        return DenoKvOauth.createTwitterOAuth2Client(config as any);
      }
    }
  }
  return null;
}
