"use client";

import { useMemo, useState } from "react";
import type { CtaEntry } from "../../lib";

interface CtaBoardProps {
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

export function CtaBoard({ cta }: CtaBoardProps) {
  const parties = cta.signupParties;
  const [activePartyKey, setActivePartyKey] = useState(parties[0]?.partyKey);

  const activeParty = useMemo(
    () => parties.find((party) => party.partyKey === activePartyKey) ?? parties[0],
    [activePartyKey, parties]
  );

  const signedCount = parties.reduce(
    (total, party) => total + party.slots.filter((slot) => slot.playerName).length,
    0
  );
  const totalSlots = parties.reduce((total, party) => total + party.slots.length, 0);

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
        <div className="cta-list">
          {activeParty.slots.map((slot, index) => (
            <div className="cta-list-row" key={slot.slotKey}>
              <span className="status-badge cta-slot-index">#{String(index + 1).padStart(2, "0")}</span>
              <span className={`status-badge role-${slot.role.toLowerCase()}`}>{slot.role}</span>
              <strong>{slot.weaponName}</strong>
              <span>{slot.label}</span>
              <span className={`cta-slot-player ${slot.playerName ? "filled" : "empty"}`}>
                {slot.playerName ?? "Sin asignar"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Esta CTA aun no tiene composicion vinculada o no se ha publicado signup.</p>
      )}
    </article>
  );
}
