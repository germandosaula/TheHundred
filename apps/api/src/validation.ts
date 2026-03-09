import { DomainError, type MemberStatus } from "@thehundred/domain";

export interface RegisterPayload {
  displayName: string;
  discordId: string;
  albionName: string;
  inviteCode?: string;
  avatarUrl?: string;
  timezone: string;
  mainRole: string;
  zvzExperience: string;
  notes?: string;
}

export interface CreateCtaPayload {
  title: string;
  datetimeUtc: string;
  compId?: string;
}

export interface UpdateMemberStatusPayload {
  status: MemberStatus;
}

export interface UpdateMemberBombGroupPayload {
  bombGroupName?: string;
}

export interface KickMemberPayload {
  reason?: string;
}

export interface SaveCompPayload {
  id?: string;
  name: string;
  parties: Array<{
    key: string;
    name: string;
    position: number;
    slots: Array<{
      id?: string;
      position: number;
      label: string;
      playerUserId?: string;
      playerName?: string;
      role: string;
      weaponId: string;
      weaponName: string;
      buildId?: string;
      notes?: string;
    }>;
  }>;
}

export interface SaveBuildPayload {
  id?: string;
  name: string;
  role: string;
  weaponId: string;
  items: Array<{
    slot:
      | "MAIN_HAND"
      | "OFF_HAND"
      | "HEAD"
      | "ARMOR"
      | "SHOES"
      | "CAPE"
      | "BAG"
      | "MOUNT"
      | "FOOD"
      | "POTION";
    itemId: string;
    itemName: string;
  }>;
}

export interface AssignCtaSlotPayload {
  playerUserId?: string;
  slotKey: string;
}

export interface CtaFillSignupPayload {
  roles: string[];
}

export interface CreateCouncilTaskPayload {
  title: string;
  description: string;
  category: "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";
  assignedMemberId?: string;
  executeAt?: string;
}

export interface UpdateCouncilTaskPayload {
  title?: string;
  description?: string;
  category?: "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";
  assignedMemberId?: string;
  executeAt?: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
}

export interface UpdateCouncilTaskStatusPayload {
  status: "TODO" | "IN_PROGRESS" | "DONE";
}

export interface ReplaceOverviewAnnouncementsPayload {
  announcements: Array<{
    title: string;
    body: string;
  }>;
}

export interface BottledEnergyImportPayload {
  raw: string;
}

const allowedMemberStatuses = new Set<MemberStatus>(["TRIAL", "CORE", "BENCHED", "COUNCIL", "REJECTED"]);

export function requireRegisterPayload(payload: RegisterPayload | null): RegisterPayload {
  if (
    !payload?.displayName?.trim() ||
    !payload?.discordId?.trim() ||
    !payload?.albionName?.trim() ||
    !payload?.timezone?.trim() ||
    !payload?.mainRole?.trim() ||
    !payload?.zvzExperience?.trim()
  ) {
    throw new DomainError(
      "displayName, discordId, albionName, timezone, mainRole and zvzExperience are required"
    );
  }

  return {
    displayName: payload.displayName.trim(),
    discordId: payload.discordId.trim(),
    albionName: payload.albionName.trim(),
    inviteCode: payload.inviteCode?.trim() || undefined,
    avatarUrl: payload.avatarUrl?.trim() || undefined,
    timezone: payload.timezone?.trim() || "",
    mainRole: payload.mainRole?.trim() || "",
    zvzExperience: payload.zvzExperience?.trim() || "",
    notes: payload.notes?.trim() || ""
  };
}

export function requireCreateCtaPayload(payload: CreateCtaPayload | null): CreateCtaPayload {
  if (!payload?.title?.trim() || !payload?.datetimeUtc?.trim()) {
    throw new DomainError("title and datetimeUtc are required");
  }

  if (Number.isNaN(Date.parse(payload.datetimeUtc))) {
    throw new DomainError("datetimeUtc must be a valid ISO date");
  }

  return {
    title: payload.title.trim(),
    datetimeUtc: payload.datetimeUtc,
    compId: payload.compId?.trim() || undefined
  };
}

export function requireMemberStatusPayload(
  payload: UpdateMemberStatusPayload | null
): UpdateMemberStatusPayload {
  if (!payload?.status || !allowedMemberStatuses.has(payload.status)) {
    throw new DomainError("status must be one of TRIAL, CORE, BENCHED, COUNCIL, REJECTED");
  }

  return payload;
}

export function requireMemberBombGroupPayload(
  payload: UpdateMemberBombGroupPayload | null
): UpdateMemberBombGroupPayload {
  const bombGroupName = payload?.bombGroupName?.trim();

  if (typeof payload?.bombGroupName === "string" && bombGroupName && bombGroupName.length > 40) {
    throw new DomainError("bombGroupName must be 40 characters or fewer");
  }

  return {
    bombGroupName: bombGroupName || undefined
  };
}

export function requireKickMemberPayload(payload: KickMemberPayload | null): KickMemberPayload {
  const reason = payload?.reason?.trim();

  if (reason && reason.length > 200) {
    throw new DomainError("reason must be 200 characters or fewer");
  }

  return {
    reason: reason || undefined
  };
}

export function requireSaveCompPayload(payload: SaveCompPayload | null): SaveCompPayload {
  if (!payload?.name?.trim() || !Array.isArray(payload.parties)) {
    throw new DomainError("name and parties are required");
  }

  return {
    id: payload.id,
    name: payload.name.trim(),
    parties: payload.parties.map((party, partyIndex) => {
      if (!party?.key?.trim() || !party?.name?.trim() || typeof party.position !== "number" || !Array.isArray(party.slots)) {
        throw new DomainError(`party ${partyIndex + 1} is invalid`);
      }

      if (party.slots.length > 20) {
        throw new DomainError("a party cannot have more than 20 slots");
      }

      const seenPositions = new Set<number>();

      return {
        key: party.key.trim(),
        name: party.name.trim(),
        position: party.position,
        slots: party.slots.map((slot, slotIndex) => {
          if (
            typeof slot.position !== "number" ||
            slot.position < 1 ||
            slot.position > 20 ||
            !slot.label?.trim() ||
            !slot.role?.trim() ||
            !slot.weaponId?.trim() ||
            !slot.weaponName?.trim()
          ) {
            throw new DomainError(`slot ${slotIndex + 1} in party ${partyIndex + 1} is invalid`);
          }

          if (seenPositions.has(slot.position)) {
            throw new DomainError("slot positions must be unique within the party");
          }

          seenPositions.add(slot.position);

          return {
            id: slot.id,
            position: slot.position,
            label: slot.label.trim(),
            playerUserId: slot.playerUserId?.trim() || undefined,
            playerName: slot.playerName?.trim() ?? "",
            role: slot.role.trim(),
            weaponId: slot.weaponId.trim(),
            weaponName: slot.weaponName.trim(),
            buildId: slot.buildId?.trim() || undefined,
            notes: slot.notes?.trim() ?? ""
          };
        })
      };
    })
  };
}

export function requireAssignCtaSlotPayload(payload: AssignCtaSlotPayload | null): AssignCtaSlotPayload {
  if (!payload?.slotKey?.trim()) {
    throw new DomainError("slotKey is required");
  }

  return {
    slotKey: payload.slotKey.trim(),
    playerUserId: payload.playerUserId?.trim() || undefined
  };
}

export function requireBottledEnergyImportPayload(
  payload: BottledEnergyImportPayload | null
): BottledEnergyImportPayload {
  if (!payload?.raw || !payload.raw.trim()) {
    throw new DomainError("raw is required");
  }
  return {
    raw: payload.raw
  };
}

export function requireCtaFillSignupPayload(payload: CtaFillSignupPayload | null): CtaFillSignupPayload {
  if (!payload || !Array.isArray(payload.roles)) {
    throw new DomainError("roles are required");
  }
  const roles = payload.roles.map((entry) => entry?.trim()).filter(Boolean) as string[];
  if (roles.length < 2 || roles.length > 4) {
    throw new DomainError("roles must have between 2 and 4 values");
  }
  if (roles.some((entry) => entry.length > 60)) {
    throw new DomainError("roles entries must be 60 characters or fewer");
  }
  return { roles };
}

const allowedBuildSlots = new Set([
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
]);
const allowedCouncilTaskCategories = new Set(["LOGISTICA", "ECONOMIA", "CONTENT", "ANUNCIOS"]);
const allowedCouncilTaskStatuses = new Set(["TODO", "IN_PROGRESS", "DONE"]);

export function requireSaveBuildPayload(payload: SaveBuildPayload | null): SaveBuildPayload {
  if (
    !payload?.name?.trim() ||
    !payload?.role?.trim() ||
    !payload?.weaponId?.trim() ||
    !Array.isArray(payload.items)
  ) {
    throw new DomainError("name, role, weaponId and items are required");
  }

  const seenSlots = new Set<string>();
  const items = payload.items.map((item, index) => {
    if (
      !item?.slot ||
      !allowedBuildSlots.has(item.slot) ||
      !item?.itemId?.trim() ||
      !item?.itemName?.trim()
    ) {
      throw new DomainError(`build item ${index + 1} is invalid`);
    }

    if (seenSlots.has(item.slot)) {
      throw new DomainError("build item slots must be unique");
    }

    seenSlots.add(item.slot);
    return {
      slot: item.slot,
      itemId: item.itemId.trim(),
      itemName: item.itemName.trim()
    };
  });

  return {
    id: payload.id,
    name: payload.name.trim(),
    role: payload.role.trim(),
    weaponId: payload.weaponId.trim(),
    items
  };
}

export function requireCreateCouncilTaskPayload(
  payload: CreateCouncilTaskPayload | null
): CreateCouncilTaskPayload {
  if (
    !payload?.title?.trim() ||
    !payload?.description?.trim() ||
    !payload?.category ||
    !allowedCouncilTaskCategories.has(payload.category)
  ) {
    throw new DomainError("title, description and valid category are required");
  }

  const executeAt = payload.executeAt?.trim() || undefined;
  if (executeAt && Number.isNaN(Date.parse(executeAt))) {
    throw new DomainError("executeAt must be a valid ISO date");
  }

  return {
    title: payload.title.trim(),
    description: payload.description.trim(),
    category: payload.category,
    assignedMemberId: payload.assignedMemberId?.trim() || undefined,
    executeAt
  };
}

export function requireUpdateCouncilTaskPayload(
  payload: UpdateCouncilTaskPayload | null
): UpdateCouncilTaskPayload {
  if (!payload || typeof payload !== "object") {
    throw new DomainError("payload is required");
  }

  const hasAnyField =
    payload.title !== undefined ||
    payload.description !== undefined ||
    payload.category !== undefined ||
    payload.assignedMemberId !== undefined ||
    payload.executeAt !== undefined ||
    payload.status !== undefined;

  if (!hasAnyField) {
    throw new DomainError("at least one field is required");
  }

  if (payload.title !== undefined && !payload.title.trim()) {
    throw new DomainError("title cannot be empty");
  }
  if (payload.description !== undefined && !payload.description.trim()) {
    throw new DomainError("description cannot be empty");
  }
  if (payload.category !== undefined && !allowedCouncilTaskCategories.has(payload.category)) {
    throw new DomainError("category is invalid");
  }
  if (payload.status !== undefined && !allowedCouncilTaskStatuses.has(payload.status)) {
    throw new DomainError("status is invalid");
  }

  const executeAt = payload.executeAt?.trim();
  if (executeAt && Number.isNaN(Date.parse(executeAt))) {
    throw new DomainError("executeAt must be a valid ISO date");
  }

  return {
    title: payload.title?.trim(),
    description: payload.description?.trim(),
    category: payload.category,
    assignedMemberId:
      payload.assignedMemberId === undefined ? undefined : payload.assignedMemberId.trim() || undefined,
    executeAt: payload.executeAt === undefined ? undefined : executeAt || undefined,
    status: payload.status
  };
}

export function requireCouncilTaskStatusPayload(
  payload: UpdateCouncilTaskStatusPayload | null
): UpdateCouncilTaskStatusPayload {
  if (!payload?.status || !allowedCouncilTaskStatuses.has(payload.status)) {
    throw new DomainError("status must be TODO, IN_PROGRESS or DONE");
  }

  return payload;
}

export function requireReplaceOverviewAnnouncementsPayload(
  payload: ReplaceOverviewAnnouncementsPayload | null
): ReplaceOverviewAnnouncementsPayload {
  if (!payload || !Array.isArray(payload.announcements)) {
    throw new DomainError("announcements array is required");
  }

  if (payload.announcements.length > 10) {
    throw new DomainError("maximum 10 announcements");
  }

  const announcements = payload.announcements.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new DomainError(`announcement ${index + 1} is invalid`);
    }
    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    const body = typeof entry.body === "string" ? entry.body.trim() : "";
    if (!title || !body) {
      throw new DomainError(`announcement ${index + 1} requires title and body`);
    }
    if (title.length > 80) {
      throw new DomainError(`announcement ${index + 1} title exceeds 80 chars`);
    }
    if (body.length > 280) {
      throw new DomainError(`announcement ${index + 1} body exceeds 280 chars`);
    }
    return { title, body };
  });

  return { announcements };
}
