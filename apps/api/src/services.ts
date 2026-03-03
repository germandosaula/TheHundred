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
    avatarUrl?: string;
    timezone: string;
    mainRole: string;
    zvzExperience: string;
    notes?: string;
  }): Promise<{ userId: string; alreadyRegistered: boolean; applicationId: string }>;
  requirePrivateAccess(actor: User): Promise<void>;
  listMembers(actor: User): Promise<
    Array<GuildMember & { displayName: string; discordId: string }>
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
    battles: GuildBattleSummary[];
  }>;
  getBattleDetail(
    actor: User,
    battleId: string
  ): Promise<GuildBattleDetail | null>;
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
        userId = existingUser.id;
        alreadyRegistered = true;
      } else {
        const user = await repository.createUser({
          displayName: input.displayName,
          discordId: input.discordId,
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

    async listMembers(actor) {
      assertOfficerOrAdmin(actor.role);
      const [members, users] = await Promise.all([repository.getMembers(), repository.getUsers()]);
      const usersById = new Map(users.map((user) => [user.id, user]));

      return members.map((member) => {
        const user = usersById.get(member.userId);
        return {
          ...member,
          displayName: user?.displayName ?? member.userId,
          discordId: user?.discordId ?? "unknown",
          avatarUrl: user?.avatarUrl
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

      console.log("[battles] result", {
        guildId: result.guildId ?? guildId,
        guildName: battles[0]?.guildName ?? guildName,
        count: battles.length
      });

      return {
        guildId: result.guildId ?? guildId,
        guildName: battles[0]?.guildName ?? guildName,
        minGuildPlayers: options.albionBattlesMinGuildPlayers,
        battles
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

      return killboard.fetchGuildBattleDetail({
        battleId,
        guildId,
        guildName
      });
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
