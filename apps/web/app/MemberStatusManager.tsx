"use client";

import { useMemo, useState } from "react";

type MemberStatus = "PENDING" | "TRIAL" | "CORE" | "BENCHED" | "COUNCIL" | "REJECTED";

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

const currentStatusLabels: Record<MemberStatus, string> = {
  PENDING: "Pendiente",
  TRIAL: "Trial",
  CORE: "Core",
  BENCHED: "Benched",
  COUNCIL: "Staff",
  REJECTED: "Rechazado"
};

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "").replace(".", ",")}%`;
}

export function MemberStatusManager({ members }: MemberStatusManagerProps) {
  const [localMembers, setLocalMembers] = useState<MemberRow[]>(members);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [query, setQuery] = useState("");
  const [bombInputByMemberId, setBombInputByMemberId] = useState<Record<string, string>>({});

  const existingBombGroups = useMemo(
    () =>
      [...new Set(localMembers.map((member) => member.bombGroupName).filter(Boolean))]
        .sort((left, right) => left!.localeCompare(right!)) as string[],
    [localMembers]
  );
  const memberPositionById = useMemo(
    () => new Map(localMembers.map((member, index) => [member.id, index + 1])),
    [localMembers]
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredMembers = normalizedQuery
    ? localMembers.filter((member) => member.displayName.toLowerCase().includes(normalizedQuery))
    : localMembers;

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

      setLocalMembers((current) =>
        current.map((member) => (member.id === memberId ? { ...member, status } : member))
      );
      setPendingMemberId(null);
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

      setLocalMembers((current) =>
        current.map((member) => (member.id === memberId ? { ...member, bombGroupName } : member))
      );
      setBombInputByMemberId((current) => ({ ...current, [memberId]: "" }));
      setPendingMemberId(null);
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

      setLocalMembers((current) => current.filter((member) => member.id !== memberId));
      setPendingMemberId(null);
    } catch (kickError) {
      setError(kickError instanceof Error ? kickError.message : "Kick failed");
      setPendingMemberId(null);
    }
  }

  async function createInvite() {
    setInviteLoading(true);
    setError(null);

    try {
      const response = await fetch("/invites", {
        method: "POST"
      });

      const payload = (await response.json()) as { inviteUrl?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `Invite failed with status ${response.status}`);
      }
      if (!payload.inviteUrl) {
        throw new Error("Invite URL missing in response");
      }

      setInviteUrl(payload.inviteUrl);
      setCopyState("idle");
    } catch (createInviteError) {
      setError(createInviteError instanceof Error ? createInviteError.message : "Invite failed");
    } finally {
      setInviteLoading(false);
    }
  }

  async function copyInviteUrl() {
    if (!inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState("copied");
    } catch {
      setError("No se pudo copiar el link");
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
        <div className="member-toolbar-actions">
          <button
            className="status-chip member-invite-trigger"
            disabled={inviteLoading}
            onClick={() => void createInvite()}
            type="button"
          >
            {inviteLoading ? "Generando..." : "Generar invite"}
          </button>
          <span className="status-badge">
            {filteredMembers.length === localMembers.length
              ? `${localMembers.length} jugadores`
              : `${filteredMembers.length} de ${localMembers.length}`}
          </span>
        </div>
      </div>
      <ul className="member-list member-card-grid">
        {filteredMembers.map((member) => (
          <li className="member-card" key={member.id}>
            <div className="member-card-head">
              <span className="status-badge member-index-badge">
                #{String(memberPositionById.get(member.id) ?? 0).padStart(2, "0")}
              </span>
              <div className="member-attendance member-card-attendance">
                <span className="member-card-label">Attendance</span>
                <strong>{member.attendanceCount}</strong>
                <span>{formatPercent(member.attendancePercent)}</span>
              </div>
            </div>
            <div className="member-card-player">
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
            <div className="member-card-statuses">
              <div className="member-status-row">
                <span className="member-card-label">Rol</span>
                <span
                  className={`status-badge member-status-pill status-${(
                    member.discordRoleStatus ?? "PENDING"
                  ).toLowerCase()}`}
                >
                  {member.discordRoleStatus
                    ? currentStatusLabels[member.discordRoleStatus]
                    : "Sin rol"}
                </span>
              </div>
            </div>
            <div className="member-card-bomb">
              <span className="member-card-label">Bomb</span>
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
            <div className="member-card-actions-wrap">
              <span className="member-card-label">Acciones</span>
              <div className="member-actions member-actions-inline">
                <button
                  className="status-chip member-reject-chip"
                  disabled={pendingMemberId === member.id || member.status === "REJECTED"}
                  onClick={() => updateStatus(member.id, "REJECTED")}
                  type="button"
                >
                  {pendingMemberId === member.id ? "..." : "Reject"}
                </button>
                <button
                  className="status-chip status-chip-danger member-kick-chip"
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
      {inviteUrl ? (
        <div className="member-invite-modal-backdrop" onClick={() => setInviteUrl(null)} role="presentation">
          <div
            className="member-invite-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Invite de acceso anticipado"
          >
            <span className="card-label">Invite</span>
            <h3>Link de invitación</h3>
            <p>Comparte este enlace con el invitado para registrarse antes del lanzamiento.</p>
            <input readOnly value={inviteUrl} />
            <div className="member-invite-modal-actions">
              <button className="button primary" onClick={() => void copyInviteUrl()} type="button">
                {copyState === "copied" ? "Copiado" : "Copiar link"}
              </button>
              <button className="button ghost" onClick={() => setInviteUrl(null)} type="button">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
