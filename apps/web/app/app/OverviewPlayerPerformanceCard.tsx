"use client";

import { useEffect, useState } from "react";
import type { AlbionPlayerLookupData } from "../lib";

interface OverviewPlayerPerformanceCardProps {
  displayName: string;
  albionName?: string;
}

export function OverviewPlayerPerformanceCard({
  displayName,
  albionName
}: OverviewPlayerPerformanceCardProps) {
  const [lookup, setLookup] = useState<AlbionPlayerLookupData | null>(null);
  const [loading, setLoading] = useState(Boolean(albionName));

  useEffect(() => {
    if (!albionName?.trim()) {
      setLoading(false);
      setLookup(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    void (async () => {
      try {
        const response = await fetch(`/albion/players/search?name=${encodeURIComponent(albionName)}`, {
          signal: controller.signal,
          cache: "no-store"
        });

        if (!response.ok) {
          setLookup(null);
          return;
        }

        const payload = (await response.json()) as AlbionPlayerLookupData;
        setLookup(payload);
      } catch {
        setLookup(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [albionName]);

  const kdRatio = lookup?.player?.kdFame;

  return (
    <article className="dashboard-card metric-card">
      <span className="card-label">Rendimiento player</span>
      <strong>{lookup?.player?.name ?? displayName}</strong>
      {loading ? (
        <p>Cargando K/D...</p>
      ) : (
        <p>
          Fame K/D ratio:{" "}
          <strong className={(kdRatio ?? 0) < 1 ? "kd-fame-negative" : "kd-fame-positive"}>
            {(kdRatio ?? 0).toFixed(2).replace(".", ",")}
          </strong>
        </p>
      )}
    </article>
  );
}
