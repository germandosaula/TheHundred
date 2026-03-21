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
  albionApiBaseUrl: string;
  albionBbApiBaseUrl: string;
  albionBattlesSource: "official" | "albionbb";
  albionBattlesGuildId: string;
  albionBattlesGuildName: string;
  albionBattlesMinGuildPlayers: number;
  albionBattlesLimit: number;
  launchCountdownEnabled: boolean;
  launchAtIso: string;
  discordGuildId: string;
  discordBotToken: string;
  discordCallerRoleIds: string[];
  discordBottledEnergyChannelId: string;
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
      .filter(Boolean),
    albionApiBaseUrl:
      process.env.ALBION_API_BASE_URL ?? "https://gameinfo-ams.albiononline.com/api/gameinfo",
    albionBbApiBaseUrl:
      process.env.ALBION_BB_API_BASE_URL ?? "https://api.albionbb.com/eu",
    albionBattlesSource:
      process.env.ALBION_BATTLES_SOURCE === "albionbb" ? "albionbb" : "official",
    albionBattlesGuildId: process.env.ALBION_BATTLES_GUILD_ID ?? "",
    albionBattlesGuildName: process.env.ALBION_BATTLES_GUILD_NAME ?? "The Hundred",
    albionBattlesMinGuildPlayers: Number(process.env.ALBION_BATTLES_MIN_GUILD_PLAYERS ?? 10),
    albionBattlesLimit: Number(process.env.ALBION_BATTLES_LIMIT ?? 12),
    launchCountdownEnabled: process.env.LAUNCH_COUNTDOWN_ENABLED !== "0",
    launchAtIso: process.env.LAUNCH_AT_ISO ?? "2026-03-23T12:00:00+01:00",
    discordGuildId: process.env.DISCORD_GUILD_ID ?? "",
    discordBotToken: process.env.DISCORD_BOT_TOKEN ?? "",
    discordCallerRoleIds: (process.env.DISCORD_CALLER_ROLE_IDS ?? "1479173827782250596")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    discordBottledEnergyChannelId:
      process.env.DISCORD_BOTTLED_ENERGY_CHANNEL_ID ?? "1480132173305614437"
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
