import { DomainError, type MemberStatus } from "@thehundred/domain";

export interface RegisterPayload {
  displayName: string;
  discordId: string;
  avatarUrl?: string;
  timezone: string;
  mainRole: string;
  zvzExperience: string;
  notes?: string;
}

export interface CreateCtaPayload {
  title: string;
  datetimeUtc: string;
}

export interface UpdateMemberStatusPayload {
  status: MemberStatus;
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
      notes?: string;
    }>;
  }>;
}

export interface AssignCtaSlotPayload {
  playerUserId?: string;
  slotKey: string;
}

const allowedMemberStatuses = new Set<MemberStatus>(["TRIAL", "CORE", "BENCHED", "REJECTED"]);

export function requireRegisterPayload(payload: RegisterPayload | null): RegisterPayload {
  if (
    !payload?.displayName?.trim() ||
    !payload?.discordId?.trim() ||
    !payload?.timezone?.trim() ||
    !payload?.mainRole?.trim() ||
    !payload?.zvzExperience?.trim()
  ) {
    throw new DomainError(
      "displayName, discordId, timezone, mainRole and zvzExperience are required"
    );
  }

  return {
    displayName: payload.displayName.trim(),
    discordId: payload.discordId.trim(),
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
    datetimeUtc: payload.datetimeUtc
  };
}

export function requireMemberStatusPayload(
  payload: UpdateMemberStatusPayload | null
): UpdateMemberStatusPayload {
  if (!payload?.status || !allowedMemberStatuses.has(payload.status)) {
    throw new DomainError("status must be one of TRIAL, CORE, BENCHED, REJECTED");
  }

  return payload;
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
