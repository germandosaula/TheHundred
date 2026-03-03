import { createServer } from "node:http";
import { createRepository } from "@thehundred/db";
import { createKillboardClient } from "@thehundred/killboard";
import { createAuthServices } from "./auth.ts";
import { loadApiConfig } from "./config.ts";
import { send, json } from "./http.ts";
import { loadEnvFile } from "./load-env.ts";
import { routeRequest } from "./routes.ts";
import { createApiServices } from "./services.ts";

loadEnvFile();

const config = loadApiConfig();
const repository = createRepository({
  provider: config.repositoryProvider,
  supabaseUrl: config.supabaseUrl,
  supabaseServiceRoleKey: config.supabaseServiceRoleKey
});
const killboard = createKillboardClient({
  baseUrl: config.albionApiBaseUrl,
  source: config.albionBattlesSource
});
const port = config.port;
const services = createApiServices(repository, killboard, {
  repositoryProvider: config.repositoryProvider,
  supabaseConfigured: Boolean(config.supabaseUrl && config.supabaseServiceRoleKey),
  albionBattlesGuildId: config.albionBattlesGuildId,
  albionBattlesGuildName: config.albionBattlesGuildName,
  albionBattlesMinGuildPlayers: config.albionBattlesMinGuildPlayers,
  albionBattlesLimit: config.albionBattlesLimit
});
const auth = createAuthServices(repository, config);

const server = createServer(async (request, response) => {
  try {
    return send(
      response,
      await routeRequest(request, services, auth, {
        appBaseUrl: config.appBaseUrl,
        cookieDomain: config.cookieDomain,
        secureCookies: config.secureCookies
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return send(response, json({ error: message }, 400));
  }
});

server.listen(port, () => {
  console.log(`The Hundred API listening on http://localhost:${port}`);
});
