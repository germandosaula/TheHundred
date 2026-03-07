"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  BuildItemSlotKey,
  BuildTemplateEntry,
  CompEntry,
  CompPartyEntry,
  CompSlotEntry
} from "../../lib";
import {
  albionWeaponCatalog,
  compRoleLabels,
  defaultPartySlots,
  getItemIconUrl,
  getResolvedWeaponIconName,
  resolveAlbionWeapon,
  type AlbionCompRole
} from "./catalog";
import { CustomSelect } from "./CustomSelect";

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
  canEdit: boolean;
  initialActiveCompId?: string;
  initialComps: CompEntry[];
  initialBuilds: BuildTemplateEntry[];
}

type BuildEditorState = {
  id?: string;
  name: string;
  role: AlbionCompRole;
  weaponId: string;
  items: Record<BuildItemSlotKey, { itemId: string; itemName: string }>;
};

type BuildEditorContext = {
  partyKey: string;
  slotId: string;
};

type AlbionItemSearchResult = {
  id: string;
  name: string;
  iconUrl: string;
};

const buildItemSlotOrder: BuildItemSlotKey[] = [
  "MAIN_HAND",
  "OFF_HAND",
  "HEAD",
  "ARMOR",
  "SHOES",
  "CAPE",
  "BAG",
  "MOUNT",
  "FOOD",
  "POTION"
];

const defaultBuildVisualGridSlots: BuildItemSlotKey[] = [
  "BAG",
  "HEAD",
  "CAPE",
  "MAIN_HAND",
  "ARMOR",
  "OFF_HAND",
  "POTION",
  "SHOES",
  "FOOD"
];

const battlemountVisualGridSlots: BuildItemSlotKey[] = [
  "BAG",
  "HEAD",
  "CAPE",
  "MAIN_HAND",
  "ARMOR",
  "OFF_HAND",
  "POTION",
  "SHOES",
  "FOOD",
  "MOUNT"
];

const buildItemSlotLabel: Record<BuildItemSlotKey, string> = {
  MAIN_HAND: "Main Hand",
  OFF_HAND: "Off Hand",
  HEAD: "Head",
  ARMOR: "Armor",
  SHOES: "Shoes",
  CAPE: "Cape",
  BAG: "Bag",
  MOUNT: "Mount",
  FOOD: "Food",
  POTION: "Potion"
};

function getPrimaryBuildSlot(role: AlbionCompRole): BuildItemSlotKey {
  return role === "Battlemount" ? "MOUNT" : "MAIN_HAND";
}

function getBuildVisualGridSlots(role: AlbionCompRole): BuildItemSlotKey[] {
  return role === "Battlemount" ? battlemountVisualGridSlots : defaultBuildVisualGridSlots;
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
    buildId: undefined,
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

function createEmptyBuildItems(): BuildEditorState["items"] {
  return {
    MAIN_HAND: { itemId: "", itemName: "" },
    OFF_HAND: { itemId: "", itemName: "" },
    HEAD: { itemId: "", itemName: "" },
    ARMOR: { itemId: "", itemName: "" },
    SHOES: { itemId: "", itemName: "" },
    CAPE: { itemId: "", itemName: "" },
    BAG: { itemId: "", itemName: "" },
    MOUNT: { itemId: "", itemName: "" },
    FOOD: { itemId: "", itemName: "" },
    POTION: { itemId: "", itemName: "" }
  };
}

function createBuildEditorFromSlot(slot: CompPartySlot): BuildEditorState {
  const weapon = getWeaponById(slot.weaponId);
  const items = createEmptyBuildItems();
  const primarySlot = getPrimaryBuildSlot(slot.role);
  items[primarySlot] = {
    itemId: getResolvedWeaponIconName(weapon.iconName ?? slot.weaponName) ?? slot.weaponName,
    itemName: slot.weaponName
  };

  return {
    name: `${slot.label} Build`,
    role: slot.role,
    weaponId: slot.weaponId,
    items
  };
}

function createBuildEditorFromBuild(build: BuildTemplateEntry): BuildEditorState {
  const items = createEmptyBuildItems();
  for (const item of build.items) {
    items[item.slot] = {
      itemId: item.itemId,
      itemName: item.itemName
    };
  }
  const primarySlot = getPrimaryBuildSlot(build.role as AlbionCompRole);
  if (!items[primarySlot].itemId && items.MAIN_HAND.itemId && primarySlot === "MOUNT") {
    items.MOUNT = { ...items.MAIN_HAND };
  }

  return {
    id: build.id,
    name: build.name,
    role: build.role as AlbionCompRole,
    weaponId: build.weaponId,
    items
  };
}

function resolveWeaponFromMainHand(input: { itemId?: string; itemName?: string }) {
  return resolveAlbionWeapon(input.itemId) ?? resolveAlbionWeapon(input.itemName);
}

export function CompsBuilder({
  canEdit,
  initialActiveCompId,
  initialComps,
  initialBuilds
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
  const [builds, setBuilds] = useState<BuildTemplateEntry[]>(initialBuilds);
  const [pendingSave, setPendingSave] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [editorBuild, setEditorBuild] = useState<BuildEditorState | null>(null);
  const [editorContext, setEditorContext] = useState<BuildEditorContext | null>(null);
  const [pendingBuildSave, setPendingBuildSave] = useState(false);
  const [activeEditorSlot, setActiveEditorSlot] = useState<BuildItemSlotKey>("MAIN_HAND");
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const [itemSearchResults, setItemSearchResults] = useState<AlbionItemSearchResult[]>([]);

  const activeParty = comp.parties.find((party) => party.key === activePartyKey) ?? comp.parties[0];
  const leftPartySlots = activeParty?.slots.slice(0, 10) ?? [];
  const rightPartySlots = activeParty?.slots.slice(10, 20) ?? [];
  const allSlots = comp.parties.flatMap((party) => party.slots);
  const activeEditorItem = editorBuild ? editorBuild.items[activeEditorSlot] : null;
  const activeEditorPrimarySlot = editorBuild ? getPrimaryBuildSlot(editorBuild.role) : "MAIN_HAND";
  const activeEditorVisualSlots = editorBuild ? getBuildVisualGridSlots(editorBuild.role) : defaultBuildVisualGridSlots;
  const buildPrimaryIconById = useMemo(() => {
    const map = new Map<string, string>();
    for (const build of builds) {
      const primarySlot = getPrimaryBuildSlot(build.role as AlbionCompRole);
      const primaryItem = build.items.find((entry) => entry.slot === primarySlot);
      if (primaryItem?.itemId) {
        map.set(build.id, primaryItem.itemId);
      }
    }
    return map;
  }, [builds]);

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

  function getPreferredBuildForWeapon(weaponId: string): BuildTemplateEntry | null {
    const candidates = builds
      .filter((entry) => entry.weaponId === weaponId)
      .sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
    return candidates[0] ?? null;
  }

  useEffect(() => {
    if (!editorBuild) {
      setItemSearchQuery("");
      setItemSearchResults([]);
      setItemSearchLoading(false);
    }
  }, [editorBuild]);

  useEffect(() => {
    if (!editorBuild) {
      return;
    }

    const query = itemSearchQuery.trim();
    if (query.length < 2) {
      setItemSearchLoading(false);
      setItemSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setItemSearchLoading(true);

      try {
        const response = await fetch(
          `/albion/items/search?q=${encodeURIComponent(query)}&slot=${encodeURIComponent(activeEditorSlot)}`,
          {
            signal: controller.signal
          }
        );
        const payload = (await response.json()) as
          | { items?: AlbionItemSearchResult[]; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "No se pudo buscar items");
        }

        setItemSearchResults(payload?.items ?? []);
      } catch (error) {
        if ((error as { name?: string })?.name !== "AbortError") {
          setItemSearchResults([]);
        }
      } finally {
        setItemSearchLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [editorBuild, itemSearchQuery ?? "", activeEditorSlot]);

  function updateSlotInParty(
    partyKey: string,
    slotId: string,
    mutator: (slot: CompPartySlot) => CompPartySlot
  ) {
    setComp((current) => ({
      ...current,
      parties: current.parties.map((party) =>
        party.key === partyKey
          ? {
              ...party,
              slots: party.slots.map((slot) => (slot.id === slotId ? mutator(slot) : slot))
            }
          : party
      )
    }));
  }

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

    const baseSlot = createSlotFromTemplate(activeParty.slots.length);
    const preferredBuild = getPreferredBuildForWeapon(baseSlot.weaponId);

    updateActiveParty((party) => ({
      ...party,
      slots: [
        ...party.slots,
        {
          ...baseSlot,
          buildId: preferredBuild?.id
        }
      ]
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
            weaponName: nextWeapon.name,
            buildId: undefined
          };
        }

        if (field === "weaponId") {
          const nextWeapon = getWeaponById(value);
          const preferredBuild = getPreferredBuildForWeapon(nextWeapon.id);

          return {
            ...slot,
            weaponId: nextWeapon.id,
            weaponName: nextWeapon.name,
            buildId: preferredBuild?.id
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

  function openBuildEditor(
    context: BuildEditorContext,
    slot: CompPartySlot,
    buildId?: string
  ) {
    const selectedBuild = buildId
      ? builds.find((entry) => entry.id === buildId)
      : getPreferredBuildForWeapon(slot.weaponId);
    setEditorContext(context);
    setEditorBuild(selectedBuild ? createBuildEditorFromBuild(selectedBuild) : createBuildEditorFromSlot(slot));
    setActiveEditorSlot(getPrimaryBuildSlot(slot.role));
    setItemSearchQuery("");
    setItemSearchResults([]);
  }

  function updateEditorItem(slot: BuildItemSlotKey, field: "itemId" | "itemName", value: string) {
    setEditorBuild((current) => {
      if (!current) {
        return current;
      }

      const nextItem = {
        ...current.items[slot],
        [field]: value
      };
      return {
        ...current,
        items: {
          ...current.items,
          [slot]: nextItem
        }
      };
    });
  }

  async function saveBuild() {
    if (!editorBuild || !canEdit) {
      return;
    }

    setPendingBuildSave(true);
    setFeedback(null);

    try {
      const response = await fetch("/builds", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          id: undefined,
          name: editorBuild.name,
          role: editorBuild.role,
          weaponId: editorBuild.weaponId,
          items: buildItemSlotOrder
            .map((slot) => ({
              slot,
              itemId: editorBuild.items[slot].itemId.trim(),
              itemName: editorBuild.items[slot].itemName.trim()
            }))
            .filter((item) => item.itemId.length > 0 && item.itemName.length > 0)
        })
      });

      const payload = (await response.json()) as BuildTemplateEntry | { error?: string };
      if (!response.ok || "error" in payload) {
        throw new Error(("error" in payload ? payload.error : undefined) ?? "No se pudo guardar la build");
      }

      const saved = payload as BuildTemplateEntry;
      setBuilds((current) => {
        const existingIndex = current.findIndex((entry) => entry.id === saved.id);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = saved;
          return next;
        }
        return [saved, ...current];
      });

      if (editorContext) {
        const primaryItem = editorBuild.items[activeEditorPrimarySlot];
        const resolvedWeapon = resolveWeaponFromMainHand(primaryItem);
        const nextWeaponName =
          primaryItem.itemName.trim() || resolvedWeapon?.name || getWeaponById(editorBuild.weaponId).name;
        const nextWeaponId = resolvedWeapon?.id ?? editorBuild.weaponId;

        updateSlotInParty(editorContext.partyKey, editorContext.slotId, (slot) => ({
          ...slot,
          role: editorBuild.role,
          weaponId: nextWeaponId,
          weaponName: nextWeaponName,
          buildId: saved.id
        }));
      }

      setEditorBuild(null);
      setEditorContext(null);
      setFeedback("Build guardada y asignada al slot.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo guardar la build.");
    } finally {
      setPendingBuildSave(false);
    }
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
              playerUserId: undefined,
              playerName: "",
              role: slot.role,
              weaponId: slot.weaponId,
              weaponName: slot.weaponName,
              buildId: slot.buildId,
              notes: slot.notes
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
      <article className="dashboard-card comp-parties-card">
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
        <div className="comp-header-grid comp-header-grid-summary">
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

      <article className="dashboard-card comp-parties-card">
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
        <div className="comp-parties-toolbar">
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
          <label className="field comp-party-name-field">
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
              <span>Arma + Build</span>
              <span>Funcion</span>
            </div>
            <div className="comp-list-grid">
              {[leftPartySlots, rightPartySlots].map((columnSlots, columnIndex) => (
                <div className="comp-list comp-list-column" key={`col-${columnIndex}`}>
                  {columnSlots.map((slot, index) => {
                    const weaponOptions = albionWeaponCatalog.filter((weapon) => weapon.role === slot.role);
                    const selectedWeapon = getWeaponById(slot.weaponId);
                    const slotWeaponIconSource = slot.weaponName || selectedWeapon.name;
                    const slotBuildIconSource = slot.buildId ? buildPrimaryIconById.get(slot.buildId) : undefined;
                    const slotPosition = columnIndex * 10 + index + 1;

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
                          <span className="card-label">Slot {String(slotPosition).padStart(2, "0")}</span>
                          {canEdit ? (
                            <div className="comp-slot-role-select">
                              <CustomSelect
                                disabled={!canEdit}
                                onChange={(nextRole) => updateSlot(slot.id, "role", nextRole)}
                                options={Object.entries(compRoleLabels).map(([role, label]) => ({
                                  value: role,
                                  label
                                }))}
                                value={slot.role}
                              />
                            </div>
                          ) : (
                            <span className="comp-slot-role">{compRoleLabels[slot.role]}</span>
                          )}
                        </div>
                        <div className="comp-weapon-cell">
                          <button
                            aria-label={`Ver build de ${slot.label}`}
                            className="comp-weapon-icon-button"
                            onClick={() => {
                              if (canEdit) {
                                openBuildEditor(
                                  { partyKey: activeParty.key, slotId: slot.id },
                                  slot,
                                  slot.buildId
                                );
                              }
                            }}
                            type="button"
                          >
                            <img
                              alt={slot.weaponName || selectedWeapon.name}
                              className="comp-weapon-icon"
                              decoding="async"
                              height={56}
                              loading="lazy"
                              src={getItemIconUrl(slotBuildIconSource ?? slotWeaponIconSource)}
                              width={56}
                            />
                          </button>
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
                        </div>
                        <label className="field comp-field">
                          <span className="comp-mobile-label">Funcion</span>
                          <input
                            disabled={!canEdit}
                            onChange={(event) => updateSlot(slot.id, "label", event.target.value)}
                            value={slot.label}
                          />
                        </label>
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
            {canEdit && activeParty.slots.length < 20 ? (
              <button className="comp-add-row comp-add-row-wide" onClick={addSlot} type="button">
                + Slot
              </button>
            ) : null}
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

      {editorBuild ? (
        <div className="comp-modal-overlay" role="dialog" aria-modal="true">
          <article className="comp-modal">
            <div className="section-row">
              <div>
                <span className="card-label">Constructor</span>
                <h2>{editorBuild.id ? "Editar build" : "Nueva build"}</h2>
              </div>
              <div className="actions">
                <button className="button primary compact" disabled={pendingBuildSave} onClick={() => void saveBuild()} type="button">
                  {pendingBuildSave ? "Guardando..." : "Guardar build"}
                </button>
                <button className="button ghost compact" onClick={() => setEditorBuild(null)} type="button">
                  Cerrar
                </button>
              </div>
            </div>
            <div className="comp-build-form-grid">
              <label className="field">
                <span>Nombre</span>
                <input
                  onChange={(event) =>
                    setEditorBuild((current) => (current ? { ...current, name: event.target.value } : current))
                  }
                  value={editorBuild.name}
                />
              </label>
              <label className="field">
                <span>Rol</span>
                <CustomSelect
                  onChange={(role) => {
                    const nextRole = role as AlbionCompRole;
                    setEditorBuild((current) => {
                      if (!current) {
                        return current;
                      }
                      const nextPrimarySlot = getPrimaryBuildSlot(nextRole);
                      const prevPrimarySlot = getPrimaryBuildSlot(current.role);
                      const nextItems = { ...current.items };
                      if (!nextItems[nextPrimarySlot].itemId && nextItems[prevPrimarySlot].itemId) {
                        nextItems[nextPrimarySlot] = { ...nextItems[prevPrimarySlot] };
                      }
                      return {
                        ...current,
                        role: nextRole,
                        items: nextItems
                      };
                    });
                    setActiveEditorSlot(getPrimaryBuildSlot(nextRole));
                  }}
                  options={Object.entries(compRoleLabels).map(([role, label]) => ({
                    value: role,
                    label
                  }))}
                  value={editorBuild.role}
                />
              </label>
              <label className="field">
                <span>{activeEditorPrimarySlot === "MOUNT" ? "Mount principal" : "Arma principal"}</span>
                <input
                  disabled
                  value={editorBuild.items[activeEditorPrimarySlot].itemName || getWeaponById(editorBuild.weaponId).name}
                />
              </label>
            </div>
            <div className="comp-build-layout">
              <div className="comp-build-slot-grid">
                {activeEditorVisualSlots.map((slot) => {
                  const item = editorBuild.items[slot];
                  const isActive = slot === activeEditorSlot;
                  return (
                    <button
                      className={`comp-build-slot-tile slot-${slot.toLowerCase()} ${isActive ? "active" : ""}`}
                      key={slot}
                      onClick={() => setActiveEditorSlot(slot)}
                      type="button"
                    >
                      <span>{buildItemSlotLabel[slot]}</span>
                      {item.itemId ? (
                        <img alt={item.itemName || item.itemId} src={getItemIconUrl(item.itemId)} />
                      ) : (
                        <div className="comp-build-slot-empty">+</div>
                      )}
                      <strong>{item.itemName || "Hueco libre"}</strong>
                    </button>
                  );
                })}
              </div>
              <div className="comp-build-search-panel">
                <h3>Slot activo: {buildItemSlotLabel[activeEditorSlot]}</h3>
                <input
                  onChange={(event) => setItemSearchQuery(event.target.value)}
                  placeholder="Buscar item (min 2 letras)"
                  value={itemSearchQuery}
                />
                {activeEditorItem?.itemId ? (
                  <button
                    className="button ghost compact"
                    onClick={() => {
                      updateEditorItem(activeEditorSlot, "itemId", "");
                      updateEditorItem(activeEditorSlot, "itemName", "");
                    }}
                    type="button"
                  >
                    Limpiar slot
                  </button>
                ) : null}
                <div className="comp-build-search-results">
                  {itemSearchLoading ? (
                    <p className="hint">Buscando items...</p>
                  ) : itemSearchQuery.trim().length < 2 ? (
                    <p className="hint">Escribe al menos 2 letras para buscar.</p>
                  ) : itemSearchResults.length === 0 ? (
                    <p className="hint">Sin resultados.</p>
                  ) : (
                    itemSearchResults.map((item) => (
                      <button
                        className="comp-build-search-result"
                        key={item.id}
                        onClick={() => {
                          updateEditorItem(activeEditorSlot, "itemId", item.id);
                          updateEditorItem(activeEditorSlot, "itemName", item.name);
                          if (activeEditorSlot === activeEditorPrimarySlot) {
                            const resolvedWeapon = resolveWeaponFromMainHand({
                              itemId: item.id,
                              itemName: item.name
                            });
                            if (resolvedWeapon) {
                              setEditorBuild((current) =>
                                current
                                  ? {
                                      ...current,
                                      weaponId: resolvedWeapon.id,
                                      role: resolvedWeapon.role
                                    }
                                  : current
                              );
                              setActiveEditorSlot(getPrimaryBuildSlot(resolvedWeapon.role));
                            }
                          }
                        }}
                        type="button"
                      >
                        <img alt={item.name} src={item.iconUrl} />
                        <div>
                          <strong>{item.name}</strong>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
