import { cookies } from "next/headers";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

export interface SlotsData {
  slotsOpen: number;
  memberCap: number;
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

export interface MeData {
  id: string;
  displayName: string;
  albionName?: string;
  role: string;
  avatarUrl?: string;
}

export interface RankingEntry {
  memberId: string;
  points: number;
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

export interface MemberEntry {
  id: string;
  userId: string;
  displayName: string;
  albionName?: string;
  discordId: string;
  avatarUrl?: string;
  status: "PENDING" | "TRIAL" | "CORE" | "BENCHED" | "REJECTED";
  bombGroupName?: string;
  attendanceCount: number;
  attendancePercent: number;
  discordRoleStatus?: "PENDING" | "TRIAL" | "CORE" | "BENCHED" | "REJECTED";
  discordRoleSyncedAt?: string;
}

export interface AssignableCompPlayerEntry {
  id: string;
  userId: string;
  displayName: string;
  discordId: string;
  avatarUrl?: string;
  status: "TRIAL" | "CORE" | "BENCHED";
  discordRoleStatus?: "TRIAL" | "CORE" | "BENCHED";
}

export interface AuthStartData {
  authorizationUrl: string;
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

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get("th_session")?.value;
}

export async function getDiscordId(): Promise<string | undefined> {
  return (await cookies()).get("th_discord_id")?.value;
}

export async function getJson<T>(
  path: string,
  sessionToken?: string,
  discordId?: string
): Promise<T | null> {
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

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getLandingData() {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();
  const [slots, authStart, me, performance] = await Promise.all([
    getJson<SlotsData>("/public/slots"),
    getJson<AuthStartData>("/auth/discord/start"),
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<PublicPerformanceData>("/public/performance")
  ]);

  return { sessionToken, slots, authStart, me, performance };
}

export async function getPublicPerformanceData(month?: string) {
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  return getJson<PublicPerformanceData>(`/public/performance${query}`);
}

export async function getPrivateDashboardData() {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();

  const [me, ranking, ctas, slots] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<RankingEntry[]>("/ranking", sessionToken, discordId),
    getJson<CtaEntry[]>("/ctas", sessionToken, discordId),
    getJson<SlotsData>("/public/slots")
  ]);

  const canReadMembers = me?.role === "OFFICER" || me?.role === "ADMIN";
  const members = canReadMembers
    ? await getJson<MemberEntry[]>("/members", sessionToken, discordId)
    : null;
  const assignablePlayers = canReadMembers
    ? await getJson<AssignableCompPlayerEntry[]>("/comps/assignable-players", sessionToken, discordId)
    : null;

  return {
    sessionToken,
    me,
    ranking,
    ctas,
    members,
    assignablePlayers: assignablePlayers ?? [],
    slots,
    hasPrivateAccess: Boolean(ranking && ctas)
  };
}

export async function getPrivateCompsData() {
  const sessionToken = await getSessionToken();
  const discordId = await getDiscordId();

  const [me, comps, assignablePlayers] = await Promise.all([
    getJson<MeData>("/me", sessionToken, discordId),
    getJson<CompEntry[]>("/comps", sessionToken, discordId),
    getJson<AssignableCompPlayerEntry[]>("/comps/assignable-players", sessionToken, discordId)
  ]);

  return {
    sessionToken,
    me,
    comps: comps ?? [],
    assignablePlayers: assignablePlayers ?? []
  };
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
