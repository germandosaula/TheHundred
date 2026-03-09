"use client";

import { useState } from "react";
import type { OverviewAnnouncementEntry } from "../lib";

type AnnouncementDraft = {
  title: string;
  body: string;
};

interface OverviewAnnouncementsProps {
  canEdit: boolean;
  initialAnnouncements: OverviewAnnouncementEntry[];
}

export function OverviewAnnouncements({
  canEdit,
  initialAnnouncements
}: OverviewAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementDraft[]>(
    initialAnnouncements
      .sort((left, right) => left.position - right.position)
      .map((entry) => ({ title: entry.title, body: entry.body }))
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnnouncementDraft[]>(announcements);

  function openEditor() {
    setDraft(announcements.map((entry) => ({ ...entry })));
    setSaveError(null);
    setIsEditing(true);
  }

  function closeEditor() {
    setIsEditing(false);
    setSaveError(null);
  }

  async function saveEditor() {
    const normalized = draft
      .map((entry) => ({
        title: entry.title.trim(),
        body: entry.body.trim()
      }))
      .filter((entry) => entry.title.length > 0 && entry.body.length > 0);
    const next = normalized;

    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/overview/announcements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ announcements: next })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron guardar los comunicados");
      }
      setAnnouncements(next);
      setIsEditing(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudieron guardar los comunicados");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="dashboard-card">
      <div className="section-row">
        <div>
          <span className="card-label">Anuncios</span>
          <h2>Comunicados de The Hundred</h2>
        </div>
        {canEdit ? (
          <button className="button ghost compact" onClick={openEditor} type="button">
            Editar comunicados
          </button>
        ) : null}
      </div>
      {!isEditing ? (
        announcements.length > 0 ? (
          <ul className="overview-announcements">
            {announcements.map((entry, index) => (
              <li key={`${entry.title}-${index}`}>
                <strong>{entry.title}</strong>
                <span>{entry.body}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No hay comunicados.</p>
        )
      ) : (
        <div className="overview-announcements-editor">
          {draft.map((entry, index) => (
            <div className="overview-announcement-row" key={`draft-${index}`}>
              <input
                onChange={(event) =>
                  setDraft((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, title: event.target.value } : item
                    )
                  )
                }
                placeholder="Título"
                value={entry.title}
              />
              <input
                onChange={(event) =>
                  setDraft((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, body: event.target.value } : item
                    )
                  )
                }
                placeholder="Texto"
                value={entry.body}
              />
              <button
                className="button ghost compact danger"
                onClick={() =>
                  setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
                type="button"
              >
                Quitar
              </button>
            </div>
          ))}
          {saveError ? <p className="empty">{saveError}</p> : null}
          <div className="actions">
            <button
              className="button ghost compact"
              onClick={() => setDraft((current) => [...current, { title: "", body: "" }])}
              type="button"
            >
              + Añadir anuncio
            </button>
            <button className="button ghost compact" onClick={closeEditor} type="button">
              Cancelar
            </button>
            <button
              className="button primary compact"
              disabled={isSaving}
              onClick={() => void saveEditor()}
              type="button"
            >
              {isSaving ? "Guardando..." : "Guardar anuncios"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
