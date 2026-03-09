export function createKillboardClient(options) {
    const baseUrl = (options?.baseUrl ?? "https://gameinfo-ams.albiononline.com/api/gameinfo").replace(/\/$/, "");
    const source = options?.source ?? "official";
    const officialSearchBaseUrl = "https://gameinfo-ams.albiononline.com/api/gameinfo";
    return {
        async resolveGuildIdByName(guildName) {
            const searchBaseUrl = source === "albionbb" ? officialSearchBaseUrl : baseUrl;
            const response = await fetchJson(`${searchBaseUrl}/search?${new URLSearchParams({ q: guildName })}`);
            const guilds = readArray(readRecord(response), "guilds") ?? readArray(readRecord(response), "Guilds") ?? [];
            const exactMatch = guilds.find((entry) => {
                const name = readString(readRecord(entry), "Name") ?? readString(readRecord(entry), "name");
                return name?.toLowerCase() === guildName.toLowerCase();
            });
            const fallbackMatch = guilds.find((entry) => {
                const name = readString(readRecord(entry), "Name") ?? readString(readRecord(entry), "name");
                return name?.toLowerCase().includes(guildName.toLowerCase());
            });
            const match = exactMatch ?? fallbackMatch;
            if (!match) {
                return null;
            }
            return String(readString(readRecord(match), "Id") ??
                readString(readRecord(match), "id") ??
                readNumber(readRecord(match), "Id") ??
                readNumber(readRecord(match), "id") ??
                "");
        },
        async fetchRecentGuildBattles({ guildId, guildName, minGuildPlayers, limit }) {
            const resolvedGuildId = guildId ?? (guildName ? await this.resolveGuildIdByName(guildName) : null);
            if (!resolvedGuildId) {
                return { guildId: undefined, battles: [] };
            }
            if (source === "albionbb") {
                const rawResponse = await fetchJson(`${baseUrl}/battles?${new URLSearchParams({
                    guildId: resolvedGuildId,
                    minPlayers: "10",
                    minGuildPlayers: String(minGuildPlayers),
                    page: "1"
                })}`);
                const battleEntries = asArray(rawResponse) ??
                    readArray(readRecord(rawResponse), "battles") ??
                    readArray(readRecord(rawResponse), "data") ??
                    [];
                if (battleEntries[0]) {
                    console.log("[battles] albionbb sample", {
                        rootKeys: Object.keys(readRecord(rawResponse)),
                        battleKeys: Object.keys(readRecord(battleEntries[0]))
                    });
                }
                return {
                    guildId: resolvedGuildId,
                    battles: battleEntries
                        .map((entry) => mapAlbionBbBattle(entry, resolvedGuildId, guildName))
                        .filter((entry) => Boolean(entry))
                        .filter((entry) => Boolean(entry.id))
                        .slice(0, limit)
                };
            }
            const queryLimit = Math.max(limit * 3, 20);
            const battlesResponse = await fetchJson(`${baseUrl}/battles?${new URLSearchParams({
                offset: "0",
                limit: String(queryLimit),
                sort: "recent",
                guildId: resolvedGuildId
            })}`);
            const battleEntries = Array.isArray(battlesResponse) ? battlesResponse : [];
            const battleIds = battleEntries
                .map((entry) => {
                const record = readRecord(entry);
                return String(readString(record, "Id") ??
                    readString(record, "id") ??
                    readNumber(record, "Id") ??
                    readNumber(record, "id") ??
                    "");
            })
                .filter(Boolean);
            const details = await Promise.all(battleIds.map(async (battleId) => {
                try {
                    const detail = await fetchJson(`${baseUrl}/battles/${battleId}`);
                    return mapBattleDetail(detail, resolvedGuildId, guildName);
                }
                catch {
                    return null;
                }
            }));
            return {
                guildId: resolvedGuildId,
                battles: details
                    .filter((entry) => Boolean(entry))
                    .filter((entry) => entry.guildPlayers >= minGuildPlayers)
                    .sort((left, right) => new Date(right.startTime).getTime() - new Date(left.startTime).getTime())
                    .slice(0, limit)
            };
        },
        async fetchGuildBattleDetail({ battleId, guildId, guildName }) {
            const resolvedGuildId = guildId ?? (guildName ? await this.resolveGuildIdByName(guildName) : null);
            if (!resolvedGuildId) {
                return null;
            }
            const detail = await fetchJson(`${baseUrl}/battles/${battleId}`);
            if (source === "albionbb") {
                const killsFeed = await fetchJson(`${baseUrl}/battles/kills?${new URLSearchParams({ ids: battleId })}`).catch(() => null);
                return mapAlbionBbBattleDetail(detail, resolvedGuildId, guildName, killsFeed);
            }
            const summary = mapBattleDetail(detail, resolvedGuildId, guildName);
            if (!summary) {
                return null;
            }
            return {
                ...summary,
                alliancesSummary: [],
                guildsSummary: [],
                players: [],
                topKills: undefined,
                topHeal: undefined,
                topDamage: undefined,
                topDeathFame: undefined
            };
        }
    };
}
async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            accept: "application/json"
        }
    });
    if (!response.ok) {
        throw new Error(`Albion API request failed with status ${response.status}`);
    }
    return response.json();
}
function mapBattleDetail(value, guildId, configuredGuildName) {
    const record = readRecord(value);
    const guilds = readArray(record, "guilds") ?? readArray(record, "Guilds") ?? [];
    const guildEntry = guilds.find((entry) => matchesGuild(readRecord(entry), guildId, configuredGuildName)) ?? null;
    if (!guildEntry) {
        return null;
    }
    const guildRecord = readRecord(guildEntry);
    const guildPlayers = readArray(guildRecord, "players")?.length ??
        readArray(guildRecord, "Players")?.length ??
        0;
    const guildName = readString(guildRecord, "name") ??
        readString(guildRecord, "Name") ??
        configuredGuildName ??
        "Unknown guild";
    const opponents = guilds
        .map((entry) => readRecord(entry))
        .filter((entry) => !matchesGuild(entry, guildId, configuredGuildName))
        .map((entry) => readString(entry, "name") ?? readString(entry, "Name") ?? "")
        .filter(Boolean);
    return {
        id: String(readString(record, "id") ??
            readString(record, "Id") ??
            readNumber(record, "id") ??
            readNumber(record, "Id") ??
            ""),
        startTime: readString(record, "startTime") ??
            readString(record, "StartTime") ??
            readString(record, "timeStamp") ??
            readString(record, "TimeStamp") ??
            new Date().toISOString(),
        endTime: readString(record, "endTime") ?? readString(record, "EndTime") ?? undefined,
        clusterName: readString(record, "clusterName") ?? readString(record, "ClusterName") ?? undefined,
        totalPlayers: readNumber(record, "totalPlayers") ??
            readNumber(record, "TotalPlayers") ??
            (readArray(record, "players")?.length ?? readArray(record, "Players")?.length ?? guildPlayers),
        totalKills: readNumber(record, "totalKills") ?? readNumber(record, "TotalKills") ?? 0,
        totalFame: readNumber(record, "totalFame") ?? readNumber(record, "TotalFame") ?? 0,
        guildId,
        guildName,
        guildPlayers,
        guildKills: readNumber(guildRecord, "kills") ?? readNumber(guildRecord, "Kills") ?? 0,
        guildDeaths: readNumber(guildRecord, "deaths") ?? readNumber(guildRecord, "Deaths") ?? 0,
        guilds: [guildName, ...opponents],
        alliances: [],
        opponentGuilds: opponents
    };
}
function matchesGuild(record, guildId, guildName) {
    const entryId = String(readString(record, "id") ??
        readString(record, "Id") ??
        readNumber(record, "id") ??
        readNumber(record, "Id") ??
        "");
    const entryName = readString(record, "name") ?? readString(record, "Name") ?? "";
    const normalizedGuildName = guildName?.toLowerCase();
    return (entryId === guildId ||
        (Boolean(normalizedGuildName) && entryName.toLowerCase() === normalizedGuildName));
}
function readRecord(value) {
    return value && typeof value === "object" ? value : {};
}
function asArray(value) {
    return Array.isArray(value) ? value : null;
}
function readArray(record, key) {
    const value = record[key];
    return Array.isArray(value) ? value : null;
}
function readString(record, key) {
    const value = record[key];
    return typeof value === "string" ? value : null;
}
function readNestedString(record, path) {
    let current = record;
    for (const segment of path) {
        if (!current || typeof current !== "object") {
            return null;
        }
        current = current[segment];
    }
    return typeof current === "string" ? current : null;
}
function readNestedRecord(record, path) {
    let current = record;
    for (const segment of path) {
        if (!current || typeof current !== "object") {
            return null;
        }
        current = current[segment];
    }
    return current && typeof current === "object" ? current : null;
}
function readNumber(record, key) {
    const value = record[key];
    if (typeof value === "number") {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value.replace(/,/g, ""));
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
function mapAlbionBbBattle(value, guildId, configuredGuildName) {
    const record = readRecord(value);
    const guildEntries = (readArray(record, "guilds") ?? []).map((entry) => readRecord(entry));
    const matchedGuildEntry = guildEntries.find((entry) => matchesGuild(entry, guildId, configuredGuildName)) ?? null;
    const totalPlayers = readNumber(record, "totalPlayers") ??
        readNumber(record, "players") ??
        readNumber(record, "TotalPlayers") ??
        0;
    const guildPlayersFromGuildEntry = matchedGuildEntry
        ? readNumber(matchedGuildEntry, "players") ??
            readNumber(matchedGuildEntry, "playerCount") ??
            readNumber(matchedGuildEntry, "totalPlayers") ??
            readNumber(matchedGuildEntry, "count") ??
            0
        : 0;
    const guildPlayers = guildPlayersFromGuildEntry > 0
        ? guildPlayersFromGuildEntry
        : (readNumber(record, "guildPlayers") ??
            readNumber(record, "alliancePlayers") ??
            readNumber(record, "playersInBattle") ??
            readNumber(record, "guildMemberCount") ??
            0);
    const guildNames = guildEntries
        .map((entry) => readString(entry, "name") ?? readString(entry, "guildName") ?? "")
        .filter(Boolean);
    const allianceNames = (readArray(record, "alliances") ?? [])
        .map((entry) => {
        if (typeof entry === "string") {
            return entry;
        }
        const alliance = readRecord(entry);
        return readString(alliance, "name") ?? readString(alliance, "allianceName") ?? "";
    })
        .filter(Boolean);
    const opponentGuilds = guildEntries
        .filter((entry) => !matchesGuild(entry, guildId, configuredGuildName))
        .map((entry) => readString(entry, "name") ?? readString(entry, "guildName") ?? "")
        .filter(Boolean);
    if (guildEntries[0]) {
        console.log("[battles] albionbb guild sample", {
            guildKeys: Object.keys(guildEntries[0])
        });
    }
    return {
        id: String(readString(record, "id") ??
            readString(record, "albionId") ??
            readString(record, "battleId") ??
            readString(record, "Id") ??
            readNumber(record, "id") ??
            readNumber(record, "albionId") ??
            readNumber(record, "battleId") ??
            ""),
        startTime: readString(record, "startedAt") ??
            readString(record, "StartedAt") ??
            readString(record, "startTime") ??
            readString(record, "time") ??
            readString(record, "StartTime") ??
            new Date().toISOString(),
        endTime: readString(record, "finishedAt") ??
            readString(record, "FinishedAt") ??
            readString(record, "endTime") ??
            readString(record, "EndTime") ??
            undefined,
        clusterName: readString(record, "clusterName") ??
            readString(record, "cluster") ??
            readString(record, "zoneName") ??
            undefined,
        totalPlayers,
        totalKills: readNumber(record, "totalKills") ?? readNumber(record, "kills") ?? 0,
        totalFame: readNumber(record, "totalFame") ?? readNumber(record, "fame") ?? 0,
        guildId,
        guildName: readString(matchedGuildEntry ?? {}, "name") ??
            readString(matchedGuildEntry ?? {}, "guildName") ??
            readString(record, "guildName") ??
            readString(record, "name") ??
            configuredGuildName ??
            "Unknown guild",
        guildPlayers,
        guildKills: readNumber(matchedGuildEntry ?? {}, "kills") ??
            readNumber(record, "guildKills") ??
            readNumber(record, "kills") ??
            0,
        guildDeaths: readNumber(matchedGuildEntry ?? {}, "deaths") ??
            readNumber(record, "guildDeaths") ??
            readNumber(record, "deaths") ??
            0,
        opponentGuilds: opponentGuilds.length > 0
            ? opponentGuilds
            : readArray(record, "opponents")
                ?.map((entry) => {
                const opponent = readRecord(entry);
                return readString(opponent, "name") ?? readString(opponent, "guildName") ?? "";
            })
                .filter(Boolean) ?? guildNames.filter((name) => name !== configuredGuildName),
        guilds: guildNames,
        alliances: allianceNames
    };
}
function mapAlbionBbBattleDetail(value, guildId, configuredGuildName, killsFeed) {
    const summary = mapAlbionBbBattle(value, guildId, configuredGuildName);
    if (!summary) {
        return null;
    }
    const record = readRecord(value);
    const guildEntries = (readArray(record, "guilds") ?? []).map((entry) => readRecord(entry));
    const allianceEntries = (readArray(record, "alliances") ?? []).map((entry) => typeof entry === "string" ? { name: entry } : readRecord(entry));
    const detailPlayers = readBattlePlayers(record, guildEntries);
    const killFeedPlayers = killsFeed ? readBattlePlayersFromKillsFeed(killsFeed) : [];
    const guildPlayers = mergeBattlePlayerSources(detailPlayers, killFeedPlayers);
    const playersWithoutWeapon = guildPlayers.filter((entry) => !entry.weaponName && !entry.weaponIconName);
    if (playersWithoutWeapon.length > 0) {
        console.log("[battles] players without weapon sample", {
            total: playersWithoutWeapon.length,
            sample: playersWithoutWeapon.slice(0, 8).map((entry) => ({
                name: entry.name,
                guildName: entry.guildName,
                allianceName: entry.allianceName,
                kills: entry.kills,
                deaths: entry.deaths,
                fame: entry.fame
            }))
        });
    }
    const guildsSummary = guildEntries
        .map((entry) => mapGuildSummaryEntry(entry))
        .filter((entry) => Boolean(entry))
        .map((entry) => ({
        ...entry,
        avgIp: entry.avgIp ?? computeAverageIpForGuild(guildPlayers, entry.name)
    }))
        .sort((left, right) => right.fame - left.fame || right.players - left.players);
    const alliancesSummary = allianceEntries
        .map((entry) => mapAllianceSummaryEntry(entry, guildsSummary))
        .filter((entry) => Boolean(entry))
        .map((entry) => ({
        ...entry,
        avgIp: entry.avgIp ?? computeAverageIpForAlliance(guildPlayers, entry.name)
    }))
        .sort((left, right) => right.fame - left.fame || right.players - left.players);
    const topKills = pickTopEntry(guildPlayers, "kills");
    const topHeal = pickTopEntry(guildPlayers, "heal");
    const topDamage = pickTopEntry(guildPlayers, "damage");
    const topDeathFame = pickTopEntry(guildPlayers.filter((entry) => entry.deaths > 0), "fame");
    return {
        ...summary,
        alliancesSummary,
        guildsSummary,
        players: guildPlayers.sort((left, right) => right.fame - left.fame || right.kills - left.kills),
        topKills,
        topHeal,
        topDamage,
        topDeathFame
    };
}
function readBattlePlayersFromKillsFeed(value) {
    const record = readRecord(value);
    const kills = (asArray(value) ??
        readArray(record, "kills") ??
        readArray(record, "data") ??
        readArray(record, "results") ??
        []).map((entry) => readRecord(entry));
    if (kills[0]) {
        console.log("[battles] albionbb kills sample", {
            rootKeys: Object.keys(record),
            killKeys: Object.keys(kills[0]),
            killerKeys: Object.keys(readRecord(kills[0].Killer ?? kills[0].killer ?? {})),
            victimKeys: Object.keys(readRecord(kills[0].Victim ?? kills[0].victim ?? {}))
        });
    }
    const players = new Map();
    for (const kill of kills) {
        const killFame = readNumber(kill, "fame") ??
            readNumber(kill, "totalFame") ??
            readNumber(kill, "killFame") ??
            readNumber(kill, "TotalVictimKillFame") ??
            readNumber(kill, "Fame") ??
            0;
        const victim = readNestedRecord(kill, ["Victim"]) ??
            readNestedRecord(kill, ["victim"]) ??
            readNestedRecord(kill, ["Death"]) ??
            readNestedRecord(kill, ["player"]);
        mergeBattlePlayer(players, mapBattlePlayer(readRecord(victim)), {
            deaths: 1,
            fame: killFame
        });
        const killer = readNestedRecord(kill, ["Killer"]) ??
            readNestedRecord(kill, ["killer"]) ??
            readNestedRecord(kill, ["finalBlow"]) ??
            readNestedRecord(kill, ["FinalBlow"]);
        mergeBattlePlayer(players, mapBattlePlayer(readRecord(killer)), {
            kills: 1
        });
        const participants = (readArray(kill, "participants") ??
            readArray(kill, "Participants") ??
            readArray(kill, "killers") ??
            readArray(kill, "Killers") ??
            readArray(kill, "assistants") ??
            []).map((entry) => readRecord(entry));
        for (const participant of participants) {
            mergeBattlePlayer(players, mapBattlePlayer(participant));
        }
    }
    return [...players.values()];
}
function mergeBattlePlayerSources(detailPlayers, killFeedPlayers) {
    if (detailPlayers.length === 0) {
        return killFeedPlayers;
    }
    if (killFeedPlayers.length === 0) {
        return detailPlayers;
    }
    const players = new Map();
    for (const entry of detailPlayers) {
        players.set(getBattlePlayerMergeKey(entry), entry);
    }
    for (const entry of killFeedPlayers) {
        mergeBattlePlayer(players, entry);
    }
    return [...players.values()];
}
function mergeBattlePlayer(players, entry, override) {
    if (!entry) {
        return;
    }
    const key = getBattlePlayerMergeKey(entry);
    const existing = players.get(key);
    const next = {
        ...entry,
        ...override
    };
    if (!existing) {
        players.set(key, next);
        return;
    }
    players.set(key, {
        ...existing,
        guildName: existing.guildName ?? next.guildName,
        allianceName: existing.allianceName ?? next.allianceName,
        ip: pickPreferredIp(existing.ip, next.ip),
        weaponName: pickPreferredWeaponName(existing.weaponName, next.weaponName),
        weaponIconName: pickPreferredWeaponName(existing.weaponIconName, next.weaponIconName),
        mountName: pickPreferredWeaponName(existing.mountName, next.mountName),
        mountIconName: pickPreferredWeaponName(existing.mountIconName, next.mountIconName),
        damage: Math.max(existing.damage, next.damage),
        heal: Math.max(existing.heal, next.heal),
        kills: Math.max(existing.kills, next.kills),
        deaths: Math.max(existing.deaths, next.deaths),
        fame: Math.max(existing.fame, next.fame)
    });
}
function getBattlePlayerMergeKey(entry) {
    const normalizedName = entry.name.trim().toLowerCase();
    return normalizedName || entry.id;
}
function pickPreferredWeaponName(current, candidate) {
    if (!current) {
        return candidate;
    }
    if (!candidate) {
        return current;
    }
    const candidateScore = scoreWeaponName(candidate);
    const currentScore = scoreWeaponName(current);
    if (candidateScore === currentScore) {
        return candidate.length > current.length ? candidate : current;
    }
    return candidateScore > currentScore ? candidate : current;
}
function pickPreferredIp(current, candidate) {
    const currentIsValid = Number.isFinite(current) && (current ?? 0) > 0;
    const candidateIsValid = Number.isFinite(candidate) && (candidate ?? 0) > 0;
    if (currentIsValid && candidateIsValid) {
        return current;
    }
    if (currentIsValid) {
        return current;
    }
    if (candidateIsValid) {
        return candidate;
    }
    return current ?? candidate;
}
function scoreWeaponName(value) {
    let score = 0;
    if (/^T\d+_/.test(value)) {
        score += 4;
    }
    if (/@\d+(Q\d+)?$/i.test(value)) {
        score += 3;
    }
    if (/Q\d+$/i.test(value)) {
        score += 2;
    }
    if (/^(MAIN|2H|OFF|MOUNT)_/.test(value)) {
        score += 3;
    }
    if (value.includes("_")) {
        score += 2;
    }
    if (/[A-Z]/.test(value) && value === value.toUpperCase()) {
        score += 1;
    }
    return score;
}
function readBattlePlayers(record, guildEntries) {
    const rootPlayers = (readArray(record, "players") ??
        readArray(record, "Players") ??
        readArray(record, "participants") ??
        readArray(record, "entries") ??
        []).map((entry) => readRecord(entry));
    if (rootPlayers.length > 0) {
        console.log("[battles] detail root player sample", {
            playerKeys: Object.keys(readRecord(rootPlayers[0])),
            equipmentKeys: Object.keys(readRecord(readNestedRecord(readRecord(rootPlayers[0]), ["Equipment"]) ??
                readNestedRecord(readRecord(rootPlayers[0]), ["equipment"])))
        });
        return rootPlayers
            .map((entry) => mapBattlePlayer(entry))
            .filter((entry) => Boolean(entry));
    }
    return guildEntries.flatMap((guildEntry) => {
        const guildName = readString(guildEntry, "name") ?? readString(guildEntry, "guildName") ?? undefined;
        const allianceName = readString(guildEntry, "allianceName") ??
            readString(guildEntry, "alliance") ??
            readString(guildEntry, "allianceTag") ??
            undefined;
        const guildPlayers = (readArray(guildEntry, "players") ??
            readArray(guildEntry, "Players") ??
            [])
            .map((entry) => readRecord(entry));
        if (guildPlayers[0]) {
            console.log("[battles] detail guild player sample", {
                guildKeys: Object.keys(guildEntry),
                playerKeys: Object.keys(readRecord(guildPlayers[0])),
                equipmentKeys: Object.keys(readRecord(readNestedRecord(readRecord(guildPlayers[0]), ["Equipment"]) ??
                    readNestedRecord(readRecord(guildPlayers[0]), ["equipment"])))
            });
        }
        return guildPlayers
            .map((entry) => mapBattlePlayer(readRecord(entry), guildName, allianceName))
            .filter((player) => Boolean(player));
    });
}
function mapGuildSummaryEntry(entry) {
    const name = readString(entry, "name") ?? readString(entry, "guildName");
    if (!name) {
        return null;
    }
    return {
        name,
        allianceName: readString(entry, "allianceName") ??
            readString(entry, "alliance") ??
            readString(entry, "allianceTag") ??
            undefined,
        players: readNumber(entry, "players") ??
            readNumber(entry, "playerCount") ??
            readNumber(entry, "totalPlayers") ??
            readNumber(entry, "count") ??
            0,
        kills: readNumber(entry, "kills") ?? readNumber(entry, "killCount") ?? 0,
        deaths: readNumber(entry, "deaths") ?? readNumber(entry, "deathCount") ?? 0,
        avgIp: readNumber(entry, "avgIp") ??
            readNumber(entry, "averageIp") ??
            readNumber(entry, "ip") ??
            readNumber(entry, "Ip") ??
            undefined,
        fame: readNumber(entry, "fame") ??
            readNumber(entry, "totalFame") ??
            readNumber(entry, "killFame") ??
            readNumber(entry, "KillFame") ??
            0
    };
}
function mapAllianceSummaryEntry(entry, guildsSummary) {
    const name = readString(entry, "name") ??
        readString(entry, "allianceName") ??
        readString(entry, "tag");
    if (!name) {
        return null;
    }
    const guildsInAlliance = guildsSummary.filter((guild) => guild.allianceName === name);
    const aggregatedPlayers = guildsInAlliance.reduce((sum, guild) => sum + guild.players, 0);
    const aggregatedKills = guildsInAlliance.reduce((sum, guild) => sum + guild.kills, 0);
    const aggregatedDeaths = guildsInAlliance.reduce((sum, guild) => sum + guild.deaths, 0);
    const aggregatedFame = guildsInAlliance.reduce((sum, guild) => sum + guild.fame, 0);
    return {
        name,
        players: readNumber(entry, "players") ??
            readNumber(entry, "playerCount") ??
            readNumber(entry, "totalPlayers") ??
            aggregatedPlayers,
        kills: readNumber(entry, "kills") ?? readNumber(entry, "killCount") ?? aggregatedKills,
        deaths: readNumber(entry, "deaths") ?? readNumber(entry, "deathCount") ?? aggregatedDeaths,
        avgIp: readNumber(entry, "avgIp") ??
            readNumber(entry, "averageIp") ??
            readNumber(entry, "ip") ??
            readNumber(entry, "Ip") ??
            undefined,
        fame: readNumber(entry, "fame") ??
            readNumber(entry, "totalFame") ??
            readNumber(entry, "killFame") ??
            readNumber(entry, "KillFame") ??
            aggregatedFame
    };
}
function mapBattlePlayer(entry, inheritedGuildName, inheritedAllianceName) {
    const name = readString(entry, "name") ??
        readString(entry, "playerName") ??
        readString(entry, "Name") ??
        readString(entry, "killerName");
    if (!name) {
        return null;
    }
    return {
        id: String(readString(entry, "id") ??
            readString(entry, "playerId") ??
            readString(entry, "albionId") ??
            name),
        name,
        guildName: readString(entry, "guildName") ??
            readString(entry, "GuildName") ??
            readString(entry, "guild") ??
            inheritedGuildName,
        allianceName: readString(entry, "allianceName") ??
            readString(entry, "AllianceName") ??
            readString(entry, "alliance") ??
            inheritedAllianceName,
        ip: readNumber(entry, "ip") ?? readNumber(entry, "averageIp") ?? undefined,
        damage: readNumber(entry, "damage") ??
            readNumber(entry, "Damage") ??
            readNumber(entry, "dmg") ??
            readNumber(entry, "Dmg") ??
            readNumber(entry, "totalDamage") ??
            readNumber(entry, "TotalDamage") ??
            0,
        heal: readNumber(entry, "heal") ??
            readNumber(entry, "Heal") ??
            readNumber(entry, "healing") ??
            readNumber(entry, "Healing") ??
            readNumber(entry, "totalHealing") ??
            readNumber(entry, "TotalHealing") ??
            0,
        kills: readNumber(entry, "kills") ?? readNumber(entry, "killCount") ?? 0,
        deaths: readNumber(entry, "deaths") ?? readNumber(entry, "deathCount") ?? 0,
        fame: readNumber(entry, "killFame") ??
            readNumber(entry, "KillFame") ??
            readNumber(entry, "fame") ??
            readNumber(entry, "Fame") ??
            0,
        weaponName: readString(entry, "weaponName") ??
            readString(entry, "WeaponName") ??
            readNestedString(entry, ["weapon", "name"]) ??
            readNestedString(entry, ["Weapon", "name"]) ??
            readNestedString(entry, ["weapon", "Name"]) ??
            readNestedString(entry, ["Weapon", "Name"]) ??
            readString(entry, "weaponLabel") ??
            readString(entry, "WeaponLabel") ??
            readString(entry, "weaponDisplayName") ??
            readString(entry, "WeaponDisplayName") ??
            readString(entry, "mainHandName") ??
            readString(entry, "MainHandName") ??
            readString(entry, "mainhandName") ??
            readString(entry, "MainhandName") ??
            readString(entry, "itemName") ??
            readString(entry, "ItemName") ??
            readString(entry, "weapon") ??
            readString(entry, "Weapon") ??
            readString(entry, "mainHand") ??
            readString(entry, "MainHand") ??
            readString(entry, "mainhand") ??
            readString(entry, "Mainhand") ??
            readString(entry, "itemId") ??
            readString(entry, "ItemId") ??
            readString(entry, "weaponId") ??
            readString(entry, "WeaponId") ??
            readString(entry, "mainHandType") ??
            readString(entry, "MainHandType") ??
            readString(entry, "mainhandType") ??
            readString(entry, "MainhandType") ??
            readString(entry, "mainHandUniqueName") ??
            readString(entry, "MainHandUniqueName") ??
            readNestedString(entry, ["Equipment", "MainHand", "Name"]) ??
            readNestedString(entry, ["Equipment", "Mainhand", "Name"]) ??
            readNestedString(entry, ["Equipment", "Weapon", "Name"]) ??
            readNestedString(entry, ["equipment", "mainHand", "name"]) ??
            readNestedString(entry, ["equipment", "mainhand", "name"]) ??
            readNestedString(entry, ["equipment", "weapon", "name"]) ??
            readNestedString(entry, ["gear", "mainHand", "name"]) ??
            readString(entry, "equipmentMainHand") ??
            readNestedString(entry, ["Equipment", "MainHand", "Type"]) ??
            readNestedString(entry, ["Equipment", "Mainhand", "Type"]) ??
            readNestedString(entry, ["Equipment", "Weapon", "Type"]) ??
            readNestedString(entry, ["equipment", "mainHand", "uniqueName"]) ??
            readNestedString(entry, ["equipment", "mainhand", "uniqueName"]) ??
            readNestedString(entry, ["equipment", "weapon", "uniqueName"]) ??
            readNestedString(entry, ["gear", "mainHand", "uniqueName"]) ??
            undefined,
        weaponIconName: readString(entry, "weaponIconName") ??
            readString(entry, "WeaponIconName") ??
            readNestedString(entry, ["weapon", "type"]) ??
            readNestedString(entry, ["Weapon", "type"]) ??
            readNestedString(entry, ["weapon", "Type"]) ??
            readNestedString(entry, ["Weapon", "Type"]) ??
            readString(entry, "weaponType") ??
            readString(entry, "WeaponType") ??
            readString(entry, "weaponUniqueName") ??
            readString(entry, "WeaponUniqueName") ??
            readString(entry, "mainHandType") ??
            readString(entry, "MainHandType") ??
            readString(entry, "mainhandType") ??
            readString(entry, "MainhandType") ??
            readString(entry, "mainHandUniqueName") ??
            readString(entry, "MainHandUniqueName") ??
            readString(entry, "itemId") ??
            readString(entry, "ItemId") ??
            readNestedString(entry, ["Equipment", "MainHand", "Type"]) ??
            readNestedString(entry, ["Equipment", "Mainhand", "Type"]) ??
            readNestedString(entry, ["Equipment", "Weapon", "Type"]) ??
            readNestedString(entry, ["equipment", "mainHand", "uniqueName"]) ??
            readNestedString(entry, ["equipment", "mainhand", "uniqueName"]) ??
            readNestedString(entry, ["equipment", "weapon", "uniqueName"]) ??
            readNestedString(entry, ["gear", "mainHand", "uniqueName"]) ??
            readNestedString(entry, ["Equipment", "MainHand", "Type"]) ??
            readNestedString(entry, ["Equipment", "Mainhand", "Type"]) ??
            readNestedString(entry, ["Equipment", "Weapon", "Type"]) ??
            undefined,
        mountName: readString(entry, "mountName") ??
            readString(entry, "MountName") ??
            readString(entry, "mount") ??
            readString(entry, "Mount") ??
            readNestedString(entry, ["mount", "name"]) ??
            readNestedString(entry, ["Mount", "name"]) ??
            readNestedString(entry, ["mount", "Name"]) ??
            readNestedString(entry, ["Mount", "Name"]) ??
            readNestedString(entry, ["Equipment", "Mount", "Name"]) ??
            readNestedString(entry, ["equipment", "mount", "name"]) ??
            undefined,
        mountIconName: readString(entry, "mountIconName") ??
            readString(entry, "MountIconName") ??
            readString(entry, "mountType") ??
            readString(entry, "MountType") ??
            readNestedString(entry, ["mount", "type"]) ??
            readNestedString(entry, ["Mount", "type"]) ??
            readNestedString(entry, ["mount", "Type"]) ??
            readNestedString(entry, ["Mount", "Type"]) ??
            readNestedString(entry, ["Equipment", "Mount", "Type"]) ??
            readNestedString(entry, ["equipment", "mount", "type"]) ??
            undefined
    };
}
function pickTopEntry(players, field) {
    const top = players.reduce((best, entry) => {
        if (!best || entry[field] > best[field]) {
            return entry;
        }
        return best;
    }, null);
    if (!top || top[field] <= 0) {
        return undefined;
    }
    return {
        playerName: top.name,
        guildName: top.guildName,
        allianceName: top.allianceName,
        value: top[field]
    };
}
function computeAverageIpForGuild(players, guildName) {
    return computeAverageIp(players.filter((player) => player.guildName === guildName));
}
function computeAverageIpForAlliance(players, allianceName) {
    return computeAverageIp(players.filter((player) => player.allianceName === allianceName));
}
function computeAverageIp(players) {
    const validIps = players
        .map((player) => player.ip)
        .filter((value) => typeof value === "number" && Number.isFinite(value) && value > 0);
    if (validIps.length === 0) {
        return undefined;
    }
    const total = validIps.reduce((sum, value) => sum + value, 0);
    return Math.round(total / validIps.length);
}
//# sourceMappingURL=index.js.map