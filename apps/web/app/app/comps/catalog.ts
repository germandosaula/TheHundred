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
  iconName?: string;
  iconUrl?: string;
  aliases?: string[];
}

export interface AlbionPartySlotTemplate {
  id: string;
  label: string;
  role: AlbionCompRole;
  weaponId: string;
}

export const albionWeaponCatalog: AlbionWeaponOption[] = [
  { id: "arcane-staff", name: "Arcane Staff", role: "Support" },
  { id: "great-arcane-staff", name: "Great Arcane Staff", role: "Tank" },
  { id: "enigmatic-staff", name: "Enigmatic Staff", role: "Support" },
  { id: "witchwork-staff", name: "Witchwork Staff", role: "Ranged" },
  { id: "occult-staff", name: "Occult Staff", role: "Support" },
  { id: "malevolent-locus", name: "Malevolent Locus", role: "Support" },
  { id: "evensong", name: "Evensong", role: "Ranged" },
  { id: "battleaxe", name: "Battleaxe", role: "Melee" },
  { id: "greataxe", name: "Greataxe", role: "Melee" },
  { id: "heavy-mace", name: "Heavy Mace", role: "Tank" },
  { id: "grovekeeper", name: "Grovekeeper", role: "Tank" },
  { id: "camlann-mace", name: "Camlann Mace", role: "Tank" },
  { id: "hand-of-justice", name: "Hand of Justice", role: "Tank", iconName: "T8_2H_HAMMER_AVALON" },
  { id: "realmbreaker", name: "Realmbreaker", role: "Melee" },
  { id: "halberd", name: "Halberd", role: "Melee" },
  { id: "infernal-scythe", name: "Infernal Scythe", role: "Melee", iconName: "T8_2H_SCYTHE_HELL", aliases: ["scythe-hell", "2h-scythe-hell"] },
  { id: "bear-paws", name: "Bear Paws", role: "Melee" },
  { id: "bow", name: "Bow", role: "Ranged" },
  { id: "warbow", name: "Warbow", role: "Ranged" },
  { id: "longbow", name: "Longbow", role: "Ranged" },
  { id: "whispering-bow", name: "Whispering Bow", role: "Ranged" },
  { id: "bow-of-badon", name: "Bow of Badon", role: "Ranged" },
  { id: "wailing-bow", name: "Wailing Bow", role: "Ranged" },
  { id: "mistpiercer", name: "Mistpiercer", role: "Ranged" },
  { id: "crossbow", name: "Crossbow", role: "Ranged" },
  { id: "heavy-crossbow", name: "Heavy Crossbow", role: "Ranged" },
  { id: "light-crossbow", name: "Light Crossbow", role: "Ranged" },
  { id: "weeping-repeater", name: "Weeping Repeater", role: "Ranged" },
  { id: "boltcasters", name: "Boltcasters", role: "Ranged" },
  { id: "siegebow", name: "Siegebow", role: "Ranged" },
  { id: "energy-shaper", name: "Energy Shaper", role: "Ranged" },
  { id: "cursed-staff", name: "Cursed Staff", role: "Ranged" },
  { id: "great-cursed-staff", name: "Great Cursed Staff", role: "Ranged" },
  { id: "demonic-staff", name: "Demonic Staff", role: "Ranged" },
  { id: "lifecurse-staff", name: "Lifecurse Staff", role: "Support", aliases: ["cursedstaff-avalon", "main-cursedstaff-avalon"] },
  { id: "damnation-staff", name: "Damnation Staff", role: "Support", aliases: ["cursedstaff-morgana", "2h-cursedstaff-morgana"] },
  { id: "shadowcaller", name: "Shadowcaller", role: "Support", aliases: ["cursedstaff-undead", "main-cursedstaff-undead"] },
  { id: "cursed-skull", name: "Cursed Skull", role: "Ranged" },
  { id: "dagger", name: "Dagger", role: "Melee" },
  { id: "dual-daggers", name: "Dual Daggers", role: "Melee" },
  { id: "claws", name: "Claws", role: "Melee" },
  { id: "dagger-pair", name: "Dagger Pair", role: "Melee" },
  { id: "deathgivers", name: "Deathgivers", role: "Melee" },
  { id: "bloodletter", name: "Bloodletter", role: "Melee", iconName: "T8_MAIN_RAPIER_MORGANA", aliases: ["rapier-morgana", "main-rapier-morgana"] },
  { id: "demonfang", name: "Demonfang", role: "Melee" },
  { id: "bridled-fury", name: "Bridled Fury", role: "Melee" },
  { id: "fire-staff", name: "Fire Staff", role: "Ranged" },
  { id: "great-fire-staff", name: "Great Fire Staff", role: "Ranged" },
  { id: "wildfire-staff", name: "Wildfire Staff", role: "Ranged", iconName: "T8_2H_INFERNOSTAFF_MORGANA", aliases: ["infernostaff-morgana", "2h-infernostaff-morgana"] },
  { id: "infernal-staff", name: "Infernal Staff", role: "Ranged" },
  { id: "brimstone-staff", name: "Brimstone Staff", role: "Ranged" },
  { id: "blazing-staff", name: "Blazing Staff", role: "Ranged" },
  { id: "dawnsong", name: "Dawnsong", role: "Ranged", iconName: "T8_2H_FIRE_RINGPAIR_AVALON", aliases: ["fire-ringpair-avalon", "2h-fire-ringpair-avalon"] },
  { id: "frost-staff", name: "Frost Staff", role: "Ranged" },
  { id: "great-frost-staff", name: "Great Frost Staff", role: "Ranged" },
  { id: "hoarfrost-staff", name: "Hoarfrost Staff", role: "Ranged" },
  { id: "icicle-staff", name: "Icicle Staff", role: "Support" },
  { id: "glacial-staff", name: "Glacial Staff", role: "Ranged" },
  { id: "permafrost-prism", name: "Permafrost Prism", role: "Ranged", iconName: "T8_2H_ICECRYSTAL_UNDEAD", aliases: ["icecrystal-undead", "2h-icecrystal-undead"] },
  { id: "chillhowl", name: "Chillhowl", role: "Ranged" },
  { id: "hammer", name: "Hammer", role: "Tank" },
  { id: "polehammer", name: "Polehammer", role: "Tank", iconName: "T8_2H_POLEHAMMER" },
  { id: "great-hammer", name: "Great Hammer", role: "Tank" },
  { id: "tombhammer", name: "Tombhammer", role: "Tank" },
  { id: "forge-hammers", name: "Forge Hammers", role: "Tank" },
  { id: "hallowfall", name: "Hallowfall", role: "Healer", iconName: "T8_MAIN_HOLYSTAFF_AVALON" },
  { id: "fallen-staff", name: "Fallen Staff", role: "Healer" },
  { id: "great-holy-staff", name: "Great Holy Staff", role: "Healer" },
  { id: "redemption-staff", name: "Redemption Staff", role: "Healer" },
  { id: "holy-staff", name: "Holy Staff", role: "Healer" },
  { id: "divine-staff", name: "Divine Staff", role: "Healer" },
  { id: "lifetouch-staff", name: "Lifetouch Staff", role: "Healer" },
  { id: "mace", name: "Mace", role: "Tank" },
  { id: "morning-star", name: "Morning Star", role: "Tank" },
  { id: "bedrock-mace", name: "Bedrock Mace", role: "Tank" },
  { id: "incubus-mace", name: "Incubus Mace", role: "Support", iconName: "T8_MAIN_MACE_HELL" },
  { id: "oathkeepers", name: "Oathkeepers", role: "Support", aliases: ["dualmace-avalon", "2h-dualmace-avalon", "main-dualmace-avalon"] },
  { id: "blight-staff", name: "Blight Staff", role: "Healer" },
  { id: "wild-staff", name: "Wild Staff", role: "Healer" },
  { id: "rampant-staff", name: "Rampant Staff", role: "Healer" },
  { id: "nature-staff", name: "Nature Staff", role: "Healer" },
  { id: "great-nature-staff", name: "Great Nature Staff", role: "Healer" },
  { id: "druidic-staff", name: "Druidic Staff", role: "Healer" },
  { id: "ironroot-staff", name: "Ironroot Staff", role: "Healer" },
  { id: "quarterstaff", name: "Quarterstaff", role: "Tank" },
  { id: "iron-clad-staff", name: "Iron-Clad Staff", role: "Tank" },
  { id: "double-bladed-staff", name: "Double Bladed Staff", role: "Tank" },
  { id: "black-monk-staff", name: "Black Monk Staff", role: "Tank", iconName: "T8_2H_COMBATSTAFF_MORGANA", aliases: ["combatstaff-morgana", "2h-combatstaff-morgana"] },
  { id: "staff-of-balance", name: "Staff of Balance", role: "Tank", iconName: "T8_2H_ROCKSTAFF_KEEPER", aliases: ["rockstaff-keeper", "2h-rockstaff-keeper"] },
  { id: "soulscythe", name: "Soulscythe", role: "Tank" },
  { id: "grailseeker", name: "Grailseeker", role: "Tank" },
  { id: "spear", name: "Spear", role: "Melee" },
  { id: "pike", name: "Pike", role: "Melee" },
  { id: "glaive", name: "Glaive", role: "Melee" },
  { id: "heron-spear", name: "Heron Spear", role: "Melee" },
  { id: "spirithunter", name: "Spirithunter", role: "Melee", iconName: "T8_2H_HARPOON_HELL", aliases: ["harpoon-hell", "2h-harpoon-hell"] },
  { id: "trinity-spear", name: "Trinity Spear", role: "Melee" },
  { id: "daybreaker", name: "Daybreaker", role: "Melee" },
  { id: "broadsword", name: "Broadsword", role: "Melee" },
  { id: "claymore", name: "Claymore", role: "Melee" },
  { id: "dual-swords", name: "Dual Swords", role: "Melee" },
  { id: "carving-sword", name: "Carving Sword", role: "Melee", iconName: "T8_2H_CLEAVER_HELL", aliases: ["cleaver-hell", "2h-cleaver-hell"] },
  { id: "clarent-blade", name: "Clarent Blade", role: "Melee" },
  { id: "galatine-pair", name: "Galatine Pair", role: "Melee" },
  { id: "kingmaker", name: "Kingmaker", role: "Melee" },
  { id: "brawler-gloves", name: "Brawler Gloves", role: "Melee" },
  { id: "battle-bracers", name: "Battle Bracers", role: "Melee", iconName: "T8_2H_KNUCKLES_SET2", aliases: ["knuckles-set2"] },
  { id: "spiked-gauntlets", name: "Spiked Gauntlets", role: "Melee", iconName: "T8_2H_KNUCKLES_SET3", aliases: ["knuckles-set3"] },
  { id: "ursine-maulers", name: "Ursine Maulers", role: "Melee", iconName: "T8_2H_KNUCKLES_KEEPER", aliases: ["knuckles-keeper", "2h-knuckles-keeper"] },
  { id: "hellfire-hands", name: "Hellfire Hands", role: "Melee" },
  { id: "ravenstrike-cestus", name: "Ravenstrike Cestus", role: "Melee" },
  { id: "avalonian-fists", name: "Brawler Gloves", role: "Melee" },
  { id: "rootbound-staff", name: "Rootbound Staff", role: "Support", iconName: "T8_2H_SHAPESHIFTER_SET2", aliases: ["shapeshifter-set2", "2h-shapeshifter-set2"] },
  { id: "earthrune-staff", name: "Earthrune Staff", role: "Tank", iconName: "T8_2H_SHAPESHIFTER_KEEPER", aliases: ["shapeshifter-keeper", "2h-shapeshifter-keeper"] },
  { id: "lightcaller", name: "Lightcaller", role: "Ranged" },
  { id: "primal-staff", name: "Primal Staff", role: "Melee" },
  { id: "bloodmoon-staff", name: "Bloodmoon Staff", role: "Melee" },
  { id: "prowling-staff", name: "Prowling Staff", role: "Melee" },
  { id: "still-gaze-staff", name: "Still Gaze Staff", role: "Tank", iconName: "T8_2H_SHAPESHIFTER_CRYSTAL", aliases: ["shapeshifter-crystal", "2h-shapeshifter-crystal"] },
  {
    id: "command-mammoth",
    name: "Command Mammoth",
    role: "Battlemount",
    iconUrl: "https://render.albiononline.com/v1/item/Elder%27s%20Command%20Mammoth@1.png?locale=en",
    aliases: ["mammoth-battle", "mount-mammoth-battle", "command mammoth"]
  },
  { id: "behemoth", name: "Behemoth", role: "Battlemount" },
  { id: "juggernaut", name: "Juggernaut", role: "Battlemount" },
  { id: "bastion", name: "Bastion", role: "Battlemount" },
  {
    id: "colossus-beetle",
    name: "Colossus Beetle",
    role: "Battlemount",
    iconName: "UNIQUE_MOUNT_BEETLE_SILVER",
    aliases: ["beetle-silver", "mount-beetle-silver", "beetle"]
  },
  { id: "flame-basilisk", name: "Flame Basilisk", role: "Battlemount" },
  { id: "venom-basilisk", name: "Venom Basilisk", role: "Battlemount" },
  {
    id: "siege-ballista",
    name: "Siege Ballista",
    role: "Battlemount",
    iconName: "T6_MOUNT_SIEGE_BALLISTA",
    aliases: ["mount-siege-ballista", "siege balista", "siege ballista"]
  },
  { id: "eagle", name: "Eagle", role: "Battlemount" },
  {
    id: "tower-chariot",
    name: "Tower Chariot",
    role: "Battlemount",
    iconName: "UNIQUE_MOUNT_TOWER_CHARIOT_SILVER",
    aliases: ["mount-tower-chariot-silver", "tower chariot", "chariot"]
  }
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

export const compRoleBucketLabels: Record<AlbionCompRole, string> = {
  Tank: "Tanks",
  Healer: "Healers",
  Support: "Supports",
  Melee: "Melees",
  Ranged: "Ranges",
  Battlemount: "Battlemounts"
};

const weaponRoleKeywordMatchers: Array<{
  role: AlbionCompRole;
  test: (value: string, compact: string) => boolean;
}> = [
  {
    role: "Battlemount",
    test: (value, compact) =>
      value.includes("mammoth") ||
      value.includes("behemoth") ||
      value.includes("juggernaut") ||
      value.includes("bastion") ||
      value.includes("beetle") ||
      value.includes("basilisk") ||
      value.includes("ballista") ||
      value.includes("chariot") ||
      value.includes("eagle") ||
      value.includes("mount") ||
      compact.includes("mammoth") ||
      compact.includes("behemoth") ||
      compact.includes("juggernaut") ||
      compact.includes("bastion") ||
      compact.includes("beetle") ||
      compact.includes("basilisk") ||
      compact.includes("ballista") ||
      compact.includes("chariot") ||
      compact.includes("eagle") ||
      compact.includes("mount")
  },
  {
    role: "Healer",
    test: (value, compact) =>
      value.includes("holy") ||
      value.includes("hallowfall") ||
      value.includes("fallen") ||
      value.includes("redemption") ||
      value.includes("lifetouch") ||
      value.includes("nature") ||
      value.includes("wild staff") ||
      value.includes("blight") ||
      value.includes("rampant") ||
      value.includes("druidic") ||
      value.includes("ironroot") ||
      compact.includes("holystaff") ||
      compact.includes("hallowfall") ||
      compact.includes("fallen") ||
      compact.includes("redemption") ||
      compact.includes("lifetouch") ||
      compact.includes("naturestaff") ||
      compact.includes("wildstaff") ||
      compact.includes("blight") ||
      compact.includes("rampant") ||
      compact.includes("druidic") ||
      compact.includes("ironroot") ||
      compact.includes("divine")
  },
  {
    role: "Tank",
    test: (value, compact) =>
      value.includes("mace") ||
      value.includes("hammer") ||
      value.includes("grovekeeper") ||
      value.includes("justice") ||
      value.includes("bedrock") ||
      value.includes("quarterstaff") ||
      value.includes("iron clad") ||
      value.includes("double bladed") ||
      value.includes("black monk") ||
      value.includes("staff of balance") ||
      value.includes("soulscythe") ||
      value.includes("grailseeker") ||
      value.includes("earthrune") ||
      compact.includes("mace") ||
      compact.includes("hammer") ||
      compact.includes("grovekeeper") ||
      compact.includes("handofjustice") ||
      compact.includes("bedrock") ||
      compact.includes("morningstar") ||
      compact.includes("quarterstaff") ||
      compact.includes("ironclad") ||
      compact.includes("doublebladed") ||
      compact.includes("blackmonk") ||
      compact.includes("staffofbalance") ||
      compact.includes("soulscythe") ||
      compact.includes("grailseeker") ||
      compact.includes("earthrune")
  },
  {
    role: "Support",
    test: (value, compact) =>
      value.includes("arcane") ||
      value.includes("enigmatic") ||
      value.includes("occult") ||
      value.includes("locus") ||
      value.includes("lifecurse") ||
      value.includes("damnation") ||
      value.includes("shadowcaller") ||
      value.includes("oathkeeper") ||
      value.includes("spirithunter") ||
      value.includes("icicle") ||
      value.includes("rootbound") ||
      value.includes("incubus") ||
      compact.includes("arcanestaff") ||
      compact.includes("greatarcane") ||
      compact.includes("enigmatic") ||
      compact.includes("occult") ||
      compact.includes("locus") ||
      compact.includes("malevolent") ||
      compact.includes("lifecurse") ||
      compact.includes("damnation") ||
      compact.includes("shadowcaller") ||
      compact.includes("oathkeeper") ||
      compact.includes("spirithunter") ||
      compact.includes("icicle") ||
      compact.includes("rootbound") ||
      compact.includes("incubus")
  },
  {
    role: "Ranged",
    test: (value, compact) =>
      value.includes("bow") ||
      value.includes("crossbow") ||
      value.includes("repeater") ||
      value.includes("boltcaster") ||
      value.includes("firestaff") ||
      value.includes("fire staff") ||
      value.includes("froststaff") ||
      value.includes("frost staff") ||
      value.includes("curse") ||
      value.includes("permafrost") ||
      value.includes("glacial") ||
      value.includes("chillhowl") ||
      value.includes("energy shaper") ||
      value.includes("lightcaller") ||
      value.includes("evensong") ||
      value.includes("dawnsong") ||
      compact.includes("bow") ||
      compact.includes("crossbow") ||
      compact.includes("repeater") ||
      compact.includes("boltcaster") ||
      compact.includes("siegebow") ||
      compact.includes("energyshaper") ||
      compact.includes("firestaff") ||
      compact.includes("froststaff") ||
      compact.includes("cursedstaff") ||
      compact.includes("demonicstaff") ||
      compact.includes("cursedskull") ||
      compact.includes("wildfire") ||
      compact.includes("brimstone") ||
      compact.includes("blazing") ||
      compact.includes("glacial") ||
      compact.includes("permafrost") ||
      compact.includes("chillhowl") ||
      compact.includes("lightcaller") ||
      compact.includes("evensong") ||
      compact.includes("dawnsong") ||
      compact.includes("warbow") ||
      compact.includes("longbow") ||
      compact.includes("whispering") ||
      compact.includes("badon") ||
      compact.includes("wailing") ||
      compact.includes("mistpiercer")
  },
  {
    role: "Melee",
    test: (value, compact) =>
      value.includes("axe") ||
      value.includes("dagger") ||
      value.includes("claw") ||
      value.includes("bloodletter") ||
      value.includes("demonfang") ||
      value.includes("bridled fury") ||
      value.includes("spear") ||
      value.includes("glaive") ||
      value.includes("pike") ||
      value.includes("trinity") ||
      value.includes("daybreaker") ||
      value.includes("sword") ||
      value.includes("claymore") ||
      value.includes("carving") ||
      value.includes("clarent") ||
      value.includes("galatine") ||
      value.includes("kingmaker") ||
      value.includes("gloves") ||
      value.includes("bracers") ||
      value.includes("gauntlets") ||
      value.includes("maulers") ||
      value.includes("cestus") ||
      value.includes("fists") ||
      value.includes("primal") ||
      value.includes("bloodmoon") ||
      value.includes("prowling") ||
      compact.includes("axe") ||
      compact.includes("halberd") ||
      compact.includes("carrion") ||
      compact.includes("infernalscythe") ||
      compact.includes("bearpaws") ||
      compact.includes("realmbreaker") ||
      compact.includes("dagger") ||
      compact.includes("claw") ||
      compact.includes("deathgiver") ||
      compact.includes("bloodletter") ||
      compact.includes("demonfang") ||
      compact.includes("bridledfury") ||
      compact.includes("spear") ||
      compact.includes("glaive") ||
      compact.includes("pike") ||
      compact.includes("trinity") ||
      compact.includes("daybreaker") ||
      compact.includes("sword") ||
      compact.includes("dualscimitar") ||
      compact.includes("clarent") ||
      compact.includes("carving") ||
      compact.includes("galatine") ||
      compact.includes("kingmaker") ||
      compact.includes("glove") ||
      compact.includes("gloves") ||
      compact.includes("bracers") ||
      compact.includes("katar") ||
      compact.includes("gauntlet") ||
      compact.includes("gauntlets") ||
      compact.includes("maulers") ||
      compact.includes("cestus") ||
      compact.includes("fists") ||
      compact.includes("primal") ||
      compact.includes("bloodmoon") ||
      compact.includes("prowling")
  }
];

function normalizeWeaponKey(value: string): string {
  return value
    .trim()
    .replace(/^T\d+_/, "")
    .replace(/@.*$/, "")
    .replace(/Q\d+$/, "")
    .replace(/\b[4-8](?:\.[0-4])\b/g, " ")
    .replace(/\b(?:tier|t)\s*[4-8]\b/gi, " ")
    .replace(/^2H_/, "")
    .replace(/^MAIN_/, "")
    .replace(/^OFF_/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function compactWeaponKey(value: string): string {
  return normalizeWeaponKey(value).replace(/[^a-z0-9]/g, "");
}

function titleCaseWeapon(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveAlbionWeapon(input?: string): AlbionWeaponOption | null {
  if (!input) {
    return null;
  }

  const normalized = normalizeWeaponKey(input);
  const compact = compactWeaponKey(input);
  const directCatalogMatch =
    albionWeaponCatalog.find((entry) => normalizeWeaponKey(entry.name) === normalized) ??
    albionWeaponCatalog.find((entry) => normalizeWeaponKey(entry.id) === normalized) ??
    albionWeaponCatalog.find((entry) => entry.aliases?.some((alias) => normalizeWeaponKey(alias) === normalized)) ??
    albionWeaponCatalog.find((entry) => compactWeaponKey(entry.name) === compact) ??
    albionWeaponCatalog.find((entry) => compactWeaponKey(entry.id) === compact) ??
    albionWeaponCatalog.find((entry) => entry.aliases?.some((alias) => compactWeaponKey(alias) === compact));

  if (directCatalogMatch) {
    return directCatalogMatch;
  }

  const fuzzyCatalogMatch = albionWeaponCatalog.find((entry) => {
    const name = normalizeWeaponKey(entry.name);
    const id = normalizeWeaponKey(entry.id);
    const compactName = compactWeaponKey(entry.name);
    const compactId = compactWeaponKey(entry.id);
    const aliases = entry.aliases ?? [];
    return (
      normalized.includes(name) ||
      name.includes(normalized) ||
      normalized.includes(id) ||
      aliases.some((alias) => normalized.includes(normalizeWeaponKey(alias)) || normalizeWeaponKey(alias).includes(normalized)) ||
      compact.includes(compactName) ||
      compactName.includes(compact) ||
      compact.includes(compactId) ||
      compactId.includes(compact) ||
      aliases.some((alias) => compact.includes(compactWeaponKey(alias)) || compactWeaponKey(alias).includes(compact))
    );
  });

  if (fuzzyCatalogMatch) {
    return fuzzyCatalogMatch;
  }

  const inferredRole =
    weaponRoleKeywordMatchers.find((matcher) => matcher.test(normalized, compact))?.role ?? null;

  if (!inferredRole) {
    return null;
  }

  return {
    id: normalized.replace(/\s+/g, "-"),
    name: titleCaseWeapon(normalized),
    role: inferredRole
  };
}

export function resolveCatalogAlbionWeapon(input?: string): AlbionWeaponOption | null {
  if (!input) {
    return null;
  }

  const normalized = normalizeWeaponKey(input);
  const compact = compactWeaponKey(input);
  return (
    albionWeaponCatalog.find((entry) => normalizeWeaponKey(entry.name) === normalized) ??
    albionWeaponCatalog.find((entry) => normalizeWeaponKey(entry.id) === normalized) ??
    albionWeaponCatalog.find((entry) => entry.aliases?.some((alias) => normalizeWeaponKey(alias) === normalized)) ??
    albionWeaponCatalog.find((entry) => compactWeaponKey(entry.name) === compact) ??
    albionWeaponCatalog.find((entry) => compactWeaponKey(entry.id) === compact) ??
    albionWeaponCatalog.find((entry) => entry.aliases?.some((alias) => compactWeaponKey(alias) === compact)) ??
    albionWeaponCatalog.find((entry) => {
      const name = normalizeWeaponKey(entry.name);
      const id = normalizeWeaponKey(entry.id);
      const compactName = compactWeaponKey(entry.name);
      const compactId = compactWeaponKey(entry.id);
      const aliases = entry.aliases ?? [];
      return (
        normalized.includes(name) ||
        name.includes(normalized) ||
        normalized.includes(id) ||
        aliases.some((alias) => normalized.includes(normalizeWeaponKey(alias)) || normalizeWeaponKey(alias).includes(normalized)) ||
        compact.includes(compactName) ||
        compactName.includes(compact) ||
        compact.includes(compactId) ||
        compactId.includes(compact) ||
        aliases.some((alias) => compact.includes(compactWeaponKey(alias)) || compactWeaponKey(alias).includes(compact))
      );
    }) ??
    null
  );
}

function isAlbionItemType(value: string): boolean {
  return /^T\d+_/.test(value.trim());
}

export function getResolvedWeaponIconName(input?: string): string | null {
  const canonical = isAlbionItemType(input ?? "") ? toTier8WeaponIconName(input) : null;
  if (canonical) {
    return canonical;
  }

  const resolved = resolveAlbionWeapon(input);
  return resolved?.iconName ?? null;
}

export function resolveEffectiveBattleItem(input: {
  weaponName?: string;
  weaponIconName?: string;
  mountName?: string;
  mountIconName?: string;
}) {
  const mountSource = input.mountIconName ?? input.mountName;
  const mountResolved = resolveCatalogAlbionWeapon(mountSource);

  if (mountResolved?.role === "Battlemount") {
    return {
      kind: "mount" as const,
      resolved: mountResolved,
      displayName: input.mountName ?? mountResolved.name,
      iconName:
        input.mountIconName ??
        getResolvedWeaponIconName(input.mountName) ??
        mountResolved.iconName ??
        null
    };
  }

  const weaponSource = input.weaponIconName ?? input.weaponName;
  const weaponResolved = resolveAlbionWeapon(weaponSource);

  return {
    kind: "weapon" as const,
    resolved: weaponResolved,
    displayName: input.weaponName ?? weaponResolved?.name ?? null,
    iconName:
      input.weaponIconName ??
      getResolvedWeaponIconName(input.weaponName ?? input.weaponIconName) ??
      weaponResolved?.iconName ??
      null
  };
}

function isAlbionRenderItemType(value: string): boolean {
  return /^T\d+_.+@\d+$/i.test(value.trim()) || /^T\d+_.+$/i.test(value.trim());
}

function resolveCatalogIconName(input?: string): string | null {
  if (!input) {
    return null;
  }

  const resolved = resolveAlbionWeapon(input);
  return resolved?.iconName ?? null;
}

function resolveCatalogIconUrl(input?: string): string | null {
  if (!input) {
    return null;
  }

  const resolved = resolveAlbionWeapon(input);
  return resolved?.iconUrl ?? null;
}

function buildAlbionBbCdnItemUrl(name: string): string {
  return `https://cdn.albionbb.com/items/${encodeURIComponent(name)}.png`;
}

export function getWeaponIconUrl(name: string): string {
  const trimmed = name.trim().replace(/\.+$/, "");
  if (!trimmed) {
    return "";
  }

  const catalogIconUrl = resolveCatalogIconUrl(trimmed);
  if (catalogIconUrl) {
    return catalogIconUrl;
  }

  if (isAlbionRenderItemType(trimmed) || /^T\d+_.+@\d+Q\d+$/i.test(trimmed)) {
    return buildAlbionBbCdnItemUrl(trimmed);
  }

  const catalogIconName = resolveCatalogIconName(trimmed);
  if (catalogIconName) {
    return buildAlbionBbCdnItemUrl(catalogIconName);
  }

  return `https://render.albiononline.com/v1/item/${encodeURIComponent(trimmed)}.png?locale=en&size=128&quality=1`;
}

export function getItemIconUrl(name: string): string {
  return getWeaponIconUrl(name);
}

export function canonicalWeaponVariantKey(input?: string): string | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/@.*$/, "").replace(/^T\d+_/, "T8_");
}

export function toTier8WeaponIconName(input?: string): string | null {
  const canonical = canonicalWeaponVariantKey(input);
  if (!canonical) {
    return null;
  }

  return canonical;
}
