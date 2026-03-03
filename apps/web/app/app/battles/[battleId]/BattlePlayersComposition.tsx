"use client";

import { useMemo, useState, type MouseEvent } from "react";
import {
  compRoleBucketLabels,
  getWeaponIconUrl,
  resolveAlbionWeapon,
  type AlbionCompRole
} from "../../comps/catalog";
import type { BattlePlayerEntry } from "../../../lib";

type ScopeOption = {
  id: string;
  label: string;
  type: "alliance" | "guild";
  value: string;
};

type RoleBucket = {
  role: AlbionCompRole;
  count: number;
  color: string;
};

type WeaponCount = {
  key: string;
  label: string;
  icon: string;
  count: number;
};

const roleOrder: AlbionCompRole[] = [
  "Tank",
  "Healer",
  "Support",
  "Ranged",
  "Melee",
  "Battlemount"
];

const roleColors: Record<AlbionCompRole, string> = {
  Tank: "#4D8DFF",
  Healer: "#28D29A",
  Support: "#8D70FF",
  Ranged: "#FF9D4D",
  Melee: "#FF4D5C",
  Battlemount: "#B6BDC9"
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad)
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [`M ${cx} ${cy}`, `L ${start.x} ${start.y}`, `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`, "Z"].join(" ");
}

export function BattlePlayersComposition({ players }: { players: BattlePlayerEntry[] }) {
  const scopeOptions = useMemo<ScopeOption[]>(() => {
    const allianceOptions = [...new Set(players.map((player) => player.allianceName).filter(Boolean))]
      .sort((left, right) => left!.localeCompare(right!))
      .map((alliance) => ({
        id: `alliance:${alliance}`,
        label: `[${alliance}]`,
        type: "alliance" as const,
        value: alliance as string
      }));

    const guildOptions = [...new Set(players.map((player) => player.guildName).filter(Boolean))]
      .sort((left, right) => left!.localeCompare(right!))
      .map((guild) => ({
        id: `guild:${guild}`,
        label: guild as string,
        type: "guild" as const,
        value: guild as string
      }));

    return [...allianceOptions, ...guildOptions];
  }, [players]);

  const [scopeId, setScopeId] = useState(scopeOptions[0]?.id ?? "all");
  const [activeRole, setActiveRole] = useState<AlbionCompRole>("Tank");
  const [hoveredRole, setHoveredRole] = useState<AlbionCompRole | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 160, y: 160 });

  const scope = scopeOptions.find((entry) => entry.id === scopeId) ?? null;
  const filteredPlayers = useMemo(() => {
    if (!scope) {
      return players;
    }

    return players.filter((player) =>
      scope.type === "alliance"
        ? player.allianceName === scope.value
        : player.guildName === scope.value
    );
  }, [players, scope]);

  const roleBuckets = useMemo<RoleBucket[]>(() => {
    const counts = new Map<AlbionCompRole, number>(roleOrder.map((role) => [role, 0]));

    for (const player of filteredPlayers) {
      const resolved = resolveAlbionWeapon(player.weaponName ?? player.weaponIconName);
      if (!resolved) {
        continue;
      }
      counts.set(resolved.role, (counts.get(resolved.role) ?? 0) + 1);
    }

    return roleOrder.map((role) => ({
      role,
      count: counts.get(role) ?? 0,
      color: roleColors[role]
    }));
  }, [filteredPlayers]);

  const weaponCounts = useMemo<WeaponCount[]>(() => {
    const counts = new Map<string, WeaponCount>();

    for (const player of filteredPlayers) {
      const resolved = resolveAlbionWeapon(player.weaponName ?? player.weaponIconName);
      if (!resolved || resolved.role !== activeRole) {
        continue;
      }

      const icon = player.weaponIconName ?? player.weaponName ?? resolved.name;
      const key = `${resolved.id}:${icon}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }

      counts.set(key, {
        key,
        label: resolved.name,
        icon,
        count: 1
      });
    }

    return [...counts.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  }, [activeRole, filteredPlayers]);

  const pieSegments = useMemo(() => {
    const total = roleBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
    if (total === 0) {
      return [];
    }

    let startAngle = 0;
    return roleBuckets
      .filter((bucket) => bucket.count > 0)
      .map((bucket) => {
        const angle = (bucket.count / total) * 360;
        const endAngle = startAngle + angle;
        const segment = {
          ...bucket,
          startAngle,
          endAngle,
          path: describeArc(100, 100, 96, startAngle, endAngle)
        };
        startAngle = endAngle;
        return segment;
      });
  }, [roleBuckets]);

  const activeBucket =
    roleBuckets.find((bucket) => bucket.role === hoveredRole) ??
    roleBuckets.find((bucket) => bucket.role === activeRole) ??
    {
      role: "Tank" as AlbionCompRole,
      count: 0,
      color: roleColors.Tank
    };

  function handleSegmentMove(event: MouseEvent<SVGPathElement>, role: AlbionCompRole) {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) {
      setHoveredRole(role);
      return;
    }

    setHoveredRole(role);
    setTooltipPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    });
  }

  return (
    <article className="dashboard-card battle-composition-card">
      <div className="section-row battle-table-head">
        <div>
          <span className="card-label">Players Composition</span>
        </div>
        <label className="battle-search battle-scope-select">
          <select onChange={(event) => setScopeId(event.target.value)} value={scopeId}>
            {scopeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="battle-composition-grid">
        <div className="battle-composition-chart">
          <div className="battle-pie-wrap">
            <svg
              className="battle-pie"
              onMouseLeave={() => setHoveredRole(null)}
              viewBox="0 0 200 200"
            >
              {pieSegments.length > 0 ? (
                pieSegments.map((segment) => (
                  <path
                    className={`battle-pie-segment${hoveredRole === segment.role ? " active" : ""}`}
                    d={segment.path}
                    fill={segment.color}
                    key={segment.role}
                    onMouseEnter={(event) => handleSegmentMove(event, segment.role)}
                    onMouseMove={(event) => handleSegmentMove(event, segment.role)}
                  />
                ))
              ) : (
                <circle cx="100" cy="100" fill="rgba(255,255,255,0.08)" r="96" />
              )}
            </svg>

            {hoveredRole ? (
              <div
                className="battle-pie-tooltip"
                style={{
                  left: tooltipPosition.x,
                  top: tooltipPosition.y,
                  transform: "translate(12px, -50%)"
                }}
              >
                <span>{compRoleBucketLabels[activeBucket.role]}</span>
                <strong>{activeBucket.count}</strong>
              </div>
            ) : null}
          </div>
        </div>

        <div className="battle-composition-panel">
          <div className="battle-role-tabs">
            {roleOrder.map((role) => (
              <button
                className={`battle-role-tab${activeRole === role ? " active" : ""}`}
                key={role}
                onClick={() => setActiveRole(role)}
                type="button"
              >
                {compRoleBucketLabels[role]}
              </button>
            ))}
          </div>

          {weaponCounts.length > 0 ? (
            <div className="battle-weapon-grid">
              {weaponCounts.map((weapon) => (
                <div className="battle-weapon-card" key={weapon.key}>
                  <img alt={weapon.label} className="battle-weapon-card-icon" src={getWeaponIconUrl(weapon.icon)} />
                  <span className="battle-weapon-card-count">x {weapon.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No hay armas clasificadas para este filtro.</p>
          )}
        </div>
      </div>
    </article>
  );
}
