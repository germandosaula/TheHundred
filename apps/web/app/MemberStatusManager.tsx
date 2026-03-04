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
  bombGroupName?: string;
  attendanceCount: number;
  attendancePercent: number;
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
    return currentStatusLabels[member.status];
  }

  return `Discord pendiente (${member.discordRoleStatus ?? "sin rol de guild"})`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "").replace(".", ",")}%`;
}

export function MemberStatusManager({ members }: MemberStatusManagerProps) {
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [bombInputByMemberId, setBombInputByMemberId] = useState<Record<string, string>>({});
  const existingBombGroups = [...new Set(members.map((member) => member.bombGroupName).filter(Boolean))]
    .sort((left, right) => left!.localeCompare(right!)) as string[];
  const memberPositionById = new Map(members.map((member, index) => [member.id, index + 1]));
  const normalizedQuery = query.trim().toLowerCase();
  const filteredMembers = normalizedQuery
    ? members.filter((member) => member.displayName.toLowerCase().includes(normalizedQuery))
    : members;

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

  async function updateBombGroup(memberId: string, bombGroupName?: string) {
    setPendingMemberId(memberId);
    setError(null);

    try {
      const response = await fetch("/members/bomb-group", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ memberId, bombGroupName })
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

  async function kickMember(memberId: string, memberName: string) {
    const confirmed = window.confirm(
      `Vas a expulsar a ${memberName}. Se ocultará del listado y el bot quitará sus roles de guild. ¿Continuar?`
    );
    if (!confirmed) {
      return;
    }

    setPendingMemberId(memberId);
    setError(null);

    try {
      const response = await fetch("/members/kick", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ memberId })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? `Kick failed with status ${response.status}`);
      }

      window.location.reload();
    } catch (kickError) {
      setError(kickError instanceof Error ? kickError.message : "Kick failed");
      setPendingMemberId(null);
    }
  }

  return (
    <div className="member-manager">
      <div className="member-toolbar">
        <label className="member-search">
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar jugador"
            value={query}
          />
        </label>
        <span className="status-badge">{filteredMembers.length} jugadores</span>
      </div>
      <div className="member-list-head">
        <span>#</span>
        <span>Jugador</span>
        <span>Attendance</span>
        <span>Bomb</span>
        <span>Estado web</span>
        <span>Estado Discord</span>
        <span>Acciones</span>
      </div>
      <ul className="member-list member-list-table">
        {filteredMembers.map((member) => (
          <li className="member-row member-row-list" key={member.id}>
            <div className="member-cell member-cell-index">
              <span className="status-badge member-index-badge">
                #{String(memberPositionById.get(member.id) ?? 0).padStart(2, "0")}
              </span>
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
            <div className="member-cell member-cell-attendance">
              <span className="member-mobile-label">Attendance</span>
              <div className="member-attendance">
                <strong>{member.attendanceCount}</strong>
                <span>{formatPercent(member.attendancePercent)}</span>
              </div>
            </div>
            <div className="member-cell member-cell-bomb">
              <span className="member-mobile-label">Bomb</span>
              <div className="member-bomb-controls">
                <select
                  disabled={pendingMemberId === member.id}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "__none__") {
                      void updateBombGroup(member.id, undefined);
                      return;
                    }

                    void updateBombGroup(member.id, value);
                  }}
                  value={member.bombGroupName ?? "__none__"}
                >
                  <option value="__none__">Sin Bomb</option>
                  {existingBombGroups.map((bombGroupName) => (
                    <option key={bombGroupName} value={bombGroupName}>
                      {bombGroupName}
                    </option>
                  ))}
                </select>
                <div className="member-bomb-custom">
                  <input
                    disabled={pendingMemberId === member.id}
                    onChange={(event) =>
                      setBombInputByMemberId((current) => ({
                        ...current,
                        [member.id]: event.target.value
                      }))
                    }
                    placeholder="Nombre Bomb"
                    value={bombInputByMemberId[member.id] ?? ""}
                  />
                  <button
                    className="status-chip"
                    disabled={
                      pendingMemberId === member.id || !(bombInputByMemberId[member.id] ?? "").trim()
                    }
                    onClick={() => updateBombGroup(member.id, (bombInputByMemberId[member.id] ?? "").trim())}
                    type="button"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
            <div className="member-cell member-cell-web-status">
              <span className="member-mobile-label">Estado web</span>
              <span className={`status-badge member-status-pill status-${member.status.toLowerCase()}`}>
                {currentStatusLabels[member.status]}
              </span>
            </div>
            <div className="member-cell member-cell-discord-status">
              <span className="member-mobile-label">Estado Discord</span>
              <span
                className={`status-badge member-sync-pill ${
                  member.discordRoleStatus === member.status ? "synced" : "pending"
                }`}
              >
                {getDiscordSyncLabel(member)}
              </span>
            </div>
            <div className="member-cell member-cell-actions">
              <span className="member-mobile-label">Acciones</span>
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
                <button
                  className="status-chip status-chip-danger"
                  disabled={pendingMemberId === member.id}
                  onClick={() => kickMember(member.id, member.displayName)}
                  type="button"
                >
                  {pendingMemberId === member.id ? "..." : "Kick"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {filteredMembers.length === 0 ? <p className="empty">No hay jugadores con ese nombre.</p> : null}
      {error ? <p className="empty">{error}</p> : null}
    </div>
  );
}
