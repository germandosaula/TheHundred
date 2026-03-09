import { randomUUID } from "node:crypto";
import { buildRanking, countOpenSlots, generateAttendancePointsEntries } from "@thehundred/domain";
export class InMemoryDatabaseRepository {
    state;
    constructor(state) {
        this.state = state;
    }
    async getConfig() {
        return this.state.config;
    }
    async getUsers() {
        return this.state.users;
    }
    async getUserById(userId) {
        return this.state.users.find((user) => user.id === userId) ?? null;
    }
    async getUserByDiscordId(discordId) {
        return this.state.users.find((user) => user.discordId === discordId) ?? null;
    }
    async createUser(input) {
        const user = {
            id: randomUUID(),
            discordId: input.discordId,
            displayName: input.displayName,
            albionName: input.albionName,
            ctaPrimaryRole: input.ctaPrimaryRole,
            ctaSecondaryRole: input.ctaSecondaryRole,
            role: input.role ?? "PLAYER",
            avatarUrl: input.avatarUrl
        };
        this.state.users.push(user);
        return user;
    }
    async updateUserAvatar(userId, avatarUrl) {
        const user = this.state.users.find((entry) => entry.id === userId) ?? null;
        if (!user) {
            return null;
        }
        user.avatarUrl = avatarUrl;
        return user;
    }
    async updateUserAlbionName(userId, albionName) {
        const user = this.state.users.find((entry) => entry.id === userId) ?? null;
        if (!user) {
            return null;
        }
        user.albionName = albionName;
        return user;
    }
    async updateUserCtaRoles(userId, input) {
        const user = this.state.users.find((entry) => entry.id === userId) ?? null;
        if (!user) {
            return null;
        }
        user.ctaPrimaryRole = input.ctaPrimaryRole;
        user.ctaSecondaryRole = input.ctaSecondaryRole;
        return user;
    }
    async getMembers() {
        return this.state.members;
    }
    async getMemberById(memberId) {
        return this.state.members.find((member) => member.id === memberId) ?? null;
    }
    async getMemberByUserId(userId) {
        return this.state.members.find((member) => member.userId === userId) ?? null;
    }
    async createMember(userId, status = "PENDING") {
        const member = {
            id: randomUUID(),
            userId,
            status,
            joinedAt: new Date().toISOString(),
            bombGroupName: undefined,
            discordRoleStatus: undefined,
            discordRoleSyncedAt: undefined,
            kickedAt: undefined,
            kickedByUserId: undefined,
            kickReason: undefined
        };
        this.state.members.push(member);
        return member;
    }
    async updateMemberStatus(memberId, status) {
        const member = this.state.members.find((item) => item.id === memberId) ?? null;
        if (!member) {
            return null;
        }
        member.status = status;
        if (status !== "REJECTED") {
            member.kickedAt = undefined;
            member.kickedByUserId = undefined;
            member.kickReason = undefined;
        }
        return member;
    }
    async kickMember(memberId, input) {
        const member = this.state.members.find((item) => item.id === memberId) ?? null;
        if (!member) {
            return null;
        }
        member.status = "REJECTED";
        member.kickedAt = new Date().toISOString();
        member.kickedByUserId = input.kickedByUserId;
        member.kickReason = input.reason?.trim() || undefined;
        member.discordRoleStatus = "REJECTED";
        member.discordRoleSyncedAt = new Date().toISOString();
        return member;
    }
    async updateMemberBombGroup(memberId, bombGroupName) {
        const member = this.state.members.find((item) => item.id === memberId) ?? null;
        if (!member) {
            return null;
        }
        member.bombGroupName = bombGroupName;
        return member;
    }
    async setMemberDiscordRoleStatus(memberId, status, syncedAt = new Date().toISOString()) {
        const member = this.state.members.find((item) => item.id === memberId) ?? null;
        if (!member) {
            return null;
        }
        member.discordRoleStatus = status;
        member.discordRoleSyncedAt = status ? syncedAt : undefined;
        return member;
    }
    async getCtas() {
        return this.state.ctas;
    }
    async getCtaById(ctaId) {
        return this.state.ctas.find((cta) => cta.id === ctaId) ?? null;
    }
    async getCtaBySignupMessageId(messageId) {
        return this.state.ctas.find((cta) => cta.signupMessageId === messageId) ?? null;
    }
    async createCta(input) {
        const cta = {
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
    async updateCtaStatus(ctaId, status) {
        const cta = this.state.ctas.find((item) => item.id === ctaId) ?? null;
        if (!cta) {
            return null;
        }
        cta.status = status;
        return cta;
    }
    async attachCtaSignupMessage(ctaId, input) {
        const cta = this.state.ctas.find((item) => item.id === ctaId) ?? null;
        if (!cta) {
            return null;
        }
        cta.signupChannelId = input.signupChannelId;
        cta.signupMessageId = input.signupMessageId;
        return cta;
    }
    async getPointsHistory() {
        return this.state.pointsHistory;
    }
    async getAttendanceByCtaId(ctaId) {
        return this.state.attendance.filter((entry) => entry.ctaId === ctaId);
    }
    async upsertAttendance(input) {
        const existing = this.state.attendance.find((entry) => entry.ctaId === input.ctaId && entry.memberId === input.memberId) ?? null;
        if (existing) {
            existing.decision = input.decision;
            existing.state = input.state;
            return existing;
        }
        const next = {
            id: randomUUID(),
            ctaId: input.ctaId,
            memberId: input.memberId,
            decision: input.decision,
            state: input.state
        };
        this.state.attendance.push(next);
        return next;
    }
    async deleteAttendance(ctaId, memberId) {
        const next = this.state.attendance.filter((entry) => !(entry.ctaId === ctaId && entry.memberId === memberId));
        const deleted = next.length !== this.state.attendance.length;
        this.state.attendance = next;
        return deleted;
    }
    async regenerateAttendancePointsForCta(ctaId) {
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
    async getRanking() {
        return buildRanking(this.state.pointsHistory);
    }
    async getOpenSlots() {
        return {
            slotsOpen: countOpenSlots(this.state.members, this.state.config),
            memberCap: this.state.config.memberCap
        };
    }
    async getBattlePerformanceSnapshots() {
        return this.state.battlePerformanceSnapshots;
    }
    async getBattlePerformanceBombs() {
        return this.state.battlePerformanceBombs;
    }
    async getBattleMemberAttendances() {
        return this.state.battleMemberAttendances;
    }
    async saveBattlePerformanceSnapshot(input) {
        const now = new Date().toISOString();
        const snapshot = {
            battleId: input.battleId,
            startTime: input.startTime,
            guildName: input.guildName,
            guildPlayers: input.guildPlayers,
            guildKills: input.guildKills,
            guildDeaths: input.guildDeaths,
            mainKills: input.mainKills,
            mainDeaths: input.mainDeaths,
            processedAt: now
        };
        this.state.battlePerformanceSnapshots = this.state.battlePerformanceSnapshots.filter((entry) => entry.battleId !== input.battleId);
        this.state.battlePerformanceSnapshots.push(snapshot);
        this.state.battlePerformanceBombs = this.state.battlePerformanceBombs.filter((entry) => entry.battleId !== input.battleId);
        this.state.battlePerformanceBombs.push(...input.bombs.map((bomb) => ({
            battleId: input.battleId,
            bombGroupName: bomb.bombGroupName,
            players: bomb.players,
            kills: bomb.kills,
            deaths: bomb.deaths
        })));
        this.state.battleMemberAttendances = this.state.battleMemberAttendances.filter((entry) => entry.battleId !== input.battleId);
        this.state.battleMemberAttendances.push(...input.memberAttendances.map((entry) => ({
            battleId: input.battleId,
            memberId: entry.memberId
        })));
        return snapshot;
    }
    async getComps() {
        return [...this.state.comps].sort((left, right) => left.name.localeCompare(right.name));
    }
    async getCompById(compId) {
        return this.state.comps.find((comp) => comp.id === compId) ?? null;
    }
    async saveComp(input) {
        const now = new Date().toISOString();
        const comp = {
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
                    .map((slot) => ({
                    id: slot.id ?? randomUUID(),
                    position: slot.position,
                    label: slot.label,
                    playerUserId: slot.playerUserId,
                    playerName: slot.playerName,
                    role: slot.role,
                    weaponId: slot.weaponId,
                    weaponName: slot.weaponName,
                    buildId: slot.buildId,
                    notes: slot.notes
                }))
                    .sort((left, right) => left.position - right.position)
            }))
                .sort((left, right) => left.position - right.position)
        };
        const index = this.state.comps.findIndex((entry) => entry.id === comp.id);
        if (index >= 0) {
            this.state.comps[index] = comp;
        }
        else {
            this.state.comps.push(comp);
        }
        return comp;
    }
    async deleteComp(compId) {
        const nextLength = this.state.comps.filter((comp) => comp.id !== compId).length;
        const deleted = nextLength !== this.state.comps.length;
        this.state.comps = this.state.comps.filter((comp) => comp.id !== compId);
        return deleted;
    }
    async getBuildTemplates() {
        return [...this.state.buildTemplates].sort((left, right) => left.name.localeCompare(right.name));
    }
    async getBuildTemplateById(buildId) {
        return this.state.buildTemplates.find((build) => build.id === buildId) ?? null;
    }
    async saveBuildTemplate(input) {
        const now = new Date().toISOString();
        const existing = input.id
            ? this.state.buildTemplates.find((entry) => entry.id === input.id) ?? null
            : null;
        const next = {
            id: existing?.id ?? input.id ?? randomUUID(),
            name: input.name,
            role: input.role,
            weaponId: input.weaponId,
            createdBy: existing?.createdBy ?? input.createdBy,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            items: input.items.map((item) => ({
                slot: item.slot,
                itemId: item.itemId,
                itemName: item.itemName
            }))
        };
        const index = this.state.buildTemplates.findIndex((entry) => entry.id === next.id);
        if (index >= 0) {
            this.state.buildTemplates[index] = next;
        }
        else {
            this.state.buildTemplates.push(next);
        }
        return next;
    }
    async deleteBuildTemplate(buildId) {
        const nextLength = this.state.buildTemplates.filter((build) => build.id !== buildId).length;
        const deleted = nextLength !== this.state.buildTemplates.length;
        this.state.buildTemplates = this.state.buildTemplates.filter((build) => build.id !== buildId);
        this.state.comps = this.state.comps.map((comp) => ({
            ...comp,
            parties: comp.parties.map((party) => ({
                ...party,
                slots: party.slots.map((slot) => slot.buildId === buildId
                    ? {
                        ...slot,
                        buildId: undefined
                    }
                    : slot)
            }))
        }));
        return deleted;
    }
    async getCouncilTasks() {
        return [...this.state.councilTasks].sort((left, right) => {
            const leftTime = left.executeAt ? new Date(left.executeAt).getTime() : Number.MAX_SAFE_INTEGER;
            const rightTime = right.executeAt ? new Date(right.executeAt).getTime() : Number.MAX_SAFE_INTEGER;
            if (leftTime !== rightTime) {
                return leftTime - rightTime;
            }
            return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        });
    }
    async getCouncilTaskById(taskId) {
        return this.state.councilTasks.find((task) => task.id === taskId) ?? null;
    }
    async createCouncilTask(input) {
        const now = new Date().toISOString();
        const next = {
            id: randomUUID(),
            title: input.title,
            description: input.description,
            category: input.category,
            status: input.status ?? "TODO",
            assignedMemberId: input.assignedMemberId,
            executeAt: input.executeAt,
            createdBy: input.createdBy,
            createdAt: now,
            updatedAt: now
        };
        this.state.councilTasks.push(next);
        return next;
    }
    async updateCouncilTask(taskId, input) {
        const task = this.state.councilTasks.find((entry) => entry.id === taskId) ?? null;
        if (!task) {
            return null;
        }
        if (typeof input.title === "string") {
            task.title = input.title;
        }
        if (typeof input.description === "string") {
            task.description = input.description;
        }
        if (typeof input.category === "string") {
            task.category = input.category;
        }
        if (typeof input.status === "string") {
            task.status = input.status;
        }
        if (Object.prototype.hasOwnProperty.call(input, "assignedMemberId")) {
            task.assignedMemberId = input.assignedMemberId;
        }
        if (Object.prototype.hasOwnProperty.call(input, "executeAt")) {
            task.executeAt = input.executeAt;
        }
        task.updatedAt = new Date().toISOString();
        return task;
    }
    async updateCouncilTaskStatus(taskId, status) {
        const task = this.state.councilTasks.find((entry) => entry.id === taskId) ?? null;
        if (!task) {
            return null;
        }
        task.status = status;
        task.updatedAt = new Date().toISOString();
        return task;
    }
    async deleteCouncilTask(taskId) {
        const next = this.state.councilTasks.filter((task) => task.id !== taskId);
        const deleted = next.length !== this.state.councilTasks.length;
        this.state.councilTasks = next;
        return deleted;
    }
    async getOverviewAnnouncements() {
        return [...this.state.overviewAnnouncements].sort((left, right) => left.position - right.position);
    }
    async replaceOverviewAnnouncements(input, updatedBy) {
        const now = new Date().toISOString();
        this.state.overviewAnnouncements = input.map((entry, index) => ({
            id: randomUUID(),
            position: index,
            title: entry.title,
            body: entry.body,
            updatedAt: now,
            updatedBy
        }));
        return this.getOverviewAnnouncements();
    }
    async getCtaSignups(ctaId) {
        return this.state.ctaSignups
            .filter((entry) => entry.ctaId === ctaId)
            .sort((left, right) => left.reactedAt.localeCompare(right.reactedAt));
    }
    async upsertCtaSignup(input) {
        const existing = this.state.ctaSignups.find((entry) => entry.ctaId === input.ctaId && entry.memberId === input.memberId) ?? null;
        if (existing) {
            existing.role = input.role;
            existing.slotKey = input.slotKey;
            existing.slotLabel = input.slotLabel;
            existing.weaponName = input.weaponName;
            existing.reactionEmoji = input.reactionEmoji;
            existing.playerName = input.playerName;
            existing.preferredRoles = input.preferredRoles ?? [];
            existing.isFill = input.isFill ?? false;
            existing.reactedAt = new Date().toISOString();
            return existing;
        }
        const next = {
            id: randomUUID(),
            ctaId: input.ctaId,
            memberId: input.memberId,
            role: input.role,
            slotKey: input.slotKey,
            slotLabel: input.slotLabel,
            weaponName: input.weaponName,
            reactionEmoji: input.reactionEmoji,
            playerName: input.playerName,
            preferredRoles: input.preferredRoles ?? [],
            isFill: input.isFill ?? false,
            reactedAt: new Date().toISOString()
        };
        this.state.ctaSignups.push(next);
        return next;
    }
    async deleteCtaSignup(ctaId, memberId) {
        const next = this.state.ctaSignups.filter((entry) => !(entry.ctaId === ctaId && entry.memberId === memberId));
        const deleted = next.length !== this.state.ctaSignups.length;
        this.state.ctaSignups = next;
        return deleted;
    }
    async getRecruitmentApplicationByUserId(userId) {
        return this.state.recruitmentApplications.find((entry) => entry.userId === userId) ?? null;
    }
    async saveRecruitmentApplication(input) {
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
        const next = {
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
    async listTicketPendingRecruitmentApplications() {
        return this.state.recruitmentApplications.filter((entry) => entry.status === "SUBMITTED" && !entry.ticketChannelId);
    }
    async markRecruitmentApplicationTicketOpened(applicationId, ticketChannelId) {
        const application = this.state.recruitmentApplications.find((entry) => entry.id === applicationId) ?? null;
        if (!application) {
            return null;
        }
        application.status = "TICKET_OPEN";
        application.ticketChannelId = ticketChannelId;
        application.updatedAt = new Date().toISOString();
        return application;
    }
    async updateRecruitmentApplicationStatus(applicationId, status) {
        const application = this.state.recruitmentApplications.find((entry) => entry.id === applicationId) ?? null;
        if (!application) {
            return null;
        }
        application.status = status;
        application.updatedAt = new Date().toISOString();
        return application;
    }
    async createInvite(createdBy) {
        const invite = {
            id: randomUUID(),
            code: randomUUID().replace(/-/g, ""),
            createdBy,
            createdAt: new Date().toISOString()
        };
        this.state.invites.push(invite);
        return invite;
    }
    async getInviteByCode(code) {
        return this.state.invites.find((entry) => entry.code === code) ?? null;
    }
    async consumeInvite(code, consumedBy) {
        const invite = await this.getInviteByCode(code);
        if (!invite || invite.consumedAt) {
            return null;
        }
        invite.consumedBy = consumedBy;
        invite.consumedAt = new Date().toISOString();
        return invite;
    }
}
export function createSeedState() {
    return {
        users: [
            { id: "u1", discordId: "1001", displayName: "Astra", albionName: "Astra", role: "ADMIN" },
            { id: "u2", discordId: "1002", displayName: "Bram", albionName: "Bram", role: "OFFICER" },
            { id: "u3", discordId: "1003", displayName: "Cyra", albionName: "Cyra", role: "PLAYER" }
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
        battlePerformanceSnapshots: [],
        battlePerformanceBombs: [],
        battleMemberAttendances: [],
        comps: [],
        buildTemplates: [],
        councilTasks: [],
        overviewAnnouncements: [
            {
                id: "oa1",
                position: 0,
                title: "CTA principal",
                body: "Revisa siempre el enlace directo desde esta vista para entrar al bloque correcto.",
                updatedAt: "2026-03-01T00:00:00Z",
                updatedBy: "u1"
            },
            {
                id: "oa2",
                position: 1,
                title: "Estado de bot",
                body: "Si no ves CTA en web, validar bot online y canal de signup en Discord.",
                updatedAt: "2026-03-01T00:00:00Z",
                updatedBy: "u1"
            }
        ],
        recruitmentApplications: [],
        invites: [],
        config: {
            attendancePoints: 10,
            absencePenalty: 5,
            memberCap: 100
        }
    };
}
export function createSeedRepository() {
    return new InMemoryDatabaseRepository(createSeedState());
}
//# sourceMappingURL=memory.js.map