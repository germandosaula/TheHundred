import type { IncomingMessage } from "node:http";
import type { ApiServices } from "./services.ts";
import { json, parseBody, redirect, type ResponsePayload } from "./http.ts";
import type { AuthServices } from "./auth.ts";
import { createRequestContext, requireAuthenticatedUser } from "./request-context.ts";
import {
  requireCreateCtaPayload,
  requireUpdateCtaCompPayload,
  requireCtaFillSignupPayload,
  requireAssignCtaSlotPayload,
  requireMemberAlbionNamePayload,
  requireMemberBombGroupPayload,
  requireKickMemberPayload,
  requireMemberActivityExclusionPayload,
  requireCreateCouncilTaskPayload,
  requireUpdateCouncilTaskPayload,
  requireCouncilTaskStatusPayload,
  requireReplaceOverviewAnnouncementsPayload,
  requireBottledEnergyImportPayload,
  requireMemberStatusPayload,
  requireRegisterPayload,
  requireSaveBuildPayload,
  requireSaveCompPayload,
  type CreateCtaPayload,
  type UpdateCtaCompPayload,
  type RegisterPayload,
  type SaveCompPayload,
  type UpdateMemberBombGroupPayload,
  type UpdateMemberAlbionNamePayload,
  type KickMemberPayload,
  type SaveBuildPayload,
  type UpdateMemberStatusPayload,
  type CreateCouncilTaskPayload,
  type UpdateCouncilTaskPayload,
  type UpdateCouncilTaskStatusPayload,
  type ReplaceOverviewAnnouncementsPayload,
  type CtaFillSignupPayload,
  type BottledEnergyImportPayload,
  type MemberActivityExclusionPayload
} from "./validation.ts";

const defaultDevDiscordId = "173816196720885760";

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
    return json({ authorizationUrl: auth.getAuthorizationUrl() });
  }

  if (method === "GET" && url.pathname === "/auth/dev-login") {
    const isLocalApp = options.appBaseUrl.startsWith("http://localhost:");
    if (!isLocalApp) {
      return json({ error: "Not found" }, 404);
    }

    const discordId = url.searchParams.get("discord_id")?.trim() || defaultDevDiscordId;
    if (!discordId) {
      return json({ error: "discord_id is required" }, 400);
    }

    const result = await auth.createDevSession(discordId);
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

  if (method === "GET" && url.pathname === "/auth/discord/callback") {
    const code = url.searchParams.get("code");
    if (!code) {
      return json({ error: "code is required" }, 400);
    }

    let result;

    try {
      result = await auth.handleDiscordCallback(code, url.searchParams.get("state"));
    } catch (error) {
      const callbackUrl = new URL("/auth/discord/callback", options.appBaseUrl);
      const message = error instanceof Error ? error.message : "Unknown Discord OAuth error";
      callbackUrl.searchParams.set("error", message);
      return redirect(callbackUrl.toString());
    }

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

  if (method === "GET" && url.pathname === "/public/performance") {
    return json(await services.getPublicPerformance({ month: url.searchParams.get("month") ?? undefined }));
  }

  if (method === "GET" && url.pathname === "/public/events") {
    return json(await services.getPublicScheduledEvents());
  }

  if (method === "GET" && url.pathname === "/public/invites/validate") {
    const code = url.searchParams.get("code")?.trim();
    if (!code) {
      return json({ valid: false });
    }
    return json(await services.validateInvite(code));
  }

  if (method === "GET" && url.pathname === "/me") {
    return json(requireAuthenticatedUser(context.currentUser));
  }

  if (method === "GET" && url.pathname === "/private/access") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json({ ok: true });
  }

  if (method === "GET" && url.pathname === "/overview/announcements") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.getOverviewAnnouncements(currentUser));
  }

  if (method === "POST" && url.pathname === "/overview/announcements") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const payload = requireReplaceOverviewAnnouncementsPayload(
      await parseBody<ReplaceOverviewAnnouncementsPayload>(request)
    );
    return json(await services.replaceOverviewAnnouncements(currentUser, payload.announcements));
  }

  if (method === "POST" && url.pathname === "/register") {
    const payload = requireRegisterPayload(await parseBody<RegisterPayload>(request));
    const result = await services.registerMember(payload);
    return json(result, 201);
  }

  if (method === "POST" && url.pathname === "/invites") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.createInvite(currentUser), 201);
  }

  if (method === "GET" && url.pathname === "/ctas") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.listCtas());
  }

  if (method === "GET" && url.pathname === "/ctas/manage-access") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    await services.requireCtaManageAccess(currentUser);
    return json({ ok: true });
  }

  if (method === "POST" && url.pathname.match(/^\/ctas\/[^/]+\/signup$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const ctaId = url.pathname.split("/")[2];
    const payload = requireCtaFillSignupPayload(await parseBody<CtaFillSignupPayload>(request));
    return json(await services.signupForFill(currentUser, { ctaId, roles: payload.roles }));
  }

  if (method === "DELETE" && url.pathname.match(/^\/ctas\/[^/]+\/signup$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const ctaId = url.pathname.split("/")[2];
    return json(await services.removeOwnCtaSignup(currentUser, { ctaId }));
  }

  if (method === "GET" && url.pathname === "/members") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.listMembers(currentUser));
  }

  if (method === "POST" && url.pathname.match(/^\/members\/[^/]+\/activity-followup$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const memberId = url.pathname.split("/")[2];
    return json(await services.openMemberActivityFollowup(currentUser, memberId), 201);
  }

  if (method === "POST" && url.pathname.match(/^\/members\/[^/]+\/activity-exclusion$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const memberId = url.pathname.split("/")[2];
    const payload = requireMemberActivityExclusionPayload(
      await parseBody<MemberActivityExclusionPayload>(request)
    );
    return json(await services.setMemberActivityExclusion(currentUser, memberId, payload));
  }

  if (method === "DELETE" && url.pathname.match(/^\/members\/[^/]+\/activity-exclusion$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const memberId = url.pathname.split("/")[2];
    return json(await services.clearMemberActivityExclusion(currentUser, memberId));
  }

  if (method === "GET" && url.pathname === "/council/members") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.listCouncilMembers(currentUser));
  }

  if (method === "GET" && url.pathname === "/council/tasks") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.listCouncilTasks(currentUser));
  }

  if (method === "POST" && url.pathname === "/council/tasks") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const payload = requireCreateCouncilTaskPayload(
      await parseBody<CreateCouncilTaskPayload>(request)
    );
    return json(await services.createCouncilTask(currentUser, payload), 201);
  }

  if (method === "POST" && url.pathname.match(/^\/council\/tasks\/[^/]+$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const taskId = url.pathname.split("/")[3];
    const payload = requireUpdateCouncilTaskPayload(
      await parseBody<UpdateCouncilTaskPayload>(request)
    );
    return json(await services.updateCouncilTask(currentUser, taskId, payload));
  }

  if (method === "POST" && url.pathname.match(/^\/council\/tasks\/[^/]+\/status$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const taskId = url.pathname.split("/")[3];
    const payload = requireCouncilTaskStatusPayload(
      await parseBody<UpdateCouncilTaskStatusPayload>(request)
    );
    return json(await services.updateCouncilTaskStatus(currentUser, taskId, payload.status));
  }

  if (method === "DELETE" && url.pathname.match(/^\/council\/tasks\/[^/]+$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const taskId = url.pathname.split("/")[3];
    return json(await services.deleteCouncilTask(currentUser, taskId));
  }

  if (method === "GET" && url.pathname === "/council/bottled-energy") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.getBottledEnergyBalances(currentUser));
  }

  if (method === "POST" && url.pathname === "/council/bottled-energy/preview") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const payload = requireBottledEnergyImportPayload(
      await parseBody<BottledEnergyImportPayload>(request)
    );
    return json(await services.previewBottledEnergyImport(currentUser, payload.raw));
  }

  if (method === "POST" && url.pathname === "/council/bottled-energy/import") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const payload = requireBottledEnergyImportPayload(
      await parseBody<BottledEnergyImportPayload>(request)
    );
    return json(await services.importBottledEnergy(currentUser, payload.raw));
  }

  if (method === "POST" && url.pathname === "/council/bottled-energy/publish") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.publishBottledEnergyToDiscord(currentUser));
  }

  if (method === "POST" && url.pathname === "/council/bottled-energy/reset") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.resetBottledEnergy(currentUser));
  }

  if (method === "GET" && url.pathname === "/ranking") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.getRanking({ month: url.searchParams.get("month") ?? undefined }));
  }

  if (method === "GET" && url.pathname === "/albion/players/search") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const name = url.searchParams.get("name")?.trim();
    const start = url.searchParams.get("start")?.trim() || undefined;
    const end = url.searchParams.get("end")?.trim() || undefined;
    const minPlayersRaw = url.searchParams.get("minPlayers")?.trim();
    if (!name) {
      return json({ error: "name is required" }, 400);
    }
    const minPlayers =
      minPlayersRaw && /^\d+$/.test(minPlayersRaw) ? Number(minPlayersRaw) : undefined;
    return json(await services.getAlbionPlayerByName(currentUser, name, { start, end, minPlayers }));
  }

  if (method === "GET" && url.pathname === "/albion/items/search") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const query = url.searchParams.get("q")?.trim();
    const slot = url.searchParams.get("slot")?.trim();
    if (!query) {
      return json({ error: "q is required" }, 400);
    }
    const allowedSlots = new Set([
      "MAIN_HAND",
      "OFF_HAND",
      "HEAD",
      "ARMOR",
      "SHOES",
      "CAPE",
      "BAG",
      "MOUNT",
      "FOOD",
      "POTION"
    ]);
    if (slot && !allowedSlots.has(slot)) {
      return json({ error: "slot is invalid" }, 400);
    }
    return json(await services.searchAlbionItems(currentUser, query, slot as
      | "MAIN_HAND"
      | "OFF_HAND"
      | "HEAD"
      | "ARMOR"
      | "SHOES"
      | "CAPE"
      | "BAG"
      | "MOUNT"
      | "FOOD"
      | "POTION"
      | undefined));
  }

  if (method === "GET" && url.pathname === "/battles") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    console.log("[battles] GET /battles", {
      userId: currentUser.id,
      role: currentUser.role
    });
    return json(await services.listBattles(currentUser));
  }

  if (method === "GET" && url.pathname.match(/^\/battles\/[^/]+$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const battleId = url.pathname.split("/")[2];
    const battle = await services.getBattleDetail(currentUser, battleId);

    if (!battle) {
      return json({ error: "Battle not found" }, 404);
    }

    return json(battle);
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

  if (method === "GET" && url.pathname === "/builds") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    return json(await services.listBuildTemplates(currentUser));
  }

  if (method === "POST" && url.pathname === "/ctas") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const payload = requireCreateCtaPayload(await parseBody<CreateCtaPayload>(request));
    return json(await services.createCta(currentUser, payload.title, payload.datetimeUtc, payload.compId), 201);
  }

  if (method === "POST" && url.pathname.match(/^\/ctas\/[^/]+\/finalize$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const ctaId = url.pathname.split("/")[2];
    return json(await services.finalizeCta(currentUser, ctaId));
  }

  if (method === "POST" && url.pathname.match(/^\/ctas\/[^/]+\/cancel$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const ctaId = url.pathname.split("/")[2];
    return json(await services.cancelCta(currentUser, ctaId));
  }

  if (method === "POST" && url.pathname.match(/^\/ctas\/[^/]+\/slots$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const ctaId = url.pathname.split("/")[2];
    const payload = requireAssignCtaSlotPayload(await parseBody(request));
    return json(await services.assignCtaSlot(currentUser, { ctaId, ...payload }));
  }

  if (method === "POST" && url.pathname.match(/^\/ctas\/[^/]+\/comp$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const ctaId = url.pathname.split("/")[2];
    const payload = requireUpdateCtaCompPayload(await parseBody<UpdateCtaCompPayload>(request));
    return json(await services.updateCtaComp(currentUser, ctaId, payload.compId));
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

  if (method === "POST" && url.pathname.match(/^\/members\/[^/]+\/bomb-group$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const memberId = url.pathname.split("/")[2];
    const payload = requireMemberBombGroupPayload(
      await parseBody<UpdateMemberBombGroupPayload>(request)
    );
    return json(await services.updateMemberBombGroup(currentUser, memberId, payload.bombGroupName));
  }

  if (method === "POST" && url.pathname.match(/^\/members\/[^/]+\/albion-name$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const memberId = url.pathname.split("/")[2];
    const payload = requireMemberAlbionNamePayload(
      await parseBody<UpdateMemberAlbionNamePayload>(request)
    );
    return json(await services.updateMemberAlbionName(currentUser, memberId, payload.albionName));
  }

  if (method === "POST" && url.pathname.match(/^\/members\/[^/]+\/kick$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const memberId = url.pathname.split("/")[2];
    const payload = requireKickMemberPayload(
      await parseBody<KickMemberPayload>(request)
    );
    return json(await services.kickMember(currentUser, memberId, payload.reason));
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
            buildId: slot.buildId,
            notes: slot.notes ?? ""
          }))
        }))
      }),
      201
    );
  }

  if (method === "POST" && url.pathname === "/builds") {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const payload = requireSaveBuildPayload(await parseBody<SaveBuildPayload>(request));
    return json(
      await services.saveBuildTemplate(currentUser, {
        id: payload.id,
        name: payload.name,
        role: payload.role,
        weaponId: payload.weaponId,
        items: payload.items
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

  if (method === "DELETE" && url.pathname.match(/^\/builds\/[^/]+$/)) {
    const currentUser = requireAuthenticatedUser(context.currentUser);
    await services.requirePrivateAccess(currentUser);
    const buildId = url.pathname.split("/")[2];
    return json(await services.deleteBuildTemplate(currentUser, buildId));
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
