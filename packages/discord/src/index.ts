import type { UserRole } from "@thehundred/domain";

export interface DiscordRoleSnapshot {
  discordUserId: string;
  inServer: boolean;
  isOfficer: boolean;
}

export interface RoleSyncResult {
  discordUserId: string;
  nextRole: UserRole;
  reason: string;
}

export function reconcileRole(
  snapshot: DiscordRoleSnapshot,
  currentRole: UserRole
): RoleSyncResult | null {
  if (!snapshot.inServer) {
    return {
      discordUserId: snapshot.discordUserId,
      nextRole: "PLAYER",
      reason: "User is no longer in Discord server"
    };
  }

  if (!snapshot.isOfficer && currentRole === "OFFICER") {
    return {
      discordUserId: snapshot.discordUserId,
      nextRole: "PLAYER",
      reason: "Discord officer role was removed"
    };
  }

  return null;
}

