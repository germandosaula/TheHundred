import { randomUUID } from "node:crypto";
import {
  type Attendance,
  buildRanking,
  countOpenSlots,
  generateAttendancePointsEntries,
  type CTA,
  type CTAStatus,
  type GuildConfig,
  type GuildMember,
  type MemberStatus,
  type PointsEntry,
  type User,
  type UserRole
} from "@thehundred/domain";
import type {
  CtaSignupRecord,
  CompRecord,
  CompSlotRecord,
  CreateCtaInput,
  DatabaseRepository,
  RecruitmentApplicationRecord,
  RecruitmentApplicationStatus,
  RegisterMemberInput,
  SaveCompInput,
  SaveRecruitmentApplicationInput
} from "./repository.ts";

export interface RepositoryState {
  users: User[];
  members: GuildMember[];
  ctas: CTA[];
  attendance: Attendance[];
  ctaSignups: CtaSignupRecord[];
  pointsHistory: PointsEntry[];
  config: GuildConfig;
  comps: CompRecord[];
  recruitmentApplications: RecruitmentApplicationRecord[];
}

export class InMemoryDatabaseRepository implements DatabaseRepository {
  private readonly state: RepositoryState;

  constructor(state: RepositoryState) {
    this.state = state;
  }

  async getConfig(): Promise<GuildConfig> {
    return this.state.config;
  }

  async getUsers(): Promise<User[]> {
    return this.state.users;
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.state.users.find((user) => user.id === userId) ?? null;
  }

  async getUserByDiscordId(discordId: string): Promise<User | null> {
    return this.state.users.find((user) => user.discordId === discordId) ?? null;
  }

  async createUser(input: RegisterMemberInput & { role?: UserRole }): Promise<User> {
    const user: User = {
      id: randomUUID(),
      discordId: input.discordId,
      displayName: input.displayName,
      role: input.role ?? "PLAYER",
      avatarUrl: input.avatarUrl
    };

    this.state.users.push(user);
    return user;
  }

  async updateUserAvatar(userId: string, avatarUrl?: string): Promise<User | null> {
    const user = this.state.users.find((entry) => entry.id === userId) ?? null;
    if (!user) {
      return null;
    }

    user.avatarUrl = avatarUrl;
    return user;
  }

  async getMembers(): Promise<GuildMember[]> {
    return this.state.members;
  }

  async getMemberById(memberId: string): Promise<GuildMember | null> {
    return this.state.members.find((member) => member.id === memberId) ?? null;
  }

  async getMemberByUserId(userId: string): Promise<GuildMember | null> {
    return this.state.members.find((member) => member.userId === userId) ?? null;
  }

  async createMember(userId: string, status: MemberStatus = "PENDING"): Promise<GuildMember> {
    const member: GuildMember = {
      id: randomUUID(),
      userId,
      status,
      joinedAt: new Date().toISOString(),
      discordRoleStatus: undefined,
      discordRoleSyncedAt: undefined
    };

    this.state.members.push(member);
    return member;
  }

  async updateMemberStatus(memberId: string, status: MemberStatus): Promise<GuildMember | null> {
    const member = this.state.members.find((item) => item.id === memberId) ?? null;
    if (!member) {
      return null;
    }

    member.status = status;
    return member;
  }

  async setMemberDiscordRoleStatus(
    memberId: string,
    status?: MemberStatus,
    syncedAt = new Date().toISOString()
  ): Promise<GuildMember | null> {
    const member = this.state.members.find((item) => item.id === memberId) ?? null;
    if (!member) {
      return null;
    }

    member.discordRoleStatus = status;
    member.discordRoleSyncedAt = status ? syncedAt : undefined;
    return member;
  }

  async getCtas(): Promise<CTA[]> {
    return this.state.ctas;
  }

  async getCtaById(ctaId: string): Promise<CTA | null> {
    return this.state.ctas.find((cta) => cta.id === ctaId) ?? null;
  }

  async getCtaBySignupMessageId(messageId: string): Promise<CTA | null> {
    return this.state.ctas.find((cta) => cta.signupMessageId === messageId) ?? null;
  }

  async createCta(input: CreateCtaInput): Promise<CTA> {
    const cta: CTA = {
      id: randomUUID(),
      title: input.title,
      datetimeUtc: input.datetimeUtc,
      createdBy: input.createdBy,
      status: input.initialStatus,
      compId: input.compId,
      signupChannelId: input.signupChannelId,
      signupMessageId: input.signupMessageId
    };

    this.state.ctas.push(cta);
    return cta;
  }

  async updateCtaStatus(ctaId: string, status: CTAStatus): Promise<CTA | null> {
    const cta = this.state.ctas.find((item) => item.id === ctaId) ?? null;
    if (!cta) {
      return null;
    }

    cta.status = status;
    return cta;
  }

  async attachCtaSignupMessage(
    ctaId: string,
    input: { signupChannelId: string; signupMessageId: string }
  ): Promise<CTA | null> {
    const cta = this.state.ctas.find((item) => item.id === ctaId) ?? null;
    if (!cta) {
      return null;
    }

    cta.signupChannelId = input.signupChannelId;
    cta.signupMessageId = input.signupMessageId;
    return cta;
  }

  async getPointsHistory(): Promise<PointsEntry[]> {
    return this.state.pointsHistory;
  }

  async getAttendanceByCtaId(ctaId: string): Promise<Attendance[]> {
    return this.state.attendance.filter((entry) => entry.ctaId === ctaId);
  }

  async upsertAttendance(input: {
    ctaId: string;
    memberId: string;
    decision: Attendance["decision"];
    state: Attendance["state"];
  }): Promise<Attendance> {
    const existing =
      this.state.attendance.find(
        (entry) => entry.ctaId === input.ctaId && entry.memberId === input.memberId
      ) ?? null;

    if (existing) {
      existing.decision = input.decision;
      existing.state = input.state;
      return existing;
    }

    const next: Attendance = {
      id: randomUUID(),
      ctaId: input.ctaId,
      memberId: input.memberId,
      decision: input.decision,
      state: input.state
    };
    this.state.attendance.push(next);
    return next;
  }

  async deleteAttendance(ctaId: string, memberId: string): Promise<boolean> {
    const next = this.state.attendance.filter(
      (entry) => !(entry.ctaId === ctaId && entry.memberId === memberId)
    );
    const deleted = next.length !== this.state.attendance.length;
    this.state.attendance = next;
    return deleted;
  }

  async regenerateAttendancePointsForCta(ctaId: string): Promise<PointsEntry[]> {
    const now = new Date().toISOString();

    for (const entry of this.state.pointsHistory) {
      if (entry.ctaId === ctaId && entry.reason === "attendance" && !entry.reversedAt) {
        entry.reversedAt = now;
      }
    }

    const entries = generateAttendancePointsEntries({
      ctaId,
      attendances: await this.getAttendanceByCtaId(ctaId),
      members: this.state.members,
      config: this.state.config,
      now
    });

    this.state.pointsHistory.push(...entries);
    return entries;
  }

  async getRanking(): Promise<Array<{ memberId: string; points: number }>> {
    return buildRanking(this.state.pointsHistory);
  }

  async getOpenSlots(): Promise<{ slotsOpen: number; memberCap: number }> {
    return {
      slotsOpen: countOpenSlots(this.state.members, this.state.config),
      memberCap: this.state.config.memberCap
    };
  }

  async getComps(): Promise<CompRecord[]> {
    return [...this.state.comps].sort((left, right) => left.name.localeCompare(right.name));
  }

  async getCompById(compId: string): Promise<CompRecord | null> {
    return this.state.comps.find((comp) => comp.id === compId) ?? null;
  }

  async saveComp(input: SaveCompInput): Promise<CompRecord> {
    const now = new Date().toISOString();
    const comp: CompRecord = {
      id: input.id ?? randomUUID(),
      name: input.name,
      createdBy: input.createdBy,
      updatedAt: now,
      parties: input.parties
        .map((party) => ({
          key: party.key,
          name: party.name,
          position: party.position,
          slots: party.slots
            .map<CompSlotRecord>((slot) => ({
              id: slot.id ?? randomUUID(),
              position: slot.position,
              label: slot.label,
              playerUserId: slot.playerUserId,
              playerName: slot.playerName,
              role: slot.role,
              weaponId: slot.weaponId,
              weaponName: slot.weaponName,
              notes: slot.notes
            }))
            .sort((left, right) => left.position - right.position)
        }))
        .sort((left, right) => left.position - right.position)
    };

    const index = this.state.comps.findIndex((entry) => entry.id === comp.id);
    if (index >= 0) {
      this.state.comps[index] = comp;
    } else {
      this.state.comps.push(comp);
    }

    return comp;
  }

  async deleteComp(compId: string): Promise<boolean> {
    const nextLength = this.state.comps.filter((comp) => comp.id !== compId).length;
    const deleted = nextLength !== this.state.comps.length;
    this.state.comps = this.state.comps.filter((comp) => comp.id !== compId);
    return deleted;
  }

  async getCtaSignups(ctaId: string): Promise<CtaSignupRecord[]> {
    return this.state.ctaSignups
      .filter((entry) => entry.ctaId === ctaId)
      .sort((left, right) => left.reactedAt.localeCompare(right.reactedAt));
  }

  async upsertCtaSignup(input: {
    ctaId: string;
    memberId: string;
    role: string;
    slotKey: string;
    slotLabel: string;
    weaponName: string;
    reactionEmoji?: string;
    playerName: string;
  }): Promise<CtaSignupRecord> {
    const existing =
      this.state.ctaSignups.find(
        (entry) => entry.ctaId === input.ctaId && entry.memberId === input.memberId
      ) ?? null;

    if (existing) {
      existing.role = input.role;
      existing.slotKey = input.slotKey;
      existing.slotLabel = input.slotLabel;
      existing.weaponName = input.weaponName;
      existing.reactionEmoji = input.reactionEmoji;
      existing.playerName = input.playerName;
      existing.reactedAt = new Date().toISOString();
      return existing;
    }

    const next: CtaSignupRecord = {
      id: randomUUID(),
      ctaId: input.ctaId,
      memberId: input.memberId,
      role: input.role,
      slotKey: input.slotKey,
      slotLabel: input.slotLabel,
      weaponName: input.weaponName,
      reactionEmoji: input.reactionEmoji,
      playerName: input.playerName,
      reactedAt: new Date().toISOString()
    };
    this.state.ctaSignups.push(next);
    return next;
  }

  async deleteCtaSignup(ctaId: string, memberId: string): Promise<boolean> {
    const next = this.state.ctaSignups.filter(
      (entry) => !(entry.ctaId === ctaId && entry.memberId === memberId)
    );
    const deleted = next.length !== this.state.ctaSignups.length;
    this.state.ctaSignups = next;
    return deleted;
  }

  async getRecruitmentApplicationByUserId(userId: string): Promise<RecruitmentApplicationRecord | null> {
    return this.state.recruitmentApplications.find((entry) => entry.userId === userId) ?? null;
  }

  async saveRecruitmentApplication(
    input: SaveRecruitmentApplicationInput
  ): Promise<RecruitmentApplicationRecord> {
    const existing = await this.getRecruitmentApplicationByUserId(input.userId);
    const now = new Date().toISOString();

    if (existing) {
      existing.displayName = input.displayName;
      existing.timezone = input.timezone;
      existing.mainRole = input.mainRole;
      existing.zvzExperience = input.zvzExperience;
      existing.notes = input.notes;
      existing.status = "SUBMITTED";
      existing.ticketChannelId = undefined;
      existing.updatedAt = now;
      return existing;
    }

    const next: RecruitmentApplicationRecord = {
      id: randomUUID(),
      userId: input.userId,
      displayName: input.displayName,
      timezone: input.timezone,
      mainRole: input.mainRole,
      zvzExperience: input.zvzExperience,
      notes: input.notes,
      status: "SUBMITTED",
      createdAt: now,
      updatedAt: now
    };

    this.state.recruitmentApplications.push(next);
    return next;
  }

  async listTicketPendingRecruitmentApplications(): Promise<RecruitmentApplicationRecord[]> {
    return this.state.recruitmentApplications.filter(
      (entry) => entry.status === "SUBMITTED" && !entry.ticketChannelId
    );
  }

  async markRecruitmentApplicationTicketOpened(
    applicationId: string,
    ticketChannelId: string
  ): Promise<RecruitmentApplicationRecord | null> {
    const application =
      this.state.recruitmentApplications.find((entry) => entry.id === applicationId) ?? null;
    if (!application) {
      return null;
    }

    application.status = "TICKET_OPEN";
    application.ticketChannelId = ticketChannelId;
    application.updatedAt = new Date().toISOString();
    return application;
  }

  async updateRecruitmentApplicationStatus(
    applicationId: string,
    status: RecruitmentApplicationStatus
  ): Promise<RecruitmentApplicationRecord | null> {
    const application =
      this.state.recruitmentApplications.find((entry) => entry.id === applicationId) ?? null;
    if (!application) {
      return null;
    }

    application.status = status;
    application.updatedAt = new Date().toISOString();
    return application;
  }
}

export function createSeedState(): RepositoryState {
  return {
    users: [
      { id: "u1", discordId: "1001", displayName: "Astra", role: "ADMIN" },
      { id: "u2", discordId: "1002", displayName: "Bram", role: "OFFICER" },
      { id: "u3", discordId: "1003", displayName: "Cyra", role: "PLAYER" }
    ],
    members: [
      {
        id: "m1",
        userId: "u1",
        status: "CORE",
        joinedAt: "2026-02-01T20:00:00Z",
        discordRoleStatus: "CORE",
        discordRoleSyncedAt: "2026-02-01T20:00:00Z"
      },
      {
        id: "m2",
        userId: "u2",
        status: "CORE",
        joinedAt: "2026-02-02T20:00:00Z",
        discordRoleStatus: "CORE",
        discordRoleSyncedAt: "2026-02-02T20:00:00Z"
      },
      {
        id: "m3",
        userId: "u3",
        status: "TRIAL",
        joinedAt: "2026-02-10T20:00:00Z",
        discordRoleStatus: "TRIAL",
        discordRoleSyncedAt: "2026-02-10T20:00:00Z"
      }
    ],
    ctas: [
      {
        id: "cta1",
        title: "Prime Time ZvZ",
        datetimeUtc: "2026-03-02T19:00:00Z",
        status: "OPEN",
        createdBy: "u2"
      }
    ],
    attendance: [
      { id: "a1", ctaId: "cta1", memberId: "m1", decision: "YES", state: "PRESENT" },
      { id: "a2", ctaId: "cta1", memberId: "m2", decision: "YES", state: "ABSENT" },
      { id: "a3", ctaId: "cta1", memberId: "m3", decision: "JUSTIFIED", state: "ABSENT" }
    ],
    ctaSignups: [],
    pointsHistory: [
      {
        id: "p1",
        memberId: "m1",
        ctaId: "cta0",
        reason: "attendance",
        points: 10,
        createdAt: "2026-02-20T20:00:00Z"
      },
      {
        id: "p2",
        memberId: "m2",
        ctaId: "cta0",
        reason: "attendance",
        points: 8,
        createdAt: "2026-02-20T20:00:00Z"
      },
      {
        id: "p3",
        memberId: "m3",
        ctaId: "cta0",
        reason: "attendance",
        points: 6,
        createdAt: "2026-02-20T20:00:00Z"
      }
    ],
    comps: [],
    recruitmentApplications: [],
    config: {
      attendancePoints: 10,
      absencePenalty: 5,
      memberCap: 100
    }
  };
}

export function createSeedRepository(): DatabaseRepository {
  return new InMemoryDatabaseRepository(createSeedState());
}
