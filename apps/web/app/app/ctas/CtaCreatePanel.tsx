"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CompEntry } from "../../lib";

function toIsoUtc(datetimeLocal: string): string | null {
  if (!datetimeLocal) {
    return null;
  }
  const date = new Date(datetimeLocal);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

export function CtaCreatePanel({ comps }: { comps: CompEntry[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [datetimeLocal, setDatetimeLocal] = useState("");
  const [compId, setCompId] = useState("");
  const [busy, setBusy] = useState(false);

  async function createCta() {
    if (busy) {
      return;
    }
    const datetimeUtc = toIsoUtc(datetimeLocal);
    if (!title.trim() || !datetimeUtc) {
      window.alert("Titulo y fecha/hora son obligatorios.");
      return;
    }
    setBusy(true);
    const response = await fetch("/ctas/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        datetimeUtc,
        compId: compId || undefined
      })
    });

    if (!response.ok) {
      let message = "No se pudo crear la CTA.";
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
          message = payload.error;
        }
      } catch {}
      window.alert(message);
      setBusy(false);
      return;
    }

    setTitle("");
    setDatetimeLocal("");
    setCompId("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="cta-create-panel">
      <div className="cta-create-panel-head">
        <span className="card-label">Nueva CTA</span>
        <p>Publica CTA en web. El bot avisará en Discord automáticamente.</p>
      </div>
      <div className="cta-create-panel-fields">
        <label className="cta-create-field">
          <span>Título</span>
          <input
            className="input compact"
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder="Ej: Reset 20 UTC"
            type="text"
            value={title}
          />
        </label>
        <label className="cta-create-field">
          <span>Composición</span>
          <select
            className="input compact"
            onChange={(event) => setCompId(event.currentTarget.value)}
            value={compId}
          >
            <option value="">Sin comp</option>
            {comps.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name}
              </option>
            ))}
          </select>
        </label>
        <label className="cta-create-field">
          <span>Fecha y hora UTC</span>
          <input
            className="input compact"
            onChange={(event) => setDatetimeLocal(event.currentTarget.value)}
            type="datetime-local"
            value={datetimeLocal}
          />
        </label>
        <button className="button primary compact cta-create-action" disabled={busy} onClick={() => void createCta()} type="button">
          {busy ? "Creando..." : "Crear CTA"}
        </button>
      </div>
    </div>
  );
}
