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
  const args = { file: 'infra/dlq-extract.json', out: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file' && argv[i + 1]) {
      args.file = argv[++i];
    } else if (a === '--out' && argv[i + 1]) {
      args.out = argv[++i];
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

function main() {
  const { file, out } = parseArgs(process.argv.slice(2));

  const abs = path.resolve(file);
  const raw = fs.readFileSync(abs, 'utf8');
  const j = JSON.parse(raw) as DlqExtractFile;
  const items = j.items ?? [];

  const byKind = new Map<string, number>();
  const byMode = new Map<string, number>();
  const byTicker = new Map<string, number>();
  const byKindMode = new Map<string, number>();

  for (const it of items) {
    const kind = it.kind ?? 'unknown';
    const mode = it.mode ?? 'unknown';
    const ticker = it.ticker ?? 'unknown';

    inc(byKind, kind);
    inc(byMode, mode);
    inc(byTicker, ticker);
    inc(byKindMode, `${kind} · ${mode}`);
  }

  const topKinds = sortEntriesDesc(byKind).slice(0, 25);
  const topKindModes = sortEntriesDesc(byKindMode).slice(0, 25);
  const topTickers = sortEntriesDesc(byTicker)
    .filter(([t]) => t !== 'unknown')
    .slice(0, 25);

  const now = new Date().toISOString();
  const md = [
    `# DLQ Extract Report`,
    ``,
    `Generated: ${now}`,
    `Source: \`${file}\``,
    `Total items: **${items.length}**`,
    ``,
    `## By kind`,
    mdTable(topKinds, ['kind', 'count']),
    ``,
    `## By kind + mode`,
    mdTable(topKindModes, ['kind · mode', 'count']),
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
