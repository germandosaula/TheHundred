"use client";

import { Fragment, useState } from "react";
import { getItemIconUrl, resolveEffectiveBattleItem } from "../../comps/catalog";
import type { BattlePlayerEntry } from "../../../lib";

const PLAYERS_PER_PAGE = 10;
type SortKey = "name" | "guildName" | "allianceName" | "ip" | "damage" | "heal" | "kills" | "deaths" | "fame";

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", ",");
    return `${formatted}m`;
  }

  if (value >= 1_000) {
    const formatted = (value / 1_000).toFixed(1).replace(/\.0$/, "").replace(".", ",");
    return `${formatted}k`;
  }

  return value.toString();
}

function StatCell({
  value,
  tone
}: {
  value: string | number;
  tone?: "red" | "pink" | "gold" | "cyan" | "purple";
}) {
  return <span className={`battle-value${tone ? ` ${tone}` : ""}`}>{value}</span>;
}

export function BattlePlayersTable({ players }: { players: BattlePlayerEntry[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("fame");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredPlayers = normalizedQuery
    ? players.filter((player) => player.name.toLowerCase().includes(normalizedQuery))
    : players;
  const sortedPlayers = [...filteredPlayers].sort((left, right) => {
    const direction = sortDirection === "asc" ? 1 : -1;

    if (sortKey === "name" || sortKey === "guildName" || sortKey === "allianceName") {
      const leftValue = (left[sortKey] ?? "").toString();
      const rightValue = (right[sortKey] ?? "").toString();
      return leftValue.localeCompare(rightValue) * direction;
    }

    const leftValue = left[sortKey] ?? (sortKey === "ip" ? -1 : 0);
    const rightValue = right[sortKey] ?? (sortKey === "ip" ? -1 : 0);
    return ((Number(leftValue) || 0) - (Number(rightValue) || 0)) * direction;
  });

  const totalPages = Math.max(1, Math.ceil(sortedPlayers.length / PLAYERS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visiblePlayers = sortedPlayers.slice(
    (safePage - 1) * PLAYERS_PER_PAGE,
    safePage * PLAYERS_PER_PAGE
  );

  function toggleSort(nextKey: SortKey) {
    setPage(1);
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(
      nextKey === "name" || nextKey === "guildName" || nextKey === "allianceName" ? "asc" : "desc"
    );
  }

  function SortHeader({ label, value }: { label: string; value: SortKey }) {
    const active = sortKey === value;
    return (
      <button className={`battle-sort-button${active ? " active" : ""}`} onClick={() => toggleSort(value)} type="button">
        {label}
        {active ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
      </button>
    );
  }

  return (
    <article className="dashboard-card battle-table-card battle-players-card">
      <div className="section-row battle-table-head">
        <div>
          <h3>Players ({filteredPlayers.length})</h3>
        </div>
        <label className="battle-search">
          <input
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search player"
            value={query}
          />
        </label>
      </div>

      {filteredPlayers.length > 0 ? (
        <>
          <div className="battle-table-shell">
            <div className="battle-table battle-table-players">
              <div className="battle-table-header"><SortHeader label="Name" value="name" /></div>
              <div className="battle-table-header"><SortHeader label="Guild" value="guildName" /></div>
              <div className="battle-table-header"><SortHeader label="Alliance" value="allianceName" /></div>
              <div className="battle-table-header"><SortHeader label="IP" value="ip" /></div>
              <div className="battle-table-header"><SortHeader label="DMG" value="damage" /></div>
              <div className="battle-table-header"><SortHeader label="HEAL" value="heal" /></div>
              <div className="battle-table-header"><SortHeader label="KILLS" value="kills" /></div>
              <div className="battle-table-header"><SortHeader label="DEATHS" value="deaths" /></div>
              <div className="battle-table-header"><SortHeader label="FAME" value="fame" /></div>

              {visiblePlayers.map((player, index) => (
                <Fragment key={`${player.id}-${index}`}>
                  {(() => {
                    const effectiveItem = resolveEffectiveBattleItem(player);
                    return (
                      <>
                  <div className="battle-table-cell battle-player-cell" key={`${player.id}-${index}-name`}>
                    {effectiveItem.iconName ? (
                      <img
                        alt={effectiveItem.displayName ?? player.name}
                        className="battle-player-weapon"
                        src={getItemIconUrl(effectiveItem.iconName)}
                      />
                    ) : (
                      <div className="battle-player-weapon placeholder" />
                    )}
                    <span className="battle-player-name">{player.name}</span>
                  </div>
                  <div className="battle-table-cell" key={`${player.id}-${index}-guild`}>
                    {player.guildName ?? "-"}
                  </div>
                  <div className="battle-table-cell" key={`${player.id}-${index}-alliance`}>
                    {player.allianceName ?? "-"}
                  </div>
                  <div className="battle-table-cell" key={`${player.id}-${index}-ip`}>
                    <StatCell value={player.ip ?? "-"} />
                  </div>
                  <div className="battle-table-cell" key={`${player.id}-${index}-dmg`}>
                    <StatCell tone="purple" value={formatCompactNumber(player.damage)} />
                  </div>
                  <div className="battle-table-cell" key={`${player.id}-${index}-heal`}>
                    <StatCell tone="cyan" value={formatCompactNumber(player.heal)} />
                  </div>
                  <div className="battle-table-cell" key={`${player.id}-${index}-kills`}>
                    <StatCell tone="red" value={player.kills} />
                  </div>
                  <div className="battle-table-cell" key={`${player.id}-${index}-deaths`}>
                    <StatCell tone="pink" value={player.deaths} />
                  </div>
                  <div className="battle-table-cell" key={`${player.id}-${index}-fame`}>
                    <StatCell tone="gold" value={formatCompactNumber(player.fame)} />
                  </div>
                      </>
                    );
                  })()}
                </Fragment>
              ))}
            </div>
          </div>

          {sortedPlayers.length > PLAYERS_PER_PAGE ? (
            <div className="battle-pagination">
              <span className="battle-pagination-meta">
                Página {safePage} de {totalPages}
              </span>
              <div className="battle-pagination-actions">
                <button
                  className="button ghost battle-page-button"
                  disabled={safePage === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  Anterior
                </button>
                <button
                  className="button ghost battle-page-button"
                  disabled={safePage === totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  type="button"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="empty">
          No hay jugadores que coincidan con esa búsqueda para esta battle.
        </p>
      )}
    </article>
  );
}
