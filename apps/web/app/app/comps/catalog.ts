export type AlbionCompRole =
  | "Tank"
  | "Healer"
  | "Support"
  | "Melee"
  | "Ranged"
  | "Battlemount";

export interface AlbionWeaponOption {
  id: string;
  name: string;
  role: AlbionCompRole;
}

export interface AlbionPartySlotTemplate {
  id: string;
  label: string;
  role: AlbionCompRole;
  weaponId: string;
}

export const albionWeaponCatalog: AlbionWeaponOption[] = [
  { id: "heavy-mace", name: "Heavy Mace", role: "Tank" },
  { id: "incubus-mace", name: "Incubus Mace", role: "Support" },
  { id: "grovekeeper", name: "Grovekeeper", role: "Tank" },
  { id: "camlann-mace", name: "Camlann Mace", role: "Tank" },
  { id: "hand-of-justice", name: "Hand of Justice", role: "Tank" },
  { id: "hallowfall", name: "Hallowfall", role: "Healer" },
  { id: "fallen-staff", name: "Fallen Staff", role: "Healer" },
  { id: "great-holy-staff", name: "Great Holy Staff", role: "Healer" },
  { id: "redemption-staff", name: "Redemption Staff", role: "Healer" },
  { id: "blight-staff", name: "Blight Staff", role: "Healer" },
  { id: "wild-staff", name: "Wild Staff", role: "Healer" },
  { id: "rampant-staff", name: "Rampant Staff", role: "Healer" },
  { id: "great-arcane-staff", name: "Great Arcane Staff", role: "Support" },
  { id: "enigmatic-staff", name: "Enigmatic Staff", role: "Support" },
  { id: "malevolent-locus", name: "Malevolent Locus", role: "Support" },
  { id: "witchwork-staff", name: "Witchwork Staff", role: "Support" },
  { id: "damnation-staff", name: "Damnation Staff", role: "Support" },
  { id: "lifecurse-staff", name: "Lifecurse Staff", role: "Support" },
  { id: "shadowcaller", name: "Shadowcaller", role: "Support" },
  { id: "realmbreaker", name: "Realmbreaker", role: "Melee" },
  { id: "halberd", name: "Halberd", role: "Melee" },
  { id: "infernal-scythe", name: "Infernal Scythe", role: "Melee" },
  { id: "carving-sword", name: "Carving Sword", role: "Melee" },
  { id: "clarent-blade", name: "Clarent Blade", role: "Melee" },
  { id: "spirithunter", name: "Spirithunter", role: "Melee" },
  { id: "bloodletter", name: "Bloodletter", role: "Melee" },
  { id: "soulscythe", name: "Soulscythe", role: "Melee" },
  { id: "permafrost-prism", name: "Permafrost Prism", role: "Ranged" },
  { id: "glacial-staff", name: "Glacial Staff", role: "Ranged" },
  { id: "energy-shaper", name: "Energy Shaper", role: "Ranged" },
  { id: "siegebow", name: "Siegebow", role: "Ranged" },
  { id: "longbow", name: "Longbow", role: "Ranged" },
  { id: "weeping-repeater", name: "Weeping Repeater", role: "Ranged" },
  { id: "avalonian-fists", name: "Brawler Gloves", role: "Melee" },
  { id: "command-mammoth", name: "Command Mammoth", role: "Battlemount" },
  { id: "behemoth", name: "Behemoth", role: "Battlemount" },
  { id: "juggernaut", name: "Juggernaut", role: "Battlemount" }
];

export const defaultPartySlots: AlbionPartySlotTemplate[] = [
  { id: "slot-01", label: "Shotcaller Tank", role: "Tank", weaponId: "heavy-mace" },
  { id: "slot-02", label: "Engage Tank", role: "Tank", weaponId: "grovekeeper" },
  { id: "slot-03", label: "Backline Tank", role: "Tank", weaponId: "camlann-mace" },
  { id: "slot-04", label: "Holy Healer A", role: "Healer", weaponId: "hallowfall" },
  { id: "slot-05", label: "Holy Healer B", role: "Healer", weaponId: "fallen-staff" },
  { id: "slot-06", label: "Nature Healer", role: "Healer", weaponId: "blight-staff" },
  { id: "slot-07", label: "Arcane Support", role: "Support", weaponId: "great-arcane-staff" },
  { id: "slot-08", label: "Defensive Support", role: "Support", weaponId: "enigmatic-staff" },
  { id: "slot-09", label: "Utility Support", role: "Support", weaponId: "damnation-staff" },
  { id: "slot-10", label: "Frontline Bruiser 1", role: "Melee", weaponId: "realmbreaker" },
  { id: "slot-11", label: "Frontline Bruiser 2", role: "Melee", weaponId: "halberd" },
  { id: "slot-12", label: "Melee Pressure 1", role: "Melee", weaponId: "infernal-scythe" },
  { id: "slot-13", label: "Melee Pressure 2", role: "Melee", weaponId: "carving-sword" },
  { id: "slot-14", label: "Ranged Pressure 1", role: "Ranged", weaponId: "permafrost-prism" },
  { id: "slot-15", label: "Ranged Pressure 2", role: "Ranged", weaponId: "glacial-staff" },
  { id: "slot-16", label: "Ranged Pressure 3", role: "Ranged", weaponId: "energy-shaper" },
  { id: "slot-17", label: "Ranged Pressure 4", role: "Ranged", weaponId: "siegebow" },
  { id: "slot-18", label: "Ranged Pressure 5", role: "Ranged", weaponId: "longbow" },
  { id: "slot-19", label: "Battlemount 1", role: "Battlemount", weaponId: "command-mammoth" },
  { id: "slot-20", label: "Battlemount 2", role: "Battlemount", weaponId: "behemoth" }
];

export const compRoleLabels: Record<AlbionCompRole, string> = {
  Tank: "Tank",
  Healer: "Healer",
  Support: "Support",
  Melee: "Melee",
  Ranged: "Ranged",
  Battlemount: "Battlemount"
};

export function getWeaponIconUrl(name: string): string {
  return `https://render.albiononline.com/v1/item/${encodeURIComponent(name)}.png?locale=en&size=128&quality=1`;
}
