"use client";

import { useMemo, useState } from "react";
import type { AssignableCompPlayerEntry, BuildTemplateEntry, CtaEntry } from "../../lib";
import { canonicalWeaponVariantKey, getItemIconUrl, getResolvedWeaponIconName } from "../comps/catalog";

interface CtaBoardProps {
  assignablePlayers: AssignableCompPlayerEntry[];
  builds: BuildTemplateEntry[];
  canCancel: boolean;
  canEdit: boolean;
  currentUserId?: string;
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

function roleClassName(role: string): string {
  return `role-${role.toLowerCase().replace(/\s+/g, "-")}`;
}

export function CtaBoard({
  assignablePlayers: _assignablePlayers,
  builds,
  canCancel,
  canEdit,
  currentUserId,
  cta
}: CtaBoardProps) {
  const [ctaStatus, setCtaStatus] = useState(cta.status);
  const [parties, setParties] = useState(cta.signupParties);
  const [fillers, setFillers] = useState(cta.signupFillers ?? []);
  const [preferredRolesMemory, setPreferredRolesMemory] = useState<Record<string, string[]>>(() =>
    (cta.signupFillers ?? []).reduce<Record<string, string[]>>((acc, entry) => {
      if (entry.playerUserId) {
        acc[entry.playerUserId] = entry.preferredRoles ?? [];
      }
      return acc;
    }, {})
  );
  const [activePartyKey, setActivePartyKey] = useState(parties[0]?.partyKey);
  const [savingSlotKey, setSavingSlotKey] = useState<string | null>(null);
  const [viewerBuildId, setViewerBuildId] = useState<string | null>(null);
  const [viewerSlotNotes, setViewerSlotNotes] = useState<string>("");
  const [signupSelections, setSignupSelections] = useState<string[]>(["", "", "", ""]);
  const [signupBusy, setSignupBusy] = useState(false);
  const [removeOwnBusy, setRemoveOwnBusy] = useState(false);
  const [draggingFillPlayerUserId, setDraggingFillPlayerUserId] = useState<string | null>(null);
  const [movingToFill, setMovingToFill] = useState(false);

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
  const alreadySignedByCurrentUser = useMemo(() => {
    if (!currentUserId) {
      return false;
    }
    const inSlot = parties.some((party) =>
      party.slots.some((slot) => slot.playerUserId === currentUserId)
    );
    if (inSlot) {
      return true;
    }
    return fillers.some((entry) => entry.playerUserId === currentUserId);
  }, [currentUserId, fillers, parties]);
  const viewerBuild = viewerBuildId ? builds.find((entry) => entry.id === viewerBuildId) ?? null : null;
  const fillWeaponOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const party of parties) {
      for (const slot of party.slots) {
        const weaponName = slot.weaponName?.trim();
        if (!weaponName) {
          continue;
        }
        const key = weaponName.toLowerCase();
        if (!byKey.has(key)) {
          byKey.set(key, weaponName);
        }
      }
    }
    return [...byKey.values()].sort((left, right) => left.localeCompare(right, "es"));
  }, [parties]);
  const roleByWeaponName = useMemo(() => {
    const map = new Map<string, string>();
    for (const party of parties) {
      for (const slot of party.slots) {
        const weaponName = slot.weaponName?.trim();
        const role = slot.role?.trim();
        if (!weaponName || !role) {
          continue;
        }
        const key = weaponName.toLowerCase();
        if (!map.has(key)) {
          map.set(key, role);
        }
      }
    }
    return map;
  }, [parties]);
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

  function resolveRoleForPreferredEntry(value: string): string | null {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    if (["tank", "healer", "support", "pierce", "melee", "ranged", "battlemount"].includes(normalized)) {
      return normalized;
    }
    const mappedRole = roleByWeaponName.get(normalized);
    return mappedRole ? mappedRole.toLowerCase() : null;
  }

  function updateSlotLocally(
    slotKey: string,
    nextValue: { playerName?: string; playerUserId?: string },
    sourceSlotKey?: string
  ) {
    const sourceKey = sourceSlotKey?.trim();
    const sourceIsDifferentSlot = Boolean(sourceKey) && sourceKey !== slotKey;
    const targetBefore = parties
      .flatMap((party) => party.slots)
      .find((slot) => slot.slotKey === slotKey && slot.playerUserId && slot.playerName);

    setParties((current) =>
      current.map((party) => ({
        ...party,
        slots: party.slots.map((slot) => {
          if (slot.slotKey === slotKey) {
            return {
              ...slot,
              playerName: nextValue.playerName,
              playerUserId: nextValue.playerUserId
            };
          }
          if (sourceIsDifferentSlot && sourceKey && slot.slotKey === sourceKey && targetBefore) {
            return {
              ...slot,
              playerName: targetBefore.playerName,
              playerUserId: targetBefore.playerUserId
            };
          }
          if (slot.playerUserId && nextValue.playerUserId && slot.playerUserId === nextValue.playerUserId) {
            return {
              ...slot,
              playerName: undefined,
              playerUserId: undefined
            };
          }
          return slot;
        })
      }))
    );

    if (nextValue.playerUserId) {
      setFillers((current) => {
        const matched = current.find((entry) => entry.playerUserId === nextValue.playerUserId);
        if (matched?.playerUserId && matched.preferredRoles.length > 0) {
          setPreferredRolesMemory((previous) => ({
            ...previous,
            [matched.playerUserId as string]: matched.preferredRoles
          }));
        }

        const withoutDragged = current.filter((entry) => entry.playerUserId !== nextValue.playerUserId);
        if (!sourceIsDifferentSlot && targetBefore?.playerUserId && targetBefore.playerName) {
          const rememberedRoles = preferredRolesMemory[targetBefore.playerUserId] ?? [];
          const displaced = {
            memberId: targetBefore.playerUserId,
            playerName: targetBefore.playerName,
            playerUserId: targetBefore.playerUserId,
            preferredRoles:
              rememberedRoles.length > 0
                ? rememberedRoles
                : [targetBefore.weaponName, targetBefore.role].filter(Boolean)
          };
          return [...withoutDragged.filter((entry) => entry.playerUserId !== displaced.playerUserId), displaced];
        }
        return withoutDragged;
      });
    }
  }

  function moveAssignedToFillLocally(slotKey: string) {
    const slotToMove = parties
      .flatMap((party) => party.slots)
      .find((slot) => slot.slotKey === slotKey && slot.playerName);

    if (!slotToMove) {
      return;
    }

    const rememberedRoles =
      (slotToMove.playerUserId ? preferredRolesMemory[slotToMove.playerUserId] : undefined) ?? [];
    const moved = {
      memberId: slotToMove.playerUserId ?? slotToMove.slotKey,
      playerName: slotToMove.playerName!,
      playerUserId: slotToMove.playerUserId,
      preferredRoles:
        rememberedRoles.length > 0
          ? rememberedRoles
          : [slotToMove.weaponName, slotToMove.role].filter(Boolean)
    };

    setParties((current) =>
      current.map((party) => ({
        ...party,
        slots: party.slots.map((slot) =>
          slot.slotKey === slotKey
            ? {
                ...slot,
                playerName: undefined,
                playerUserId: undefined
              }
            : slot
        )
      }))
    );

    setFillers((current) => {
      const filtered = current.filter((entry) => entry.playerUserId !== moved.playerUserId);
      return [...filtered, moved];
    });
  }

  async function assignSlot(slotKey: string, playerUserId?: string) {
    const previousParties = parties;
    const previousFillers = fillers;
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
      setFillers(previousFillers);
    }

    setSavingSlotKey(null);
  }

  async function signupForFill() {
    if (signupBusy || alreadySignedByCurrentUser) {
      return;
    }
    const selectedWeapons = signupSelections.map((entry) => entry.trim()).filter(Boolean);
    const uniqueSelections = Array.from(new Set(selectedWeapons));
    if (uniqueSelections.length < 2 || uniqueSelections.length > 4) {
      window.alert("Debes seleccionar al menos 2 armas (máximo 4).");
      return;
    }

    setSignupBusy(true);
    const response = await fetch(`/ctas/signup?ctaId=${encodeURIComponent(cta.id)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ roles: uniqueSelections })
    });

    if (!response.ok) {
      let reason = "No se pudo guardar el signup para fillear.";
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload?.error) {
          reason = payload.error;
        }
      } catch {}
      window.alert(reason);
      setSignupBusy(false);
      return;
    }
    const payload = (await response.json()) as {
      ok: true;
      filler: {
        memberId: string;
        playerName: string;
        playerUserId: string;
        preferredRoles: string[];
      };
    };
    setFillers((current) => {
      const withoutCurrent = current.filter((entry) => entry.memberId !== payload.filler.memberId);
      return [...withoutCurrent, payload.filler];
    });
    setPreferredRolesMemory((current) => ({
      ...current,
      [payload.filler.playerUserId]: payload.filler.preferredRoles
    }));
    setSignupSelections(["", "", "", ""]);
    setSignupBusy(false);
  }

  async function removeOwnSignup() {
    if (!currentUserId || removeOwnBusy) {
      return;
    }

    const previousParties = parties;
    const previousFillers = fillers;
    setRemoveOwnBusy(true);
    setParties((current) =>
      current.map((party) => ({
        ...party,
        slots: party.slots.map((slot) =>
          slot.playerUserId === currentUserId
            ? {
                ...slot,
                playerName: undefined,
                playerUserId: undefined
              }
            : slot
        )
      }))
    );
    setFillers((current) => current.filter((entry) => entry.playerUserId !== currentUserId));

    const response = await fetch(`/ctas/signup?ctaId=${encodeURIComponent(cta.id)}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      setParties(previousParties);
      setFillers(previousFillers);
      let reason = "No se pudo eliminar tu signup.";
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload?.error) {
          reason = payload.error;
        }
      } catch {}
      window.alert(reason);
    }

    setRemoveOwnBusy(false);
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

  async function moveAssignedToFill(slotKey: string) {
    if (movingToFill) {
      return;
    }

    const previousParties = parties;
    const previousFillers = fillers;
    setMovingToFill(true);
    moveAssignedToFillLocally(slotKey);

    const response = await fetch(`/ctas?ctaId=${encodeURIComponent(cta.id)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ slotKey })
    });

    if (!response.ok) {
      setParties(previousParties);
      setFillers(previousFillers);
    }
    setMovingToFill(false);
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
        <div className="cta-board-layout">
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
                    <div
                      className={`cta-list-row cta-list-row-editable ${roleClassName(slot.role)}`}
                      key={slot.slotKey}
                      onDragOver={(event) => {
                        if (!canEdit || !draggingFillPlayerUserId) {
                          return;
                        }
                        event.preventDefault();
                      }}
                      onDrop={(event) => {
                        if (!canEdit) {
                          return;
                        }
                        const playerUserId = event.dataTransfer.getData("text/playerUserId").trim();
                        const playerName = event.dataTransfer.getData("text/playerName").trim();
                        const sourceSlotKey = event.dataTransfer.getData("text/slotKey").trim();
                        if (!playerUserId || !playerName) {
                          return;
                        }
                        updateSlotLocally(slot.slotKey, { playerName, playerUserId }, sourceSlotKey);
                        void assignSlot(slot.slotKey, playerUserId);
                        setDraggingFillPlayerUserId(null);
                      }}
                    >
                      <div className="cta-slot-copy">
                        <div className="cta-slot-weapon">
                          <button
                            className="cta-slot-weapon-button"
                            onClick={() => {
                              const nextBuild = resolveBuildForSlot(slot);
                              if (!nextBuild) {
                                return;
                              }
                              setViewerSlotNotes(slot.notes ?? "");
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
                      <div
                        className={`cta-slot-dropzone ${slot.playerName ? "filled" : "empty"}`}
                        onDragEnd={() => setDraggingFillPlayerUserId(null)}
                        onDragStart={(event) => {
                          if (!canEdit || !slot.playerUserId || !slot.playerName) {
                            return;
                          }
                          event.dataTransfer.setData("text/playerUserId", slot.playerUserId);
                          event.dataTransfer.setData("text/playerName", slot.playerName);
                          event.dataTransfer.setData("text/slotKey", slot.slotKey);
                          event.dataTransfer.setData("text/slotRole", slot.role);
                          event.dataTransfer.setData("text/slotWeaponName", slot.weaponName);
                          setDraggingFillPlayerUserId(slot.playerUserId);
                        }}
                      >
                        {slot.playerName ? (
                          <>
                            {currentUserId && slot.playerUserId === currentUserId ? (
                              <span className="status-badge user-self-badge">TU</span>
                            ) : null}
                            <span
                              className="cta-slot-player-chip"
                              draggable={Boolean(canEdit && slot.playerUserId)}
                            >
                              {slot.playerName}
                            </span>
                          </>
                        ) : (
                          <span>Sin asignar</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <aside className="dashboard-card cta-fill-column">
            <div className="cta-fill-head">
              <span className="card-label">Apuntarse:</span>
              <strong>{fillers.length}</strong>
            </div>
            <div className="cta-fill-input-grid">
              {signupSelections.map((value, index) => (
                <select
                  className="input compact"
                  disabled={alreadySignedByCurrentUser || signupBusy || fillWeaponOptions.length === 0}
                  key={index}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    setSignupSelections((current) =>
                      current.map((entry, entryIndex) => (entryIndex === index ? nextValue : entry))
                    );
                  }}
                  value={value}
                >
                  <option value="">{`Selecciona arma ${index + 1}`}</option>
                  {fillWeaponOptions.map((weaponName) => (
                    <option key={weaponName} value={weaponName}>
                      {weaponName}
                    </option>
                  ))}
                </select>
              ))}
            </div>
            <button
              className="button primary compact"
              disabled={signupBusy || alreadySignedByCurrentUser || fillWeaponOptions.length === 0}
              onClick={() => void signupForFill()}
              type="button"
            >
              {signupBusy ? "Guardando..." : "Apuntarme (mín. 2)"}
            </button>
            {alreadySignedByCurrentUser ? (
              <p className="cta-fill-hint">Ya estas apuntado en esta CTA.</p>
            ) : null}
            {fillWeaponOptions.length === 0 ? (
              <p className="cta-fill-hint">No hay armas disponibles en la comp de esta CTA.</p>
            ) : null}
            <div className="cta-fill-list">
              <div
                className={`cta-fill-dropzone ${draggingFillPlayerUserId ? "active" : ""}`}
                onDragOver={(event) => {
                  if (!canEdit) {
                    return;
                  }
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!canEdit) {
                    return;
                  }
                  event.preventDefault();
                  const slotKey = event.dataTransfer.getData("text/slotKey").trim();
                  if (!slotKey) {
                    return;
                  }
                  void moveAssignedToFill(slotKey);
                  setDraggingFillPlayerUserId(null);
                }}
              >
                Arrastra aquí para quitar del slot y mantener en apuntados
              </div>
              {fillers.map((entry) => (
                <article
                  className={`cta-fill-item ${canEdit && entry.playerUserId ? "draggable" : ""}`}
                  draggable={Boolean(canEdit && entry.playerUserId)}
                  key={entry.memberId}
                  onDragEnd={() => setDraggingFillPlayerUserId(null)}
                  onDragStart={(event) => {
                    if (!entry.playerUserId) {
                      return;
                    }
                    event.dataTransfer.setData("text/playerUserId", entry.playerUserId);
                    event.dataTransfer.setData("text/playerName", entry.playerName);
                    setDraggingFillPlayerUserId(entry.playerUserId);
                  }}
                >
                  <div className="cta-fill-name">
                    {currentUserId && entry.playerUserId === currentUserId ? (
                      <span className="status-badge user-self-badge">TU</span>
                    ) : null}
                    <strong>{entry.playerName}</strong>
                    {currentUserId && entry.playerUserId === currentUserId ? (
                      <button
                        className="cta-fill-remove-button"
                        disabled={removeOwnBusy}
                        onClick={() => void removeOwnSignup()}
                        title="Quitarme de esta CTA"
                        type="button"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                  <p className="cta-fill-preferred-roles">
                    {entry.preferredRoles.map((preferred, index) => {
                      const resolvedRole = resolveRoleForPreferredEntry(preferred);
                      return (
                        <span
                          className={`cta-fill-preferred-pill${resolvedRole ? ` role-${resolvedRole}` : ""}`}
                          key={`${entry.memberId}-${preferred}-${index}`}
                        >
                          {preferred}
                        </span>
                      );
                    })}
                  </p>
                </article>
              ))}
              {fillers.length === 0 ? <p className="empty">Sin apuntados para fillear.</p> : null}
            </div>
          </aside>
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
            <div className="comp-build-notes">
              <span className="card-label">Notas del slot</span>
              <p>{viewerSlotNotes.trim() || "Sin notas para este slot."}</p>
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
