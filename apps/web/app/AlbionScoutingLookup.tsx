"use client";

import { useState } from "react";
import type { AlbionPlayerLookupData } from "./lib";

function formatFame(value: number) {
  return new Intl.NumberFormat("es-ES", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatKd(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export function AlbionScoutingLookup() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AlbionPlayerLookupData | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = name.trim();
    if (!query) {
      setError("Escribe un nombre");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/albion/players/search?name=${encodeURIComponent(query)}`,
        {
          method: "GET",
        },
      );
      const payload = (await response.json()) as AlbionPlayerLookupData & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error ?? `Search failed with status ${response.status}`,
        );
      }
      setResult(payload);
    } catch (lookupError) {
      setResult(null);
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "No se pudo buscar ahora",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form
        className="scouting-search"
        onSubmit={(event) => void onSubmit(event)}
      >
        <input
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre del jugador en Albion"
          value={name}
        />
        <button className="button primary" disabled={loading} type="submit">
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>
      <p className="scouting-hint">
        Tip: usa el nombre del personaje (no el de Discord).
      </p>

      {error ? (
        <article className="dashboard-card scouting-response-block">
          <p className="empty">{error}</p>
        </article>
      ) : null}

      {result ? (
        result.player ? (
          <article className="dashboard-card scouting-result scouting-response-block">
            <div className="section-row">
              <div>
                <span className="card-label">Jugador</span>
                <h2>{result.player.name}</h2>
              </div>
              <span className="status-badge">
                {result.player.guildName ?? "Sin guild"}
              </span>
            </div>
            <div className="dashboard-grid scouting-metrics">
              <article className="metric-card">
                <span className="card-label">Kill Fame</span>
                <strong>{formatFame(result.player.killFame)}</strong>
              </article>
              <article className="metric-card">
                <span className="card-label">Death Fame</span>
                <strong>{formatFame(result.player.deathFame)}</strong>
              </article>
              <article className="metric-card">
                <span className="card-label">KD Fame</span>
                <strong
                  className={
                    result.player.kdFame < 1
                      ? "kd-fame-negative"
                      : "kd-fame-positive"
                  }
                >
                  {formatKd(result.player.kdFame)}
                </strong>
              </article>
            </div>
          </article>
        ) : (
          <article className="dashboard-card scouting-response-block">
            <p className="empty">
              No se encontró jugador para "{result.query}".
            </p>
          </article>
        )
      ) : null}
    </>
  );
}
