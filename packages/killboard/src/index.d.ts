export interface GuildBattleSummary {
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
export interface GuildBattleDetail extends GuildBattleSummary {
    alliancesSummary: BattleAllianceEntry[];
    guildsSummary: BattleGuildEntry[];
    players: BattlePlayerEntry[];
    topKills?: BattleTopEntry;
    topHeal?: BattleTopEntry;
    topDamage?: BattleTopEntry;
    topDeathFame?: BattleTopEntry;
}
export interface KillboardClient {
    resolveGuildIdByName(guildName: string): Promise<string | null>;
    fetchRecentGuildBattles(input: {
        guildId?: string;
        guildName?: string;
        minGuildPlayers: number;
        limit: number;
    }): Promise<{
        guildId?: string;
        battles: GuildBattleSummary[];
    }>;
    fetchGuildBattleDetail(input: {
        battleId: string;
        guildId?: string;
        guildName?: string;
    }): Promise<GuildBattleDetail | null>;
}
export declare function createKillboardClient(options?: {
    baseUrl?: string;
    source?: "official" | "albionbb";
}): KillboardClient;
