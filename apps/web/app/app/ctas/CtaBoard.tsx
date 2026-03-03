"use client";

import { useMemo, useState } from "react";
import type { AssignableCompPlayerEntry, CtaEntry } from "../../lib";
import { PlayerSelect } from "../comps/PlayerSelect";
import { getWeaponIconUrl } from "../comps/catalog";

interface CtaBoardProps {
  assignablePlayers: AssignableCompPlayerEntry[];
  canEdit: boolean;
  cta: CtaEntry;
}

function formatCtaStatus(status: string) {
  if (status === "OPEN") {
    return "Abierta";
  }

  if (status === "FINALIZED") {
    return "Finalizada";
  }

  if (status === "CREATED") {
    return "Creada";
  }

  return status;
}

function formatCompactLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .trim();
}

export function CtaBoard({ assignablePlayers, canEdit, cta }: CtaBoardProps) {
  const [parties, setParties] = useState(cta.signupParties);
  const [activePartyKey, setActivePartyKey] = useState(parties[0]?.partyKey);
  const [savingSlotKey, setSavingSlotKey] = useState<string | null>(null);

  const activeParty = useMemo(
    () => parties.find((party) => party.partyKey === activePartyKey) ?? parties[0],
    [activePartyKey, parties]
  );

  const signedCount = parties.reduce(
    (total, party) => total + party.slots.filter((slot) => slot.playerName).length,
    0
  );
  const totalSlots = parties.reduce((total, party) => total + party.slots.length, 0);
  const leftColumnSlots = activeParty?.slots.filter((_, index) => index < 10) ?? [];
  const rightColumnSlots = activeParty?.slots.filter((_, index) => index >= 10) ?? [];

  function updateSlotLocally(slotKey: string, nextValue: { playerName?: string; playerUserId?: string }) {
    setParties((current) =>
      current.map((party) => ({
        ...party,
        slots: party.slots.map((slot) =>
          slot.slotKey === slotKey
            ? {
                ...slot,
                playerName: nextValue.playerName,
                playerUserId: nextValue.playerUserId
              }
            : slot.playerUserId && nextValue.playerUserId && slot.playerUserId === nextValue.playerUserId
              ? {
                  ...slot,
                  playerName: undefined,
                  playerUserId: undefined
                }
              : slot
        )
      }))
    );
  }

  async function assignSlot(slotKey: string, playerUserId?: string) {
    const previousParties = parties;
    setSavingSlotKey(slotKey);

    const response = await fetch(`/ctas?ctaId=${encodeURIComponent(cta.id)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ slotKey, playerUserId })
    });

    if (!response.ok) {
      setParties(previousParties);
    }

    setSavingSlotKey(null);
  }

  return (
    <article className="dashboard-card cta-board">
      <div className="cta-board-top">
        <div className="cta-board-copy">
          <span className="card-label">CTA</span>
          <h2>{cta.title}</h2>
          <p className="lede">
            {new Date(cta.datetimeUtc).toLocaleString("es-ES", { timeZone: "UTC" })} UTC
          </p>
        </div>
        <div className="cta-board-meta">
          <span className={`status-badge cta-status ${cta.status.toLowerCase()}`}>
            {formatCtaStatus(cta.status)}
          </span>
          {cta.compName ? <span className="status-badge">{cta.compName}</span> : null}
          <span className="status-badge">
            {signedCount}/{totalSlots}
          </span>
        </div>
      </div>

      {parties.length > 1 ? (
        <div className="cta-party-tabs">
          {parties.map((party) => {
            const partySignedCount = party.slots.filter((slot) => slot.playerName).length;

            return (
              <button
                className={`comp-tab ${party.partyKey === activeParty?.partyKey ? "active" : ""}`}
                key={party.partyKey}
                onClick={() => setActivePartyKey(party.partyKey)}
                type="button"
              >
                {party.partyName} {partySignedCount}/{party.slots.length}
              </button>
            );
          })}
        </div>
      ) : null}

      {activeParty ? (
        <div className="cta-party-grid">
          {[leftColumnSlots, rightColumnSlots].map((columnSlots, columnIndex) => (
            <div className="cta-list cta-list-column" key={columnIndex}>
              {columnSlots.map((slot, index) => (
                <div className="cta-list-row cta-list-row-editable" key={slot.slotKey}>
                  <div className="cta-slot-meta">
                    <span className="status-badge cta-slot-index">
                      #{String(columnIndex * 10 + index + 1).padStart(2, "0")}
                    </span>
                    <span className={`status-badge role-${slot.role.toLowerCase()}`}>{slot.role}</span>
                  </div>
                  <div className="cta-slot-copy">
                    <div className="cta-slot-weapon">
                      <img
                        alt={formatCompactLabel(slot.label)}
                        className="cta-slot-weapon-icon"
                        height={44}
                        src={getWeaponIconUrl(formatCompactLabel(slot.weaponName))}
                        width={44}
                      />
                    </div>
                  </div>
                  {canEdit ? (
                    <PlayerSelect
                      disabled={savingSlotKey === slot.slotKey}
                      onChange={({ playerName, playerUserId }) => {
                        updateSlotLocally(slot.slotKey, { playerName, playerUserId });
                        void assignSlot(slot.slotKey, playerUserId);
                      }}
                      playerName={slot.playerName ?? ""}
                      playerUserId={slot.playerUserId}
                      players={assignablePlayers}
                    />
                  ) : (
                    <span className={`cta-slot-player ${slot.playerName ? "filled" : "empty"}`}>
                      {slot.playerName ?? "Sin asignar"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Esta CTA aun no tiene composicion vinculada o no se ha publicado signup.</p>
      )}
    </article>
  );
}
