"use client";

import { useState } from "react";
import type { AlbionPlayerLookupData } from "./lib";

function formatCompact(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (absolute >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value);
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value);
}

export function AlbionScoutingLookup() {
  const [name, setName] = useState("");
  const [name2, setName2] = useState("");
  const [name3, setName3] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [minPlayers, setMinPlayers] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AlbionPlayerLookupData[]>([]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const names = [name, name2, name3]
      .map((entry) => entry.trim())
      .filter(Boolean)
      .filter((entry, index, list) => list.findIndex((other) => other.toLowerCase() === entry.toLowerCase()) === index)
      .slice(0, 3);

    if (names.length === 0) {
      setError("Escribe al menos 1 nombre");
      setResults([]);
      return;
    }

    const baseParams = new URLSearchParams();
    const minPlayersNumber = Number(minPlayers);
    if (Number.isFinite(minPlayersNumber) && minPlayersNumber > 0) {
      baseParams.set("minPlayers", String(Math.floor(minPlayersNumber)));
    }
    if (start) {
      baseParams.set("start", start);
    }
    if (end) {
      baseParams.set("end", end);
    }

    setLoading(true);
    setError(null);
    try {
      const payloads = await Promise.all(
        names.map(async (playerName) => {
          const params = new URLSearchParams(baseParams);
          params.set("name", playerName);
          const response = await fetch(`/albion/players/search?${params.toString()}`, {
            method: "GET"
          });
          const payload = (await response.json()) as AlbionPlayerLookupData & { error?: string };
          if (!response.ok) {
            throw new Error(payload.error ?? `Search failed with status ${response.status}`);
          }
          return payload;
        })
      );
      setResults(payloads);
    } catch (lookupError) {
      setResults([]);
      setError(lookupError instanceof Error ? lookupError.message : "No se pudo buscar ahora");
    } finally {
      setLoading(false);
    }
  }

  const compared = results.filter((entry) => Boolean(entry.stats));

  const metricRows: Array<{
    key: string;
    label: string;
    value: (entry: AlbionPlayerLookupData) => string;
    numeric: (entry: AlbionPlayerLookupData) => number;
  }> = [
    {
      key: "kills",
      label: "Total kills",
      value: (entry) => formatInteger(entry.stats?.totalKills ?? 0),
      numeric: (entry) => entry.stats?.totalKills ?? 0
    },
    {
      key: "deaths",
      label: "Total deaths",
      value: (entry) => formatInteger(entry.stats?.totalDeaths ?? 0),
      numeric: (entry) => entry.stats?.totalDeaths ?? 0
    },
    {
      key: "damage",
      label: "Total damage",
      value: (entry) => formatCompact(entry.stats?.totalDamage ?? 0),
      numeric: (entry) => entry.stats?.totalDamage ?? 0
    },
    {
      key: "kd",
      label: "K/D",
      value: (entry) => (entry.stats?.kd ?? 0).toFixed(2).replace(".", ","),
      numeric: (entry) => entry.stats?.kd ?? 0
    },
    {
      key: "attendance",
      label: "Total attendance",
      value: (entry) => formatInteger(entry.stats?.totalAttendance ?? 0),
      numeric: (entry) => entry.stats?.totalAttendance ?? 0
    },
    {
      key: "ip",
      label: "Average IP",
      value: (entry) => formatInteger(entry.stats?.averageIp ?? 0),
      numeric: (entry) => entry.stats?.averageIp ?? 0
    },
    {
      key: "killfame",
      label: "Total kill fame",
      value: (entry) => formatCompact(entry.stats?.totalKillFame ?? 0),
      numeric: (entry) => entry.stats?.totalKillFame ?? 0
    },
    {
      key: "deathfame",
      label: "Total death fame",
      value: (entry) => formatCompact(entry.stats?.totalDeathFame ?? 0),
      numeric: (entry) => entry.stats?.totalDeathFame ?? 0
    }
  ];

  return (
    <>
      <form className="scouting-search scouting-search-kd" onSubmit={(event) => void onSubmit(event)}>
        <input
          onChange={(event) => setName(event.target.value)}
          placeholder="Jugador Albion"
          value={name}
        />
        <input
          onChange={(event) => setName2(event.target.value)}
          placeholder="Jugador 2 (opcional)"
          value={name2}
        />
        <input
          onChange={(event) => setName3(event.target.value)}
          placeholder="Jugador 3 (opcional)"
          value={name3}
        />
        <input onChange={(event) => setStart(event.target.value)} type="date" value={start} />
        <input onChange={(event) => setEnd(event.target.value)} type="date" value={end} />
        <input
          inputMode="numeric"
          min={1}
          onChange={(event) => setMinPlayers(event.target.value)}
          placeholder="Min. players"
          type="number"
          value={minPlayers}
        />
        <button className="button primary" disabled={loading} type="submit">
          {loading ? "Buscando..." : "Filtrar"}
        </button>
      </form>

      {error ? (
        <article className="dashboard-card scouting-response-block">
          <p className="empty">{error}</p>
        </article>
      ) : null}

      {results.length > 0 ? (
        <>
          <section className="scouting-compare-grid">
            {results.map((entry) => {
              const stats = entry.stats;
              const playerName = entry.player?.name ?? entry.query;
              const guildName = entry.player?.guildName;

              if (!stats) {
                if (entry.player) {
                  return (
                    <article
                      className="dashboard-card scouting-result scouting-response-block scouting-kd-result"
                      key={entry.query}
                    >
                      <div className="section-row">
                        <div>
                          <h2>{guildName ? `${playerName} - ${guildName}` : playerName}</h2>
                        </div>
                      </div>
                      <p className="scouting-hint">
                        No hay actividad agregada con estos filtros; mostrando datos generales del perfil.
                      </p>
                      <div className="scouting-kd-grid">
                        <article className="metric-card scouting-kd-card scouting-kd-killfame">
                          <span className="card-label">Kill fame</span>
                          <strong>{formatCompact(entry.player.killFame ?? 0)}</strong>
                        </article>
                        <article className="metric-card scouting-kd-card scouting-kd-deathfame">
                          <span className="card-label">Death fame</span>
                          <strong>{formatCompact(entry.player.deathFame ?? 0)}</strong>
                        </article>
                        <article className="metric-card scouting-kd-card scouting-kd-heal">
                          <span className="card-label">K/D fame</span>
                          <strong>{(entry.player.kdFame ?? 0).toFixed(2).replace(".", ",")}</strong>
                        </article>
                      </div>
                    </article>
                  );
                }
                return (
                  <article className="dashboard-card scouting-response-block" key={entry.query}>
                    <p className="empty">
                      No se encontró actividad para "{entry.query}" con los filtros actuales.
                    </p>
                  </article>
                );
              }

              return (
                <article
                  className="dashboard-card scouting-result scouting-response-block scouting-kd-result"
                  key={entry.query}
                >
                  <div className="section-row">
                    <div>
                      <h2>{guildName ? `${playerName} - ${guildName}` : playerName}</h2>
                    </div>
                  </div>
                  <div className="scouting-kd-grid">
                    <article className="metric-card scouting-kd-card scouting-kd-kills">
                      <span className="card-label">Total kills</span>
                      <strong>{formatInteger(stats.totalKills)}</strong>
                    </article>
                    <article className="metric-card scouting-kd-card scouting-kd-deaths">
                      <span className="card-label">Total deaths</span>
                      <strong>{formatInteger(stats.totalDeaths)}</strong>
                    </article>
                    <article className="metric-card scouting-kd-card scouting-kd-damage">
                      <span className="card-label">Total damage</span>
                      <strong>{formatCompact(stats.totalDamage)}</strong>
                    </article>
                    <article className="metric-card scouting-kd-card scouting-kd-heal">
                      <span className="card-label">K/D</span>
                      <strong>{(stats.kd ?? 0).toFixed(2).replace(".", ",")}</strong>
                    </article>
                    <article className="metric-card scouting-kd-card scouting-kd-attendance">
                      <span className="card-label">Total attendance</span>
                      <strong>{formatInteger(stats.totalAttendance)}</strong>
                    </article>
                    <article className="metric-card scouting-kd-card scouting-kd-ip">
                      <span className="card-label">Average IP</span>
                      <strong>{formatInteger(stats.averageIp)}</strong>
                    </article>
                    <article className="metric-card scouting-kd-card scouting-kd-killfame">
                      <span className="card-label">Total kill fame</span>
                      <strong>{formatCompact(stats.totalKillFame)}</strong>
                    </article>
                    <article className="metric-card scouting-kd-card scouting-kd-deathfame">
                      <span className="card-label">Total death fame</span>
                      <strong>{formatCompact(stats.totalDeathFame)}</strong>
                    </article>
                  </div>
                </article>
              );
            })}
          </section>

          {compared.length >= 2 ? (
            <article className="dashboard-card scouting-response-block">
              <div className="section-row">
                <div>
                  <span className="card-label">Comparativa</span>
                  <h3>Comparación directa</h3>
                </div>
              </div>
              <div className="scouting-compare-table">
                <div className="scouting-compare-head">
                  <span>Métrica</span>
                  {compared.map((entry) => (
                    <span key={`head-${entry.query}`}>{entry.player?.name ?? entry.query}</span>
                  ))}
                </div>
                {metricRows.map((metric) => (
                  <div className="scouting-compare-row" key={metric.key}>
                    <strong>{metric.label}</strong>
                    {(() => {
                      const max = compared.reduce((best, entry) => Math.max(best, metric.numeric(entry)), Number.NEGATIVE_INFINITY);
                      return compared.map((entry) => {
                        const current = metric.numeric(entry);
                        const isBest = current === max;
                        return (
                          <span
                            className={isBest ? "scouting-compare-best" : undefined}
                            key={`${metric.key}-${entry.query}`}
                          >
                            {metric.value(entry)}
                          </span>
                        );
                      });
                    })()}
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </>
      ) : null}
    </>
  );
}
