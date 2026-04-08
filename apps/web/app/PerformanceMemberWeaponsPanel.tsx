"use client";

import { Fragment, useEffect, useState } from "react";
import { getWeaponIconUrl, resolveAlbionWeapon } from "./app/comps/catalog";

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
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
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
        const response = await fetch(`/performance/member-weapons?memberId=${encodeURIComponent(selectedMemberId)}`, {
          method: "GET",
          cache: "no-store"
        });
        const payload = (await response.json()) as MemberWeaponStatsPayload | { error?: string };
        if (!response.ok || "error" in payload) {
          throw new Error(("error" in payload ? payload.error : undefined) ?? "No se pudo cargar stats");
        }
        if (cancelled) {
          return;
        }
        const data = payload as MemberWeaponStatsPayload;
        const nextMembers = data.members ?? [];
        setMembers(nextMembers);
        setSummary(data.summary);
        setWeapons(data.weapons ?? []);
        setSelectedMember((previous) => nextMembers.find((entry) => entry.memberId === selectedMemberId) ?? previous);
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
  }, [selectedMemberId]);

  const handleSelectMember = (member: MemberOption) => {
    setSelectedMemberId(member.memberId);
    setSelectedMember(member);
    setQuery(member.displayName);
    setShowSuggestions(false);
  };

  const handleSearchEnter = () => {
    const exact = members.find(
      (member) =>
        member.displayName.toLowerCase() === query.trim().toLowerCase() ||
        member.albionName?.toLowerCase() === query.trim().toLowerCase()
    );
    if (exact) {
      handleSelectMember(exact);
      return;
    }
    if (members[0]) {
      handleSelectMember(members[0]);
    }
  };

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
            onBlur={() => {
              window.setTimeout(() => setShowSuggestions(false), 120);
            }}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearchEnter();
              }
            }}
            placeholder="Escribe nombre Discord o Albion"
            value={query}
          />
          {showSuggestions && members.length > 0 ? (
            <div className="performance-member-suggestions">
              {members.map((member) => (
                <button
                  className={`performance-member-suggestion ${
                    selectedMemberId === member.memberId ? "active" : ""
                  }`}
                  key={member.memberId}
                  onClick={() => handleSelectMember(member)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  type="button"
                >
                  <strong>{member.displayName}</strong>
                  <span>{member.albionName ?? "Sin albion_name"}</span>
                </button>
              ))}
            </div>
          ) : null}
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
            <p>CTAs finalizadas con signup</p>
            <p>{formatPercent(summary.attendancePercent)}</p>
          </article>
          <article className="dashboard-card metric-card">
            <span className="card-label">Signup CTA</span>
            <strong>{summary.signupCount} CTAs</strong>
            <p>
              {summary.signupEligibleCtas} CTAs elegibles (finalizadas + canceladas)
            </p>
            <p>{formatPercent(summary.signupPercent)}</p>
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
                  {(() => {
                    const resolved = resolveAlbionWeapon(weapon.weaponName);
                    const label = resolved?.name ?? formatWeaponLabel(weapon.weaponName);
                    const iconUrl = getWeaponIconUrl(weapon.weaponName);
                    return (
                      <div className="performance-member-weapon-cell">
                        {iconUrl ? (
                          <img
                            alt={label}
                            className="performance-member-weapon-icon"
                            loading="lazy"
                            src={iconUrl}
                          />
                        ) : (
                          <div aria-hidden className="performance-member-weapon-icon" />
                        )}
                        <span>{label}</span>
                      </div>
                    );
                  })()}
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
        <p className="empty">Escribe un nombre y pulsa Enter para ver su historial por arma.</p>
      )}
    </article>
  );
}

function formatWeaponLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Unknown";
  }
  return trimmed
    .replace(/^T\d+_/, "")
    .replace(/^2H_/, "")
    .replace(/^MAIN_/, "")
    .replace(/^OFF_/, "")
    .replace(/@.*$/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
