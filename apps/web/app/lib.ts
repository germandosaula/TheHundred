import { cookies } from "next/headers";
import { cache } from "react";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export interface SlotsData {
  slotsOpen: number;
  memberCap: number;
}

export interface PublicScheduledEventEntry {
  id: string;
  description: string;
  mapName: string;
  targetUtc: string;
  createdByDiscordId: string;
  createdByDisplayName: string;
  createdAt: string;
}

export interface PublicPerformanceData {
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
}

export interface OverviewAnnouncementEntry {
  id: string;
  title: string;
  body: string;
  position: number;
  updatedAt: string;
}

export interface MeData {
  id: string;
  displayName: string;
  albionName?: string;
  role: string;
  avatarUrl?: string;
}

export interface RankingEntry {
  memberId: string;
  displayName: string;
  avatarUrl?: string;
  attendanceCount: number;
  attendancePercent: number;
}

export interface RankingData {
  selectedMonth: string;
  selectedMonthLabel: string;
  pagination: {
    previousMonth?: string;
    nextMonth?: string;
  };
  entries: RankingEntry[];
}

export interface BattleEntry {
  id: string;
  startTime: string;
  endTime?: string;
  clusterName?: string;
  totalPlayers: number;
  totalKills: number;
  totalFame: number;
  guildId: string;
  guildName: string;
  guildPlayers: number;
  guildKills: number;
  guildDeaths: number;
  guilds: string[];
  alliances: string[];
  opponentGuilds: string[];
  mainKills?: number;
  bombKills?: number;
}

export interface BattleAllianceEntry {
  name: string;
  players: number;
  kills: number;
  deaths: number;
  avgIp?: number;
  fame: number;
}

export interface BattleGuildEntry {
  name: string;
  allianceName?: string;
  players: number;
  kills: number;
  deaths: number;
  avgIp?: number;
  fame: number;
}

export interface BattlePlayerEntry {
  id: string;
  name: string;
  guildName?: string;
  allianceName?: string;
  ip?: number;
  damage: number;
  heal: number;
  kills: number;
  deaths: number;
  fame: number;
  weaponName?: string;
  weaponIconName?: string;
  mountName?: string;
  mountIconName?: string;
}

export interface BattleTopEntry {
  playerName: string;
  guildName?: string;
  allianceName?: string;
  value: number;
}

export interface BattleRosterGroupEntry {
  key: string;
  label: string;
  type: "BOMB" | "MAIN_ZERG";
  matchedPlayers: number;
  kills: number;
  deaths: number;
}

export interface BattleDetailEntry extends BattleEntry {
  alliancesSummary: BattleAllianceEntry[];
  guildsSummary: BattleGuildEntry[];
  players: BattlePlayerEntry[];
  rosterGroupsSummary: BattleRosterGroupEntry[];
  topKills?: BattleTopEntry;
  topHeal?: BattleTopEntry;
  topDamage?: BattleTopEntry;
  topDeathFame?: BattleTopEntry;
}

export interface BattlesData {
  guildId?: string;
  guildName?: string;
  minGuildPlayers: number;
  battles: BattleEntry[];
}

export interface CtaEntry {
  id: string;
  title: string;
  datetimeUtc: string;
  status: string;
  compId?: string;
  compName?: string;
  signupChannelId?: string;
  signupMessageId?: string;
  signupFillers: Array<{
    memberId: string;
    playerName: string;
    playerUserId?: string;
    preferredRoles: string[];
    preferredWeapons: string[];
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
      buildId?: string;
      notes?: string;
      playerName?: string;
      playerUserId?: string;
      preferredRoles: string[];
      preferredWeapons: string[];
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

export interface MemberEntry {
  id: string;
  userId: string;
  displayName: string;
  albionName?: string;
  discordId: string;
  avatarUrl?: string;
  status: "PENDING" | "TRIAL" | "CORE" | "BENCHED" | "COUNCIL" | "REJECTED";
  bombGroupName?: string;
  attendanceCount: number;
  attendancePercent: number;
  ctaSignupCount: number;
  ctaSignupUniqueCtas: number;
  ctaSignupFinalizedCtas: number;
  ctaSignupCanceledCtas: number;
  ctaSignupEligibleCtasSinceJoin: number;
  ctaSignupPercentSinceJoin: number;
  attendanceTimersSinceJoin: number;
  attendanceEligibleTimersSinceJoin: number;
  attendancePercentSinceJoin: number;
  lastActivityAt?: string;
  inactiveDays: number;
  activityState: "OK" | "RIESGO" | "INACTIVO" | "EXCLUIDO";
  activityReason: string;
  activityThresholdDays: number;
  followupTaskId?: string;
  activityExclusion?: {
    startsAt: string;
    endsAt: string;
    reason?: string;
  };
  discordRoleStatus?: "PENDING" | "TRIAL" | "CORE" | "BENCHED" | "COUNCIL" | "REJECTED";
  discordRoleSyncedAt?: string;
}

export interface AssignableCompPlayerEntry {
  id: string;
  userId: string;
  displayName: string;
  discordId: string;
  avatarUrl?: string;
  status: "TRIAL" | "CORE" | "BENCHED" | "COUNCIL";
  discordRoleStatus?: "TRIAL" | "CORE" | "BENCHED" | "COUNCIL";
}

export interface CouncilMemberEntry {
  memberId: string;
  userId: string;
  displayName: string;
  discordId: string;
  avatarUrl?: string;
}

export interface CouncilTaskEntry {
  id: string;
  title: string;
  description: string;
  category: "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS" | "REVISION_MIEMBROS";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assignedMemberId?: string;
  assignedDisplayName?: string;
  executeAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BottledEnergyBalanceEntry {
  memberId: string;
  userId: string;
  discordId: string;
  displayName: string;
  albionName?: string;
  balance: number;
}

export interface BottledEnergyUnmatchedEntry {
  albionName: string;
  balance: number;
  lastSeenAt: string;
}

export interface BottledEnergyData {
  balances: BottledEnergyBalanceEntry[];
  unmatched: BottledEnergyUnmatchedEntry[];
  updatedAt: string;
  publishConfigured?: boolean;
}

export interface AlbionPlayerLookupData {
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
}

export interface AuthStartData {
  authorizationUrl: string;
}

export interface InviteValidationData {
  valid: boolean;
}

export interface CompSlotEntry {
  id: string;
  position: number;
  label: string;
  playerUserId?: string;
  playerName: string;
  role: string;
  weaponId: string;
  weaponName: string;
  buildId?: string;
  notes: string;
}

export interface CompPartyEntry {
  key: string;
  name: string;
  position: number;
  slots: CompSlotEntry[];
}

export interface CompEntry {
  id: string;
  name: string;
  createdBy: string;
  updatedAt: string;
  parties: CompPartyEntry[];
}

export type BuildItemSlotKey =
  | "MAIN_HAND"
  | "OFF_HAND"
  | "HEAD"
  | "ARMOR"
  | "SHOES"
  | "CAPE"
  | "BAG"
  | "MOUNT"
  | "FOOD"
  | "POTION";

export interface BuildTemplateEntry {
  id: string;
  name: string;
  role: string;
  weaponId: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    slot: BuildItemSlotKey;
    itemId: string;
    itemName: string;
  }>;
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get("th_session")?.value;
}

export async function getDiscordId(): Promise<string | undefined> {
  return (await cookies()).get("th_discord_id")?.value;
}

const getJsonCached = cache(async (
  path: string,
  sessionToken?: string,
  discordId?: string
): Promise<unknown | null> => {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      cache: "no-store",
      headers:
        sessionToken || discordId
          ? {
              ...(sessionToken ? { "x-session-token": sessionToken } : {}),
              ...(discordId ? { "x-discord-id": discordId } : {})
            }
          : undefined
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
});

export async function getJson<T>(
  path: string,
  sessionToken?: string,
  discordId?: string
): Promise<T | null> {
  const payload = await getJsonCached(path, sessionToken, discordId);
  return payload as T | null;
}

export async function getLandingData(inviteCode?: string) {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();
  const inviteQuery = inviteCode ? `?code=${encodeURIComponent(inviteCode)}` : "";
  const [slots, me, privateAccessProbe, inviteValidation] = await Promise.all([
    getJson<SlotsData>("/public/slots"),
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<{ ok: true }>("/private/access", sessionToken, discordId),
    inviteCode ? getJson<InviteValidationData>(`/public/invites/validate${inviteQuery}`) : Promise.resolve(null)
  ]);

  return {
    sessionToken,
    slots,
    authStartUrl: inviteCode ? `/auth/start?invite=${encodeURIComponent(inviteCode)}` : "/auth/start",
    me,
    hasPrivateAccess: Boolean(privateAccessProbe),
    inviteCode,
    inviteValid: Boolean(inviteValidation?.valid)
  };
}

export async function getPublicPerformanceData(month?: string) {
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  return getJson<PublicPerformanceData>(`/public/performance${query}`);
}

export async function getPublicScheduledEventsData() {
  return getJson<PublicScheduledEventEntry[]>("/public/events");
}

export async function getPrivateDashboardData(month?: string) {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();
  const rankingPath = month ? `/ranking?month=${encodeURIComponent(month)}` : "/ranking";

  const [me, ranking, ctas, slots, builds] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<RankingData>(rankingPath, sessionToken, discordId),
    getJson<CtaEntry[]>("/ctas", sessionToken, discordId),
    getJson<SlotsData>("/public/slots"),
    getJson<BuildTemplateEntry[]>("/builds", sessionToken, discordId)
  ]);

  const [members, assignablePlayers] = await Promise.all([
    getJson<MemberEntry[]>("/members", sessionToken, discordId),
    getJson<AssignableCompPlayerEntry[]>("/comps/assignable-players", sessionToken, discordId)
  ]);
  const canManageCouncil = Boolean(members);
  const canEditCompsAndCtas = Boolean(assignablePlayers);

  return {
    sessionToken,
    me,
    ranking,
    ctas,
    builds: builds ?? [],
    members,
    assignablePlayers: assignablePlayers ?? [],
    canManageCouncil,
    canEditCompsAndCtas,
    slots,
    hasPrivateAccess: Boolean(ranking && ctas)
  };
}

export async function getPrivateCompsData() {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();

  const [me, comps, assignablePlayers, builds] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<CompEntry[]>("/comps", sessionToken, discordId),
    getJson<AssignableCompPlayerEntry[]>("/comps/assignable-players", sessionToken, discordId),
    getJson<BuildTemplateEntry[]>("/builds", sessionToken, discordId)
  ]);

  return {
    sessionToken,
    me,
    comps: comps ?? [],
    assignablePlayers: assignablePlayers ?? [],
    canEditCompsAndCtas: Boolean(assignablePlayers),
    builds: builds ?? []
  };
}

export async function getPrivateOverviewData() {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();

  const [me, ctas, slots, managementProbe, announcements] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<CtaEntry[]>("/ctas", sessionToken, discordId),
    getJson<SlotsData>("/public/slots"),
    getJson<AssignableCompPlayerEntry[]>("/comps/assignable-players", sessionToken, discordId),
    getJson<OverviewAnnouncementEntry[]>("/overview/announcements", sessionToken, discordId)
  ]);

  return {
    me,
    ctas,
    slots,
    canManageCouncil: Boolean(managementProbe),
    announcements: announcements ?? []
  };
}

export async function getPrivateRankingData(month?: string) {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();
  const rankingPath = month ? `/ranking?month=${encodeURIComponent(month)}` : "/ranking";

  const [me, ranking] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<RankingData>(rankingPath, sessionToken, discordId)
  ]);

  return {
    me,
    ranking
  };
}

export async function getPrivateCtasData() {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();

  const [me, ctas, builds, comps, manageProbe] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<CtaEntry[]>("/ctas", sessionToken, discordId),
    getJson<BuildTemplateEntry[]>("/builds", sessionToken, discordId),
    getJson<CompEntry[]>("/comps", sessionToken, discordId),
    getJson<{ ok: true }>("/ctas/manage-access", sessionToken, discordId)
  ]);
  const canManage = Boolean(manageProbe);
  const assignablePlayers = canManage
    ? await getJson<AssignableCompPlayerEntry[]>("/comps/assignable-players", sessionToken, discordId)
    : null;

  return {
    me,
    ctas,
    comps: comps ?? [],
    assignablePlayers: assignablePlayers ?? [],
    canEditCompsAndCtas: canManage,
    canCancelCta: canManage,
    builds: builds ?? []
  };
}

export async function getPrivateMembersData() {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();

  const [me, members] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<MemberEntry[]>("/members", sessionToken, discordId)
  ]);

  return {
    me,
    members,
    canManageCouncil: Boolean(members)
  };
}

export async function getPrivateScoutingData() {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();

  const [me, managementProbe] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<AssignableCompPlayerEntry[]>("/comps/assignable-players", sessionToken, discordId)
  ]);

  return {
    me,
    canManageCouncil: Boolean(managementProbe)
  };
}

export async function getPrivateCouncilTasksData() {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();
  const [me, councilMembers, councilTasks] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<CouncilMemberEntry[]>("/council/members", sessionToken, discordId),
    getJson<CouncilTaskEntry[]>("/council/tasks", sessionToken, discordId)
  ]);

  return {
    me,
    councilMembers: councilMembers ?? [],
    councilTasks: councilTasks ?? [],
    canAccessCouncilTasks: Boolean(councilMembers && councilTasks)
  };
}

export async function getPrivateBottledEnergyData() {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();

  const [me, data] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<BottledEnergyData>("/council/bottled-energy", sessionToken, discordId)
  ]);

  return {
    me,
    data,
    canAccess: Boolean(data)
  };
}

export async function getPrivateCompsOverviewData() {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();

  const [me, comps, assignablePlayers] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<CompEntry[]>("/comps", sessionToken, discordId),
    getJson<AssignableCompPlayerEntry[]>("/comps/assignable-players", sessionToken, discordId)
  ]);

  return {
    me,
    comps: comps ?? [],
    canEditCompsAndCtas: Boolean(assignablePlayers)
  };
}

export async function getPrivateCompsEditorData() {
  return getPrivateCompsData();
}

export async function getPrivateBattlesData() {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();

  const [me, battles] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<BattlesData>("/battles", sessionToken, discordId)
  ]);

  return {
    me,
    battles
  };
}

export async function getPrivateAlbionPlayerLookup(name?: string) {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();

  if (!name?.trim()) {
    return null;
  }

  const query = `?name=${encodeURIComponent(name.trim())}`;
  return getJson<AlbionPlayerLookupData>(`/albion/players/search${query}`, sessionToken, discordId);
}

export async function getPrivateBattleDetailData(battleId: string) {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();
  const [me, battle] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<BattleDetailEntry>(`/battles/${battleId}`, sessionToken, discordId)
  ]);

  return {
    me,
    battle
  };
}
