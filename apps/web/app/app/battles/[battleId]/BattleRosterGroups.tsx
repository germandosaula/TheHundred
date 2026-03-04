"use client";

import { Fragment } from "react";
import type { BattleRosterGroupEntry } from "../../../lib";

function formatPercentage(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1).replace(/\.0$/, "").replace(".", ",")}%`;
}

function formatRatio(kills: number, deaths: number) {
  if (deaths === 0) {
    return kills > 0 ? "∞" : "0";
  }

  const ratio = kills / deaths;
  return ratio.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1").replace(".", ",");
}

export function BattleRosterGroups({ groups }: { groups: BattleRosterGroupEntry[] }) {
  if (groups.length === 0) {
    return (
      <article className="dashboard-card">
        <p className="empty">No hay datos de Bomb/Main Zerg para esta battle.</p>
      </article>
    );
  }

  const totalKills = groups.reduce((sum, group) => sum + group.kills, 0);
  const totalDeaths = groups.reduce((sum, group) => sum + group.deaths, 0);

  return (
    <article className="dashboard-card battle-table-card">
      <div className="section-row battle-table-head">
        <div>
          <span className="card-label">Roster Split</span>
          <h3>Bombs y Main Zerg</h3>
        </div>
      </div>

      <div
        className="battle-table battle-table-summary"
        style={{
          gridTemplateColumns:
            "minmax(180px, 1.35fr) minmax(88px, 0.7fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(88px, 0.65fr)"
        }}
      >
        <div className="battle-table-header">Grupo</div>
        <div className="battle-table-header">Players</div>
        <div className="battle-table-header">Kills</div>
        <div className="battle-table-header">Deaths</div>
        <div className="battle-table-header">K/D</div>

        {groups.map((group) => (
          <Fragment key={group.key}>
            <div className="battle-table-cell battle-name-cell" key={`${group.key}-label`}>
              {group.label}
            </div>
            <div className="battle-table-cell" key={`${group.key}-players`}>
              <span className="battle-value blue">{group.matchedPlayers}</span>
            </div>
            <div className="battle-table-cell" key={`${group.key}-kills`}>
              <span className="battle-value red">
                {group.kills}
                <span className="battle-value-meta">
                  {formatPercentage(totalKills > 0 ? (group.kills / totalKills) * 100 : 0)}
                </span>
              </span>
            </div>
            <div className="battle-table-cell" key={`${group.key}-deaths`}>
              <span className="battle-value pink">
                {group.deaths}
                <span className="battle-value-meta">
                  {formatPercentage(totalDeaths > 0 ? (group.deaths / totalDeaths) * 100 : 0)}
                </span>
              </span>
            </div>
            <div className="battle-table-cell" key={`${group.key}-kd`}>
              <span className="battle-value">{formatRatio(group.kills, group.deaths)}</span>
            </div>
          </Fragment>
        ))}
      </div>
    </article>
  );
}
