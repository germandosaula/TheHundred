import type { Attendance, CTA, CTAStatus, GuildConfig, GuildMember, MemberStatus, PointsEntry, User, UserRole } from "@thehundred/domain";
export interface RegisterMemberInput {
    displayName: string;
    discordId: string;
    albionName: string;
    ctaPrimaryRole?: string;
    ctaSecondaryRole?: string;
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
export type RecruitmentApplicationStatus = "SUBMITTED" | "TICKET_OPEN" | "APPROVED" | "REJECTED";
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
export interface InviteRecord {
    id: string;
    code: string;
    createdBy: string;
    createdAt: string;
    consumedBy?: string;
    consumedAt?: string;
}
export interface OverviewAnnouncementRecord {
    id: string;
    position: number;
    title: string;
    body: string;
    updatedAt: string;
    updatedBy?: string;
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
    buildId?: string;
    notes: string;
}
export type BuildTemplateItemSlot = "MAIN_HAND" | "OFF_HAND" | "HEAD" | "ARMOR" | "SHOES" | "CAPE" | "BAG" | "MOUNT" | "FOOD" | "POTION";
export interface BuildTemplateItemRecord {
    slot: BuildTemplateItemSlot;
    itemId: string;
    itemName: string;
}
export interface BuildTemplateRecord {
    id: string;
    name: string;
    role: string;
    weaponId: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    items: BuildTemplateItemRecord[];
}
export interface SaveBuildTemplateInput {
    id?: string;
    name: string;
    role: string;
    weaponId: string;
    createdBy?: string;
    items: BuildTemplateItemRecord[];
}
export type CouncilTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type CouncilTaskCategory = "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";
export interface CouncilTaskRecord {
    id: string;
    title: string;
    description: string;
    category: CouncilTaskCategory;
    status: CouncilTaskStatus;
    assignedMemberId?: string;
    executeAt?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface CreateCouncilTaskInput {
    title: string;
    description: string;
    category: CouncilTaskCategory;
    status?: CouncilTaskStatus;
    assignedMemberId?: string;
    executeAt?: string;
    createdBy: string;
}
export interface UpdateCouncilTaskInput {
    title?: string;
    description?: string;
    category?: CouncilTaskCategory;
    status?: CouncilTaskStatus;
    assignedMemberId?: string;
    executeAt?: string;
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
    preferredRoles: string[];
    isFill: boolean;
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
    preferredRoles?: string[];
    isFill?: boolean;
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
            buildId?: string;
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
export interface WalletAccountRecord {
    userId: string;
    cashBalance: number;
    bankBalance: number;
    updatedAt: string;
}
export interface WalletTransactionRecord {
    id: string;
    userId: string;
    cashDelta: number;
    bankDelta: number;
    cashBalanceAfter: number;
    bankBalanceAfter: number;
    reason: string;
    createdBy?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export interface LootSplitPayoutRecord {
    id: string;
    createdBy: string;
    battleLink: string;
    battleIds: string[];
    guildName: string;
    splitRole: string;
    estValue: number;
    bags: number;
    repairCost: number;
    taxPercent: number;
    grossTotal: number;
    netAfterRep: number;
    taxAmount: number;
    finalPool: number;
    participantCount: number;
    perPerson: number;
    createdAt: string;
    idempotencyKey?: string;
}
export interface LootSplitPayoutCreateResult {
    payout: LootSplitPayoutRecord;
    alreadyProcessed: boolean;
}
export interface BottledEnergyLedgerImportRow {
    happenedAt: string;
    albionPlayer: string;
    albionPlayerNormalized: string;
    reason: string;
    amount: number;
    rowHash: string;
    userId?: string;
}
export interface BottledEnergyImportResult {
    importId: string;
    insertedRows: number;
    duplicateRows: number;
    totalRows: number;
}
export interface BottledEnergyBalanceRecord {
    memberId: string;
    userId: string;
    discordId: string;
    displayName: string;
    albionName?: string;
    balance: number;
}
export interface BottledEnergyUnmatchedBalanceRecord {
    albionName: string;
    balance: number;
    lastSeenAt: string;
}
export interface DatabaseRepository {
    getConfig(): Promise<GuildConfig>;
    getUsers(): Promise<User[]>;
    getUserById(userId: string): Promise<User | null>;
    getUserByDiscordId(discordId: string): Promise<User | null>;
    createUser(input: RegisterMemberInput & {
        role?: UserRole;
    }): Promise<User>;
    updateUserAvatar(userId: string, avatarUrl?: string): Promise<User | null>;
    updateUserAlbionName(userId: string, albionName: string): Promise<User | null>;
    updateUserCtaRoles(userId: string, input: {
        ctaPrimaryRole: string;
        ctaSecondaryRole: string;
    }): Promise<User | null>;
    getMembers(): Promise<GuildMember[]>;
    getMemberById(memberId: string): Promise<GuildMember | null>;
    getMemberByUserId(userId: string): Promise<GuildMember | null>;
    createMember(userId: string, status?: MemberStatus): Promise<GuildMember>;
    updateMemberStatus(memberId: string, status: MemberStatus): Promise<GuildMember | null>;
    kickMember(memberId: string, input: {
        kickedByUserId: string;
        reason?: string;
    }): Promise<GuildMember | null>;
    updateMemberBombGroup(memberId: string, bombGroupName?: string): Promise<GuildMember | null>;
    setMemberDiscordRoleStatus(memberId: string, status?: MemberStatus, syncedAt?: string): Promise<GuildMember | null>;
    getCtas(): Promise<CTA[]>;
    getCtaById(ctaId: string): Promise<CTA | null>;
    getCtaBySignupMessageId(messageId: string): Promise<CTA | null>;
    createCta(input: CreateCtaInput): Promise<CTA>;
    updateCtaStatus(ctaId: string, status: CTAStatus): Promise<CTA | null>;
    attachCtaSignupMessage(ctaId: string, input: {
        signupChannelId: string;
        signupMessageId: string;
    }): Promise<CTA | null>;
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
    getRanking(): Promise<Array<{
        memberId: string;
        points: number;
    }>>;
    getOpenSlots(): Promise<{
        slotsOpen: number;
        memberCap: number;
    }>;
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
    getBuildTemplates(): Promise<BuildTemplateRecord[]>;
    getBuildTemplateById(buildId: string): Promise<BuildTemplateRecord | null>;
    saveBuildTemplate(input: SaveBuildTemplateInput): Promise<BuildTemplateRecord>;
    deleteBuildTemplate(buildId: string): Promise<boolean>;
    getCouncilTasks(): Promise<CouncilTaskRecord[]>;
    getCouncilTaskById(taskId: string): Promise<CouncilTaskRecord | null>;
    createCouncilTask(input: CreateCouncilTaskInput): Promise<CouncilTaskRecord>;
    updateCouncilTask(taskId: string, input: UpdateCouncilTaskInput): Promise<CouncilTaskRecord | null>;
    updateCouncilTaskStatus(taskId: string, status: CouncilTaskStatus): Promise<CouncilTaskRecord | null>;
    deleteCouncilTask(taskId: string): Promise<boolean>;
    getOverviewAnnouncements(): Promise<OverviewAnnouncementRecord[]>;
    replaceOverviewAnnouncements(input: Array<{
        title: string;
        body: string;
    }>, updatedBy: string): Promise<OverviewAnnouncementRecord[]>;
    getCtaSignups(ctaId: string): Promise<CtaSignupRecord[]>;
    upsertCtaSignup(input: SaveCtaSignupInput): Promise<CtaSignupRecord>;
    deleteCtaSignup(ctaId: string, memberId: string): Promise<boolean>;
    getRecruitmentApplicationByUserId(userId: string): Promise<RecruitmentApplicationRecord | null>;
    saveRecruitmentApplication(input: SaveRecruitmentApplicationInput): Promise<RecruitmentApplicationRecord>;
    listTicketPendingRecruitmentApplications(): Promise<RecruitmentApplicationRecord[]>;
    markRecruitmentApplicationTicketOpened(applicationId: string, ticketChannelId: string): Promise<RecruitmentApplicationRecord | null>;
    updateRecruitmentApplicationStatus(applicationId: string, status: RecruitmentApplicationStatus): Promise<RecruitmentApplicationRecord | null>;
    createInvite(createdBy: string): Promise<InviteRecord>;
    getInviteByCode(code: string): Promise<InviteRecord | null>;
    consumeInvite(code: string, consumedBy: string): Promise<InviteRecord | null>;
    getWalletAccount(userId: string): Promise<WalletAccountRecord>;
    listWalletAccounts(): Promise<WalletAccountRecord[]>;
    addWalletTransaction(input: {
        userId: string;
        cashDelta: number;
        bankDelta?: number;
        reason: string;
        createdBy?: string;
        metadata?: Record<string, unknown>;
    }): Promise<WalletTransactionRecord>;
    createLootSplitPayout(input: {
        createdBy: string;
        battleLink: string;
        battleIds: string[];
        guildName: string;
        splitRole: string;
        estValue: number;
        bags: number;
        repairCost: number;
        taxPercent: number;
        grossTotal: number;
        netAfterRep: number;
        taxAmount: number;
        finalPool: number;
        participantCount: number;
        perPerson: number;
        payouts: Array<{
            memberId: string;
            userId: string;
            playerName: string;
            amount: number;
        }>;
        idempotencyKey?: string;
    }): Promise<LootSplitPayoutCreateResult>;
    importBottledEnergyLedger(input: {
        importedBy: string;
        sourcePreview?: string;
        rows: BottledEnergyLedgerImportRow[];
    }): Promise<BottledEnergyImportResult>;
    listBottledEnergyBalances(): Promise<BottledEnergyBalanceRecord[]>;
    listBottledEnergyUnmatchedBalances(): Promise<BottledEnergyUnmatchedBalanceRecord[]>;
    resetBottledEnergyLedger(): Promise<{
        deletedLedgerRows: number;
        deletedImportRows: number;
    }>;
}
