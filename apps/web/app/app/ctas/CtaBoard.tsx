"use client";

import { useMemo, useState } from "react";
import type { AssignableCompPlayerEntry, BuildTemplateEntry, CtaEntry } from "../../lib";
import { PlayerSelect } from "../comps/PlayerSelect";
import { canonicalWeaponVariantKey, getItemIconUrl, getResolvedWeaponIconName } from "../comps/catalog";

interface CtaBoardProps {
  assignablePlayers: AssignableCompPlayerEntry[];
  builds: BuildTemplateEntry[];
  canCancel: boolean;
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

  if (status === "CANCELED") {
    return "Cancelada";
  }

  return status;
}

function formatCompactLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .trim();
}

function compactWeaponKey(value?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeWeaponLookupKey(value: string | undefined, role?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^T\d+_/i.test(trimmed)) {
    if (role === "Battlemount" || /_MOUNT_/i.test(trimmed)) {
      return trimmed.replace(/@.*$/, "").toUpperCase();
    }
    return canonicalWeaponVariantKey(trimmed)?.toUpperCase() ?? trimmed.toUpperCase();
  }

  return compactWeaponKey(trimmed);
}

export function CtaBoard({ assignablePlayers, builds, canCancel, canEdit, cta }: CtaBoardProps) {
  const [ctaStatus, setCtaStatus] = useState(cta.status);
  const [parties, setParties] = useState(cta.signupParties);
  const [activePartyKey, setActivePartyKey] = useState(parties[0]?.partyKey);
  const [savingSlotKey, setSavingSlotKey] = useState<string | null>(null);
  const [viewerBuildId, setViewerBuildId] = useState<string | null>(null);

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
  const viewerBuild = viewerBuildId ? builds.find((entry) => entry.id === viewerBuildId) ?? null : null;
  const buildPrimaryIconById = useMemo(() => {
    const map = new Map<string, string>();
    for (const build of builds) {
      const primarySlot = build.role === "Battlemount" ? "MOUNT" : "MAIN_HAND";
      const primaryItem = build.items.find((entry) => entry.slot === primarySlot);
      if (primaryItem?.itemId) {
        map.set(build.id, primaryItem.itemId);
      }
    }
    return map;
  }, [builds]);
  const buildByWeaponId = useMemo(() => {
    const sorted = [...builds].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
    const map = new Map<string, BuildTemplateEntry[]>();
    for (const build of sorted) {
      const keys = new Set<string>();
      const primarySlot = build.role === "Battlemount" ? "MOUNT" : "MAIN_HAND";
      const primaryItemId = build.items.find((entry) => entry.slot === primarySlot)?.itemId;
      const normalizedWeaponId = normalizeWeaponLookupKey(build.weaponId, build.role);
      const normalizedPrimaryId = normalizeWeaponLookupKey(primaryItemId, build.role);

      if (normalizedWeaponId) {
        keys.add(normalizedWeaponId);
      }
      if (normalizedPrimaryId) {
        keys.add(normalizedPrimaryId);
      }

      for (const key of keys) {
        const current = map.get(key) ?? [];
        current.push(build);
        map.set(key, current);
      }
    }
    return map;
  }, [builds]);
  const buildItemSlotOrder: Array<
    "BAG" | "HEAD" | "CAPE" | "MAIN_HAND" | "ARMOR" | "OFF_HAND" | "POTION" | "SHOES" | "FOOD"
  > = ["BAG", "HEAD", "CAPE", "MAIN_HAND", "ARMOR", "OFF_HAND", "POTION", "SHOES", "FOOD"];
  const buildItemSlotLabel = {
    BAG: "Bolsa",
    HEAD: "Casco",
    CAPE: "Capa",
    MAIN_HAND: "Main Hand",
    MOUNT: "Mount",
    ARMOR: "Pecho",
    OFF_HAND: "Off Hand",
    POTION: "Poción",
    SHOES: "Botas",
    FOOD: "Comida"
  } as const;

  function resolveBuildForSlot(slot: CtaEntry["signupParties"][number]["slots"][number]): BuildTemplateEntry | null {
    if (slot.buildId) {
      const explicit = builds.find((entry) => entry.id === slot.buildId);
      if (explicit) {
        return explicit;
      }
    }

    const keys = new Set<string>();
    const normalizedById = normalizeWeaponLookupKey(slot.weaponId, slot.role);
    const normalizedByName = normalizeWeaponLookupKey(slot.weaponName, slot.role);
    const resolvedIconById = normalizeWeaponLookupKey(getResolvedWeaponIconName(slot.weaponId) ?? undefined, slot.role);
    const resolvedIconByName = normalizeWeaponLookupKey(
      getResolvedWeaponIconName(slot.weaponName) ?? undefined,
      slot.role
    );
    if (normalizedById) keys.add(normalizedById);
    if (normalizedByName) keys.add(normalizedByName);
    if (resolvedIconById) keys.add(resolvedIconById);
    if (resolvedIconByName) keys.add(resolvedIconByName);

    for (const key of keys) {
      const candidates = buildByWeaponId.get(key) ?? [];
      const roleMatch = candidates.find((entry) => entry.role === slot.role);
      if (roleMatch) {
        return roleMatch;
      }
      if (candidates[0]) {
        return candidates[0];
      }
    }

    return null;
  }

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

  async function cancelCta() {
    const confirmed = window.confirm(
      "¿Cancelar esta CTA? Se eliminarán los signups de esta CTA y no contará para attendance."
    );
    if (!confirmed) {
      return;
    }

    setSavingSlotKey("__cancel__");
    const response = await fetch(`/ctas/cancel?ctaId=${encodeURIComponent(cta.id)}`, {
      method: "POST"
    });

    if (response.ok) {
      setCtaStatus("CANCELED");
      setParties((current) =>
        current.map((party) => ({
          ...party,
          slots: party.slots.map((slot) => ({
            ...slot,
            playerName: undefined,
            playerUserId: undefined
          }))
        }))
      );
    }

    setSavingSlotKey(null);
  }

  if (ctaStatus === "CANCELED") {
    return null;
  }

  return (
    <article className="dashboard-card cta-board" id={`cta-${cta.id}`}>
      <div className="cta-board-top">
        <div className="cta-board-copy">
          <span className="card-label">CTA</span>
          <h2>{cta.title}</h2>
        </div>
        <div className="cta-board-meta">
          <span className="status-badge">
            {new Date(cta.datetimeUtc).toLocaleString("es-ES", { timeZone: "UTC" })} UTC
          </span>
          <span className={`status-badge cta-status ${ctaStatus.toLowerCase()}`}>
            {formatCtaStatus(ctaStatus)}
          </span>
          {cta.compName ? <span className="status-badge">{cta.compName}</span> : null}
          <span className="status-badge">
            {signedCount}/{totalSlots}
          </span>
          {canCancel ? (
            <button
              className="button ghost compact"
              disabled={savingSlotKey === "__cancel__"}
              onClick={() => void cancelCta()}
              type="button"
            >
              {savingSlotKey === "__cancel__" ? "Cancelando..." : "Cancelar CTA"}
            </button>
          ) : null}
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
              {columnSlots.map((slot, index) => {
                const slotBuildIconSource = slot.buildId ? buildPrimaryIconById.get(slot.buildId) : undefined;
                const slotIconSource =
                  slotBuildIconSource ??
                  getResolvedWeaponIconName(slot.weaponId) ??
                  getResolvedWeaponIconName(slot.weaponName) ??
                  slot.weaponId;
                return (
                <div className="cta-list-row cta-list-row-editable" key={slot.slotKey}>
                  <div className="cta-slot-copy">
                    <div className="cta-slot-weapon">
                      <button
                        className="cta-slot-weapon-button"
                        onClick={() => {
                          const nextBuild = resolveBuildForSlot(slot);
                          if (!nextBuild) {
                            return;
                          }
                          setViewerBuildId(nextBuild.id);
                        }}
                        type="button"
                      >
                        <img
                          alt={formatCompactLabel(slot.label)}
                          className="cta-slot-weapon-icon"
                          decoding="async"
                          height={44}
                          loading="lazy"
                          src={getItemIconUrl(slotIconSource)}
                          width={44}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="cta-slot-meta">
                    <span className="status-badge cta-slot-index">
                      #{String(columnIndex * 10 + index + 1).padStart(2, "0")}
                    </span>
                    <span className={`status-badge role-${slot.role.toLowerCase()}`}>{slot.role}</span>
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
              );
              })}
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Esta CTA aun no tiene composicion vinculada o no se ha publicado signup.</p>
      )}
      {viewerBuild ? (
        <div className="comp-modal-overlay" role="dialog" aria-modal="true">
          <article className="comp-modal cta-build-modal">
            <div className="section-row">
              <div>
                <span className="card-label">Build</span>
                <h2>{viewerBuild.name}</h2>
              </div>
              <button className="button ghost compact" onClick={() => setViewerBuildId(null)} type="button">
                Cerrar
              </button>
            </div>
            <div className="comp-build-meta">
              <span className="status-badge">{viewerBuild.role}</span>
              <span className="status-badge">{viewerBuild.weaponId}</span>
            </div>
            <div className="comp-build-grid">
              {buildItemSlotOrder.map((slotKey) => {
                const item = viewerBuild.items.find((entry) => entry.slot === slotKey);
                return (
                  <article className="comp-build-item" key={slotKey}>
                    <span>{buildItemSlotLabel[slotKey]}</span>
                    {item ? (
                      <>
                        <img alt={item.itemName} height={72} src={getItemIconUrl(item.itemId)} width={72} />
                        <strong>{item.itemName}</strong>
                      </>
                    ) : (
                      <em>Sin item</em>
                    )}
                  </article>
                );
              })}
            </div>
            {viewerBuild.role === "Battlemount" ? (
              <div className="comp-build-extra-row">
                {(() => {
                  const mountItem = viewerBuild.items.find((entry) => entry.slot === "MOUNT");
                  return (
                    <article className="comp-build-item comp-build-item-extra" key="MOUNT">
                      <span>{buildItemSlotLabel.MOUNT}</span>
                      {mountItem ? (
                        <>
                          <img alt={mountItem.itemName} height={72} src={getItemIconUrl(mountItem.itemId)} width={72} />
                          <strong>{mountItem.itemName}</strong>
                        </>
                      ) : (
                        <em>Sin item</em>
                      )}
                    </article>
                  );
                })()}
              </div>
            ) : null}
          </article>
        </div>
      ) : null}
    </article>
  );
}
