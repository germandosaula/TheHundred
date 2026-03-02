import type { IncomingMessage } from "node:http";
import type { ApiServices } from "./services.ts";
import { json, parseBody, redirect, type ResponsePayload } from "./http.ts";
import type { AuthServices } from "./auth.ts";
import { createRequestContext, requireAuthenticatedUser } from "./request-context.ts";
import {
  requireCreateCtaPayload,
  requireMemberStatusPayload,
  requireRegisterPayload,
  requireSaveCompPayload,
  type CreateCtaPayload,
  type RegisterPayload,
  type SaveCompPayload,
  type UpdateMemberStatusPayload
} from "./validation.ts";

export async function routeRequest(
  request: IncomingMessage,
  services: ApiServices,
  auth: AuthServices,
  options: { appBaseUrl: string; cookieDomain?: string; secureCookies: boolean }
): Promise<ResponsePayload> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const method = request.method ?? "GET";
  const context = await createRequestContext(request, auth);

  if (method === "GET" && url.pathname === "/health") {
    return json(await services.getHealth());
  }

  if (method === "GET" && url.pathname === "/auth/discord/start") {
    return json({ authorizationUrl: auth.getAuthorizationUrl(url.searchParams.get("state") ?? undefined) });
  }

  if (method === "GET" && url.pathname === "/auth/discord/callback") {
    const code = url.searchParams.get("code");
    if (!code) {
      return json({ error: "code is required" }, 400);
    }

    const result = await auth.handleDiscordCallback(code);
    const callbackUrl = new URL("/auth/discord/callback", options.appBaseUrl);
    callbackUrl.searchParams.set("session_token", result.sessionToken);
    callbackUrl.searchParams.set("discord_id", result.discordUser.id);
    callbackUrl.searchParams.set(
      "discord_name",
      result.discordUser.global_name ?? result.discordUser.username
    );
    callbackUrl.searchParams.set("linked", result.linkedUser ? "1" : "0");
    if (result.linkedUser) {
      callbackUrl.searchParams.set("role", result.linkedUser.role);
      callbackUrl.searchParams.set("display_name", result.linkedUser.displayName);
    }
    if (result.discordUser.avatarUrl) {
      callbackUrl.searchParams.set("avatar_url", result.discordUser.avatarUrl);
    }

    if (url.searchParams.get("redirect") !== "0") {
      const sessionCookie = createCookie("th_session", result.sessionToken, {
        maxAge: 43200,
        domain: options.cookieDomain,
        secure: options.secureCookies
      });
      const discordIdCookie = createCookie("th_discord_id", result.discordUser.id, {
        maxAge: 2592000,
        domain: options.cookieDomain,
        secure: options.secureCookies
      });
      return redirect(callbackUrl.toString(), {
        cookies: [sessionCookie, discordIdCookie]
      });
    }

    return json(result);
  }

  if (method === "GET" && url.pathname === "/public/slots") {
    return json(await services.getOpenSlots());
  }

  if (method === "GET" && url.pathname === "/me") {
    return json(requireAuthenticatedUser(context.currentUser));
  }

  if (method === "POST" && url.pathname === "/register") {
    const payload = requireRegisterPayload(await parseBody<RegisterPayload>(request));
    const result = await services.registerMember(payload);
    return json(result, 201);
  }

  if (method === "GET" && url.pathname === "/ctas") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.listCtas());
  }

  if (method === "GET" && url.pathname === "/members") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.listMembers(currentUser));
  }

  if (method === "GET" && url.pathname === "/ranking") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.getRanking());
  }

  if (method === "GET" && url.pathname === "/comps") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.listComps());
  }

  if (method === "GET" && url.pathname === "/comps/assignable-players") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.listAssignableCompPlayers(currentUser));
  }

  if (method === "POST" && url.pathname === "/ctas") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const payload = requireCreateCtaPayload(await parseBody<CreateCtaPayload>(request));
    return json(await services.createCta(currentUser, payload.title, payload.datetimeUtc), 201);
  }

  if (method === "POST" && url.pathname.match(/^\/ctas\/[^/]+\/finalize$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const ctaId = url.pathname.split("/")[2];
    return json(await services.finalizeCta(currentUser, ctaId));
  }

  if (method === "POST" && url.pathname.match(/^\/members\/[^/]+\/status$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const memberId = url.pathname.split("/")[2];
    const payload = requireMemberStatusPayload(
      await parseBody<UpdateMemberStatusPayload>(request)
    );
    return json(await services.updateMemberStatus(currentUser, memberId, payload.status));
  }

  if (method === "POST" && url.pathname.match(/^\/regear\/[^/]+\/approve$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const regearId = url.pathname.split("/")[2];
    return json(await services.approveRegear(currentUser, regearId));
  }

  if (method === "POST" && url.pathname === "/comps") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const payload = requireSaveCompPayload(await parseBody<SaveCompPayload>(request));
    return json(
      await services.saveComp(currentUser, {
        id: payload.id,
        name: payload.name,
        createdBy: currentUser.id,
        parties: payload.parties.map((party) => ({
          ...party,
          slots: party.slots.map((slot) => ({
            ...slot,
            playerUserId: slot.playerUserId,
            playerName: slot.playerName ?? "",
            notes: slot.notes ?? ""
          }))
        }))
      }),
      201
    );
  }

  if (method === "DELETE" && url.pathname.match(/^\/comps\/[^/]+$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const compId = url.pathname.split("/")[2];
    return json(await services.deleteComp(currentUser, compId));
  }

  return json({ error: "Not found" }, 404);
}

function createCookie(
  name: string,
  value: string,
  options: { maxAge: number; domain?: string; secure: boolean }
): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${options.maxAge}`
  ];

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}
