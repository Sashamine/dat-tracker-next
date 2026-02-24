import fs from 'node:fs';
import path from 'node:path';

type Item = {
  kind: string;
  ticker?: string;
  mode?: string;
  at?: string;
  [k: string]: any;
};

type DlqFile = {
  schemaVersion?: string;
  items: Item[];
};

function parseArgs(argv: string[]) {
  const args = {
    file: 'infra/dlq-extract.json',
    maxDays: 30,
    maxPerKey: 3,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file' && argv[i + 1]) args.file = argv[++i];
    else if (a === '--maxDays' && argv[i + 1]) args.maxDays = Number(argv[++i]);
    else if (a === '--maxPerKey' && argv[i + 1]) args.maxPerKey = Number(argv[++i]);
    else if (a === '--dry-run') args.dryRun = true;
  }

  return args;
}

function msDays(d: number) {
  return d * 86400000;
}

function keyOf(it: Item) {
  return `${it.kind}::${String(it.mode ?? 'unknown')}::${String(it.ticker ?? 'unknown')}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const p = path.resolve(args.file);
  const raw = fs.readFileSync(p, 'utf8');
  const j = JSON.parse(raw) as DlqFile;
  const items = (j.items ?? []).slice();

  const now = Date.now();
  const cutoff = now - msDays(args.maxDays);

  // Filter by time window (requires valid `at`)
  const recent = items.filter((it) => {
    const t = it.at ? Date.parse(it.at) : NaN;
    if (!Number.isFinite(t)) return true; // keep if no timestamp
    return t >= cutoff;
  });

  // For each (kind,mode,ticker) keep only the N most recent
  const byKey = new Map<string, Item[]>();
  for (const it of recent) {
    const k = keyOf(it);
    const arr = byKey.get(k) ?? [];
    arr.push(it);
    byKey.set(k, arr);
  }

  const pruned: Item[] = [];
  for (const arr of byKey.values()) {
    arr.sort((a, b) => (Date.parse(b.at ?? '') || 0) - (Date.parse(a.at ?? '') || 0));
    pruned.push(...arr.slice(0, args.maxPerKey));
  }

  // Stable ordering
  pruned.sort((a, b) => (Date.parse(b.at ?? '') || 0) - (Date.parse(a.at ?? '') || 0));

  const before = items.length;
  const after = pruned.length;
  process.stdout.write(
    `dlq-prune: ${args.file}: before=${before} after=${after} maxDays=${args.maxDays} maxPerKey=${args.maxPerKey} dryRun=${args.dryRun}\n`,
  );

  if (args.dryRun) return;

  const out: DlqFile = { schemaVersion: j.schemaVersion ?? '0.1', items: pruned };
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
}

main();
