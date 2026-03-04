import type {
  Attendance,
  CTA,
  CTAStatus,
  GuildConfig,
  GuildMember,
  MemberStatus,
  PointsEntry,
  User,
  UserRole
} from "@thehundred/domain";

export interface RegisterMemberInput {
  displayName: string;
  discordId: string;
  albionName: string;
  avatarUrl?: string;
}

export interface CreateCtaInput {
  title: string;
  datetimeUtc: string;
  createdBy: string;
  initialStatus: CTAStatus;
  compId?: string;
  signupChannelId?: string;
  signupMessageId?: string;
}

export type RecruitmentApplicationStatus =
  | "SUBMITTED"
  | "TICKET_OPEN"
  | "APPROVED"
  | "REJECTED";

export interface RecruitmentApplicationRecord {
  id: string;
  userId: string;
  displayName: string;
  timezone: string;
  mainRole: string;
  zvzExperience: string;
  notes: string;
  status: RecruitmentApplicationStatus;
  ticketChannelId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveRecruitmentApplicationInput {
  userId: string;
  displayName: string;
  timezone: string;
  mainRole: string;
  zvzExperience: string;
  notes: string;
}

export interface CompSlotRecord {
  id: string;
  position: number;
  label: string;
  playerUserId?: string;
  playerName: string;
  role: string;
  weaponId: string;
  weaponName: string;
  notes: string;
}

export interface CompPartyRecord {
  key: string;
  name: string;
  position: number;
  slots: CompSlotRecord[];
}

export interface CompRecord {
  id: string;
  name: string;
  createdBy: string;
  updatedAt: string;
  parties: CompPartyRecord[];
}

export interface CtaSignupRecord {
  id: string;
  ctaId: string;
  memberId: string;
  role: string;
  slotKey: string;
  slotLabel: string;
  weaponName: string;
  reactionEmoji?: string;
  playerName: string;
  reactedAt: string;
}

export interface SaveCtaSignupInput {
  ctaId: string;
  memberId: string;
  role: string;
  slotKey: string;
  slotLabel: string;
  weaponName: string;
  reactionEmoji?: string;
  playerName: string;
}

export interface SaveCompInput {
  id?: string;
  name: string;
  createdBy: string;
  parties: Array<{
    key: string;
    name: string;
    position: number;
    slots: Array<{
      id?: string;
      position: number;
      label: string;
      playerUserId?: string;
      playerName: string;
      role: string;
      weaponId: string;
      weaponName: string;
      notes: string;
    }>;
  }>;
}

export interface BattlePerformanceBombRecord {
  battleId: string;
  bombGroupName: string;
  players: number;
  kills: number;
  deaths: number;
}

export interface BattlePerformanceSnapshotRecord {
  battleId: string;
  startTime: string;
  guildName: string;
  guildPlayers: number;
  guildKills: number;
  guildDeaths: number;
  mainKills: number;
  mainDeaths: number;
  processedAt: string;
}

export interface BattleMemberAttendanceRecord {
  battleId: string;
  memberId: string;
}

export interface DatabaseRepository {
  getConfig(): Promise<GuildConfig>;
  getUsers(): Promise<User[]>;
  getUserById(userId: string): Promise<User | null>;
  getUserByDiscordId(discordId: string): Promise<User | null>;
  createUser(input: RegisterMemberInput & { role?: UserRole }): Promise<User>;
  updateUserAvatar(userId: string, avatarUrl?: string): Promise<User | null>;
  updateUserAlbionName(userId: string, albionName: string): Promise<User | null>;
  getMembers(): Promise<GuildMember[]>;
  getMemberById(memberId: string): Promise<GuildMember | null>;
  getMemberByUserId(userId: string): Promise<GuildMember | null>;
  createMember(userId: string, status?: MemberStatus): Promise<GuildMember>;
  updateMemberStatus(memberId: string, status: MemberStatus): Promise<GuildMember | null>;
  kickMember(
    memberId: string,
    input: { kickedByUserId: string; reason?: string }
  ): Promise<GuildMember | null>;
  updateMemberBombGroup(memberId: string, bombGroupName?: string): Promise<GuildMember | null>;
  setMemberDiscordRoleStatus(
    memberId: string,
    status?: MemberStatus,
    syncedAt?: string
  ): Promise<GuildMember | null>;
  getCtas(): Promise<CTA[]>;
  getCtaById(ctaId: string): Promise<CTA | null>;
  getCtaBySignupMessageId(messageId: string): Promise<CTA | null>;
  createCta(input: CreateCtaInput): Promise<CTA>;
  updateCtaStatus(ctaId: string, status: CTAStatus): Promise<CTA | null>;
  attachCtaSignupMessage(
    ctaId: string,
    input: { signupChannelId: string; signupMessageId: string }
  ): Promise<CTA | null>;
  getAttendanceByCtaId(ctaId: string): Promise<Attendance[]>;
  upsertAttendance(input: {
    ctaId: string;
    memberId: string;
    decision: Attendance["decision"];
    state: Attendance["state"];
  }): Promise<Attendance>;
  deleteAttendance(ctaId: string, memberId: string): Promise<boolean>;
  getPointsHistory(): Promise<PointsEntry[]>;
  regenerateAttendancePointsForCta(ctaId: string): Promise<PointsEntry[]>;
  getRanking(): Promise<Array<{ memberId: string; points: number }>>;
  getOpenSlots(): Promise<{ slotsOpen: number; memberCap: number }>;
  getBattlePerformanceSnapshots(): Promise<BattlePerformanceSnapshotRecord[]>;
  getBattlePerformanceBombs(): Promise<BattlePerformanceBombRecord[]>;
  getBattleMemberAttendances(): Promise<BattleMemberAttendanceRecord[]>;
  saveBattlePerformanceSnapshot(input: {
    battleId: string;
    startTime: string;
    guildName: string;
    guildPlayers: number;
    guildKills: number;
    guildDeaths: number;
    mainKills: number;
    mainDeaths: number;
    bombs: Array<{
      bombGroupName: string;
      players: number;
      kills: number;
      deaths: number;
    }>;
    memberAttendances: Array<{
      memberId: string;
    }>;
  }): Promise<BattlePerformanceSnapshotRecord>;
  getComps(): Promise<CompRecord[]>;
  getCompById(compId: string): Promise<CompRecord | null>;
  saveComp(input: SaveCompInput): Promise<CompRecord>;
  deleteComp(compId: string): Promise<boolean>;
  getCtaSignups(ctaId: string): Promise<CtaSignupRecord[]>;
  upsertCtaSignup(input: SaveCtaSignupInput): Promise<CtaSignupRecord>;
  deleteCtaSignup(ctaId: string, memberId: string): Promise<boolean>;
  getRecruitmentApplicationByUserId(userId: string): Promise<RecruitmentApplicationRecord | null>;
  saveRecruitmentApplication(
    input: SaveRecruitmentApplicationInput
  ): Promise<RecruitmentApplicationRecord>;
  listTicketPendingRecruitmentApplications(): Promise<RecruitmentApplicationRecord[]>;
  markRecruitmentApplicationTicketOpened(
    applicationId: string,
    ticketChannelId: string
  ): Promise<RecruitmentApplicationRecord | null>;
  updateRecruitmentApplicationStatus(
    applicationId: string,
    status: RecruitmentApplicationStatus
  ): Promise<RecruitmentApplicationRecord | null>;
}
