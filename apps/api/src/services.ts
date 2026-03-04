import type { DatabaseRepository } from "@thehundred/db";
import type { GuildBattleDetail, GuildBattleSummary, KillboardClient } from "@thehundred/killboard";
import {
  assertOfficerOrAdmin,
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
    avatarUrl?: string;
    timezone: string;
    mainRole: string;
    zvzExperience: string;
    notes?: string;
  }): Promise<{ userId: string; alreadyRegistered: boolean; applicationId: string }>;
  requirePrivateAccess(actor: User): Promise<void>;
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
  listAssignableCompPlayers(actor: User): Promise<
    Array<GuildMember & { displayName: string; discordId: string; avatarUrl?: string }>
  >;
  listCtas(): Promise<
    Array<
      CTA & {
        compName?: string;
        signupParties: Array<{
          partyKey: string;
          partyName: string;
          slots: Array<{
            slotKey: string;
            role: string;
            label: string;
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
  getRanking(): Promise<Array<{ memberId: string; points: number }>>;
  createCta(actor: User, title: string, datetimeUtc: string): Promise<CTA>;
  finalizeCta(
    actor: User,
    ctaId: string
  ): Promise<{ cta: CTA; generatedPoints: Array<{ memberId: string; points: number }> }>;
  updateMemberStatus(actor: User, memberId: string, nextStatus: GuildMember["status"]): Promise<GuildMember>;
  updateMemberBombGroup(actor: User, memberId: string, bombGroupName?: string): Promise<GuildMember>;
  approveRegear(actor: User, regearId: string): Promise<{ approved: true; regearId: string }>;
  listComps(): Promise<Awaited<ReturnType<DatabaseRepository["getComps"]>>>;
  saveComp(
    actor: User,
    input: Parameters<DatabaseRepository["saveComp"]>[0]
  ): Promise<Awaited<ReturnType<DatabaseRepository["saveComp"]>>>;
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
  }
): ApiServices {
  const compRoleOrder = ["Tank", "Healer", "Support", "Melee", "Ranged", "Battlemount"];

  return {
    async getHealth() {
      return {
        ok: true,
        repositoryProvider: options.repositoryProvider,
        supabaseConfigured: options.supabaseConfigured
      };
    },

    async getOpenSlots() {
      return repository.getOpenSlots();
    },

    async registerMember(input) {
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

      return { userId, alreadyRegistered, applicationId: application.id };
    },

    async requirePrivateAccess(actor) {
      const member = await repository.getMemberByUserId(actor.id);
      if (!memberHasPrivateAccess(member)) {
        throw new DomainError(
          "Private dashboard access requires guild recruitment approval via Discord"
        );
      }
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

    async listMembers(actor) {
      assertOfficerOrAdmin(actor.role);
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

      return members.map((member) => {
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

    async listAssignableCompPlayers(actor) {
      const actorMember = await repository.getMemberByUserId(actor.id);
      if (!memberHasPrivateAccess(actorMember)) {
        throw new DomainError(
          "Private dashboard access requires guild recruitment approval via Discord"
        );
      }

      const [members, users] = await Promise.all([repository.getMembers(), repository.getUsers()]);
      const usersById = new Map(users.map((user) => [user.id, user]));

      return members
        .filter(
          (member) =>
            (member.status === "TRIAL" || member.status === "CORE" || member.status === "BENCHED") &&
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
                  weaponName: slot.weaponName,
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
          signupParties,
          signupCategories
        };
      });
    },

    async getRanking() {
      return repository.getRanking();
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

    async createCta(actor, title, datetimeUtc) {
      assertOfficerOrAdmin(actor.role);
      const cta = await repository.createCta({
        title,
        datetimeUtc,
        createdBy: actor.id,
        initialStatus: "CREATED"
      });

      const nextStatus = transitionCtaStatus(cta.status, "OPEN");
      const updated = await repository.updateCtaStatus(cta.id, nextStatus);
      if (!updated) {
        throw new Error("CTA not found after creation");
      }

      return updated;
    },

    async finalizeCta(actor, ctaId) {
      assertOfficerOrAdmin(actor.role);
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

    async updateMemberStatus(actor, memberId, nextStatus) {
      assertOfficerOrAdmin(actor.role);
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

    async updateMemberBombGroup(actor, memberId, bombGroupName) {
      assertOfficerOrAdmin(actor.role);
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
      assertOfficerOrAdmin(actor.role);
      return { approved: true, regearId };
    },

    async listComps() {
      return repository.getComps();
    },

    async saveComp(actor, input) {
      assertOfficerOrAdmin(actor.role);
      return repository.saveComp({
        ...input,
        createdBy: input.createdBy || actor.id
      });
    },

    async assignCtaSlot(actor, input) {
      assertOfficerOrAdmin(actor.role);

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
        await repository.deleteCtaSignup(cta.id, existingSlotSignup.memberId);
        await repository.deleteAttendance(cta.id, existingSlotSignup.memberId);
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
        playerName: user.displayName
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
      assertOfficerOrAdmin(actor.role);
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
