"use client";

import { useMemo, useState } from "react";
import type { RankingEntry } from "./lib";

interface RankingAttendanceListProps {
  ranking: RankingEntry[];
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "").replace(".", ",")}%`;
}

export function RankingAttendanceList({ ranking }: RankingAttendanceListProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredRanking = useMemo(
    () =>
      normalizedQuery
        ? ranking.filter((entry) => entry.displayName.toLowerCase().includes(normalizedQuery))
        : ranking,
    [ranking, normalizedQuery]
  );

  return (
    <div className="ranking-manager">
      <div className="ranking-toolbar">
        <label className="member-search">
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar jugador"
            value={query}
          />
        </label>
        <span className="status-badge">
          {filteredRanking.length === ranking.length
            ? `${ranking.length} jugadores`
            : `${filteredRanking.length} de ${ranking.length}`}
        </span>
      </div>

      {filteredRanking.length > 0 ? (
        <div className="ranking-grid">
          {filteredRanking.map((entry, index) => (
            <article
              className={`ranking-card ${
                index === 0 ? "ranking-card-gold" : index === 1 ? "ranking-card-silver" : index === 2 ? "ranking-card-bronze" : ""
              }`}
              key={entry.memberId}
            >
              <span
                className={`status-badge ranking-position ${
                  index === 0 ? "ranking-position-gold" : index === 1 ? "ranking-position-silver" : index === 2 ? "ranking-position-bronze" : ""
                }`}
              >
                #{String(index + 1).padStart(2, "0")}
              </span>
              <div className="ranking-player">
                {entry.avatarUrl ? (
                  <img alt={entry.displayName} className="user-avatar ranking-avatar" src={entry.avatarUrl} />
                ) : (
                  <span className="member-avatar-fallback ranking-avatar-fallback">
                    {entry.displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <strong>{entry.displayName}</strong>
              </div>
              <span className="ranking-metric">
                {entry.attendanceCount} · {formatPercent(entry.attendancePercent)}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty">No hay jugadores con ese nombre.</p>
      )}
    </div>
  );
}
