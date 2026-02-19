#!/usr/bin/env tsx

import fs from "node:fs";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function isObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function formatPath(pathParts: (string | number)[]): string {
  return pathParts
    .map((p) => (typeof p === "number" ? `[${p}]` : /^[A-Za-z_][A-Za-z0-9_]*$/.test(p) ? `.${p}` : `[${JSON.stringify(p)}]`))
    .join("")
    .replace(/^\./, "");
}

function diff(a: Json, b: Json, pathParts: (string | number)[] = [], out: string[] = []): string[] {
  if (a === b) return out;

  const aIsArr = Array.isArray(a);
  const bIsArr = Array.isArray(b);

  if (aIsArr && bIsArr) {
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      if (i >= a.length) {
        out.push(`${formatPath([...pathParts, i])} added: ${JSON.stringify((b as any)[i])}`);
      } else if (i >= b.length) {
        out.push(`${formatPath([...pathParts, i])} removed: ${JSON.stringify((a as any)[i])}`);
      } else {
        diff((a as any)[i], (b as any)[i], [...pathParts, i], out);
      }
    }
    return out;
  }

  if (isObject(a) && isObject(b)) {
    const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
    const sorted = [...keys].sort();
    for (const k of sorted) {
      if (!(k in (a as any))) {
        out.push(`${formatPath([...pathParts, k])} added: ${JSON.stringify((b as any)[k])}`);
      } else if (!(k in (b as any))) {
        out.push(`${formatPath([...pathParts, k])} removed: ${JSON.stringify((a as any)[k])}`);
      } else {
        diff((a as any)[k], (b as any)[k], [...pathParts, k], out);
      }
    }
    return out;
  }

  out.push(`${formatPath(pathParts)} changed from ${JSON.stringify(a)} to ${JSON.stringify(b)}`);
  return out;
}

function main() {
  const [fileA, fileB] = process.argv.slice(2);
  if (!fileA || !fileB) {
    console.error("Usage: npm run diff-snapshot -- <snapshotA.json> <snapshotB.json>");
    process.exit(2);
  }

  const a = JSON.parse(fs.readFileSync(fileA, "utf8")) as Json;
  const b = JSON.parse(fs.readFileSync(fileB, "utf8")) as Json;

  const differences = diff(a, b);
  if (differences.length === 0) {
    console.log("Snapshots are identical.");
    process.exit(0);
  }

  console.error(`Found ${differences.length} difference(s):`);
  for (const line of differences) console.error(line);
  process.exit(1);
}

main();
