"use client";

import { useMemo, useState, type MouseEvent } from "react";
import {
  canonicalWeaponVariantKey,
  compRoleBucketLabels,
  getItemIconUrl,
  resolveEffectiveBattleItem,
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
  percentage: number;
  color: string;
};

type WeaponCount = {
  key: string;
  label: string;
  icon: string;
  count: number;
};

function getCompositionGroupKey(player: BattlePlayerEntry) {
  const effectiveItem = resolveEffectiveBattleItem(player);
  if (effectiveItem.resolved?.role === "Battlemount") {
    return effectiveItem.resolved.id ?? effectiveItem.iconName ?? effectiveItem.displayName ?? null;
  }
  return (
    canonicalWeaponVariantKey(effectiveItem.iconName ?? undefined) ??
    effectiveItem.resolved?.id ??
    effectiveItem.displayName ??
    null
  );
}

function getCompositionIconName(player: BattlePlayerEntry) {
  const effectiveItem = resolveEffectiveBattleItem(player);
  if (effectiveItem.resolved?.role === "Battlemount") {
    return effectiveItem.resolved.iconName ?? effectiveItem.iconName ?? null;
  }
  return (
    canonicalWeaponVariantKey(effectiveItem.iconName ?? undefined) ??
    effectiveItem.iconName ??
    null
  );
}

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
  const x = cx + r * Math.cos(angleRad);
  const y = cy + r * Math.sin(angleRad);
  return {
    x,
    y
  };
}

function formatSvgNumber(value: number) {
  return Number(value.toFixed(4)).toString();
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${formatSvgNumber(cx)} ${formatSvgNumber(cy)}`,
    `L ${formatSvgNumber(start.x)} ${formatSvgNumber(start.y)}`,
    `A ${formatSvgNumber(r)} ${formatSvgNumber(r)} 0 ${largeArcFlag} 0 ${formatSvgNumber(end.x)} ${formatSvgNumber(end.y)}`,
    "Z"
  ].join(" ");
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
    const totalPlayers = filteredPlayers.length;

    for (const player of filteredPlayers) {
      const effectiveItem = resolveEffectiveBattleItem(player);
      if (!effectiveItem.resolved) {
        continue;
      }
      counts.set(
        effectiveItem.resolved.role,
        (counts.get(effectiveItem.resolved.role) ?? 0) + 1
      );
    }

    return roleOrder.map((role) => ({
      role,
      count: counts.get(role) ?? 0,
      percentage: totalPlayers > 0 ? ((counts.get(role) ?? 0) / totalPlayers) * 100 : 0,
      color: roleColors[role]
    }));
  }, [filteredPlayers]);

  const weaponCounts = useMemo<WeaponCount[]>(() => {
    const counts = new Map<string, WeaponCount>();

    for (const player of filteredPlayers) {
      const effectiveItem = resolveEffectiveBattleItem(player);
      if (!effectiveItem.resolved || effectiveItem.resolved.role !== activeRole) {
        continue;
      }

      const icon = getCompositionIconName(player);
      const key = getCompositionGroupKey(player);
      if (!icon || !key) {
        continue;
      }

      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }

      counts.set(key, {
        key,
        label: effectiveItem.resolved.name,
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
      percentage: 0,
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
                    onClick={() => setActiveRole(segment.role)}
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
                <small>{activeBucket.percentage.toFixed(1)}%</small>
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
                  <img alt={weapon.label} className="battle-weapon-card-icon" src={getItemIconUrl(weapon.icon)} />
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
