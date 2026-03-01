import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import type { DatabaseRepository } from "@thehundred/db";
import { DomainError, type User } from "@thehundred/domain";
import type { ApiConfig } from "./config.ts";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordIdentity {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
}

export interface AuthServices {
  getAuthorizationUrl(state?: string): string;
  resolveCurrentUser(request: IncomingMessage): Promise<User | null>;
  handleDiscordCallback(code: string): Promise<{
    discordUser: DiscordIdentity & { avatarUrl?: string };
    linkedUser: User | null;
    sessionToken: string;
  }>;
}

interface SessionRecord {
  userId?: string;
  discordId: string;
  expiresAt: number;
}

export function createAuthServices(
  repository: DatabaseRepository,
  config: ApiConfig
): AuthServices {
  const sessions = new Map<string, SessionRecord>();

  return {
    getAuthorizationUrl(state = "dev-state") {
      if (!config.discordClientId) {
        throw new DomainError("DISCORD_CLIENT_ID is not configured");
      }

      const url = new URL("https://discord.com/oauth2/authorize");
      url.searchParams.set("client_id", config.discordClientId);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("redirect_uri", config.discordRedirectUri);
      url.searchParams.set("scope", config.discordScopes.join(" "));
      url.searchParams.set("prompt", "consent");
      url.searchParams.set("state", state);
      return url.toString();
    },

    async resolveCurrentUser(request) {
      const sessionToken = getSessionTokenFromRequest(request);
      if (sessionToken) {
        const session = sessions.get(sessionToken);
        if (session && session.expiresAt > Date.now()) {
          if (session.userId) {
            return repository.getUserById(session.userId);
          }

          const linkedUser = await repository.getUserByDiscordId(session.discordId);
          if (linkedUser) {
            session.userId = linkedUser.id;
            return linkedUser;
          }
        }
      }

      const cookieDiscordId = getDiscordIdFromRequest(request);
      if (cookieDiscordId) {
        const linkedUser = await repository.getUserByDiscordId(cookieDiscordId);
        if (linkedUser) {
          return linkedUser;
        }
      }

      const userId = request.headers["x-user-id"];
      if (typeof userId === "string" && userId.trim()) {
        return repository.getUserById(userId.trim());
      }

      const discordId = request.headers["x-discord-id"];
      if (typeof discordId === "string" && discordId.trim()) {
        return repository.getUserByDiscordId(discordId.trim());
      }

      return null;
    },

    async handleDiscordCallback(code) {
      if (!config.discordClientId || !config.discordClientSecret) {
        throw new DomainError("Discord OAuth credentials are not fully configured");
      }

      const tokens = await exchangeDiscordCode({
        code,
        clientId: config.discordClientId,
        clientSecret: config.discordClientSecret,
        redirectUri: config.discordRedirectUri
      });
      const discordUser = await fetchDiscordIdentity(tokens.access_token);
      const avatarUrl = getDiscordAvatarUrl(discordUser);
      const linkedUser = await repository.getUserByDiscordId(discordUser.id);
      const sessionToken = randomUUID();

      if (linkedUser) {
        await repository.updateUserAvatar(linkedUser.id, avatarUrl);
      }

      sessions.set(sessionToken, {
        userId: linkedUser?.id,
        discordId: discordUser.id,
        expiresAt: Date.now() + 1000 * 60 * 60 * 12
      });

      return {
        discordUser: {
          ...discordUser,
          avatarUrl
        },
        linkedUser: linkedUser ? { ...linkedUser, avatarUrl } : null,
        sessionToken
      };
    }
  };
}

function getSessionTokenFromRequest(request: IncomingMessage): string | null {
  const headerToken = request.headers["x-session-token"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }

  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  for (const segment of cookieHeader.split(";")) {
    const [rawName, rawValue] = segment.split("=");
    if (rawName?.trim() === "th_session" && rawValue?.trim()) {
      return rawValue.trim();
    }
  }

  return null;
}

function getDiscordIdFromRequest(request: IncomingMessage): string | null {
  const headerDiscordId = request.headers["x-discord-id"];
  if (typeof headerDiscordId === "string" && headerDiscordId.trim()) {
    return headerDiscordId.trim();
  }

  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  for (const segment of cookieHeader.split(";")) {
    const [rawName, rawValue] = segment.split("=");
    if (rawName?.trim() === "th_discord_id" && rawValue?.trim()) {
      return rawValue.trim();
    }
  }

  return null;
}

async function exchangeDiscordCode(args: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<DiscordTokenResponse> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri
  });

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new DomainError(`Discord token exchange failed with status ${response.status}`);
  }

  return (await response.json()) as DiscordTokenResponse;
}

async function fetchDiscordIdentity(accessToken: string): Promise<DiscordIdentity> {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new DomainError(`Discord identity request failed with status ${response.status}`);
  }

  return (await response.json()) as DiscordIdentity;
}

function getDiscordAvatarUrl(user: DiscordIdentity): string | undefined {
  if (!user.avatar) {
    return undefined;
  }

  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}
