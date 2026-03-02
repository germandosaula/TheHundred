export interface ApiConfig {
  port: number;
  appBaseUrl: string;
  cookieDomain?: string;
  secureCookies: boolean;
  repositoryProvider: "memory" | "supabase";
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  discordClientId: string;
  discordClientSecret: string;
  discordRedirectUri: string;
  discordScopes: string[];
}

export function loadApiConfig(): ApiConfig {
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  return {
    port: Number(process.env.PORT ?? process.env.API_PORT ?? 3001),
    appBaseUrl,
    cookieDomain: deriveCookieDomain(appBaseUrl),
    secureCookies: usesHttps(appBaseUrl),
    repositoryProvider: process.env.REPOSITORY_PROVIDER === "supabase" ? "supabase" : "memory",
    supabaseUrl: process.env.SUPABASE_URL ?? "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    discordClientId: process.env.DISCORD_CLIENT_ID ?? "",
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    discordRedirectUri:
      process.env.DISCORD_REDIRECT_URI ?? "http://localhost:3001/auth/discord/callback",
    discordScopes: (process.env.DISCORD_SCOPES ?? "identify guilds")
      .split(" ")
      .map((scope) => scope.trim())
      .filter(Boolean)
  };
}

function deriveCookieDomain(baseUrl: string): string | undefined {
  try {
    const { hostname } = new URL(baseUrl);
    if (hostname === "localhost" || isIpAddress(hostname)) {
      return undefined;
    }

    const segments = hostname.split(".").filter(Boolean);
    if (segments.length < 2) {
      return undefined;
    }

    return `.${segments.slice(-2).join(".")}`;
  } catch {
    return undefined;
  }
}

function usesHttps(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).protocol === "https:";
  } catch {
    return false;
  }
}

function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}
