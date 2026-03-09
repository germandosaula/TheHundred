import { type Attendance, type CTA, type CTAStatus, type GuildConfig, type GuildMember, type MemberStatus, type PointsEntry, type User, type UserRole } from "@thehundred/domain";
import type { BuildTemplateRecord, BattleMemberAttendanceRecord, BattlePerformanceBombRecord, BattlePerformanceSnapshotRecord, CouncilTaskRecord, CouncilTaskStatus, CtaSignupRecord, CompRecord, CreateCouncilTaskInput, CreateCtaInput, DatabaseRepository, InviteRecord, OverviewAnnouncementRecord, RecruitmentApplicationRecord, RecruitmentApplicationStatus, RegisterMemberInput, SaveCompInput, SaveBuildTemplateInput, SaveRecruitmentApplicationInput, UpdateCouncilTaskInput } from "./repository.ts";
interface SupabaseRepositoryOptions {
    url: string;
    serviceRoleKey: string;
}
export declare class SupabaseDatabaseRepository implements DatabaseRepository {
    private readonly client;
    constructor(options: SupabaseRepositoryOptions);
    getConfig(): Promise<GuildConfig>;
    getUsers(): Promise<User[]>;
    getUserById(userId: string): Promise<User | null>;
    getUserByDiscordId(discordId: string): Promise<User | null>;
    createUser(input: RegisterMemberInput & {
        role?: UserRole;
    }): Promise<User>;
    updateUserAvatar(userId: string, avatarUrl?: string): Promise<User | null>;
    updateUserAlbionName(userId: string, albionName: string): Promise<User | null>;
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
    upsertCtaSignup(input: {
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
    }): Promise<CtaSignupRecord>;
    deleteCtaSignup(ctaId: string, memberId: string): Promise<boolean>;
    getRecruitmentApplicationByUserId(userId: string): Promise<RecruitmentApplicationRecord | null>;
    saveRecruitmentApplication(input: SaveRecruitmentApplicationInput): Promise<RecruitmentApplicationRecord>;
    listTicketPendingRecruitmentApplications(): Promise<RecruitmentApplicationRecord[]>;
    markRecruitmentApplicationTicketOpened(applicationId: string, ticketChannelId: string): Promise<RecruitmentApplicationRecord | null>;
    updateRecruitmentApplicationStatus(applicationId: string, status: RecruitmentApplicationStatus): Promise<RecruitmentApplicationRecord | null>;
    createInvite(createdBy: string): Promise<InviteRecord>;
    getInviteByCode(code: string): Promise<InviteRecord | null>;
    consumeInvite(code: string, consumedBy: string): Promise<InviteRecord | null>;
}
export declare function createSupabaseRepository(options: SupabaseRepositoryOptions): DatabaseRepository;
export {};
