export interface ApiConfig {
  port: number;
  appBaseUrl: string;
  repositoryProvider: "memory" | "supabase";
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  discordClientId: string;
  discordClientSecret: string;
  discordRedirectUri: string;
  discordScopes: string[];
}

export function loadApiConfig(): ApiConfig {
  return {
    port: Number(process.env.API_PORT ?? 3001),
    appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
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
