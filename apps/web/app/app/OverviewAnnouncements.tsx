"use client";

import { useMemo, useState } from "react";

const STORAGE_KEY = "th_overview_announcements";

type Announcement = {
  title: string;
  body: string;
};

const defaultAnnouncements: Announcement[] = [
  {
    title: "CTA principal",
    body: "Revisa siempre el enlace directo desde esta vista para entrar al bloque correcto.",
  },
  {
    title: "Estado de bot",
    body: "Si no ves CTA en web, validar bot online y canal de signup en Discord.",
  },
];

function readAnnouncements(): Announcement[] {
  if (typeof window === "undefined") {
    return defaultAnnouncements;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultAnnouncements;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return defaultAnnouncements;
    }
    const safe = parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const record = entry as Record<string, unknown>;
        const title =
          typeof record.title === "string" ? record.title.trim() : "";
        const body = typeof record.body === "string" ? record.body.trim() : "";
        if (!title || !body) {
          return null;
        }
        return { title, body };
      })
      .filter((entry): entry is Announcement => Boolean(entry));
    return safe.length > 0 ? safe : defaultAnnouncements;
  } catch {
    return defaultAnnouncements;
  }
}

function writeAnnouncements(items: Announcement[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function OverviewAnnouncements({ canEdit }: { canEdit: boolean }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    readAnnouncements(),
  );
  const [isEditing, setIsEditing] = useState(false);

  const nextDraft = useMemo(
    () => announcements.map((entry) => ({ ...entry })),
    [announcements],
  );
  const [draft, setDraft] = useState(nextDraft);

  function openEditor() {
    setDraft(announcements.map((entry) => ({ ...entry })));
    setIsEditing(true);
  }

  function closeEditor() {
    setIsEditing(false);
  }

  function saveEditor() {
    const normalized = draft
      .map((entry) => ({
        title: entry.title.trim(),
        body: entry.body.trim(),
      }))
      .filter((entry) => entry.title.length > 0 && entry.body.length > 0);
    const next = normalized.length > 0 ? normalized : defaultAnnouncements;
    setAnnouncements(next);
    writeAnnouncements(next);
    setIsEditing(false);
  }

  return (
    <article className="dashboard-card">
      <div className="section-row">
        <div>
          <span className="card-label">Anuncios</span>
          <h2>Comunicados de The Hundred</h2>
        </div>
        {canEdit ? (
          <button
            className="button ghost compact"
            onClick={openEditor}
            type="button"
          >
            Editar comunicados
          </button>
        ) : null}
      </div>
      {!isEditing ? (
        <ul className="overview-announcements">
          {announcements.map((entry, index) => (
            <li key={`${entry.title}-${index}`}>
              <strong>{entry.title}</strong>
              <span>{entry.body}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="overview-announcements-editor">
          {draft.map((entry, index) => (
            <div className="overview-announcement-row" key={`draft-${index}`}>
              <input
                onChange={(event) =>
                  setDraft((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, title: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="Título"
                value={entry.title}
              />
              <input
                onChange={(event) =>
                  setDraft((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, body: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="Texto"
                value={entry.body}
              />
              <button
                className="button ghost compact danger"
                onClick={() =>
                  setDraft((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                type="button"
              >
                Quitar
              </button>
            </div>
          ))}
          <div className="actions">
            <button
              className="button ghost compact"
              onClick={() =>
                setDraft((current) => [...current, { title: "", body: "" }])
              }
              type="button"
            >
              + Añadir anuncio
            </button>
            <button
              className="button ghost compact"
              onClick={closeEditor}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="button primary compact"
              onClick={saveEditor}
              type="button"
            >
              Guardar anuncios
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
