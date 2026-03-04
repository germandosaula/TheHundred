"use client";

import { Fragment, useState } from "react";
import type { BattleGuildEntry } from "../../../lib";

const ITEMS_PER_PAGE = 6;
type SortKey = "name" | "allianceName" | "players" | "kills" | "deaths" | "avgIp" | "fame";

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
  tone?: "blue" | "red" | "pink" | "gold";
}) {
  return <span className={`battle-value${tone ? ` ${tone}` : ""}`}>{value}</span>;
}

export function BattleGuildTable({ guilds }: { guilds: BattleGuildEntry[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("fame");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? guilds.filter((entry) => entry.name.toLowerCase().includes(normalizedQuery))
    : guilds;
  const sorted = [...filtered].sort((left, right) => {
    const direction = sortDirection === "asc" ? 1 : -1;

    if (sortKey === "name" || sortKey === "allianceName") {
      const leftValue = (left[sortKey] ?? "").toString();
      const rightValue = (right[sortKey] ?? "").toString();
      return leftValue.localeCompare(rightValue) * direction;
    }

    const leftValue = left[sortKey] ?? (sortKey === "avgIp" ? -1 : 0);
    const rightValue = right[sortKey] ?? (sortKey === "avgIp" ? -1 : 0);
    return ((Number(leftValue) || 0) - (Number(rightValue) || 0)) * direction;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = sorted.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  function toggleSort(nextKey: SortKey) {
    setPage(1);
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "name" || nextKey === "allianceName" ? "asc" : "desc");
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
    <article className="dashboard-card battle-table-card">
      <div className="section-row battle-table-head">
        <div>
          <h3>Guilds ({filtered.length})</h3>
        </div>
        <label className="battle-search">
          <input
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search guild"
            value={query}
          />
        </label>
      </div>

      {filtered.length > 0 ? (
        <>
          <div className="battle-table-shell">
            <div
              className="battle-table battle-table-summary"
              style={{ gridTemplateColumns: "1.15fr 0.8fr repeat(5, minmax(0, 0.7fr))" }}
            >
              <div className="battle-table-header"><SortHeader label="Guild" value="name" /></div>
              <div className="battle-table-header"><SortHeader label="Alliance" value="allianceName" /></div>
              <div className="battle-table-header"><SortHeader label="Players" value="players" /></div>
              <div className="battle-table-header"><SortHeader label="Kills" value="kills" /></div>
              <div className="battle-table-header"><SortHeader label="Deaths" value="deaths" /></div>
              <div className="battle-table-header"><SortHeader label="Avg IP" value="avgIp" /></div>
              <div className="battle-table-header"><SortHeader label="Fame" value="fame" /></div>

              {visible.map((guild, index) => (
                <Fragment key={`${guild.name}-${index}`}>
                  <div className="battle-table-cell battle-name-cell">{guild.name}</div>
                  <div className="battle-table-cell">{guild.allianceName ?? "-"}</div>
                  <div className="battle-table-cell">
                    <StatCell tone="blue" value={guild.players} />
                  </div>
                  <div className="battle-table-cell">
                    <StatCell tone="red" value={guild.kills} />
                  </div>
                  <div className="battle-table-cell">
                    <StatCell tone="pink" value={guild.deaths} />
                  </div>
                  <div className="battle-table-cell">
                    <StatCell value={guild.avgIp ?? "-"} />
                  </div>
                  <div className="battle-table-cell">
                    <StatCell tone="gold" value={formatCompactNumber(guild.fame)} />
                  </div>
                </Fragment>
              ))}
            </div>
          </div>

          {sorted.length > ITEMS_PER_PAGE ? (
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
        <p className="empty">No hay guilds que coincidan con esa búsqueda.</p>
      )}
    </article>
  );
}
