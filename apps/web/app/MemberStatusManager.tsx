"use client";

import { useState } from "react";

type MemberStatus = "PENDING" | "TRIAL" | "CORE" | "BENCHED" | "REJECTED";

interface MemberRow {
  id: string;
  userId: string;
  displayName: string;
  discordId: string;
  avatarUrl?: string;
  status: MemberStatus;
  discordRoleStatus?: MemberStatus;
}

interface MemberStatusManagerProps {
  members: MemberRow[];
}

const allowedTransitions: Record<MemberStatus, Array<Exclude<MemberStatus, "PENDING">>> = {
  PENDING: ["TRIAL", "REJECTED"],
  TRIAL: ["CORE", "REJECTED"],
  CORE: ["BENCHED", "REJECTED"],
  BENCHED: ["CORE", "REJECTED"],
  REJECTED: ["TRIAL"]
};

const statusLabels: Record<Exclude<MemberStatus, "PENDING">, string> = {
  TRIAL: "Trial",
  CORE: "Core",
  BENCHED: "Benched",
  REJECTED: "Reject"
};

const currentStatusLabels: Record<MemberStatus, string> = {
  PENDING: "Pendiente",
  TRIAL: "Trial",
  CORE: "Core",
  BENCHED: "Benched",
  REJECTED: "Rechazado"
};

function getDiscordSyncLabel(member: MemberRow) {
  if (member.discordRoleStatus === member.status) {
    return `Discord sincronizado como ${currentStatusLabels[member.status]}`;
  }

  return `Discord pendiente (${member.discordRoleStatus ?? "sin rol de guild"})`;
}

export function MemberStatusManager({ members }: MemberStatusManagerProps) {
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(memberId: string, status: Exclude<MemberStatus, "PENDING">) {
    setPendingMemberId(memberId);
    setError(null);

    try {
      const response = await fetch("/members/status", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ memberId, status })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? `Update failed with status ${response.status}`);
      }

      window.location.reload();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Update failed");
      setPendingMemberId(null);
    }
  }

  return (
    <div className="member-manager">
      <div className="member-list-head">
        <span>#</span>
        <span>Jugador</span>
        <span>Estado web</span>
        <span>Estado Discord</span>
        <span>Acciones</span>
      </div>
      <ul className="member-list member-list-table">
        {members.map((member, index) => (
          <li className="member-row member-row-list" key={member.id}>
            <div className="member-cell member-cell-index">
              <span className="status-badge member-index-badge">#{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="member-cell member-cell-player">
              {member.avatarUrl ? (
                <img alt={member.displayName} className="user-avatar member-avatar" src={member.avatarUrl} />
              ) : (
                <div className="member-avatar-fallback">{member.displayName.slice(0, 1).toUpperCase()}</div>
              )}
              <div className="member-identity">
                <strong>{member.displayName}</strong>
                <span className="member-meta">{member.discordId}</span>
              </div>
            </div>
            <div className="member-cell">
              <span className={`status-badge member-status-pill status-${member.status.toLowerCase()}`}>
                {currentStatusLabels[member.status]}
              </span>
            </div>
            <div className="member-cell">
              <span
                className={`status-badge member-sync-pill ${
                  member.discordRoleStatus === member.status ? "synced" : "pending"
                }`}
              >
                {getDiscordSyncLabel(member)}
              </span>
            </div>
            <div className="member-actions member-actions-inline">
              {allowedTransitions[member.status].map((status) => (
                <button
                  className="status-chip"
                  disabled={pendingMemberId === member.id || member.status === status}
                  key={status}
                  onClick={() => updateStatus(member.id, status)}
                  type="button"
                >
                  {pendingMemberId === member.id
                    ? "..."
                    : member.status === "REJECTED" && status === "TRIAL"
                      ? "Reopen"
                      : statusLabels[status]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {error ? <p className="empty">{error}</p> : null}
    </div>
  );
}
