"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

type MemberOption = {
  memberId: string;
  userId: string;
  displayName: string;
  albionName?: string;
  avatarUrl?: string;
  status: "TRIAL" | "CORE" | "BENCHED" | "COUNCIL";
};

type MemberWeaponStatsPayload = {
  members: MemberOption[];
  selectedMemberId?: string;
  summary?: {
    attendanceCount: number;
    attendanceEligibleTimers: number;
    attendancePercent: number;
    signupCount: number;
    signupEligibleCtas: number;
    signupPercent: number;
  };
  weapons: Array<{
    weaponName: string;
    kills: number;
    deaths: number;
    kd: number;
    battles: number;
  }>;
};

function formatCompact(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: value >= 10 ? 0 : 1
  }).format(value);
}

function formatPercent(value: number) {
  return `${formatCompact(value)}%`;
}

export function PerformanceMemberWeaponsPanel() {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [summary, setSummary] = useState<MemberWeaponStatsPayload["summary"]>();
  const [weapons, setWeapons] = useState<MemberWeaponStatsPayload["weapons"]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          const response = await fetch(
            `/performance/member-weapons${query.trim() ? `?query=${encodeURIComponent(query.trim())}` : ""}`,
            {
              method: "GET",
              cache: "no-store"
            }
          );
          const payload = (await response.json()) as MemberWeaponStatsPayload | { error?: string };
          if (!response.ok || "error" in payload) {
            throw new Error(("error" in payload ? payload.error : undefined) ?? "No se pudo cargar miembros");
          }
          if (cancelled) {
            return;
          }
          const data = payload as MemberWeaponStatsPayload;
          setMembers(data.members ?? []);
          setError(null);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "No se pudo cargar miembros");
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    if (!selectedMemberId) {
      setSummary(undefined);
      setWeapons([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/performance/member-weapons?memberId=${encodeURIComponent(selectedMemberId)}${
            query.trim() ? `&query=${encodeURIComponent(query.trim())}` : ""
          }`,
          {
            method: "GET",
            cache: "no-store"
          }
        );
        const payload = (await response.json()) as MemberWeaponStatsPayload | { error?: string };
        if (!response.ok || "error" in payload) {
          throw new Error(("error" in payload ? payload.error : undefined) ?? "No se pudo cargar stats");
        }
        if (cancelled) {
          return;
        }
        const data = payload as MemberWeaponStatsPayload;
        setMembers(data.members ?? []);
        setSummary(data.summary);
        setWeapons(data.weapons ?? []);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar stats");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedMemberId, query]);

  const selectedMember = useMemo(
    () => members.find((entry) => entry.memberId === selectedMemberId),
    [members, selectedMemberId]
  );

  return (
    <article className="dashboard-card battle-table-card">
      <div className="section-row battle-table-head">
        <div>
          <span className="card-label">Rendimiento Player</span>
          <h3>Historial por arma / rol</h3>
        </div>
      </div>

      <div className="performance-member-controls">
        <label className="field">
          <span>Buscar miembro</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Escribe nombre Discord o Albion"
            value={query}
          />
        </label>
        <label className="field">
          <span>Seleccionar miembro</span>
          <select
            onChange={(event) => setSelectedMemberId(event.target.value)}
            value={selectedMemberId}
          >
            <option value="">Selecciona un miembro</option>
            {members.map((member) => (
              <option key={member.memberId} value={member.memberId}>
                {member.displayName}
                {member.albionName ? ` (${member.albionName})` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="hint banner">{error}</p> : null}
      {loading ? <p className="hint">Cargando...</p> : null}

      {selectedMember && summary ? (
        <div className="dashboard-grid performance-member-summary-grid">
          <article className="dashboard-card metric-card">
            <span className="card-label">Attendance</span>
            <strong>
              {summary.attendanceCount}/{summary.attendanceEligibleTimers}
            </strong>
            <p>{formatPercent(summary.attendancePercent)}</p>
          </article>
          <article className="dashboard-card metric-card">
            <span className="card-label">Signup CTA</span>
            <strong>
              {summary.signupCount} eventos
            </strong>
            <p>
              {summary.signupEligibleCtas} CTAs elegibles · {formatPercent(summary.signupPercent)}
            </p>
          </article>
          <article className="dashboard-card metric-card">
            <span className="card-label">Jugador</span>
            <strong>{selectedMember.displayName}</strong>
            <p>{selectedMember.albionName ?? "Sin albion_name"}</p>
          </article>
        </div>
      ) : null}

      {selectedMemberId ? (
        weapons.length > 0 ? (
          <div
            className="battle-table battle-table-summary"
            style={{
              gridTemplateColumns:
                "minmax(240px, 1.8fr) minmax(100px, 0.7fr) minmax(100px, 0.7fr) minmax(100px, 0.7fr) minmax(100px, 0.7fr)"
            }}
          >
            <div className="battle-table-header">Arma</div>
            <div className="battle-table-header">Kills</div>
            <div className="battle-table-header">Deaths</div>
            <div className="battle-table-header">K/D</div>
            <div className="battle-table-header">Battles</div>

            {weapons.map((weapon) => (
              <Fragment key={weapon.weaponName}>
                <div className="battle-table-cell battle-name-cell">
                  {weapon.weaponName}
                </div>
                <div className="battle-table-cell">
                  <span className="battle-value red">{formatCompact(weapon.kills)}</span>
                </div>
                <div className="battle-table-cell">
                  <span className="battle-value gold">{formatCompact(weapon.deaths)}</span>
                </div>
                <div className="battle-table-cell">
                  <span className="battle-value">{formatCompact(weapon.kd)}</span>
                </div>
                <div className="battle-table-cell">
                  <span className="battle-value">{formatCompact(weapon.battles)}</span>
                </div>
              </Fragment>
            ))}
          </div>
        ) : (
          <p className="empty">Sin datos de armas para este miembro todavía.</p>
        )
      ) : (
        <p className="empty">Busca y selecciona un miembro para ver su historial por arma.</p>
      )}
    </article>
  );
}
