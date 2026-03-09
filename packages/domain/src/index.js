const slotConsumingStatuses = ["TRIAL", "CORE", "BENCHED", "COUNCIL"];
const privateAccessStatuses = ["TRIAL", "CORE", "COUNCIL"];
export class DomainError extends Error {
    constructor(message) {
        super(message);
        this.name = "DomainError";
    }
}
const allowedStatusTransitions = {
    PENDING: ["TRIAL", "COUNCIL", "REJECTED"],
    TRIAL: ["CORE", "COUNCIL", "REJECTED"],
    CORE: ["BENCHED", "COUNCIL", "REJECTED"],
    BENCHED: ["CORE", "COUNCIL", "REJECTED"],
    COUNCIL: ["CORE", "BENCHED", "REJECTED"],
    REJECTED: ["TRIAL"]
};
const allowedCtaTransitions = {
    CREATED: ["OPEN", "CANCELED"],
    OPEN: ["FINALIZED", "CANCELED"],
    FINALIZED: [],
    CANCELED: []
};
export function transitionMemberStatus(currentStatus, nextStatus) {
    if (!allowedStatusTransitions[currentStatus].includes(nextStatus)) {
        throw new DomainError(`Invalid member status transition: ${currentStatus} -> ${nextStatus}`);
    }
    return nextStatus;
}
export function transitionCtaStatus(currentStatus, nextStatus) {
    if (!allowedCtaTransitions[currentStatus].includes(nextStatus)) {
        throw new DomainError(`Invalid CTA status transition: ${currentStatus} -> ${nextStatus}`);
    }
    return nextStatus;
}
export function assertOfficerOrAdmin(role) {
    if (role !== "OFFICER" && role !== "ADMIN") {
        throw new DomainError("Officer or admin role required");
    }
}
export function calculatePointsDelta(attendance, config) {
    if (attendance.state === "PRESENT") {
        return config.attendancePoints;
    }
    if (attendance.decision === "YES") {
        return -config.absencePenalty;
    }
    return 0;
}
export function buildRanking(entries) {
    const totals = new Map();
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
export function countOpenSlots(members, config) {
    const activeCount = members.filter((member) => slotConsumingStatuses.includes(member.status)).length;
    return Math.max(config.memberCap - activeCount, 0);
}
export function memberHasPrivateAccess(member) {
    if (!member) {
        return false;
    }
    return privateAccessStatuses.includes(member.status) && member.discordRoleStatus === member.status;
}
export function generateAttendancePointsEntries(args) {
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
//# sourceMappingURL=index.js.map