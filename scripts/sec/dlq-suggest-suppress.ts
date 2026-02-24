import fs from 'node:fs';
import path from 'node:path';

type Item = {
  kind: string;
  ticker?: string;
  mode?: string;
  ageDays?: number;
};

type DlqFile = {
  schemaVersion?: string;
  items: Item[];
};

type SuppressFile = {
  schemaVersion?: string;
  cash?: string[];
  debt?: string[];
  preferred?: string[];
};

function parseArgs(argv: string[]) {
  const args = {
    dlq: 'infra/dlq-extract.json',
    suppress: 'infra/sec-companyfacts-suppress.json',
    minAgeDays: 1500,
    minCount: 3,
    mode: '' as '' | 'cash' | 'debt' | 'preferred',
    apply: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dlq' && argv[i + 1]) args.dlq = argv[++i];
    else if (a === '--suppress' && argv[i + 1]) args.suppress = argv[++i];
    else if (a === '--minAgeDays' && argv[i + 1]) args.minAgeDays = Number(argv[++i]);
    else if (a === '--minCount' && argv[i + 1]) args.minCount = Number(argv[++i]);
    else if (a === '--mode' && argv[i + 1]) args.mode = argv[++i] as any;
    else if (a === '--apply') args.apply = true;
  }

  return args;
}

function modeFromKind(kind: string): '' | 'cash' | 'debt' | 'preferred' {
  if (kind.startsWith('cash_')) return 'cash';
  if (kind.startsWith('debt_')) return 'debt';
  if (kind.startsWith('preferred_')) return 'preferred';
  return '';
}

function uniqSorted(xs: string[]) {
  return [...new Set(xs.map((x) => x.toUpperCase()))].sort();
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const dlqPath = path.resolve(args.dlq);
  const dlq = JSON.parse(fs.readFileSync(dlqPath, 'utf8')) as DlqFile;

  const counts = new Map<string, number>();
  const maxAge = new Map<string, number>();

  for (const it of dlq.items ?? []) {
    if (!it.kind?.endsWith('_extract_stale')) continue;
    const m = modeFromKind(it.kind);
    if (!m) continue;
    if (args.mode && m !== args.mode) continue;

    const t = String(it.ticker || '').toUpperCase();
    if (!t) continue;

    const age = Number(it.ageDays ?? NaN);
    if (!Number.isFinite(age)) continue;

    const key = `${m}::${t}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    maxAge.set(key, Math.max(maxAge.get(key) ?? 0, age));
  }

  const candidates: Record<'cash' | 'debt' | 'preferred', string[]> = { cash: [], debt: [], preferred: [] };

  for (const [key, c] of counts.entries()) {
    const [m, t] = key.split('::') as any;
    const age = maxAge.get(key) ?? 0;
    if (c >= args.minCount && age >= args.minAgeDays) {
      candidates[m].push(t);
    }
  }

  for (const m of ['cash', 'debt', 'preferred'] as const) {
    candidates[m] = uniqSorted(candidates[m]);
  }

  const lines: string[] = [];
  lines.push(`# DLQ suppress suggestions`);
  lines.push(`minAgeDays=${args.minAgeDays} minCount=${args.minCount}${args.mode ? ` mode=${args.mode}` : ''}`);
  lines.push('');
  for (const m of ['cash', 'debt', 'preferred'] as const) {
    lines.push(`## ${m}`);
    if (!candidates[m].length) lines.push('(none)');
    else lines.push(candidates[m].join('\n'));
    lines.push('');
  }

  process.stdout.write(lines.join('\n'));

  if (!args.apply) return;

  const sPath = path.resolve(args.suppress);
  let s: SuppressFile = { schemaVersion: '0.1', cash: [], debt: [], preferred: [] };
  try {
    s = JSON.parse(fs.readFileSync(sPath, 'utf8'));
  } catch {}

  for (const m of ['cash', 'debt', 'preferred'] as const) {
    const existing = (s[m] ?? []).map((x) => x.toUpperCase());
    s[m] = uniqSorted([...existing, ...candidates[m]]);
  }

  fs.mkdirSync(path.dirname(sPath), { recursive: true });
  fs.writeFileSync(sPath, JSON.stringify(s, null, 2) + '\n');
}

main();
