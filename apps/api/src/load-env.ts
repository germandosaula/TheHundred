import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function loadEnvFile(filename = ".env"): void {
  const cwd = process.cwd();
  const paths: string[] = [];
  let current = cwd;

  while (true) {
    paths.unshift(resolve(current, filename));
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  const shellDefinedKeys = new Set(Object.keys(process.env));
  const loadedValues = new Map<string, string>();

  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }

    const source = readFileSync(path, "utf8");
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex < 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (!key || shellDefinedKeys.has(key)) {
        continue;
      }

      loadedValues.set(key, stripWrappingQuotes(value));
    }
  }

  for (const [key, value] of loadedValues) {
    process.env[key] = value;
  }
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
