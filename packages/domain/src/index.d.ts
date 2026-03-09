export type UserRole = "PLAYER" | "OFFICER" | "ADMIN";
export type MemberStatus = "PENDING" | "TRIAL" | "CORE" | "BENCHED" | "COUNCIL" | "REJECTED";
export type AttendanceDecision = "YES" | "NO" | "JUSTIFIED";
export type AttendanceState = "PRESENT" | "ABSENT";
export type CTAStatus = "CREATED" | "OPEN" | "FINALIZED" | "CANCELED";
export type RegearStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED";
export interface User {
    id: string;
    discordId: string;
    displayName: string;
    albionName?: string;
    ctaPrimaryRole?: string;
    ctaSecondaryRole?: string;
    role: UserRole;
    avatarUrl?: string;
}
export interface GuildMember {
    id: string;
    userId: string;
    status: MemberStatus;
    joinedAt: string;
    bombGroupName?: string;
    discordRoleStatus?: MemberStatus;
    discordRoleSyncedAt?: string;
    kickedAt?: string;
    kickedByUserId?: string;
    kickReason?: string;
}
export interface CTA {
    id: string;
    title: string;
    datetimeUtc: string;
    status: CTAStatus;
    createdBy: string;
    compId?: string;
    signupChannelId?: string;
    signupMessageId?: string;
}
export interface Attendance {
    id: string;
    ctaId: string;
    memberId: string;
    decision: AttendanceDecision;
    state: AttendanceState;
}
export interface PointsEntry {
    id: string;
    memberId: string;
    ctaId?: string;
    reason: string;
    points: number;
    createdAt: string;
    reversedAt?: string;
}
export interface GuildConfig {
    attendancePoints: number;
    absencePenalty: number;
    memberCap: number;
}
export declare class DomainError extends Error {
    constructor(message: string);
}
export declare function transitionMemberStatus(currentStatus: MemberStatus, nextStatus: MemberStatus): MemberStatus;
export declare function transitionCtaStatus(currentStatus: CTAStatus, nextStatus: CTAStatus): CTAStatus;
export declare function assertOfficerOrAdmin(role: UserRole): void;
export declare function calculatePointsDelta(attendance: Pick<Attendance, "decision" | "state">, config: GuildConfig): number;
export declare function buildRanking(entries: PointsEntry[]): Array<{
    memberId: string;
    points: number;
}>;
export declare function countOpenSlots(members: GuildMember[], config: GuildConfig): number;
export declare function memberHasPrivateAccess(member: GuildMember | null): boolean;
export declare function generateAttendancePointsEntries(args: {
    ctaId: string;
    attendances: Attendance[];
    members: GuildMember[];
    config: GuildConfig;
    now: string;
}): PointsEntry[];
