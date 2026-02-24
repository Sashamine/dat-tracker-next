import fs from 'node:fs';
import path from 'node:path';

type DlqExtractItem = {
  kind: string;
  ticker?: string;
  mode?: string;
  at?: string;
  note?: string;
  [k: string]: any;
};

type DlqExtractFile = {
  schemaVersion?: string;
  items: DlqExtractItem[];
};

function parseArgs(argv: string[]) {
  const args = { file: 'infra/dlq-extract.json', out: '', includeNoise: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file' && argv[i + 1]) {
      args.file = argv[++i];
    } else if (a === '--out' && argv[i + 1]) {
      args.out = argv[++i];
    } else if (a === '--include-noise') {
      args.includeNoise = true;
    }
  }
  return args;
}

function inc(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function sortEntriesDesc(map: Map<string, number>) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function mdTable(rows: Array<[string, number]>, headers: [string, string]) {
  const lines = [
    `| ${headers[0]} | ${headers[1]} |`,
    `|---|---:|`,
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
  ];
  return lines.join('\n');
}

function mdTable3(rows: Array<[string, string, number]>, headers: [string, string, string]) {
  const lines = [
    `| ${headers[0]} | ${headers[1]} | ${headers[2]} |`,
    `|---|---|---:|`,
    ...rows.map(([a, b, c]) => `| ${a} | ${b} | ${c} |`),
  ];
  return lines.join('\n');
}

function main() {
  const { file, out, includeNoise } = parseArgs(process.argv.slice(2));

  const abs = path.resolve(file);
  const raw = fs.readFileSync(abs, 'utf8');
  const j = JSON.parse(raw) as DlqExtractFile;
  const rawItems = j.items ?? [];
  const noiseKinds = new Set([
    'cash_extract_conflict',
    'debt_extract_conflict',
    'preferred_extract_conflict',
  ]);
  const items = includeNoise ? rawItems : rawItems.filter((it) => !noiseKinds.has(it.kind));

  const byKind = new Map<string, number>();
  const byMode = new Map<string, number>();
  const byTicker = new Map<string, number>();
  const byKindMode = new Map<string, number>();

  const staleDetails: Array<{ kind: string; mode: string; ticker: string; ageDays: number; at?: string; note?: string }> = [];

  for (const it of items) {
    const kind = it.kind ?? 'unknown';
    const mode = it.mode ?? 'unknown';
    const ticker = it.ticker ?? 'unknown';

    inc(byKind, kind);
    inc(byMode, mode);
    inc(byTicker, ticker);
    inc(byKindMode, `${kind} · ${mode}`);

    if (kind.endsWith('_extract_stale')) {
      const ageDays = Math.round(Number(it.ageDays ?? NaN));
      if (Number.isFinite(ageDays)) {
        staleDetails.push({ kind, mode, ticker, ageDays, at: it.at, note: it.note });
      }
    }
  }

  const topKinds = sortEntriesDesc(byKind).slice(0, 25);
  const topKindModes = sortEntriesDesc(byKindMode).slice(0, 25);
  const topTickers = sortEntriesDesc(byTicker)
    .filter(([t]) => t !== 'unknown')
    .slice(0, 25);

  const now = new Date().toISOString();

  // De-dupe stale: take max ageDays per (kind,ticker)
  const staleMax = new Map<string, { kind: string; ticker: string; ageDays: number }>();
  for (const x of staleDetails) {
    if (x.ticker === 'unknown') continue;
    const key = `${x.kind}::${x.ticker}`;
    const prev = staleMax.get(key);
    if (!prev || x.ageDays > prev.ageDays) staleMax.set(key, { kind: x.kind, ticker: x.ticker, ageDays: x.ageDays });
  }

  const staleTop = [...staleMax.values()]
    .sort((a, b) => b.ageDays - a.ageDays || a.ticker.localeCompare(b.ticker))
    .slice(0, 25)
    .map((x) => [x.kind, x.ticker, x.ageDays] as [string, string, number]);

  const md = [
    `# DLQ Extract Report`,
    ``,
    `Generated: ${now}`,
    `Source: \`${file}\``,
    `Total items: **${items.length}**${includeNoise ? '' : ` (excluding noise kinds: ${[...noiseKinds].join(', ')})`}`, 
    ``,
    `## By kind`,
    mdTable(topKinds, ['kind', 'count']),
    ``,
    `## By kind + mode`,
    mdTable(topKindModes, ['kind · mode', 'count']),
    ``,
    `## Stale details (top by ageDays)`,
    staleTop.length ? mdTable3(staleTop, ['kind', 'ticker', 'ageDays']) : '_none_',
    ``,
    `## Top tickers`,
    topTickers.length ? mdTable(topTickers, ['ticker', 'count']) : '_none_',
    ``,
  ].join('\n');

  if (out) {
    const outAbs = path.resolve(out);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, md);
  }

  // Always print to stdout
  process.stdout.write(md + '\n');
}

main();
