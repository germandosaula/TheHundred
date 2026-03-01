"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  AssignableCompPlayerEntry,
  CompEntry,
  CompPartyEntry,
  CompSlotEntry
} from "../../lib";
import {
  albionWeaponCatalog,
  compRoleLabels,
  defaultPartySlots,
  getWeaponIconUrl,
  type AlbionCompRole
} from "./catalog";
import { CustomSelect } from "./CustomSelect";
import { PlayerSelect } from "./PlayerSelect";

interface CompPartySlot extends CompSlotEntry {
  role: AlbionCompRole;
}

interface PartyState extends Omit<CompPartyEntry, "slots"> {
  slots: CompPartySlot[];
}

interface CompState {
  id?: string;
  name: string;
  parties: PartyState[];
}

interface CompsBuilderProps {
  assignablePlayers: AssignableCompPlayerEntry[];
  canEdit: boolean;
  initialActiveCompId?: string;
  initialComps: CompEntry[];
}

function createParty(index: number): PartyState {
  return {
    key: `party-${index}`,
    name: `Party ${index}`,
    position: index,
    slots: []
  };
}

function createSlotFromTemplate(slotCount: number): CompPartySlot {
  const template = defaultPartySlots[Math.min(slotCount, defaultPartySlots.length - 1)];
  const weapon = albionWeaponCatalog.find((entry) => entry.id === template.weaponId) ?? albionWeaponCatalog[0];

  return {
    id: `local-slot-${template.id}-${slotCount + 1}`,
    position: slotCount + 1,
    label: template.label,
    playerUserId: undefined,
    playerName: "",
    role: template.role,
    weaponId: weapon.id,
    weaponName: weapon.name,
    notes: ""
  };
}

function normalizeComp(comp: CompEntry): CompState {
  return {
    id: comp.id,
    name: comp.name,
    parties:
      comp.parties?.length > 0
        ? comp.parties
            .slice()
            .sort((left, right) => left.position - right.position)
            .map((party, index) => ({
              key: party.key || `party-${index + 1}`,
              name: party.name,
              position: party.position,
              slots: party.slots
                .slice()
                .sort((left, right) => left.position - right.position)
                .map((slot) => ({
                  ...slot,
                  role: slot.role as AlbionCompRole
                }))
            }))
        : [createParty(1)]
  };
}

function getWeaponById(weaponId: string) {
  return albionWeaponCatalog.find((weapon) => weapon.id === weaponId) ?? albionWeaponCatalog[0];
}

function reorderSlots(slots: CompPartySlot[], draggedId: string, targetId: string) {
  const next = [...slots];
  const fromIndex = next.findIndex((slot) => slot.id === draggedId);
  const toIndex = next.findIndex((slot) => slot.id === targetId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return slots;
  }

  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  return next.map((slot, index) => ({
    ...slot,
    position: index + 1
  }));
}

function roleClassName(role: AlbionCompRole): string {
  return `role-${role.toLowerCase().replace(/\s+/g, "-")}`;
}

export function CompsBuilder({
  assignablePlayers,
  canEdit,
  initialActiveCompId,
  initialComps
}: CompsBuilderProps) {
  const router = useRouter();
  const initialComp =
    initialComps.find((comp) => comp.id === initialActiveCompId) ??
    initialComps[0] ??
    {
      name: "Nueva comp",
      parties: [createParty(1)]
    };

  const [comp, setComp] = useState<CompState>(normalizeComp(initialComp as CompEntry));
  const [activePartyKey, setActivePartyKey] = useState(comp.parties[0]?.key ?? "party-1");
  const [pendingSave, setPendingSave] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);

  const activeParty = comp.parties.find((party) => party.key === activePartyKey) ?? comp.parties[0];
  const allSlots = comp.parties.flatMap((party) => party.slots);

  const summary = useMemo(
    () =>
      allSlots.reduce<Record<AlbionCompRole, number>>(
        (accumulator, slot) => {
          accumulator[slot.role] += 1;
          return accumulator;
        },
        {
          Tank: 0,
          Healer: 0,
          Support: 0,
          Melee: 0,
          Ranged: 0,
          Battlemount: 0
        }
      ),
    [allSlots]
  );

  function updateActiveParty(mutator: (party: PartyState) => PartyState) {
    setComp((current) => ({
      ...current,
      parties: current.parties.map((party) => (party.key === activePartyKey ? mutator(party) : party))
    }));
  }

  function addParty() {
    const nextIndex = comp.parties.length + 1;
    const nextParty = createParty(nextIndex);
    setComp((current) => ({
      ...current,
      parties: [...current.parties, nextParty]
    }));
    setActivePartyKey(nextParty.key);
    setFeedback(null);
  }

  function addSlot() {
    if (activeParty.slots.length >= 20) {
      return;
    }

    updateActiveParty((party) => ({
      ...party,
      slots: [...party.slots, createSlotFromTemplate(party.slots.length)]
    }));
  }

  function renameComp(name: string) {
    setComp((current) => ({ ...current, name }));
  }

  function renameParty(name: string) {
    updateActiveParty((party) => ({ ...party, name }));
  }

  function updateSlot(slotId: string, field: keyof CompPartySlot, value: string) {
    updateActiveParty((party) => ({
      ...party,
      slots: party.slots.map((slot) => {
        if (slot.id !== slotId) {
          return slot;
        }

        if (field === "role") {
          const role = value as AlbionCompRole;
          const nextWeapon = albionWeaponCatalog.find((weapon) => weapon.role === role) ?? albionWeaponCatalog[0];

          return {
            ...slot,
            role,
            weaponId: nextWeapon.id,
            weaponName: nextWeapon.name
          };
        }

        if (field === "weaponId") {
          const nextWeapon = getWeaponById(value);

          return {
            ...slot,
            weaponId: nextWeapon.id,
            weaponName: nextWeapon.name
          };
        }

        return {
          ...slot,
          [field]: value
        };
      })
    }));
  }

  function onDrop(targetId: string) {
    if (!draggedSlotId || !canEdit) {
      return;
    }

    updateActiveParty((party) => ({
      ...party,
      slots: reorderSlots(party.slots, draggedSlotId, targetId)
    }));

    setDraggedSlotId(null);
  }

  async function saveComp() {
    if (!canEdit) {
      return;
    }

    setPendingSave(true);
    setFeedback(null);

    try {
      const response = await fetch("/comps", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          id: comp.id,
          name: comp.name,
          parties: comp.parties.map((party, partyIndex) => ({
            key: party.key,
            name: party.name,
            position: partyIndex + 1,
            slots: party.slots.map((slot, slotIndex) => ({
              id: slot.id.startsWith("local-") ? undefined : slot.id,
              position: slotIndex + 1,
              label: slot.label,
              playerUserId: slot.playerUserId,
              playerName: slot.playerName,
              role: slot.role,
                weaponId: slot.weaponId,
                weaponName: slot.weaponName,
                notes: ""
              }))
            }))
          })
      });

      const payload = (await response.json()) as CompEntry | { error?: string };
      if (!response.ok || "error" in payload) {
        throw new Error(("error" in payload ? payload.error : undefined) ?? "No se pudo guardar la comp");
      }

      const normalized = normalizeComp(payload as CompEntry);
      setComp(normalized);
      setActivePartyKey(normalized.parties[0]?.key ?? activePartyKey);
      setFeedback("Comp guardada para toda la guild.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo guardar la comp.");
    } finally {
      setPendingSave(false);
    }
  }

  async function deleteComp() {
    if (!canEdit || !comp.id) {
      return;
    }

    setPendingSave(true);
    setFeedback(null);

    try {
      const response = await fetch(`/comps?compId=${encodeURIComponent(comp.id)}`, {
        method: "DELETE"
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo borrar la comp");
      }

      router.push("/app/comps");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo borrar la comp.");
    } finally {
      setPendingSave(false);
    }
  }

  return (
    <section className="dashboard-stack">
      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Comps</span>
            <h2>Editor de compos del roster.</h2>
          </div>
          <div className="actions">
            <Link className="button ghost" href="/app/comps">
              Ver todas las comps
            </Link>
            {canEdit ? (
              <>
                {comp.id ? (
                  <button className="button ghost danger" onClick={deleteComp} type="button">
                    Borrar comp
                  </button>
                ) : null}
                <button className="button primary" onClick={saveComp} type="button">
                  {pendingSave ? "Guardando..." : "Guardar comp"}
                </button>
              </>
            ) : (
              <span className="status-badge">Solo lectura</span>
            )}
          </div>
        </div>
        <p className="lede">
          Una comp puede tener una o varias parties. Cada party puede tener cualquier numero de slots y el
          resumen superior suma todos los roles de la comp completa.
        </p>
        <div className="comp-header-grid">
          <label className="field">
            <span>Nombre de la comp</span>
            <input
              disabled={!canEdit}
              onChange={(event) => renameComp(event.target.value)}
              placeholder="Nombre de la comp"
              value={comp.name}
            />
          </label>
          <div className="comp-summary">
            {Object.entries(summary).map(([role, count]) => (
              <div className={`comp-summary-chip ${roleClassName(role as AlbionCompRole)}`} key={role}>
                <strong>{count}</strong>
                <span>{compRoleLabels[role as AlbionCompRole]}</span>
              </div>
            ))}
          </div>
        </div>
        {feedback ? <p className="hint banner">{feedback}</p> : null}
      </article>

      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Parties</span>
            <h2>{activeParty.name}</h2>
          </div>
          <div className="actions">
            <span className="status-badge">{activeParty.slots.length} slots</span>
            {canEdit ? (
              <button className="button ghost" onClick={addParty} type="button">
                + Nueva party
              </button>
            ) : null}
          </div>
        </div>
        <div className="comp-tabs" role="tablist" aria-label="Parties de la comp">
          {comp.parties.map((party) => (
            <button
              className={`comp-tab ${party.key === activePartyKey ? "active" : ""}`}
              key={party.key}
              onClick={() => setActivePartyKey(party.key)}
              type="button"
            >
              {party.name}
            </button>
          ))}
        </div>
        <div className="comp-header-grid">
          <label className="field">
            <span>Nombre de la party</span>
            <input
              disabled={!canEdit}
              onChange={(event) => renameParty(event.target.value)}
              placeholder="Nombre de la party"
              value={activeParty.name}
            />
          </label>
        </div>
      </article>

      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Editor de party</span>
            <h2>{activeParty.name}</h2>
          </div>
          <span className="status-badge">{activeParty.slots.length}/20 slots</span>
        </div>
        {activeParty.slots.length > 0 ? (
          <>
            <div className="comp-list-head" aria-hidden="true">
              <span>Slot</span>
              <span>Funcion</span>
              <span>Jugador</span>
              <span>Rol</span>
              <span>Arma</span>
            </div>
            <div className="comp-list">
              {activeParty.slots.map((slot, index) => {
                const weaponOptions = albionWeaponCatalog.filter((weapon) => weapon.role === slot.role);
                const selectedWeapon = getWeaponById(slot.weaponId);

                return (
                  <article
                    className={`comp-list-row ${roleClassName(slot.role)} ${draggedSlotId === slot.id ? "dragging" : ""}`}
                    draggable={canEdit}
                    key={slot.id}
                    onDragOver={(event) => {
                      if (canEdit) {
                        event.preventDefault();
                      }
                    }}
                    onDragStart={() => setDraggedSlotId(slot.id)}
                    onDrop={() => onDrop(slot.id)}
                    onDragEnd={() => setDraggedSlotId(null)}
                  >
                    <div className="comp-list-slot">
                      <span className="card-label">Slot {String(index + 1).padStart(2, "0")}</span>
                      <span className="comp-slot-role">{compRoleLabels[slot.role]}</span>
                    </div>
                    <label className="field comp-field">
                      <span className="comp-mobile-label">Funcion</span>
                      <input
                        disabled={!canEdit}
                        onChange={(event) => updateSlot(slot.id, "label", event.target.value)}
                        value={slot.label}
                      />
                    </label>
                    <label className="field comp-field">
                      <span className="comp-mobile-label">Jugador</span>
                      <PlayerSelect
                        disabled={!canEdit}
                        onChange={({ playerName, playerUserId }) => {
                          updateActiveParty((party) => ({
                            ...party,
                            slots: party.slots.map((entry) =>
                              entry.id === slot.id
                                ? {
                                    ...entry,
                                    playerName,
                                    playerUserId
                                  }
                                : entry
                            )
                          }));
                        }}
                        playerName={slot.playerName}
                        playerUserId={slot.playerUserId}
                        players={assignablePlayers}
                      />
                    </label>
                    <label className="field comp-field">
                      <span className="comp-mobile-label">Rol</span>
                      <CustomSelect
                        disabled={!canEdit}
                        onChange={(nextRole) => updateSlot(slot.id, "role", nextRole)}
                        options={Object.entries(compRoleLabels).map(([role, label]) => ({
                          value: role,
                          label
                        }))}
                        value={slot.role}
                      />
                    </label>
                    <div className="comp-weapon-cell">
                      <label className="field comp-field">
                        <span className="comp-mobile-label">Arma</span>
                        <CustomSelect
                          disabled={!canEdit}
                          onChange={(nextWeaponId) => updateSlot(slot.id, "weaponId", nextWeaponId)}
                          options={weaponOptions.map((weapon) => ({
                            value: weapon.id,
                            label: weapon.name
                          }))}
                          value={slot.weaponId}
                        />
                      </label>
                      <img
                        alt={selectedWeapon.name}
                        className="comp-weapon-icon"
                        height={56}
                        src={getWeaponIconUrl(selectedWeapon.name)}
                        width={56}
                      />
                    </div>
                  </article>
                );
              })}
              {canEdit && activeParty.slots.length < 20 ? (
                <button className="comp-add-row" onClick={addSlot} type="button">
                  + Slot
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="panel">
            <p className="empty">
              Esta party aun no tiene jugadores definidos. Usa <strong>+ Slot</strong> dentro de la lista para
              construir una bomb squad reducida o escalarla hasta una party completa.
            </p>
            {canEdit ? (
              <button className="button primary" onClick={addSlot} type="button">
                + Slot
              </button>
            ) : null}
          </div>
        )}
      </article>
    </section>
  );
}
