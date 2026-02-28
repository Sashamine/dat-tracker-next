import { D1Client } from '@/lib/d1';
import { TICKER_TO_CIK } from '@/lib/sec/sec-edgar';

type Row = { ticker: string };

async function main() {
  const write = process.argv.includes('--write');
  const d1 = D1Client.fromEnv();

  const missing = await d1.query<Row>(
    `
    SELECT DISTINCT ticker
    FROM artifacts
    WHERE source_type = 'sec_filing'
      AND (source_url IS NULL OR source_url = '')
      AND (cik IS NULL OR cik = '')
      AND ticker IS NOT NULL AND ticker != ''
    ORDER BY ticker;
    `.trim()
  );

  const tickers = missing.results.map((r) => r.ticker.toUpperCase());

  let canMap = 0;
  let cannotMap: string[] = [];
  let totalUpdated = 0;

  for (const t of tickers) {
    const cik = TICKER_TO_CIK[t];
    if (!cik) {
      cannotMap.push(t);
      continue;
    }
    canMap++;

    if (write) {
      const res = await d1.query(
        `
        UPDATE artifacts
        SET cik = ?
        WHERE source_type = 'sec_filing'
          AND (source_url IS NULL OR source_url = '')
          AND (cik IS NULL OR cik = '')
          AND ticker = ?;
        `.trim(),
        [cik, t]
      );

      // D1 doesn't reliably return affected row counts; approximate by re-querying per ticker is expensive.
      // We'll just track tickers updated and do a global count check after.
      void res;
      totalUpdated++;
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: write ? 'write' : 'dry-run',
        distinctTickersMissingCik: tickers.length,
        tickersWithCikMapping: canMap,
        tickersMissingCikMapping: cannotMap.length,
        missingMappingSample: cannotMap.slice(0, 50),
        tickersUpdated: write ? totalUpdated : 0,
      },
      null,
      2
    )
  );

  if (write) {
    const after = await d1.query<{ remaining: number }>(
      `
      SELECT COUNT(*) AS remaining
      FROM artifacts
      WHERE source_type = 'sec_filing'
        AND (source_url IS NULL OR source_url = '')
        AND (cik IS NULL OR cik = '')
        AND ticker IS NOT NULL AND ticker != '';
      `.trim()
    );

    console.log(JSON.stringify({ remainingRowsWithNullCikButTickerPresent: after.results[0]?.remaining }, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
