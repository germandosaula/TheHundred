"use client";

import { useMemo, useState } from "react";

type MemberStatus = "PENDING" | "TRIAL" | "CORE" | "BENCHED" | "COUNCIL" | "REJECTED";
type ActivityState = "OK" | "RIESGO" | "INACTIVO" | "EXCLUIDO";
type ActivityFilter = "ALL" | ActivityState;

interface MemberRow {
  id: string;
  userId: string;
  displayName: string;
  albionName?: string;
  discordId: string;
  avatarUrl?: string;
  status: MemberStatus;
  bombGroupName?: string;
  attendanceCount: number;
  attendancePercent: number;
  lastActivityAt?: string;
  inactiveDays: number;
  activityState: ActivityState;
  activityReason: string;
  activityThresholdDays: number;
  followupTaskId?: string;
  activityExclusion?: {
    startsAt: string;
    endsAt: string;
    reason?: string;
  };
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

const activityStateLabels: Record<ActivityState, string> = {
  OK: "Activo",
  RIESGO: "Poca Actividad",
  INACTIVO: "Inactivo",
  EXCLUIDO: "Falta justificada"
};

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "").replace(".", ",")}%`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Sin actividad registrada";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getActivityReasonLabel(member: MemberRow) {
  const reason = member.activityReason.trim();
  const normalizedReason = reason.toLowerCase();
  if (
    normalizedReason.startsWith("última actividad") ||
    normalizedReason.startsWith("ultima actividad")
  ) {
    return `${member.inactiveDays} día${member.inactiveDays === 1 ? "" : "s"} sin actividad`;
  }

  return reason;
}

function toDatetimeLocalValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function MemberStatusManager({ members }: MemberStatusManagerProps) {
  const [localMembers, setLocalMembers] = useState<MemberRow[]>(members);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [query, setQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("ALL");
  const [bombInputByMemberId, setBombInputByMemberId] = useState<Record<string, string>>({});
  const [albionModalMember, setAlbionModalMember] = useState<MemberRow | null>(null);
  const [albionNameDraft, setAlbionNameDraft] = useState("");
  const [exclusionModalMember, setExclusionModalMember] = useState<MemberRow | null>(null);
  const [exclusionDraft, setExclusionDraft] = useState({
    startsAt: "",
    endsAt: "",
    reason: ""
  });

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
  const filteredMembers = localMembers.filter((member) => {
    const matchesQuery =
      !normalizedQuery || member.displayName.toLowerCase().includes(normalizedQuery);
    const matchesActivity =
      activityFilter === "ALL" || member.activityState === activityFilter;
    return matchesQuery && matchesActivity;
  });

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
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Update failed");
    } finally {
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
    } catch (kickError) {
      setError(kickError instanceof Error ? kickError.message : "Kick failed");
    } finally {
      setPendingMemberId(null);
    }
  }

  function openAlbionModal(member: MemberRow) {
    setAlbionModalMember(member);
    setAlbionNameDraft(member.albionName ?? "");
  }

  async function saveAlbionName() {
    if (!albionModalMember) {
      return;
    }

    const normalizedAlbionName = albionNameDraft.trim();
    if (!normalizedAlbionName) {
      setError("El albion_name no puede ir vacío.");
      return;
    }

    const confirmed = window.confirm(
      "Confirma el albion_name exacto del personaje. Si está mal, no vinculará loot splits, attendance y registro de embotelladas. ¿Guardar cambios?"
    );
    if (!confirmed) {
      return;
    }

    setPendingMemberId(albionModalMember.id);
    setError(null);

    try {
      const response = await fetch("/members/albion-name", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ memberId: albionModalMember.id, albionName: normalizedAlbionName })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? `Update failed with status ${response.status}`);
      }

      setLocalMembers((current) =>
        current.map((member) =>
          member.id === albionModalMember.id ? { ...member, albionName: normalizedAlbionName } : member
        )
      );
      setAlbionModalMember(null);
      setAlbionNameDraft("");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Update failed");
    } finally {
      setPendingMemberId(null);
    }
  }

  async function openActivityFollowup(memberId: string) {
    setPendingMemberId(memberId);
    setError(null);

    try {
      const response = await fetch("/members/activity-followup", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ memberId })
      });

      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `Update failed with status ${response.status}`);
      }

      setLocalMembers((current) =>
        current.map((member) =>
          member.id === memberId ? { ...member, followupTaskId: payload.id ?? member.followupTaskId } : member
        )
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo abrir el seguimiento");
    } finally {
      setPendingMemberId(null);
    }
  }

  function openExclusionModal(member: MemberRow) {
    setExclusionModalMember(member);
    setExclusionDraft({
      startsAt: toDatetimeLocalValue(member.activityExclusion?.startsAt),
      endsAt: toDatetimeLocalValue(member.activityExclusion?.endsAt),
      reason: member.activityExclusion?.reason ?? ""
    });
  }

  async function saveActivityExclusion() {
    if (!exclusionModalMember) {
      return;
    }

    if (!exclusionDraft.startsAt || !exclusionDraft.endsAt) {
      setError("Debes indicar inicio y fin de la exclusión.");
      return;
    }

    setPendingMemberId(exclusionModalMember.id);
    setError(null);

    try {
      const response = await fetch("/members/activity-exclusion", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          memberId: exclusionModalMember.id,
          startsAt: new Date(exclusionDraft.startsAt).toISOString(),
          endsAt: new Date(exclusionDraft.endsAt).toISOString(),
          reason: exclusionDraft.reason.trim() || undefined
        })
      });

      const payload = (await response.json()) as {
        startsAt?: string;
        endsAt?: string;
        reason?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `Update failed with status ${response.status}`);
      }

      setLocalMembers((current) =>
        current.map((member) =>
          member.id === exclusionModalMember.id
            ? {
                ...member,
                activityExclusion: payload.startsAt && payload.endsAt
                  ? {
                      startsAt: payload.startsAt,
                      endsAt: payload.endsAt,
                      reason: payload.reason
                    }
                  : member.activityExclusion,
                activityState: "EXCLUIDO"
              }
            : member
        )
      );
      setExclusionModalMember(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo guardar la exclusión");
    } finally {
      setPendingMemberId(null);
    }
  }

  async function clearActivityExclusion(memberId: string) {
    const confirmed = window.confirm(
      "Se quitará la exclusión temporal y el miembro volverá a entrar en la revisión automática de inactividad. ¿Continuar?"
    );
    if (!confirmed) {
      return;
    }

    setPendingMemberId(memberId);
    setError(null);

    try {
      const response = await fetch(`/members/activity-exclusion?memberId=${encodeURIComponent(memberId)}`, {
        method: "DELETE"
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `Update failed with status ${response.status}`);
      }

      setLocalMembers((current) =>
        current.map((member) =>
          member.id === memberId
            ? {
                ...member,
                activityExclusion: undefined,
                activityState:
                  member.inactiveDays >= member.activityThresholdDays
                    ? "INACTIVO"
                    : member.inactiveDays >= Math.max(1, member.activityThresholdDays - 1)
                      ? "RIESGO"
                      : "OK"
              }
            : member
        )
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo quitar la exclusión");
    } finally {
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

      <div className="member-activity-filters">
        {[
          ["ALL", "Todos"],
          ["INACTIVO", "Inactivos"],
          ["RIESGO", "Poca Actividad"],
          ["EXCLUIDO", "Falta justificada"]
        ].map(([value, label]) => (
          <button
            key={value}
            className={`member-filter-chip ${activityFilter === value ? "active" : ""}`}
            onClick={() => setActivityFilter(value as ActivityFilter)}
            type="button"
          >
            {label}
          </button>
        ))}
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
                <span className="member-meta">
                  Albion: {member.albionName?.trim() ? member.albionName : "Sin definir"}
                </span>
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
                  {member.discordRoleStatus ? currentStatusLabels[member.discordRoleStatus] : "Sin rol"}
                </span>
              </div>
            </div>

            <div className={`member-activity-panel state-${member.activityState.toLowerCase()}`}>
              <div className="member-status-row">
                <span className="member-card-label">Actividad</span>
                <span className={`status-badge member-activity-pill state-${member.activityState.toLowerCase()}`}>
                  {activityStateLabels[member.activityState]}
                </span>
              </div>
              <span className="member-meta">
                Última actividad: {formatDateTime(member.lastActivityAt)}
              </span>
              <span className="member-meta">
                {getActivityReasonLabel(member)}
              </span>
              {member.activityExclusion ? (
                <span className="member-meta">
                  Excluido hasta {formatDateTime(member.activityExclusion.endsAt)}
                  {member.activityExclusion.reason ? ` · ${member.activityExclusion.reason}` : ""}
                </span>
              ) : null}
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
                    disabled={pendingMemberId === member.id || !(bombInputByMemberId[member.id] ?? "").trim()}
                    onClick={() => void updateBombGroup(member.id, (bombInputByMemberId[member.id] ?? "").trim())}
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
                  className="status-chip"
                  disabled={pendingMemberId === member.id}
                  onClick={() => openAlbionModal(member)}
                  type="button"
                >
                  Editar nombre de Albion
                </button>
                <button
                  className="status-chip"
                  disabled={pendingMemberId === member.id || Boolean(member.followupTaskId)}
                  onClick={() => void openActivityFollowup(member.id)}
                  type="button"
                >
                  {member.followupTaskId ? "Seguimiento attendance" : "Seguimiento attendance"}
                </button>
                <button
                  className="status-chip"
                  disabled={pendingMemberId === member.id}
                  onClick={() =>
                    member.activityExclusion
                      ? void clearActivityExclusion(member.id)
                      : openExclusionModal(member)
                  }
                  type="button"
                >
                  {member.activityExclusion ? "Quitar falta justificada" : "Falta Justificada"}
                </button>
                <button
                  className="status-chip status-chip-danger"
                  disabled={pendingMemberId === member.id}
                  onClick={() => void kickMember(member.id, member.displayName)}
                  type="button"
                >
                  {pendingMemberId === member.id ? "..." : "Kick"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {filteredMembers.length === 0 ? <p className="empty">No hay jugadores con ese filtro.</p> : null}
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

      {albionModalMember ? (
        <div
          className="member-invite-modal-backdrop"
          onClick={() => {
            if (pendingMemberId !== albionModalMember.id) {
              setAlbionModalMember(null);
            }
          }}
          role="presentation"
        >
          <div
            aria-label="Editar albion_name"
            aria-modal="true"
            className="member-invite-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <span className="card-label">Editar miembro</span>
            <h3>Albion name de {albionModalMember.displayName}</h3>
            <p className="member-modal-warning">
              Si el nombre no es exacto, no se vinculará bien en loot splits, attendance y registro de
              embotelladas.
            </p>
            <input
              disabled={pendingMemberId === albionModalMember.id}
              onChange={(event) => setAlbionNameDraft(event.target.value)}
              placeholder="Nombre exacto del personaje en Albion"
              value={albionNameDraft}
            />
            <div className="member-invite-modal-actions">
              <button
                className="button primary"
                disabled={pendingMemberId === albionModalMember.id || !albionNameDraft.trim()}
                onClick={() => void saveAlbionName()}
                type="button"
              >
                {pendingMemberId === albionModalMember.id ? "Guardando..." : "Guardar"}
              </button>
              <button
                className="button ghost"
                disabled={pendingMemberId === albionModalMember.id}
                onClick={() => setAlbionModalMember(null)}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exclusionModalMember ? (
        <div
          className="member-invite-modal-backdrop"
          onClick={() => {
            if (pendingMemberId !== exclusionModalMember.id) {
              setExclusionModalMember(null);
            }
          }}
          role="presentation"
        >
          <div
            aria-label="Excluir temporalmente de inactividad"
            aria-modal="true"
            className="member-invite-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <span className="card-label">Exclusión temporal</span>
            <h3>{exclusionModalMember.displayName}</h3>
            <p>Úsalo para vacaciones, ausencias justificadas o pausas que no deban disparar seguimiento.</p>
            <div className="member-exclusion-grid">
              <label className="member-modal-field">
                <span>Inicio</span>
                <input
                  type="datetime-local"
                  value={exclusionDraft.startsAt}
                  onChange={(event) =>
                    setExclusionDraft((current) => ({ ...current, startsAt: event.target.value }))
                  }
                />
              </label>
              <label className="member-modal-field">
                <span>Fin</span>
                <input
                  type="datetime-local"
                  value={exclusionDraft.endsAt}
                  onChange={(event) =>
                    setExclusionDraft((current) => ({ ...current, endsAt: event.target.value }))
                  }
                />
              </label>
            </div>
            <label className="member-modal-field">
              <span>Motivo</span>
              <input
                maxLength={200}
                placeholder="Vacaciones, descanso, aviso previo..."
                value={exclusionDraft.reason}
                onChange={(event) =>
                  setExclusionDraft((current) => ({ ...current, reason: event.target.value }))
                }
              />
            </label>
            <div className="member-invite-modal-actions">
              <button
                className="button primary"
                disabled={pendingMemberId === exclusionModalMember.id}
                onClick={() => void saveActivityExclusion()}
                type="button"
              >
                {pendingMemberId === exclusionModalMember.id ? "Guardando..." : "Guardar exclusión"}
              </button>
              <button
                className="button ghost"
                disabled={pendingMemberId === exclusionModalMember.id}
                onClick={() => setExclusionModalMember(null)}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
