export type UserRole = "PLAYER" | "OFFICER" | "ADMIN";
export type MemberStatus = "PENDING" | "TRIAL" | "CORE" | "BENCHED" | "REJECTED";
export type AttendanceDecision = "YES" | "NO" | "JUSTIFIED";
export type AttendanceState = "PRESENT" | "ABSENT";
export type CTAStatus = "CREATED" | "OPEN" | "FINALIZED";
export type RegearStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED";

export interface User {
  id: string;
  discordId: string;
  displayName: string;
  albionName?: string;
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

const slotConsumingStatuses: MemberStatus[] = ["TRIAL", "CORE", "BENCHED"];

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

const allowedStatusTransitions: Record<MemberStatus, MemberStatus[]> = {
  PENDING: ["TRIAL", "REJECTED"],
  TRIAL: ["CORE", "REJECTED"],
  CORE: ["BENCHED", "REJECTED"],
  BENCHED: ["CORE", "REJECTED"],
  REJECTED: ["TRIAL"]
};

const allowedCtaTransitions: Record<CTAStatus, CTAStatus[]> = {
  CREATED: ["OPEN"],
  OPEN: ["FINALIZED"],
  FINALIZED: []
};

export function transitionMemberStatus(
  currentStatus: MemberStatus,
  nextStatus: MemberStatus
): MemberStatus {
  if (!allowedStatusTransitions[currentStatus].includes(nextStatus)) {
    throw new DomainError(`Invalid member status transition: ${currentStatus} -> ${nextStatus}`);
  }

  return nextStatus;
}

export function transitionCtaStatus(currentStatus: CTAStatus, nextStatus: CTAStatus): CTAStatus {
  if (!allowedCtaTransitions[currentStatus].includes(nextStatus)) {
    throw new DomainError(`Invalid CTA status transition: ${currentStatus} -> ${nextStatus}`);
  }

  return nextStatus;
}

export function assertOfficerOrAdmin(role: UserRole): void {
  if (role !== "OFFICER" && role !== "ADMIN") {
    throw new DomainError("Officer or admin role required");
  }
}

export function calculatePointsDelta(
  attendance: Pick<Attendance, "decision" | "state">,
  config: GuildConfig
): number {
  if (attendance.state === "PRESENT") {
    return config.attendancePoints;
  }

  if (attendance.decision === "YES") {
    return -config.absencePenalty;
  }

  return 0;
}

export function buildRanking(entries: PointsEntry[]): Array<{ memberId: string; points: number }> {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    if (entry.reversedAt) {
      continue;
    }

    totals.set(entry.memberId, (totals.get(entry.memberId) ?? 0) + entry.points);
  }

  return [...totals.entries()]
    .map(([memberId, points]) => ({ memberId, points }))
    .sort((left, right) => right.points - left.points);
}

export function countOpenSlots(members: GuildMember[], config: GuildConfig): number {
  const activeCount = members.filter((member) => slotConsumingStatuses.includes(member.status)).length;
  return Math.max(config.memberCap - activeCount, 0);
}

export function memberHasPrivateAccess(member: GuildMember | null): boolean {
  if (!member) {
    return false;
  }

  return slotConsumingStatuses.includes(member.status) && member.discordRoleStatus === member.status;
}

export function generateAttendancePointsEntries(args: {
  ctaId: string;
  attendances: Attendance[];
  members: GuildMember[];
  config: GuildConfig;
  now: string;
}): PointsEntry[] {
  const attendanceByMemberId = new Map(args.attendances.map((attendance) => [attendance.memberId, attendance]));

  return args.members
    .filter((member) => member.status !== "REJECTED")
    .map((member) => {
      const attendance = attendanceByMemberId.get(member.id);
      const points = attendance
        ? calculatePointsDelta(attendance, args.config)
        : 0;

      return {
        id: `${args.ctaId}:${member.id}:attendance`,
        memberId: member.id,
        ctaId: args.ctaId,
        reason: "attendance",
        points,
        createdAt: args.now
      };
    });
}
