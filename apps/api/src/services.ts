import { createHash } from "node:crypto";
import type { BuildTemplateItemSlot, DatabaseRepository } from "@thehundred/db";
import type { GuildBattleDetail, GuildBattleSummary, KillboardClient } from "@thehundred/killboard";
import {
  DomainError,
  memberHasPrivateAccess,
  transitionCtaStatus,
  transitionMemberStatus,
  type CTA,
  type GuildMember,
  type User
} from "@thehundred/domain";

export interface ApiServices {
  getHealth(): Promise<{
    ok: true;
    repositoryProvider: "memory" | "supabase";
    supabaseConfigured: boolean;
  }>;
  getOpenSlots(): Promise<{ slotsOpen: number; memberCap: number }>;
  registerMember(input: {
    displayName: string;
    discordId: string;
    albionName: string;
    inviteCode?: string;
    avatarUrl?: string;
    timezone: string;
    mainRole: string;
    zvzExperience: string;
    notes?: string;
  }): Promise<{ userId: string; alreadyRegistered: boolean; applicationId: string }>;
  validateInvite(code: string): Promise<{ valid: boolean }>;
  createInvite(actor: User): Promise<{ code: string; inviteUrl: string }>;
  requirePrivateAccess(actor: User): Promise<void>;
  requireCtaManageAccess(actor: User): Promise<void>;
  getPublicPerformance(input?: { month?: string }): Promise<{
    trackedBattles: number;
    selectedMonth: string;
    selectedMonthLabel: string;
    attendance: {
      averageCount: number;
      averagePercent: number;
      ctaCount: number;
      history: Array<{
        dateKey: string;
        label: string;
        memberCount: number;
        attendancePercent: number;
        battleCount: number;
      }>;
    };
    main: {
      averageKills: number;
      sharePercent: number;
    };
    bombTotals: {
      averageKills: number;
      sharePercent: number;
    };
    bombs: Array<{
      bombGroupName: string;
      averageKills: number;
      sharePercent: number;
    }>;
    pagination: {
      previousMonth?: string;
      nextMonth?: string;
    };
    lastUpdatedAt?: string;
  }>;
  getOverviewAnnouncements(actor: User): Promise<
    Array<{
      id: string;
      title: string;
      body: string;
      position: number;
      updatedAt: string;
    }>
  >;
  replaceOverviewAnnouncements(
    actor: User,
    input: Array<{ title: string; body: string }>
  ): Promise<
    Array<{
      id: string;
      title: string;
      body: string;
      position: number;
      updatedAt: string;
    }>
  >;
  listMembers(actor: User): Promise<
    Array<
      GuildMember & {
        displayName: string;
        discordId: string;
        attendanceCount: number;
        attendancePercent: number;
      }
    >
  >;
  listCouncilMembers(actor: User): Promise<
    Array<{
      memberId: string;
      userId: string;
      displayName: string;
      discordId: string;
      avatarUrl?: string;
    }>
  >;
  listCouncilTasks(actor: User): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      category: "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";
      status: "TODO" | "IN_PROGRESS" | "DONE";
      assignedMemberId?: string;
      assignedDisplayName?: string;
      executeAt?: string;
      createdBy: string;
      createdAt: string;
      updatedAt: string;
    }>
  >;
  createCouncilTask(
    actor: User,
    input: {
      title: string;
      description: string;
      category: "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";
      assignedMemberId?: string;
      executeAt?: string;
    }
  ): Promise<{
    id: string;
    title: string;
    description: string;
    category: "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";
    status: "TODO" | "IN_PROGRESS" | "DONE";
    assignedMemberId?: string;
    assignedDisplayName?: string;
    executeAt?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }>;
  updateCouncilTask(
    actor: User,
    taskId: string,
    input: {
      title?: string;
      description?: string;
      category?: "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";
      assignedMemberId?: string;
      executeAt?: string;
      status?: "TODO" | "IN_PROGRESS" | "DONE";
    }
  ): Promise<{
    id: string;
    title: string;
    description: string;
    category: "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";
    status: "TODO" | "IN_PROGRESS" | "DONE";
    assignedMemberId?: string;
    assignedDisplayName?: string;
    executeAt?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }>;
  updateCouncilTaskStatus(
    actor: User,
    taskId: string,
    status: "TODO" | "IN_PROGRESS" | "DONE"
  ): Promise<{
    id: string;
    title: string;
    description: string;
    category: "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";
    status: "TODO" | "IN_PROGRESS" | "DONE";
    assignedMemberId?: string;
    assignedDisplayName?: string;
    executeAt?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }>;
  deleteCouncilTask(actor: User, taskId: string): Promise<{ deleted: true; taskId: string }>;
  getBottledEnergyBalances(actor: User): Promise<{
    balances: Array<{
      memberId: string;
      userId: string;
      discordId: string;
      displayName: string;
      albionName?: string;
      balance: number;
    }>;
    unmatched: Array<{
      albionName: string;
      balance: number;
      lastSeenAt: string;
    }>;
    updatedAt: string;
  }>;
  previewBottledEnergyImport(
    actor: User,
    raw: string
  ): Promise<{
    rows: number;
    matchedRows: number;
    unmatchedRows: number;
    membersMatched: number;
    membersUnmatched: number;
    sampleUnmatched: string[];
  }>;
  importBottledEnergy(
    actor: User,
    raw: string
  ): Promise<{
    importId: string;
    rows: number;
    insertedRows: number;
    duplicateRows: number;
    matchedRows: number;
    unmatchedRows: number;
  }>;
  publishBottledEnergyToDiscord(actor: User): Promise<{
    sent: true;
    channelId: string;
    mentioned: number;
    messages: number;
  }>;
  resetBottledEnergy(actor: User): Promise<{
    reset: true;
    deletedLedgerRows: number;
    deletedImportRows: number;
  }>;
  listAssignableCompPlayers(actor: User): Promise<
    Array<GuildMember & { displayName: string; discordId: string; avatarUrl?: string }>
  >;
  listCtas(): Promise<
    Array<
      CTA & {
        compName?: string;
        signupFillers: Array<{
          memberId: string;
          playerName: string;
          playerUserId?: string;
          preferredRoles: string[];
        }>;
        signupParties: Array<{
          partyKey: string;
          partyName: string;
          slots: Array<{
            slotKey: string;
            role: string;
            label: string;
            weaponId: string;
            weaponName: string;
            playerName?: string;
            playerUserId?: string;
          }>;
        }>;
        signupCategories: Array<{
          role: string;
          slots: Array<{
            slotKey: string;
            label: string;
            weaponName: string;
            reactionEmoji?: string;
            playerName?: string;
          }>;
        }>;
      }
    >
  >;
  signupForFill(
    actor: User,
    input: { ctaId: string; roles: string[] }
  ): Promise<{
    ok: true;
    filler: {
      memberId: string;
      playerName: string;
      playerUserId: string;
      preferredRoles: string[];
    };
  }>;
  getRanking(input?: { month?: string }): Promise<{
    selectedMonth: string;
    selectedMonthLabel: string;
    pagination: {
      previousMonth?: string;
      nextMonth?: string;
    };
    entries: Array<{
      memberId: string;
      displayName: string;
      avatarUrl?: string;
      attendanceCount: number;
      attendancePercent: number;
    }>;
  }>;
  getAlbionPlayerByName(
    actor: User,
    name: string,
    filters?: { start?: string; end?: string; minPlayers?: number }
  ): Promise<{
    query: string;
    filters?: {
      start?: string;
      end?: string;
      minPlayers: number;
    };
    stats?: {
      totalKills: number;
      totalDeaths: number;
      totalDamage: number;
      totalHeal: number;
      totalAttendance: number;
      averageIp: number;
      totalKillFame: number;
      totalDeathFame: number;
      kd: number;
      entries: number;
    };
    player?: {
      id: string;
      name: string;
      guildName?: string;
      killFame: number;
      deathFame: number;
      kdFame: number;
      previousGuilds: string[];
      guildHistory: Array<{
        guildName: string;
        joinedAt?: string;
        leftAt?: string;
      }>;
      guildHistorySource?: "official" | "albiondb" | "unavailable";
      guildHistoryNote?: string;
    };
  }>;
  searchAlbionItems(
    actor: User,
    query: string,
    slot?: BuildTemplateItemSlot
  ): Promise<{
    query: string;
    items: Array<{
      id: string;
      name: string;
      iconUrl: string;
    }>;
  }>;
  createCta(actor: User, title: string, datetimeUtc: string, compId?: string): Promise<CTA>;
  finalizeCta(
    actor: User,
    ctaId: string
  ): Promise<{ cta: CTA; generatedPoints: Array<{ memberId: string; points: number }> }>;
  cancelCta(actor: User, ctaId: string): Promise<{ cta: CTA; canceledSignups: number }>;
  updateMemberStatus(actor: User, memberId: string, nextStatus: GuildMember["status"]): Promise<GuildMember>;
  kickMember(actor: User, memberId: string, reason?: string): Promise<GuildMember>;
  updateMemberBombGroup(actor: User, memberId: string, bombGroupName?: string): Promise<GuildMember>;
  approveRegear(actor: User, regearId: string): Promise<{ approved: true; regearId: string }>;
  listComps(): Promise<Awaited<ReturnType<DatabaseRepository["getComps"]>>>;
  saveComp(
    actor: User,
    input: Parameters<DatabaseRepository["saveComp"]>[0]
  ): Promise<Awaited<ReturnType<DatabaseRepository["saveComp"]>>>;
  listBuildTemplates(
    actor: User
  ): Promise<Awaited<ReturnType<DatabaseRepository["getBuildTemplates"]>>>;
  saveBuildTemplate(
    actor: User,
    input: Parameters<DatabaseRepository["saveBuildTemplate"]>[0]
  ): Promise<Awaited<ReturnType<DatabaseRepository["saveBuildTemplate"]>>>;
  deleteBuildTemplate(
    actor: User,
    buildId: string
  ): Promise<{ deleted: true; buildId: string }>;
  assignCtaSlot(
    actor: User,
    input: { ctaId: string; slotKey: string; playerUserId?: string }
  ): Promise<{ ok: true }>;
  listBattles(
    actor: User
  ): Promise<{
    guildId?: string;
    guildName?: string;
    minGuildPlayers: number;
    battles: Array<
      GuildBattleSummary & {
        mainKills?: number;
        bombKills?: number;
      }
    >;
  }>;
  getBattleDetail(
    actor: User,
    battleId: string
  ): Promise<
    | (GuildBattleDetail & {
        rosterGroupsSummary: Array<{
          key: string;
          label: string;
          type: "BOMB" | "MAIN_ZERG";
          matchedPlayers: number;
          kills: number;
          deaths: number;
        }>;
      })
    | null
  >;
  deleteComp(actor: User, compId: string): Promise<{ deleted: true; compId: string }>;
}

export function createApiServices(
  repository: DatabaseRepository,
  killboard: KillboardClient,
  options: {
    repositoryProvider: "memory" | "supabase";
    supabaseConfigured: boolean;
    albionBattlesGuildId?: string;
    albionBattlesGuildName?: string;
    albionBattlesMinGuildPlayers: number;
    albionBattlesLimit: number;
    albionApiBaseUrl: string;
    albionBbApiBaseUrl: string;
    launchCountdownEnabled: boolean;
    launchAtIso: string;
    appBaseUrl: string;
    discordGuildId: string;
    discordBotToken: string;
    discordCallerRoleIds: string[];
    discordBottledEnergyChannelId: string;
  }
): ApiServices {
  const compRoleOrder = ["Tank", "Healer", "Support", "Pierce", "Melee", "Ranged", "Battlemount"];
  const requireStaffAccess = async (actor: User) => {
    const actorMember = await repository.getMemberByUserId(actor.id);
    if (actorMember?.discordRoleStatus === "COUNCIL" && !actorMember.kickedAt) {
      return;
    }

    throw new DomainError("Staff role required");
  };
  const actorHasCallerRole = async (actor: User): Promise<boolean> => {
    const guildId = options.discordGuildId?.trim();
    const botToken = options.discordBotToken?.trim();
    const callerRoleIds = options.discordCallerRoleIds ?? [];
    if (!guildId || !botToken || callerRoleIds.length === 0) {
      return false;
    }

    try {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${actor.discordId}`,
        {
          headers: {
            authorization: `Bot ${botToken}`
          }
        }
      );
      if (!response.ok) {
        return false;
      }

      const payload = (await response.json()) as { roles?: string[] };
      const roleIds = payload.roles ?? [];
      return callerRoleIds.some((roleId) => roleIds.includes(roleId));
    } catch {
      return false;
    }
  };
  const requireCtaManager = async (actor: User) => {
    const actorMember = await repository.getMemberByUserId(actor.id);
    if (actorMember?.discordRoleStatus === "COUNCIL" && !actorMember.kickedAt) {
      return;
    }

    if (await actorHasCallerRole(actor)) {
      return;
    }

    throw new DomainError("Staff o Caller role required");
  };

  return {
    async getHealth() {
      return {
        ok: true,
        repositoryProvider: options.repositoryProvider,
        supabaseConfigured: options.supabaseConfigured
      };
    },

    async getAlbionPlayerByName(actor, name, filters) {
      await requireStaffAccess(actor);
      const query = name.trim();
      if (!query) {
        throw new DomainError("name is required");
      }

      const minPlayers = clampMinPlayers(filters?.minPlayers);
      const bbBaseUrl = options.albionBbApiBaseUrl.replace(/\/$/, "");
      const statsPayload = await fetchJsonSafe(
        `${bbBaseUrl}/stats/players/${encodeURIComponent(query)}?${new URLSearchParams({
          minPlayers: String(minPlayers)
        }).toString()}`
      );
      const statsEntries = extractAlbionBbStatsEntries(statsPayload);
      const filteredStatsEntries = filterAlbionBbEntriesByDate(
        statsEntries,
        filters?.start,
        filters?.end
      );
      const scope = filteredStatsEntries.length > 0 ? filteredStatsEntries : statsEntries;

      if (scope.length > 0) {
        const totals = scope.reduce(
          (acc, entry) => {
            acc.totalKills += entry.kills;
            acc.totalDeaths += entry.deaths;
            acc.totalDamage += entry.damage;
            acc.totalHeal += entry.heal;
            acc.totalAttendance += 1;
            acc.totalKillFame += entry.killFame;
            acc.totalDeathFame += entry.deathFame;
            if (entry.ip > 0) {
              acc.ipSum += entry.ip;
              acc.ipCount += 1;
            }
            return acc;
          },
          {
            totalKills: 0,
            totalDeaths: 0,
            totalDamage: 0,
            totalHeal: 0,
            totalAttendance: 0,
            totalKillFame: 0,
            totalDeathFame: 0,
            ipSum: 0,
            ipCount: 0
          }
        );
        const latest = [...scope].sort((left, right) => {
          const leftTime = Date.parse(left.startedAt);
          const rightTime = Date.parse(right.startedAt);
          return Number.isFinite(rightTime) ? rightTime - (Number.isFinite(leftTime) ? leftTime : 0) : 0;
        })[0];
        const kdFame =
          totals.totalDeathFame > 0
            ? totals.totalKillFame / totals.totalDeathFame
            : totals.totalKillFame > 0
              ? totals.totalKillFame
              : 0;

        return {
          query,
          filters: {
            start: filters?.start,
            end: filters?.end,
            minPlayers
          },
          stats: {
            totalKills: totals.totalKills,
            totalDeaths: totals.totalDeaths,
            totalDamage: totals.totalDamage,
            totalHeal: totals.totalHeal,
            totalAttendance: totals.totalAttendance,
            averageIp: totals.ipCount > 0 ? totals.ipSum / totals.ipCount : 0,
            totalKillFame: totals.totalKillFame,
            totalDeathFame: totals.totalDeathFame,
            kd: totals.totalDeaths > 0 ? totals.totalKills / totals.totalDeaths : totals.totalKills,
            entries: scope.length
          },
          player: {
            id: String(latest.albionId),
            name: query,
            guildName: latest.guildName || undefined,
            killFame: totals.totalKillFame,
            deathFame: totals.totalDeathFame,
            kdFame,
            previousGuilds: [],
            guildHistory: [],
            guildHistorySource: "unavailable"
          }
        };
      }

      const officialAmsBase = "https://gameinfo-ams.albiononline.com/api/gameinfo";
      const officialLegacyBase = "https://gameinfo.albiononline.com/api/gameinfo";
      const baseCandidates = [
        options.albionApiBaseUrl,
        officialAmsBase,
        officialLegacyBase
      ]
        .map((base) => base.replace(/\/$/, ""))
        .filter((base, index, list) => Boolean(base) && list.indexOf(base) === index);

      for (const baseUrl of baseCandidates) {
        const searchPayload = await fetchJsonSafe(
          `${baseUrl}/search?${new URLSearchParams({ q: query }).toString()}`
        );
        const searchPlayer = pickAlbionSearchPlayer(searchPayload, query);
        if (!searchPlayer) {
          continue;
        }

        const detailPayload = await fetchJsonSafe(`${baseUrl}/players/${encodeURIComponent(searchPlayer.id)}`);
        if (!detailPayload || typeof detailPayload !== "object") {
          continue;
        }

        const killFame = readNumber(detailPayload, "KillFame");
        const deathFame = readNumber(detailPayload, "DeathFame");
        const fameRatio = readNumber(detailPayload, "FameRatio");
        const kdFame = fameRatio > 0 ? fameRatio : deathFame > 0 ? killFame / deathFame : killFame > 0 ? killFame : 0;

        const guildHistoryPayload =
          (await fetchJsonSafe(`${baseUrl}/players/${encodeURIComponent(searchPlayer.id)}/guildhistory`)) ??
          (await fetchJsonSafe(`${baseUrl}/players/${encodeURIComponent(searchPlayer.id)}/guilds`)) ??
          (await fetchJsonSafe(`${baseUrl}/players/${encodeURIComponent(searchPlayer.id)}/history`));
        let guildHistory = extractGuildHistory(
          guildHistoryPayload,
          readString(detailPayload, "GuildName") || undefined
        );
        let guildHistorySource: "official" | "albiondb" | "unavailable" | undefined =
          guildHistory.length > 0 ? "official" : undefined;
        let guildHistoryNote: string | undefined;
        if (guildHistory.length === 0) {
          const albionDbFallback = await fetchAlbionDbGuildHistory(searchPlayer.name);
          guildHistory = albionDbFallback.history;
          guildHistorySource = albionDbFallback.source;
          guildHistoryNote = albionDbFallback.note;
        }
        const previousGuilds = [...new Set(guildHistory.map((entry) => entry.guildName))];

        return {
          query,
          player: {
            id: searchPlayer.id,
            name: readString(detailPayload, "Name") || searchPlayer.name,
            guildName: readString(detailPayload, "GuildName") || undefined,
            killFame,
            deathFame,
            kdFame,
            previousGuilds,
            guildHistory,
            guildHistorySource,
            guildHistoryNote
          }
        };
      }

      return {
        query,
        filters: {
          start: filters?.start,
          end: filters?.end,
          minPlayers
        }
      };
    },

    async searchAlbionItems(actor, query, slot) {
      await requireStaffAccess(actor);
      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        throw new DomainError("query is required");
      }

      const items = await searchAlbionItemsCatalog(normalizedQuery, slot);
      return {
        query: normalizedQuery,
        items
      };
    },

    async getOpenSlots() {
      return repository.getOpenSlots();
    },

    async registerMember(input) {
      if (isPrelaunchActive(options)) {
        const inviteCode = input.inviteCode?.trim();
        if (!inviteCode) {
          throw new DomainError("Invite required before launch");
        }

        const invite = await repository.getInviteByCode(inviteCode);
        if (!invite || invite.consumedAt) {
          throw new DomainError("Invite is invalid or already used");
        }
      }

      const existingUser = await repository.getUserByDiscordId(input.discordId);
      let userId: string;
      let alreadyRegistered: boolean;

      if (existingUser) {
        if (input.avatarUrl) {
          await repository.updateUserAvatar(existingUser.id, input.avatarUrl);
        }
        if (existingUser.albionName !== input.albionName) {
          await repository.updateUserAlbionName(existingUser.id, input.albionName);
        }
        userId = existingUser.id;
        alreadyRegistered = true;
      } else {
        const user = await repository.createUser({
          displayName: input.displayName,
          discordId: input.discordId,
          albionName: input.albionName,
          avatarUrl: input.avatarUrl,
          role: "PLAYER"
        });
        userId = user.id;
        alreadyRegistered = false;
      }

      const application = await repository.saveRecruitmentApplication({
        userId,
        displayName: input.displayName,
        timezone: input.timezone,
        mainRole: input.mainRole,
        zvzExperience: input.zvzExperience,
        notes: input.notes ?? ""
      });

      if (isPrelaunchActive(options) && input.inviteCode) {
        const consumedInvite = await repository.consumeInvite(input.inviteCode.trim(), userId);
        if (!consumedInvite) {
          throw new DomainError("Invite is invalid or already used");
        }
      }

      return { userId, alreadyRegistered, applicationId: application.id };
    },

    async validateInvite(code) {
      const invite = await repository.getInviteByCode(code.trim());
      return {
        valid: Boolean(invite && !invite.consumedAt)
      };
    },

    async createInvite(actor) {
      await requireStaffAccess(actor);
      const invite = await repository.createInvite(actor.id);
      const inviteUrl = new URL("/", options.appBaseUrl);
      inviteUrl.searchParams.set("invite", invite.code);
      return {
        code: invite.code,
        inviteUrl: inviteUrl.toString()
      };
    },

    async requirePrivateAccess(actor) {
      const member = await repository.getMemberByUserId(actor.id);
      if (!memberHasPrivateAccess(member)) {
        throw new DomainError(
          "Private dashboard access requires guild recruitment approval via Discord"
        );
      }
    },

    async requireCtaManageAccess(actor) {
      await requireCtaManager(actor);
    },

    async getPublicPerformance(input) {
      await syncLatestBattlePerformanceSnapshots({
        repository,
        killboard,
        guildId: options.albionBattlesGuildId?.trim() || undefined,
        guildName: options.albionBattlesGuildName?.trim() || undefined,
        minGuildPlayers: options.albionBattlesMinGuildPlayers,
        limit: options.albionBattlesLimit
      });

      const [snapshots, bombs, members] = await Promise.all([
        repository.getBattlePerformanceSnapshots(),
        repository.getBattlePerformanceBombs(),
        repository.getMembers()
      ]);
      const selectedMonth = resolveSelectedMonth(input?.month);
      const selectedMonthLabel = formatSelectedMonthLabel(selectedMonth);
      const monthRange = getMonthRange(selectedMonth);
      const totalMembers = members.length;
      const dailyBuckets = new Map<
        number,
        {
          dateKey: string;
          day: number;
          totalMembers: number;
          totalPercent: number;
          battleCount: number;
        }
      >();

      for (const snapshot of snapshots.filter((entry) => {
        const time = new Date(entry.startTime).getTime();
        return time >= monthRange.start.getTime() && time < monthRange.end.getTime();
      })) {
        const day = Math.min(new Date(snapshot.startTime).getUTCDate(), 30);
        const dateKey = formatUtcDayKey(snapshot.startTime, day);
        const existing = dailyBuckets.get(day) ?? {
          dateKey,
          day,
          totalMembers: 0,
          totalPercent: 0,
          battleCount: 0
        };
        const attendancePercent = totalMembers > 0 ? (snapshot.guildPlayers / totalMembers) * 100 : 0;
        existing.totalMembers += snapshot.guildPlayers;
        existing.totalPercent += attendancePercent;
        existing.battleCount += 1;
        dailyBuckets.set(day, existing);
      }

      const attendanceHistory = [...dailyBuckets.values()]
        .sort((left, right) => left.day - right.day)
        .map((entry) => ({
          dateKey: entry.dateKey,
          label: String(entry.day).padStart(2, "0"),
          memberCount: entry.battleCount > 0 ? entry.totalMembers / entry.battleCount : 0,
          attendancePercent: entry.battleCount > 0 ? entry.totalPercent / entry.battleCount : 0,
          battleCount: entry.battleCount
        }));

      const averageAttendanceCount =
        snapshots.length > 0
          ? snapshots.reduce((sum, snapshot) => sum + snapshot.guildPlayers, 0) / snapshots.length
          : 0;
      const averageAttendancePercent =
        totalMembers > 0 ? (averageAttendanceCount / totalMembers) * 100 : 0;

      const totalGuildKills = snapshots.reduce((sum, snapshot) => sum + snapshot.guildKills, 0);
      const totalMainKills = snapshots.reduce((sum, snapshot) => sum + snapshot.mainKills, 0);
      const totalBombKills = bombs.reduce((sum, bomb) => sum + bomb.kills, 0);

      const bombMap = new Map<
        string,
        {
          bombGroupName: string;
          totalKills: number;
        }
      >();

      for (const bomb of bombs) {
        const existing = bombMap.get(bomb.bombGroupName) ?? {
          bombGroupName: bomb.bombGroupName,
          totalKills: 0
        };
        existing.totalKills += bomb.kills;
        bombMap.set(bomb.bombGroupName, existing);
      }

      return {
        trackedBattles: snapshots.length,
        selectedMonth,
        selectedMonthLabel,
        attendance: {
          averageCount: averageAttendanceCount,
          averagePercent: averageAttendancePercent,
          ctaCount: snapshots.length,
          history: attendanceHistory
        },
        main: {
          averageKills: snapshots.length > 0 ? totalMainKills / snapshots.length : 0,
          sharePercent: totalGuildKills > 0 ? (totalMainKills / totalGuildKills) * 100 : 0
        },
        bombTotals: {
          averageKills: snapshots.length > 0 ? totalBombKills / snapshots.length : 0,
          sharePercent: totalGuildKills > 0 ? (totalBombKills / totalGuildKills) * 100 : 0
        },
        bombs: [...bombMap.values()]
          .map((entry) => ({
            bombGroupName: entry.bombGroupName,
            averageKills: snapshots.length > 0 ? entry.totalKills / snapshots.length : 0,
            sharePercent: totalGuildKills > 0 ? (entry.totalKills / totalGuildKills) * 100 : 0
          }))
          .sort((left, right) => right.averageKills - left.averageKills || left.bombGroupName.localeCompare(right.bombGroupName, "es")),
        pagination: {
          previousMonth: shiftMonth(selectedMonth, -1),
          nextMonth: shiftMonth(selectedMonth, 1)
        },
        lastUpdatedAt: snapshots[0]?.processedAt
      };
    },

    async getOverviewAnnouncements(actor) {
      await this.requirePrivateAccess(actor);
      const existing = await repository.getOverviewAnnouncements();
      return existing.map((entry) => ({
        id: entry.id,
        title: entry.title,
        body: entry.body,
        position: entry.position,
        updatedAt: entry.updatedAt
      }));
    },

    async replaceOverviewAnnouncements(actor, input) {
      await requireStaffAccess(actor);
      const normalized = input
        .map((entry) => ({
          title: entry.title.trim(),
          body: entry.body.trim()
        }))
        .filter((entry) => entry.title.length > 0 && entry.body.length > 0);
      const saved = await repository.replaceOverviewAnnouncements(normalized, actor.id);
      return saved.map((entry) => ({
        id: entry.id,
        title: entry.title,
        body: entry.body,
        position: entry.position,
        updatedAt: entry.updatedAt
      }));
    },

    async listMembers(actor) {
      await requireStaffAccess(actor);
      await syncLatestBattlePerformanceSnapshots({
        repository,
        killboard,
        guildId: options.albionBattlesGuildId?.trim() || undefined,
        guildName: options.albionBattlesGuildName?.trim() || undefined,
        minGuildPlayers: options.albionBattlesMinGuildPlayers,
        limit: options.albionBattlesLimit
      });

      const [members, users, snapshots, attendances] = await Promise.all([
        repository.getMembers(),
        repository.getUsers(),
        repository.getBattlePerformanceSnapshots(),
        repository.getBattleMemberAttendances()
      ]);
      const usersById = new Map(users.map((user) => [user.id, user]));
      const attendanceCountByMemberId = new Map<string, number>();

      for (const attendance of attendances) {
        attendanceCountByMemberId.set(
          attendance.memberId,
          (attendanceCountByMemberId.get(attendance.memberId) ?? 0) + 1
        );
      }

      return members.filter((member) => !member.kickedAt).map((member) => {
        const user = usersById.get(member.userId);
        const attendanceCount = attendanceCountByMemberId.get(member.id) ?? 0;
        return {
          ...member,
          displayName: user?.displayName ?? member.userId,
          albionName: user?.albionName,
          discordId: user?.discordId ?? "unknown",
          avatarUrl: user?.avatarUrl,
          attendanceCount,
          attendancePercent: snapshots.length > 0 ? (attendanceCount / snapshots.length) * 100 : 0
        };
      });
    },

    async listCouncilMembers(actor) {
      await requireStaffAccess(actor);
      const [members, users] = await Promise.all([repository.getMembers(), repository.getUsers()]);
      const usersById = new Map(users.map((user) => [user.id, user]));

      return members
        .filter(
          (member) =>
            !member.kickedAt &&
            member.status === "COUNCIL" &&
            member.discordRoleStatus === "COUNCIL"
        )
        .map((member) => {
          const user = usersById.get(member.userId);
          return {
            memberId: member.id,
            userId: member.userId,
            displayName: user?.displayName ?? member.userId,
            discordId: user?.discordId ?? "",
            avatarUrl: user?.avatarUrl
          };
        })
        .sort((left, right) => left.displayName.localeCompare(right.displayName, "es"));
    },

    async listCouncilTasks(actor) {
      await requireStaffAccess(actor);
      const [tasks, members, users] = await Promise.all([
        repository.getCouncilTasks(),
        repository.getMembers(),
        repository.getUsers()
      ]);
      const membersById = new Map(members.map((member) => [member.id, member]));
      const usersById = new Map(users.map((user) => [user.id, user]));

      return tasks.map((task) => {
        const assignedMember = task.assignedMemberId ? membersById.get(task.assignedMemberId) : undefined;
        const assignedUser = assignedMember ? usersById.get(assignedMember.userId) : undefined;
        return {
          ...task,
          assignedDisplayName: assignedUser?.displayName
        };
      });
    },

    async createCouncilTask(actor, input) {
      await requireStaffAccess(actor);
      assertCouncilTaskInput(input);
      await validateCouncilAssignment(repository, input.assignedMemberId);
      const created = await repository.createCouncilTask({
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        assignedMemberId: input.assignedMemberId,
        executeAt: input.executeAt,
        createdBy: actor.id
      });
      return mapCouncilTaskForApi(repository, created);
    },

    async updateCouncilTask(actor, taskId, input) {
      await requireStaffAccess(actor);
      assertCouncilTaskPatch(input);
      await validateCouncilAssignment(repository, input.assignedMemberId);
      const updated = await repository.updateCouncilTask(taskId, {
        title: typeof input.title === "string" ? input.title.trim() : undefined,
        description: typeof input.description === "string" ? input.description.trim() : undefined,
        category: input.category,
        status: input.status,
        assignedMemberId: input.assignedMemberId,
        executeAt: input.executeAt
      });
      if (!updated) {
        throw new DomainError("Council task not found");
      }
      return mapCouncilTaskForApi(repository, updated);
    },

    async updateCouncilTaskStatus(actor, taskId, status) {
      await requireStaffAccess(actor);
      if (status !== "TODO" && status !== "IN_PROGRESS" && status !== "DONE") {
        throw new DomainError("Invalid council task status");
      }
      const updated = await repository.updateCouncilTaskStatus(taskId, status);
      if (!updated) {
        throw new DomainError("Council task not found");
      }
      return mapCouncilTaskForApi(repository, updated);
    },

    async deleteCouncilTask(actor, taskId) {
      await requireStaffAccess(actor);
      const deleted = await repository.deleteCouncilTask(taskId);
      if (!deleted) {
        throw new DomainError("Council task not found");
      }
      return { deleted: true, taskId };
    },

    async getBottledEnergyBalances(actor) {
      await requireStaffAccess(actor);
      const [balances, unmatched] = await Promise.all([
        repository.listBottledEnergyBalances(),
        repository.listBottledEnergyUnmatchedBalances()
      ]);
      return {
        balances,
        unmatched,
        updatedAt: new Date().toISOString()
      };
    },

    async previewBottledEnergyImport(actor, raw) {
      await requireStaffAccess(actor);
      const rows = parseBottledEnergyClipboard(raw);
      if (rows.length === 0) {
        throw new DomainError("No se encontraron filas validas para importar.");
      }

      const users = await repository.getUsers();
      const userByAlbion = buildUserMapByNormalizedAlbionName(users);

      let matchedRows = 0;
      let unmatchedRows = 0;
      const matchedMembers = new Set<string>();
      const unmatchedMembers = new Set<string>();

      for (const row of rows) {
        const user = userByAlbion.get(row.albionPlayerNormalized);
        if (user) {
          matchedRows += 1;
          matchedMembers.add(user.id);
        } else {
          unmatchedRows += 1;
          unmatchedMembers.add(row.albionPlayer);
        }
      }

      return {
        rows: rows.length,
        matchedRows,
        unmatchedRows,
        membersMatched: matchedMembers.size,
        membersUnmatched: unmatchedMembers.size,
        sampleUnmatched: [...unmatchedMembers].slice(0, 12)
      };
    },

    async importBottledEnergy(actor, raw) {
      await requireStaffAccess(actor);
      const rows = parseBottledEnergyClipboard(raw);
      if (rows.length === 0) {
        throw new DomainError("No se encontraron filas validas para importar.");
      }

      const users = await repository.getUsers();
      const userByAlbion = buildUserMapByNormalizedAlbionName(users);
      let matchedRows = 0;
      let unmatchedRows = 0;

      const preparedRows = rows.map((row) => {
        const user = userByAlbion.get(row.albionPlayerNormalized);
        if (user) {
          matchedRows += 1;
        } else {
          unmatchedRows += 1;
        }
        return {
          ...row,
          userId: user?.id
        };
      });

      const result = await repository.importBottledEnergyLedger({
        importedBy: actor.id,
        sourcePreview: raw.slice(0, 500),
        rows: preparedRows
      });

      return {
        importId: result.importId,
        rows: result.totalRows,
        insertedRows: result.insertedRows,
        duplicateRows: result.duplicateRows,
        matchedRows,
        unmatchedRows
      };
    },

    async publishBottledEnergyToDiscord(actor) {
      await requireStaffAccess(actor);
      const channelId = options.discordBottledEnergyChannelId?.trim();
      const botToken = options.discordBotToken?.trim();
      if (!channelId || !botToken) {
        throw new DomainError("Discord no configurado para publicar embotelladas.");
      }

      const balances = await repository.listBottledEnergyBalances();
      const eligible = balances.filter((entry) => entry.discordId?.trim().length > 0);
      if (eligible.length === 0) {
        throw new DomainError("No hay miembros con Discord ID para mencionar.");
      }

      const header = "📦 **Balance embotelladas actualizado**";
      const timestamp = `Actualizado: <t:${Math.floor(Date.now() / 1000)}:f>`;
      const lines = eligible.map(
        (entry) => `• <@${entry.discordId}> · ${entry.balance > 0 ? `+${entry.balance}` : entry.balance}`
      );
      const messages = buildDiscordMessageChunks([header, timestamp, ...lines], 1800);

      for (const message of messages) {
        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: "POST",
          headers: {
            authorization: `Bot ${botToken}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            content: message,
            allowed_mentions: {
              parse: ["users"]
            }
          })
        });
        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new DomainError(`Discord error al publicar embotelladas (${response.status}): ${body}`);
        }
      }

      return {
        sent: true,
        channelId,
        mentioned: eligible.length,
        messages: messages.length
      };
    },

    async resetBottledEnergy(actor) {
      await requireStaffAccess(actor);
      const result = await repository.resetBottledEnergyLedger();
      return {
        reset: true,
        deletedLedgerRows: result.deletedLedgerRows,
        deletedImportRows: result.deletedImportRows
      };
    },

    async listAssignableCompPlayers(actor) {
      await requireStaffAccess(actor);

      const [members, users] = await Promise.all([repository.getMembers(), repository.getUsers()]);
      const usersById = new Map(users.map((user) => [user.id, user]));

      return members
        .filter(
          (member) =>
            (member.status === "TRIAL" ||
              member.status === "CORE" ||
              member.status === "COUNCIL") &&
            member.discordRoleStatus === member.status
        )
        .map((member) => {
          const user = usersById.get(member.userId);
          return {
            ...member,
            displayName: user?.displayName ?? member.userId,
            discordId: user?.discordId ?? "unknown",
            avatarUrl: user?.avatarUrl
          };
        })
        .sort((left, right) => left.displayName.localeCompare(right.displayName));
    },

    async listCtas() {
      const ctas = await repository.getCtas();
      const [comps, signups, members] = await Promise.all([
        repository.getComps(),
        Promise.all(ctas.map((cta) => repository.getCtaSignups(cta.id))),
        repository.getMembers()
      ]);

      const compsById = new Map(comps.map((comp) => [comp.id, comp]));
      const signupsByCtaId = new Map<string, Awaited<ReturnType<DatabaseRepository["getCtaSignups"]>>>();
      const membersById = new Map(members.map((member) => [member.id, member]));

      ctas.forEach((cta, index) => {
        signupsByCtaId.set(cta.id, signups[index] ?? []);
      });

      return ctas.map((cta) => {
        const comp = cta.compId ? compsById.get(cta.compId) : undefined;
        const ctaSignups = signupsByCtaId.get(cta.id) ?? [];
        const ctaFillers = ctaSignups.filter((entry) => entry.isFill || entry.slotKey === "__FILL__");
        const signupParties = comp
          ? comp.parties.map((party) => ({
              partyKey: party.key,
              partyName: party.name,
              slots: party.slots.map((slot) => {
                const slotKey = `${party.key}:${slot.position}`;
                const signup = ctaSignups.find((entry) => entry.slotKey === slotKey);

                return {
                  slotKey,
                  role: slot.role,
                  label: slot.label,
                  weaponId: slot.weaponId,
                  weaponName: slot.weaponName,
                  buildId: slot.buildId,
                  playerName: signup?.playerName,
                  playerUserId: signup ? membersById.get(signup.memberId)?.userId : undefined
                };
              })
            }))
          : [];
        const signupCategories = comp
          ? compRoleOrder
              .map((role) => {
                const slots = comp.parties.flatMap((party) =>
                  party.slots
                    .filter((slot) => slot.role === role)
                    .map((slot) => {
                      const slotKey = `${party.key}:${slot.position}`;
                      const signup = ctaSignups.find((entry) => entry.slotKey === slotKey);

                      return {
                        slotKey,
                        label: slot.label,
                        weaponName: slot.weaponName,
                        reactionEmoji: signup?.reactionEmoji,
                        playerName: signup?.playerName
                      };
                    })
                );

                if (slots.length === 0) {
                  return null;
                }

                return {
                  role,
                  slots
                };
              })
              .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
          : [];

        return {
          ...cta,
          compName: comp?.name,
          signupFillers: ctaFillers.map((entry) => ({
            memberId: entry.memberId,
            playerName: entry.playerName,
            playerUserId: membersById.get(entry.memberId)?.userId,
            preferredRoles: entry.preferredRoles ?? []
          })),
          signupParties,
          signupCategories
        };
      });
    },

    async signupForFill(actor, input) {
      await this.requirePrivateAccess(actor);
      const member = await repository.getMemberByUserId(actor.id);
      if (!member) {
        throw new DomainError("Member not found");
      }

      const cta = await repository.getCtaById(input.ctaId);
      if (!cta || (cta.status !== "OPEN" && cta.status !== "CREATED")) {
        throw new DomainError("CTA not found or not available for signup");
      }

      const normalizedRoles = input.roles.map((role) => role.trim()).filter(Boolean);
      if (normalizedRoles.length < 2 || normalizedRoles.length > 4) {
        throw new DomainError("roles must contain between 2 and 4 entries");
      }

      const existingSignups = await repository.getCtaSignups(cta.id);
      const alreadySigned = existingSignups.some((entry) => entry.memberId === member.id);
      if (alreadySigned) {
        throw new DomainError("Ya estas apuntado en esta CTA");
      }

      await repository.upsertCtaSignup({
        ctaId: cta.id,
        memberId: member.id,
        role: normalizedRoles[0],
        slotKey: "__FILL__",
        slotLabel: "Para fillear",
        weaponName: "",
        playerName: actor.displayName,
        preferredRoles: normalizedRoles,
        isFill: true
      });
      await repository.upsertAttendance({
        ctaId: cta.id,
        memberId: member.id,
        decision: "YES",
        state: "ABSENT"
      });

      return {
        ok: true,
        filler: {
          memberId: member.id,
          playerName: actor.displayName,
          playerUserId: actor.id,
          preferredRoles: normalizedRoles
        }
      };
    },

    async getRanking(input) {
      await syncLatestBattlePerformanceSnapshots({
        repository,
        killboard,
        guildId: options.albionBattlesGuildId?.trim() || undefined,
        guildName: options.albionBattlesGuildName?.trim() || undefined,
        minGuildPlayers: options.albionBattlesMinGuildPlayers,
        limit: options.albionBattlesLimit
      });

      const [members, users, snapshots, attendances] = await Promise.all([
        repository.getMembers(),
        repository.getUsers(),
        repository.getBattlePerformanceSnapshots(),
        repository.getBattleMemberAttendances()
      ]);
      const selectedMonth = resolveSelectedMonth(input?.month);
      const selectedMonthLabel = formatSelectedMonthLabel(selectedMonth);
      const monthRange = getMonthRange(selectedMonth);

      const usersById = new Map(users.map((user) => [user.id, user]));
      const attendanceCountByMemberId = new Map<string, number>();
      const snapshotIdsInMonth = new Set(
        snapshots
          .filter((snapshot) => {
            const time = new Date(snapshot.startTime).getTime();
            return time >= monthRange.start.getTime() && time < monthRange.end.getTime();
          })
          .map((snapshot) => snapshot.battleId)
      );

      for (const attendance of attendances) {
        if (!snapshotIdsInMonth.has(attendance.battleId)) {
          continue;
        }
        attendanceCountByMemberId.set(
          attendance.memberId,
          (attendanceCountByMemberId.get(attendance.memberId) ?? 0) + 1
        );
      }

      const totalBattles = snapshotIdsInMonth.size;

      const entries = members
        .filter((member) => !member.kickedAt)
        .map((member) => {
          const attendanceCount = attendanceCountByMemberId.get(member.id) ?? 0;
          const attendancePercent = totalBattles > 0 ? (attendanceCount / totalBattles) * 100 : 0;
          const user = usersById.get(member.userId);
          const displayName = user?.displayName ?? member.userId;

          return {
            memberId: member.id,
            displayName,
            avatarUrl: user?.avatarUrl,
            attendanceCount,
            attendancePercent
          };
        })
        .sort((left, right) => {
          if (right.attendanceCount !== left.attendanceCount) {
            return right.attendanceCount - left.attendanceCount;
          }

          if (right.attendancePercent !== left.attendancePercent) {
            return right.attendancePercent - left.attendancePercent;
          }

          return left.displayName.localeCompare(right.displayName, "es");
        });

      return {
        selectedMonth,
        selectedMonthLabel,
        pagination: {
          previousMonth: shiftMonth(selectedMonth, -1),
          nextMonth: shiftMonth(selectedMonth, 1)
        },
        entries
      };
    },

    async listBattles(actor) {
      const actorMember = await repository.getMemberByUserId(actor.id);
      if (!memberHasPrivateAccess(actorMember)) {
        throw new DomainError(
          "Private dashboard access requires guild recruitment approval via Discord"
        );
      }

      const guildId = options.albionBattlesGuildId?.trim() || undefined;
      const guildName = options.albionBattlesGuildName?.trim() || undefined;

       console.log("[battles] config", {
        guildId,
        guildName,
        minGuildPlayers: options.albionBattlesMinGuildPlayers,
        limit: options.albionBattlesLimit
      });

      if (!guildId && !guildName) {
        console.log("[battles] skipped: no guild configured");
        return {
          guildId: undefined,
          guildName: undefined,
          minGuildPlayers: options.albionBattlesMinGuildPlayers,
          battles: []
        };
      }

      const result = await killboard.fetchRecentGuildBattles({
        guildId,
        guildName,
        minGuildPlayers: options.albionBattlesMinGuildPlayers,
        limit: options.albionBattlesLimit
      });
      const battles = result.battles;
      const battlesWithRosterSplit = await syncBattlesWithRosterSplit({
        repository,
        killboard,
        battles,
        guildId: result.guildId ?? guildId,
        guildName
      });

      console.log("[battles] result", {
        guildId: result.guildId ?? guildId,
        guildName: battles[0]?.guildName ?? guildName,
        count: battles.length
      });

      return {
        guildId: result.guildId ?? guildId,
        guildName: battles[0]?.guildName ?? guildName,
        minGuildPlayers: options.albionBattlesMinGuildPlayers,
        battles: battlesWithRosterSplit
      };
    },

    async getBattleDetail(actor, battleId) {
      const actorMember = await repository.getMemberByUserId(actor.id);
      if (!memberHasPrivateAccess(actorMember)) {
        throw new DomainError(
          "Private dashboard access requires guild recruitment approval via Discord"
        );
      }

      const guildId = options.albionBattlesGuildId?.trim() || undefined;
      const guildName = options.albionBattlesGuildName?.trim() || undefined;

      if (!guildId && !guildName) {
        return null;
      }

      const battle = await killboard.fetchGuildBattleDetail({
        battleId,
        guildId,
        guildName
      });

      if (!battle) {
        return null;
      }

      const [members, users] = await Promise.all([repository.getMembers(), repository.getUsers()]);
      const rosterGroupsSummary = buildRosterGroupsSummary({
        battle,
        members,
        users,
        configuredGuildName: guildName
      });

      return {
        ...battle,
        rosterGroupsSummary
      };
    },

    async createCta(actor, title, datetimeUtc, compId) {
      await requireCtaManager(actor);
      let resolvedCompId: string | undefined;
      if (compId) {
        const comp = await repository.getCompById(compId);
        if (!comp) {
          throw new DomainError("Comp not found");
        }
        resolvedCompId = comp.id;
      }
      const cta = await repository.createCta({
        title,
        datetimeUtc,
        createdBy: actor.id,
        initialStatus: "CREATED",
        compId: resolvedCompId
      });

      const nextStatus = transitionCtaStatus(cta.status, "OPEN");
      const updated = await repository.updateCtaStatus(cta.id, nextStatus);
      if (!updated) {
        throw new Error("CTA not found after creation");
      }

      return updated;
    },

    async finalizeCta(actor, ctaId) {
      await requireCtaManager(actor);
      const cta = await repository.getCtaById(ctaId);
      if (!cta) {
        throw new Error("CTA not found");
      }

      if (cta.status === "FINALIZED") {
        const generatedPoints = (await repository.getPointsHistory())
          .filter((entry) => entry.ctaId === ctaId && entry.reason === "attendance" && !entry.reversedAt)
          .map((entry) => ({ memberId: entry.memberId, points: entry.points }));

        return { cta, generatedPoints };
      }

      const nextStatus = transitionCtaStatus(cta.status, "FINALIZED");
      const updated = await repository.updateCtaStatus(cta.id, nextStatus);
      if (!updated) {
        throw new Error("CTA not found during finalization");
      }

      const generatedPoints = await repository.regenerateAttendancePointsForCta(cta.id);

      return {
        cta: updated,
        generatedPoints: generatedPoints.map((entry) => ({
          memberId: entry.memberId,
          points: entry.points
        }))
      };
    },

    async cancelCta(actor, ctaId) {
      await requireCtaManager(actor);
      const cta = await repository.getCtaById(ctaId);
      if (!cta) {
        throw new Error("CTA not found");
      }

      if (cta.status === "FINALIZED") {
        throw new DomainError("Finalized CTA cannot be canceled");
      }

      if (cta.status === "CANCELED") {
        return { cta, canceledSignups: 0 };
      }

      const signups = await repository.getCtaSignups(cta.id);
      for (const signup of signups) {
        await repository.deleteCtaSignup(cta.id, signup.memberId);
        await repository.deleteAttendance(cta.id, signup.memberId);
      }

      const nextStatus = transitionCtaStatus(cta.status, "CANCELED");
      const updated = await repository.updateCtaStatus(cta.id, nextStatus);
      if (!updated) {
        throw new Error("CTA not found during cancelation");
      }

      return { cta: updated, canceledSignups: signups.length };
    },

    async updateMemberStatus(actor, memberId, nextStatus) {
      await requireStaffAccess(actor);
      const member = await repository.getMemberById(memberId);
      if (!member) {
        throw new Error("Member not found");
      }

      const status = transitionMemberStatus(member.status, nextStatus);
      const updated = await repository.updateMemberStatus(memberId, status);
      if (!updated) {
        throw new Error("Member not found during status update");
      }

      return updated;
    },

    async kickMember(actor, memberId, reason) {
      await requireStaffAccess(actor);
      const member = await repository.getMemberById(memberId);
      if (!member) {
        throw new DomainError("Member not found");
      }

      const updated = await repository.kickMember(memberId, {
        kickedByUserId: actor.id,
        reason
      });

      if (!updated) {
        throw new DomainError("Member not found");
      }

      return updated;
    },

    async updateMemberBombGroup(actor, memberId, bombGroupName) {
      await requireStaffAccess(actor);
      const member = await repository.getMemberById(memberId);
      if (!member) {
        throw new Error("Member not found");
      }

      const updated = await repository.updateMemberBombGroup(memberId, bombGroupName);
      if (!updated) {
        throw new Error("Member not found during bomb group update");
      }

      return updated;
    },

    async approveRegear(actor, regearId) {
      await requireStaffAccess(actor);
      return { approved: true, regearId };
    },

    async listComps() {
      return repository.getComps();
    },

    async saveComp(actor, input) {
      await requireStaffAccess(actor);
      return repository.saveComp({
        ...input,
        createdBy: input.createdBy || actor.id
      });
    },

    async listBuildTemplates(actor) {
      const builds = await repository.getBuildTemplates();
      return builds.map((build) => ({
        ...build,
        items: build.items.map((item) => ({
          ...item,
          itemId: canonicalizeToT8PlainItemId(item.itemId)
        }))
      }));
    },

    async saveBuildTemplate(actor, input) {
      await requireStaffAccess(actor);
      const normalizedItems = input.items.map((item) => ({
        ...item,
        itemId: canonicalizeToT8PlainItemId(item.itemId)
      }));
      return repository.saveBuildTemplate({
        ...input,
        items: normalizedItems,
        createdBy: input.createdBy || actor.id
      });
    },

    async deleteBuildTemplate(actor, buildId) {
      await requireStaffAccess(actor);
      const deleted = await repository.deleteBuildTemplate(buildId);
      if (!deleted) {
        throw new Error("Build not found");
      }
      return { deleted: true, buildId };
    },

    async assignCtaSlot(actor, input) {
      await requireCtaManager(actor);

      const cta = await repository.getCtaById(input.ctaId);
      if (!cta) {
        throw new Error("CTA not found");
      }

      if (!cta.compId) {
        throw new DomainError("CTA does not have a linked composition");
      }

      const comp = await repository.getCompById(cta.compId);
      if (!comp) {
        throw new Error("Comp not found");
      }

      const targetSlot = comp.parties
        .flatMap((party) =>
          party.slots.map((slot) => ({
            slotKey: `${party.key}:${slot.position}`,
            role: slot.role,
            label: slot.label,
            weaponName: slot.weaponName
          }))
        )
        .find((slot) => slot.slotKey === input.slotKey);

      if (!targetSlot) {
        throw new DomainError("CTA slot not found");
      }

      const signups = await repository.getCtaSignups(cta.id);
      const existingSlotSignup = signups.find((signup) => signup.slotKey === input.slotKey);
      if (existingSlotSignup) {
        if (!input.playerUserId) {
          const preferredRoles = Array.from(
            new Set(
              [existingSlotSignup.weaponName, existingSlotSignup.role, targetSlot.weaponName, targetSlot.role]
                .map((entry) => entry?.trim())
                .filter((entry): entry is string => Boolean(entry))
            )
          ).slice(0, 4);

          await repository.upsertCtaSignup({
            ctaId: cta.id,
            memberId: existingSlotSignup.memberId,
            role: preferredRoles[0] || existingSlotSignup.role || targetSlot.role,
            slotKey: "__FILL__",
            slotLabel: "Para fillear",
            weaponName: "",
            playerName: existingSlotSignup.playerName,
            preferredRoles,
            isFill: true
          });
          await repository.upsertAttendance({
            ctaId: cta.id,
            memberId: existingSlotSignup.memberId,
            decision: "YES",
            state: "ABSENT"
          });
        } else {
          await repository.deleteCtaSignup(cta.id, existingSlotSignup.memberId);
          await repository.deleteAttendance(cta.id, existingSlotSignup.memberId);
        }
      }

      if (!input.playerUserId) {
        return { ok: true };
      }

      const member = await repository.getMemberByUserId(input.playerUserId);
      if (!member) {
        throw new DomainError("Member not found for selected player");
      }

      const user = await repository.getUserById(input.playerUserId);
      if (!user) {
        throw new DomainError("User not found for selected player");
      }

      const existingMemberSignup = signups.find((signup) => signup.memberId === member.id);
      if (existingMemberSignup && existingMemberSignup.slotKey !== input.slotKey) {
        await repository.deleteCtaSignup(cta.id, member.id);
        await repository.deleteAttendance(cta.id, member.id);
      }

      await repository.upsertCtaSignup({
        ctaId: cta.id,
        memberId: member.id,
        role: targetSlot.role,
        slotKey: targetSlot.slotKey,
        slotLabel: targetSlot.label,
        weaponName: targetSlot.weaponName,
        playerName: user.displayName,
        preferredRoles: [],
        isFill: false
      });
      await repository.upsertAttendance({
        ctaId: cta.id,
        memberId: member.id,
        decision: "YES",
        state: "ABSENT"
      });

      return { ok: true };
    },

    async deleteComp(actor, compId) {
      await requireStaffAccess(actor);
      const deleted = await repository.deleteComp(compId);

      if (!deleted) {
        throw new Error("Comp not found");
      }

      return { deleted: true, compId };
    }
  };
}

function normalizeRosterPlayerName(value?: string): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function normalizeGuildName(value?: string): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function formatUtcDayKey(value: string, forcedDay?: number): string {
  const date = new Date(value);
  const day = String(forcedDay ?? date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${year}-${month}-${day}`;
}

function resolveSelectedMonth(value?: string): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(month: string) {
  const [year, rawMonth] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, rawMonth - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, rawMonth, 1, 0, 0, 0, 0));
  return { start, end };
}

function shiftMonth(month: string, delta: number): string {
  const [year, rawMonth] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, rawMonth - 1 + delta, 1, 0, 0, 0, 0));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatSelectedMonthLabel(month: string): string {
  const [year, rawMonth] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, rawMonth - 1, 1, 0, 0, 0, 0)));
}

type AlbionBbPlayerStatsEntry = {
  albionId: number;
  startedAt: string;
  guildName: string;
  kills: number;
  deaths: number;
  killFame: number;
  deathFame: number;
  ip: number;
  heal: number;
  damage: number;
};

function clampMinPlayers(value?: number): number {
  if (!Number.isFinite(value)) {
    return 10;
  }
  return Math.min(100, Math.max(1, Math.floor(value as number)));
}

function extractAlbionBbStatsEntries(payload: unknown): AlbionBbPlayerStatsEntry[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { entries?: unknown[] }).entries)
      ? (payload as { entries: unknown[] }).entries
      : [];

  const entries: AlbionBbPlayerStatsEntry[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const albionId = readNumber(entry, "albionId");
    const startedAt = readString(entry, "startedAt");
    if (!startedAt) {
      continue;
    }
    entries.push({
      albionId,
      startedAt,
      guildName: readString(entry, "guildName"),
      kills: readNumber(entry, "kills"),
      deaths: readNumber(entry, "deaths"),
      killFame: readNumber(entry, "killFame"),
      deathFame: readNumber(entry, "deathFame"),
      ip: readNumber(entry, "ip"),
      heal: readNumber(entry, "heal"),
      damage: readNumber(entry, "damage")
    });
  }

  return entries;
}

function normalizeDateOnly(value?: string): string | null {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function filterAlbionBbEntriesByDate(
  entries: AlbionBbPlayerStatsEntry[],
  start?: string,
  end?: string
): AlbionBbPlayerStatsEntry[] {
  const startDate = normalizeDateOnly(start);
  const endDate = normalizeDateOnly(end);
  if (!startDate && !endDate) {
    return entries;
  }

  return entries.filter((entry) => {
    const entryDate = normalizeDateOnly(entry.startedAt);
    if (!entryDate) {
      return false;
    }
    if (startDate && entryDate < startDate) {
      return false;
    }
    if (endDate && entryDate > endDate) {
      return false;
    }
    return true;
  });
}

function pickAlbionSearchPlayer(payload: unknown, query: string): { id: string; name: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const players =
    (payload as { players?: unknown[] }).players ??
    (payload as { Players?: unknown[] }).Players ??
    [];
  const normalizedQuery = query.trim().toLowerCase();
  let fallback: { id: string; name: string } | null = null;

  for (const entry of players) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const id = readString(entry, "Id") || readString(entry, "id");
    const name = readString(entry, "Name") || readString(entry, "name");
    if (!id || !name) {
      continue;
    }

    const candidate = { id, name };
    if (!fallback) {
      fallback = candidate;
    }
    if (name.trim().toLowerCase() === normalizedQuery) {
      return candidate;
    }
  }

  return fallback;
}

function readString(input: unknown, key: string): string {
  if (!input || typeof input !== "object") {
    return "";
  }
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function readNumber(input: unknown, key: string): number {
  if (!input || typeof input !== "object") {
    return 0;
  }
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function extractPreviousGuildNames(payload: unknown, currentGuildName?: string): string[] {
  const history = extractGuildHistory(payload, currentGuildName);
  return [...new Set(history.map((entry) => entry.guildName))];
}

function extractGuildHistory(
  payload: unknown,
  currentGuildName?: string
): Array<{ guildName: string; joinedAt?: string; leftAt?: string }> {
  const entries = resolveGuildHistoryEntries(payload);
  const normalizedCurrent = currentGuildName?.trim().toLowerCase();
  const result: Array<{ guildName: string; joinedAt?: string; leftAt?: string }> = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const guildName =
      readString(entry, "Name") ||
      readString(entry, "GuildName") ||
      readString(entry, "guildName") ||
      readString(entry, "guild_name") ||
      readString(entry, "GName") ||
      readString(entry, "PreviousGuildName");
    const normalizedName = guildName.trim().toLowerCase();
    if (!normalizedName || normalizedName === normalizedCurrent) {
      continue;
    }

    const joinedAt =
      readString(entry, "Joined") ||
      readString(entry, "JoinDate") ||
      readString(entry, "Start") ||
      readString(entry, "Started") ||
      readString(entry, "TimeStamp") ||
      undefined;
    const leftAt =
      readString(entry, "Left") ||
      readString(entry, "LeaveDate") ||
      readString(entry, "End") ||
      readString(entry, "Ended") ||
      undefined;

    const dedupeKey = `${normalizedName}:${joinedAt ?? ""}:${leftAt ?? ""}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    result.push({
      guildName,
      joinedAt,
      leftAt
    });
  }

  return result;
}

function resolveGuildHistoryEntries(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.guilds,
    record.Guilds,
    record.history,
    record.History,
    record.data,
    record.Data,
    record.items,
    record.Items
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

async function fetchJsonSafe(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json"
      }
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

const albionDbGuildHistoryCache = new Map<
  string,
  {
    expiresAt: number;
    history: Array<{ guildName: string; joinedAt?: string; leftAt?: string }>;
  }
>();
const ALBION_DB_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

async function fetchAlbionDbGuildHistory(
  playerName: string
): Promise<{
  history: Array<{ guildName: string; joinedAt?: string; leftAt?: string }>;
  source: "albiondb" | "unavailable";
  note?: string;
}> {
  const key = playerName.trim().toLowerCase();
  if (!key) {
    return { history: [], source: "unavailable" };
  }

  const cached = albionDbGuildHistoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { history: cached.history, source: cached.history.length > 0 ? "albiondb" : "unavailable" };
  }

  try {
    const response = await fetch(`https://europe.albiondb.net/player/${encodeURIComponent(playerName)}`, {
      headers: {
        "user-agent": "TheHundredBot/1.0 (+https://thehundredalbion.com)",
        accept: "text/html"
      }
    });
    if (!response.ok) {
      return { history: [], source: "unavailable", note: "AlbionDB respondió con error HTTP" };
    }

    const html = await response.text();
    if (html.includes("Just a moment...") || html.includes("cf_chl_")) {
      return {
        history: [],
        source: "unavailable",
        note: "AlbionDB protegido por Cloudflare challenge para requests de servidor"
      };
    }
    const parsed = parseAlbionDbGuildHistoryFromHtml(html);
    albionDbGuildHistoryCache.set(key, {
      expiresAt: Date.now() + ALBION_DB_CACHE_TTL_MS,
      history: parsed
    });
    return { history: parsed, source: parsed.length > 0 ? "albiondb" : "unavailable" };
  } catch {
    return { history: [], source: "unavailable", note: "No se pudo consultar AlbionDB desde servidor" };
  }
}

function parseAlbionDbGuildHistoryFromHtml(
  html: string
): Array<{ guildName: string; joinedAt?: string; leftAt?: string }> {
  const guildHistoryBlockMatch = html.match(/Guild History[\s\S]*?(<table[\s\S]*?<\/table>)/i);
  const block = guildHistoryBlockMatch ? guildHistoryBlockMatch[1] : html;
  const rows = [...block.matchAll(/<tr[\s\S]*?<\/tr>/gi)];
  const history: Array<{ guildName: string; joinedAt?: string; leftAt?: string }> = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const rowHtml = row[0];
    const guildLinkMatch = rowHtml.match(/\/guild\/[^"]*">([^<]+)</i);
    const guildName = decodeHtmlEntities((guildLinkMatch?.[1] ?? "").trim());
    if (!guildName) {
      continue;
    }

    const cols = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) =>
      decodeHtmlEntities(stripHtml(match[1]).trim())
    );
    const joinedAt = cols.length >= 2 ? normalizeAlbionDbDate(cols[1]) : undefined;
    const leftAt = cols.length >= 3 ? normalizeAlbionDbDate(cols[2]) : undefined;
    const dedupeKey = `${guildName.toLowerCase()}:${joinedAt ?? ""}:${leftAt ?? ""}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    history.push({ guildName, joinedAt, leftAt });
  }

  return history;
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function normalizeAlbionDbDate(value?: string): string | undefined {
  const clean = value?.trim();
  if (!clean || /^n\/a$/i.test(clean) || /^-+$/.test(clean)) {
    return undefined;
  }
  return clean;
}

type AlbionItemIndexEntry = {
  id: string;
  name: string;
  search: string;
  tier: number;
};

const ALBION_ITEMS_DUMP_URL =
  "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json";
const ALBION_ITEM_INDEX_TTL_MS = 1000 * 60 * 60 * 6;

let albionItemIndexCache:
  | {
      expiresAt: number;
      items: AlbionItemIndexEntry[];
    }
  | undefined;
let albionItemIndexLoading: Promise<AlbionItemIndexEntry[]> | undefined;

async function searchAlbionItemsCatalog(
  query: string,
  slot?: BuildTemplateItemSlot
): Promise<
  Array<{
    id: string;
    name: string;
    iconUrl: string;
  }>
> {
  const allItems = await getAlbionItemIndex();
  const normalizedQuery = normalizeItemSearchValue(query);
  if (!normalizedQuery) {
    return [];
  }

  const matched = allItems
    .filter((item) => (slot ? isItemAllowedForSlot(item.id, slot) : true))
    .filter((item) => item.search.includes(normalizedQuery))
    .slice(0, 80);

  return matched.map((item) => ({
    id: item.id,
    name: item.name,
    iconUrl: `https://render.albiononline.com/v1/item/${encodeURIComponent(item.id)}.png?locale=en&size=128&quality=1`
  }));
}

function isItemAllowedForSlot(itemId: string, slot: BuildTemplateItemSlot): boolean {
  const value = itemId.toUpperCase();
  switch (slot) {
    case "MAIN_HAND":
      return value.includes("_MAIN_") || value.includes("_2H_");
    case "OFF_HAND":
      return (
        value.includes("_OFF_") ||
        value.includes("_SHIELD") ||
        value.includes("_ORB") ||
        value.includes("_TORCH") ||
        value.includes("_BOOK") ||
        value.includes("_HORN") ||
        value.includes("_TOTEM")
      );
    case "HEAD":
      return value.includes("_HEAD_");
    case "ARMOR":
      return value.includes("_ARMOR_");
    case "SHOES":
      return value.includes("_SHOES_");
    case "CAPE":
      return value.includes("_CAPE");
    case "BAG":
      return value.includes("_BAG");
    case "MOUNT":
      return value.includes("_MOUNT");
    case "FOOD":
      return value.includes("_MEAL_");
    case "POTION":
      return value.includes("_POTION_");
    default:
      return true;
  }
}

async function getAlbionItemIndex(): Promise<AlbionItemIndexEntry[]> {
  const cached = albionItemIndexCache;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.items;
  }

  if (albionItemIndexLoading) {
    return albionItemIndexLoading;
  }

  albionItemIndexLoading = (async () => {
    const payload = await fetchJsonSafe(ALBION_ITEMS_DUMP_URL);
    const rows = Array.isArray(payload) ? payload : [];
    const mapped = rows
      .map((entry) => mapAlbionItemIndexEntry(entry))
      .filter((entry): entry is AlbionItemIndexEntry => Boolean(entry));
    const deduped = new Map<string, AlbionItemIndexEntry>();
    for (const item of mapped) {
      const existing = deduped.get(item.id);
      if (!existing || item.tier >= existing.tier) {
        deduped.set(item.id, item);
      }
    }

    albionItemIndexCache = {
      items: [...deduped.values()],
      expiresAt: Date.now() + ALBION_ITEM_INDEX_TTL_MS
    };
    albionItemIndexLoading = undefined;
    return mapped;
  })().catch((error) => {
    albionItemIndexLoading = undefined;
    throw error;
  });

  return albionItemIndexLoading;
}

function mapAlbionItemIndexEntry(value: unknown): AlbionItemIndexEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const uniqueName = typeof record.UniqueName === "string" ? record.UniqueName.trim() : "";
  if (!uniqueName) {
    return null;
  }
  const upperUniqueName = uniqueName.toUpperCase();
  if (upperUniqueName.includes("_ARTEFACT_")) {
    return null;
  }
  const keepsOriginalTier = isTierPreservedItemId(upperUniqueName);
  const isMount = isMountItemId(upperUniqueName);
  const tierMatch = upperUniqueName.match(/^T(\d+)_/i);
  const tier = tierMatch ? Number(tierMatch[1]) : 0;
  if (!keepsOriginalTier && tier !== 8) {
    return null;
  }
  if (
    (!isMount && /@\d+/i.test(upperUniqueName)) ||
    /_Q\d+/i.test(upperUniqueName) ||
    /_LEVEL\d+/i.test(upperUniqueName)
  ) {
    return null;
  }

  const localizedNames =
    record.LocalizedNames && typeof record.LocalizedNames === "object"
      ? (record.LocalizedNames as Record<string, unknown>)
      : undefined;
  const preferredName =
    (typeof localizedNames?.["EN-US"] === "string" ? localizedNames["EN-US"] : "") ||
    (typeof localizedNames?.["ES-ES"] === "string" ? localizedNames["ES-ES"] : "") ||
    uniqueName;
  const normalizedName = preferredName.trim();
  if (!normalizedName) {
    return null;
  }
  const canonicalId = keepsOriginalTier
    ? upperUniqueName
    : upperUniqueName.replace(/^T\d+_/i, "T8_");

  return {
    id: canonicalId,
    name: normalizedName,
    search: normalizeItemSearchValue(`${canonicalId} ${upperUniqueName} ${normalizedName}`),
    tier
  };
}

function normalizeItemSearchValue(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalizeToT8PlainItemId(itemId: string): string {
  const trimmed = itemId.trim().toUpperCase();
  if (!trimmed) {
    return trimmed;
  }

  const withoutQuality = trimmed
    .replace(/_Q\d+$/i, "")
    .replace(/_LEVEL\d+$/i, "");

  if (isMountItemId(withoutQuality)) {
    return withoutQuality;
  }

  const withoutEnchant = withoutQuality.replace(/@.*$/, "");

  if (isTierPreservedItemId(withoutEnchant)) {
    return withoutEnchant;
  }

  if (/^T\d+_/i.test(withoutEnchant)) {
    return withoutEnchant.replace(/^T\d+_/i, "T8_");
  }

  return withoutEnchant;
}

function isMountItemId(itemId: string): boolean {
  return /_MOUNT/i.test(itemId);
}

function isTierPreservedItemId(itemId: string): boolean {
  return /_MEAL_|_POTION_|_MOUNT/i.test(itemId);
}

function normalizeAlbionNameForMatch(value?: string): string | null {
  if (!value) {
    return null;
  }
  const normalized = value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function buildUserMapByNormalizedAlbionName(
  users: Array<{ id: string; albionName?: string }>
): Map<string, { id: string }> {
  const mapping = new Map<string, { id: string }>();
  for (const user of users) {
    const normalized = normalizeAlbionNameForMatch(user.albionName);
    if (!normalized) {
      continue;
    }
    if (!mapping.has(normalized)) {
      mapping.set(normalized, { id: user.id });
    }
  }
  return mapping;
}

function parseBottledEnergyClipboard(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const rows: Array<{
    happenedAt: string;
    albionPlayer: string;
    albionPlayerNormalized: string;
    reason: string;
    amount: number;
    rowHash: string;
  }> = [];

  for (const line of lines) {
    if (/^"?date"?\s*\t/i.test(line)) {
      continue;
    }
    const cols = splitTsvLine(line);
    if (cols.length < 4) {
      continue;
    }

    const dateText = cleanTsvCell(cols[0]);
    const player = cleanTsvCell(cols[1]);
    const reason = cleanTsvCell(cols[2]);
    const amountText = cleanTsvCell(cols[3]);
    const amount = Number.parseInt(amountText, 10);
    const happenedAt = parseAlbionClipboardDateToIso(dateText);
    const normalizedPlayer = normalizeAlbionNameForMatch(player);

    if (!happenedAt || !normalizedPlayer || Number.isNaN(amount)) {
      continue;
    }

    const normalizedReason = reason || "Unknown";
    const rowHash = createHash("sha256")
      .update(`${happenedAt}|${normalizedPlayer}|${normalizedReason}|${amount}`)
      .digest("hex");

    rows.push({
      happenedAt,
      albionPlayer: player,
      albionPlayerNormalized: normalizedPlayer,
      reason: normalizedReason,
      amount,
      rowHash
    });
  }

  return rows;
}

function splitTsvLine(line: string): string[] {
  return line.split("\t");
}

function cleanTsvCell(value: string): string {
  return value.replace(/^"+|"+$/g, "").trim();
}

function parseAlbionClipboardDateToIso(value: string): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const withZone = /z$/i.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function buildDiscordMessageChunks(lines: string[], maxLength: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    if (!line) {
      continue;
    }
    const next = current.length === 0 ? line : `${current}\n${line}`;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current.length > 0) {
      chunks.push(current);
    }

    if (line.length <= maxLength) {
      current = line;
    } else {
      chunks.push(line.slice(0, maxLength));
      current = "";
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks.length > 0 ? chunks : ["Sin datos"];
}

function assertCouncilTaskInput(input: {
  title: string;
  description: string;
  category: "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";
  assignedMemberId?: string;
  executeAt?: string;
}) {
  if (!input.title?.trim()) {
    throw new DomainError("Council task title is required");
  }
  if (!input.description?.trim()) {
    throw new DomainError("Council task description is required");
  }
  if (!["LOGISTICA", "ECONOMIA", "CONTENT", "ANUNCIOS"].includes(input.category)) {
    throw new DomainError("Council task category is invalid");
  }
  if (input.executeAt && Number.isNaN(Date.parse(input.executeAt))) {
    throw new DomainError("executeAt must be a valid ISO date");
  }
}

function assertCouncilTaskPatch(input: {
  title?: string;
  description?: string;
  category?: "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";
  assignedMemberId?: string;
  executeAt?: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
}) {
  if (
    input.title === undefined &&
    input.description === undefined &&
    input.category === undefined &&
    input.assignedMemberId === undefined &&
    input.executeAt === undefined &&
    input.status === undefined
  ) {
    throw new DomainError("No council task fields to update");
  }
  if (typeof input.title === "string" && !input.title.trim()) {
    throw new DomainError("Council task title cannot be empty");
  }
  if (typeof input.description === "string" && !input.description.trim()) {
    throw new DomainError("Council task description cannot be empty");
  }
  if (
    input.category !== undefined &&
    !["LOGISTICA", "ECONOMIA", "CONTENT", "ANUNCIOS"].includes(input.category)
  ) {
    throw new DomainError("Council task category is invalid");
  }
  if (input.status !== undefined && !["TODO", "IN_PROGRESS", "DONE"].includes(input.status)) {
    throw new DomainError("Council task status is invalid");
  }
  if (input.executeAt !== undefined && input.executeAt !== "" && Number.isNaN(Date.parse(input.executeAt))) {
    throw new DomainError("executeAt must be a valid ISO date");
  }
}

async function validateCouncilAssignment(
  repository: DatabaseRepository,
  assignedMemberId?: string
) {
  if (!assignedMemberId) {
    return;
  }

  const member = await repository.getMemberById(assignedMemberId);
  if (!member) {
    throw new DomainError("Assigned council member does not exist");
  }
  if (member.kickedAt || member.status !== "COUNCIL" || member.discordRoleStatus !== "COUNCIL") {
    throw new DomainError("Assigned member must be an active council member");
  }
}

async function mapCouncilTaskForApi(
  repository: DatabaseRepository,
  task: {
    id: string;
    title: string;
    description: string;
    category: "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";
    status: "TODO" | "IN_PROGRESS" | "DONE";
    assignedMemberId?: string;
    executeAt?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }
) {
  let assignedDisplayName: string | undefined;
  if (task.assignedMemberId) {
    const [member, users] = await Promise.all([
      repository.getMemberById(task.assignedMemberId),
      repository.getUsers()
    ]);
    if (member) {
      assignedDisplayName = users.find((user) => user.id === member.userId)?.displayName;
    }
  }

  return {
    ...task,
    assignedDisplayName
  };
}

function buildRosterAnalysis(args: {
  battle: GuildBattleDetail;
  members: GuildMember[];
  users: Awaited<ReturnType<DatabaseRepository["getUsers"]>>;
  configuredGuildName?: string;
}) {
  const rosterNameToBomb = new Map<string, string>();
  const rosterNameToMemberId = new Map<string, string>();
  const usersById = new Map(args.users.map((entry) => [entry.id, entry]));
  const targetGuildName = normalizeGuildName(args.configuredGuildName ?? args.battle.guildName);
  const guildPlayers = targetGuildName
    ? args.battle.players.filter(
        (player) => normalizeGuildName(player.guildName) === targetGuildName
      )
    : args.battle.players;

  for (const member of args.members) {
    const user = usersById.get(member.userId);
    const normalizedName = normalizeRosterPlayerName(user?.albionName);
    if (!normalizedName) {
      continue;
    }
    rosterNameToMemberId.set(normalizedName, member.id);
    if (member.bombGroupName) {
      rosterNameToBomb.set(normalizedName, member.bombGroupName);
    }
  }

  const summaryByKey = new Map<
    string,
    {
      key: string;
      label: string;
      type: "BOMB" | "MAIN_ZERG";
      matchedPlayers: number;
      kills: number;
      deaths: number;
    }
  >();
  const matchedMemberIds = new Set<string>();

  for (const player of guildPlayers) {
    const normalizedPlayerName = normalizeRosterPlayerName(player.name) ?? "";
    const assignedBomb = rosterNameToBomb.get(normalizedPlayerName);
    const matchedMemberId = rosterNameToMemberId.get(normalizedPlayerName);
    const key = assignedBomb ? `bomb:${assignedBomb.toLowerCase()}` : "main-zerg";
    const existing = summaryByKey.get(key) ?? {
      key,
      label: assignedBomb ? `Bomb "${assignedBomb}"` : "Main Zerg",
      type: assignedBomb ? ("BOMB" as const) : ("MAIN_ZERG" as const),
      matchedPlayers: 0,
      kills: 0,
      deaths: 0
    };

    existing.matchedPlayers += 1;
    existing.kills += player.kills;
    existing.deaths += player.deaths;
    summaryByKey.set(key, existing);

    if (matchedMemberId) {
      matchedMemberIds.add(matchedMemberId);
    }
  }

  return {
    rosterGroupsSummary: [...summaryByKey.values()].sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "MAIN_ZERG" ? -1 : 1;
      }
      return left.label.localeCompare(right.label, "es");
    }),
    matchedMemberIds: [...matchedMemberIds]
  };
}

function buildRosterGroupsSummary(args: {
  battle: GuildBattleDetail;
  members: GuildMember[];
  users: Awaited<ReturnType<DatabaseRepository["getUsers"]>>;
  configuredGuildName?: string;
}) {
  return buildRosterAnalysis(args).rosterGroupsSummary;
}

async function syncLatestBattlePerformanceSnapshots(args: {
  repository: DatabaseRepository;
  killboard: KillboardClient;
  guildId?: string;
  guildName?: string;
  minGuildPlayers: number;
  limit: number;
}) {
  if (!args.guildId && !args.guildName) {
    return [];
  }

  const result = await args.killboard.fetchRecentGuildBattles({
    guildId: args.guildId,
    guildName: args.guildName,
    minGuildPlayers: args.minGuildPlayers,
    limit: args.limit
  });

  return syncBattlesWithRosterSplit({
    repository: args.repository,
    killboard: args.killboard,
    battles: result.battles,
    guildId: result.guildId ?? args.guildId,
    guildName: args.guildName
  });
}

async function syncBattlesWithRosterSplit(args: {
  repository: DatabaseRepository;
  killboard: KillboardClient;
  battles: GuildBattleSummary[];
  guildId?: string;
  guildName?: string;
}) {
  const [members, users] = await Promise.all([args.repository.getMembers(), args.repository.getUsers()]);

  return Promise.all(
    args.battles.map(async (battle) => {
      const detail = await args.killboard
        .fetchGuildBattleDetail({
          battleId: battle.id,
          guildId: args.guildId,
          guildName: battle.guildName ?? args.guildName
        })
        .catch((error) => {
          console.warn("[battles] skip battle detail due to provider error", {
            battleId: battle.id,
            message: error instanceof Error ? error.message : String(error)
          });
          return null;
        });

      if (!detail) {
        return battle;
      }

      const rosterAnalysis = buildRosterAnalysis({
        battle: detail,
        members,
        users,
        configuredGuildName: args.guildName
      });
      const rosterGroupsSummary = rosterAnalysis.rosterGroupsSummary;

      const mainGroup = rosterGroupsSummary.find((entry) => entry.type === "MAIN_ZERG");
      const bombGroups = rosterGroupsSummary.filter((entry) => entry.type === "BOMB");

      await args.repository.saveBattlePerformanceSnapshot({
        battleId: detail.id,
        startTime: detail.startTime,
        guildName: detail.guildName,
        guildPlayers: detail.guildPlayers,
        guildKills: detail.guildKills,
        guildDeaths: detail.guildDeaths,
        mainKills: mainGroup?.kills ?? 0,
        mainDeaths: mainGroup?.deaths ?? 0,
        bombs: bombGroups.map((group) => ({
          bombGroupName: group.label.replace(/^Bomb "/, "").replace(/"$/, ""),
          players: group.matchedPlayers,
          kills: group.kills,
          deaths: group.deaths
        })),
        memberAttendances: rosterAnalysis.matchedMemberIds.map((memberId) => ({
          memberId
        }))
      });

      return {
        ...battle,
        mainKills: mainGroup?.kills || undefined,
        bombKills: bombGroups.reduce((sum, entry) => sum + entry.kills, 0) || undefined
      };
    })
  );
}

function isPrelaunchActive(options: {
  launchCountdownEnabled: boolean;
  launchAtIso: string;
}): boolean {
  if (!options.launchCountdownEnabled) {
    return false;
  }

  const launchAt = Date.parse(options.launchAtIso);
  if (Number.isNaN(launchAt)) {
    return false;
  }

  return Date.now() < launchAt;
}
