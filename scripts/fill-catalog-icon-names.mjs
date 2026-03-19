#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const CATALOG_PATH = path.resolve("apps/web/app/app/comps/catalog.ts");
const ITEMS_DUMP_URL =
  "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json";

const shouldWrite = process.argv.includes("--write");
const includeMounts = process.argv.includes("--include-mounts");

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripTierPrefix(value) {
  return value
    .replace(/^(novice|adept|expert|master|grandmaster|elder)[’']s\s+/i, "")
    .replace(/^(novice|adept|expert|master|grandmaster|elder)\s+/i, "");
}

function stripHandPrefix(value) {
  return value.replace(/^(?:one handed|two handed|1h|2h)\s+/i, "");
}

function buildNameKeys(value) {
  const keys = new Set();
  const raw = value.trim();
  if (!raw) {
    return keys;
  }
  keys.add(normalize(raw));
  const noTier = stripTierPrefix(raw);
  keys.add(normalize(noTier));
  const noHand = stripHandPrefix(noTier);
  keys.add(normalize(noHand));
  const compact = normalize(noHand).replace(/\b(staff|sword|mace|bow|hammer|dagger|crossbow|spear|axe)\b$/, "").trim();
  if (compact) {
    keys.add(compact);
  }
  const dualToDouble = noHand.replace(/\bdual\b/gi, "double");
  if (dualToDouble !== noHand) {
    keys.add(normalize(dualToDouble));
  }
  const doubleToDual = noHand.replace(/\bdouble\b/gi, "dual");
  if (doubleToDual !== noHand) {
    keys.add(normalize(doubleToDual));
  }
  return new Set([...keys].filter(Boolean));
}

function splitObjectBlocks(arrayText, baseOffset) {
  const blocks = [];
  let i = 0;
  while (i < arrayText.length) {
    if (arrayText[i] !== "{") {
      i += 1;
      continue;
    }
    const start = i;
    let depth = 0;
    let inString = false;
    let quote = "";
    let escaped = false;
    for (; i < arrayText.length; i += 1) {
      const ch = arrayText[i];
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === quote) {
          inString = false;
          quote = "";
        }
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inString = true;
        quote = ch;
        continue;
      }
      if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          blocks.push({
            start: baseOffset + start,
            end: baseOffset + i + 1,
            text: arrayText.slice(start, i + 1),
          });
          break;
        }
      }
    }
    i += 1;
  }
  return blocks;
}

function parseCatalogEntry(blockText) {
  const idMatch = blockText.match(/\bid:\s*"([^"]+)"/);
  const nameMatch = blockText.match(/\bname:\s*"([^"]+)"/);
  const roleMatch = blockText.match(/\brole:\s*"([^"]+)"/);
  if (!idMatch || !nameMatch || !roleMatch) {
    return null;
  }
  return {
    id: idMatch[1],
    name: nameMatch[1],
    role: roleMatch[1],
    hasIconName: /\biconName\s*:/.test(blockText),
    hasIconUrl: /\biconUrl\s*:/.test(blockText),
  };
}

function toCanonicalT8(uniqueName) {
  const upper = uniqueName.toUpperCase().trim();
  if (!upper) {
    return null;
  }
  const withoutQuality = upper.replace(/_Q\d+$/i, "").replace(/_LEVEL\d+$/i, "");
  const withoutEnchant = withoutQuality.replace(/@.*$/, "");
  if (!/^T\d+_/.test(withoutEnchant)) {
    return null;
  }
  return withoutEnchant.replace(/^T\d+_/, "T8_");
}

function isWeaponUniqueName(uniqueName) {
  const upper = uniqueName.toUpperCase();
  return upper.includes("_MAIN_") || upper.includes("_2H_");
}

function isMountUniqueName(uniqueName) {
  const upper = uniqueName.toUpperCase();
  return upper.includes("_MOUNT") || upper.startsWith("UNIQUE_MOUNT_");
}

function pickLocalizedName(entry) {
  const names =
    entry && typeof entry.LocalizedNames === "object" && entry.LocalizedNames
      ? entry.LocalizedNames
      : {};
  return String(names["EN-US"] || names["ES-ES"] || entry.UniqueName || "").trim();
}

function buildCandidateIndex(items) {
  const index = new Map();
  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const uniqueName = String(item.UniqueName || "").trim();
    if (!uniqueName || uniqueName.toUpperCase().includes("_ARTEFACT_")) {
      continue;
    }
    const localizedName = pickLocalizedName(item);
    if (!localizedName) {
      continue;
    }
    const nameKeys = buildNameKeys(localizedName);
    if (nameKeys.size === 0) {
      continue;
    }
    const candidate = {
      iconName: toCanonicalT8(uniqueName),
      normalizedName: normalize(localizedName),
      uniqueName: uniqueName.toUpperCase(),
      isWeapon: isWeaponUniqueName(uniqueName),
      isMount: isMountUniqueName(uniqueName),
    };
    if (!candidate.iconName && !candidate.isMount) {
      continue;
    }
    for (const key of nameKeys) {
      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key).push(candidate);
    }
  }

  for (const [key, candidates] of index.entries()) {
    const deduped = new Map();
    for (const candidate of candidates) {
      const dedupeKey = candidate.iconName || candidate.uniqueName;
      if (!deduped.has(dedupeKey)) {
        deduped.set(dedupeKey, candidate);
      }
    }
    index.set(key, [...deduped.values()]);
  }

  return index;
}

function chooseCandidate(entry, candidates) {
  const relevant = candidates.filter((candidate) => {
    if (entry.role === "Battlemount") {
      return includeMounts ? candidate.isMount : false;
    }
    return candidate.isWeapon;
  });

  if (relevant.length === 1) {
    return { pick: relevant[0], reason: "single" };
  }

  const familyHints = [
    "crossbow",
    "mace",
    "dagger",
    "sword",
    "spear",
    "hammer",
    "axe",
    "bow",
    "staff",
    "knuckles",
    "scythe",
    "rapier",
    "cleaver",
    "harpoon",
  ];
  const family = familyHints.find((hint) => entry.id.includes(hint));
  if (family) {
    const familyFiltered = relevant.filter((candidate) => candidate.iconName?.toLowerCase().includes(family));
    if (familyFiltered.length === 1) {
      return { pick: familyFiltered[0], reason: "family-match" };
    }
    if (familyFiltered.length > 0) {
      return { pick: null, reason: "ambiguous" };
    }
  }

  const idCompact = entry.id.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const narrowedById = relevant.filter((candidate) =>
    candidate.iconName?.toLowerCase().includes(idCompact)
  );
  if (narrowedById.length === 1) {
    return { pick: narrowedById[0], reason: "id-match" };
  }

  return { pick: null, reason: relevant.length === 0 ? "no-candidate" : "ambiguous" };
}

function applyIconName(blockText, iconName) {
  const closingIndex = blockText.lastIndexOf("}");
  if (closingIndex < 0) {
    return blockText;
  }
  const beforeClosing = blockText.slice(0, closingIndex);
  if (/\n/.test(blockText)) {
    const indentMatch = beforeClosing.match(/\n(\s*)[^\n]*$/);
    const indent = indentMatch ? indentMatch[1] : "  ";
    const needsComma = !beforeClosing.trimEnd().endsWith(",");
    const insertion = `${needsComma ? "," : ""}\n${indent}iconName: "${iconName}"\n`;
    return `${beforeClosing}${insertion}}`;
  }
  const compact = beforeClosing.trimEnd();
  const needsComma = !compact.endsWith(",");
  return `${beforeClosing}${needsComma ? ", " : " "}iconName: "${iconName}"}`;
}

async function main() {
  const catalogText = await fs.readFile(CATALOG_PATH, "utf8");
  const arrayStartToken = "export const albionWeaponCatalog: AlbionWeaponOption[] = [";
  const start = catalogText.indexOf(arrayStartToken);
  if (start < 0) {
    throw new Error("No se encontro albionWeaponCatalog en catalog.ts");
  }
  const arrayStart = catalogText.indexOf("[", start);
  const arrayEnd = catalogText.indexOf("];", arrayStart);
  if (arrayStart < 0 || arrayEnd < 0) {
    throw new Error("No se pudo localizar el array de albionWeaponCatalog");
  }
  const arrayText = catalogText.slice(arrayStart + 1, arrayEnd);
  const blocks = splitObjectBlocks(arrayText, arrayStart + 1);

  const response = await fetch(ITEMS_DUMP_URL);
  if (!response.ok) {
    throw new Error(`No se pudo descargar items.json (${response.status})`);
  }
  const items = await response.json();
  if (!Array.isArray(items)) {
    throw new Error("items.json no devolvio un array valido");
  }
  const index = buildCandidateIndex(items);

  const replacements = [];
  const unresolved = [];
  let scanned = 0;

  for (const block of blocks) {
    const entry = parseCatalogEntry(block.text);
    if (!entry) {
      continue;
    }
    scanned += 1;
    if (entry.hasIconName) {
      continue;
    }
    if (entry.role === "Battlemount" && !includeMounts) {
      continue;
    }
    const nameKeys = [...buildNameKeys(entry.name)];
    const candidates = [];
    for (const key of nameKeys) {
      const byKey = index.get(key) ?? [];
      for (const candidate of byKey) {
        if (!candidates.some((entryCandidate) => entryCandidate.iconName === candidate.iconName)) {
          candidates.push(candidate);
        }
      }
    }
    const choice = chooseCandidate(entry, candidates);
    if (!choice.pick?.iconName) {
      unresolved.push({
        id: entry.id,
        name: entry.name,
        role: entry.role,
        reason: choice.reason,
        candidates: candidates.slice(0, 5).map((candidate) => candidate.iconName || candidate.uniqueName),
      });
      continue;
    }
    const nextText = applyIconName(block.text, choice.pick.iconName);
    replacements.push({
      ...block,
      nextText,
      id: entry.id,
      iconName: choice.pick.iconName,
      reason: choice.reason,
      hadIconUrl: entry.hasIconUrl,
    });
  }

  let nextCatalogText = catalogText;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    nextCatalogText =
      nextCatalogText.slice(0, replacement.start) +
      replacement.nextText +
      nextCatalogText.slice(replacement.end);
  }

  if (shouldWrite) {
    await fs.writeFile(CATALOG_PATH, nextCatalogText, "utf8");
  }

  console.log(JSON.stringify({
    mode: shouldWrite ? "write" : "dry-run",
    includeMounts,
    scanned,
    updated: replacements.length,
    unresolved: unresolved.length,
    updatedSample: replacements.slice(0, 20).map((entry) => ({
      id: entry.id,
      iconName: entry.iconName,
      reason: entry.reason,
      hadIconUrl: entry.hadIconUrl,
    })),
    unresolvedSample: unresolved.slice(0, 40),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
