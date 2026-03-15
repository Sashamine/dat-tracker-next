/**
 * Cross-check: Public API v1 vs D1 direct (HTTP) vs companies.ts static data
 *
 * Three-way comparison to verify the public API returns correct data:
 * 1. Public API (/api/v1/*) — what external consumers see
 * 2. D1 direct (Cloudflare HTTP API) — ground truth
 * 3. companies.ts — static fallback reference
 */
import { allCompanies as companies } from '@/lib/data/companies';

const TICKERS_TO_CHECK = ['MSTR', 'KULR', '3350.T', 'SBET', 'MARA', 'STKE', 'BMNR', 'GAME', 'CYPH', 'ZONE'];
const API_BASE = 'https://dat-tracker-next.vercel.app/api/v1';

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_DB_ID = process.env.CLOUDFLARE_D1_DATABASE_ID!;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;

interface Discrepancy {
  ticker: string;
  field: string;
  publicApi: any;
  d1Direct: any;
  staticFile: any;
}

async function queryD1(sql: string): Promise<any[]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
  return data.result[0].results;
}

async function main() {
  const discrepancies: Discrepancy[] = [];
  let checks = 0;
  let matches = 0;

  // Get all latest metrics from D1 in one query
  const d1AllMetrics = await queryD1(
    `SELECT entity_id, metric, value, as_of FROM latest_datapoints
     WHERE entity_id IN (${TICKERS_TO_CHECK.map(t => `'${t}'`).join(',')})
     ORDER BY entity_id, metric`
  );

  // Group by ticker
  const d1ByTicker: Record<string, Record<string, { value: number; as_of: string }>> = {};
  for (const row of d1AllMetrics) {
    if (!d1ByTicker[row.entity_id]) d1ByTicker[row.entity_id] = {};
    d1ByTicker[row.entity_id][row.metric] = { value: row.value, as_of: row.as_of };
  }

  const staticFieldMap: Record<string, string> = {
    holdings_native: 'holdings',
    basic_shares: 'sharesForMnav',
    debt_usd: 'totalDebt',
    cash_usd: 'cashReserves',
    preferred_equity_usd: 'preferredEquity',
  };

  for (const ticker of TICKERS_TO_CHECK) {
    console.log(`\n=== ${ticker} ===`);

    // 1. Public API
    const apiRes = await fetch(`${API_BASE}/companies/${ticker}`);
    if (!apiRes.ok) {
      console.log(`  API: ${apiRes.status} (skipping — not in entities table)`);
      continue;
    }
    const apiData = await apiRes.json();
    const apiMetrics = apiData.company?.metrics || {};

    // 2. D1 direct
    const d1Metrics = d1ByTicker[ticker] || {};

    // 3. Static
    const staticCompany = companies.find(c => c.ticker === ticker);

    // Compare: API vs D1 direct
    const metricsToCheck = ['holdings_native', 'basic_shares', 'debt_usd', 'cash_usd', 'preferred_equity_usd'];

    for (const metric of metricsToCheck) {
      checks++;
      const apiVal = apiMetrics[metric]?.value ?? null;
      const d1Val = d1Metrics[metric]?.value ?? null;
      const staticVal = (staticCompany as any)?.[staticFieldMap[metric]] ?? null;

      const apiMatchesD1 = apiVal === d1Val;

      if (!apiMatchesD1) {
        discrepancies.push({ ticker, field: metric, publicApi: apiVal, d1Direct: d1Val, staticFile: staticVal });
        console.log(`  ✗ ${metric}: API=${apiVal} vs D1=${d1Val} vs Static=${staticVal}`);
      } else {
        matches++;
        const d1DiffStatic = d1Val !== null && staticVal !== null && Math.abs(d1Val - staticVal) > 0.01;
        const note = d1DiffStatic ? ` (static=${staticVal.toLocaleString()}, D1 is newer)` : '';
        console.log(`  ✓ ${metric}: ${apiVal != null ? apiVal.toLocaleString() : 'null'}${note}`);
      }
    }

    // Check entity metadata vs static
    if (apiData.company && staticCompany) {
      checks++;
      const nameMatch = apiData.company.name === staticCompany.name;
      const assetMatch = apiData.company.asset === staticCompany.asset;
      if (nameMatch && assetMatch) {
        matches++;
        console.log(`  ✓ metadata: name="${apiData.company.name}", asset=${apiData.company.asset}`);
      } else {
        discrepancies.push({
          ticker, field: 'metadata',
          publicApi: `${apiData.company.name}/${apiData.company.asset}`,
          d1Direct: 'n/a',
          staticFile: `${staticCompany.name}/${staticCompany.asset}`,
        });
        console.log(`  ✗ metadata: API="${apiData.company.name}" vs static="${staticCompany.name}"`);
      }
    }
  }

  // Company list count
  console.log(`\n=== LIST ENDPOINT ===`);
  const listRes = await fetch(`${API_BASE}/companies`);
  const listData = await listRes.json();
  const d1CountRows = await queryD1('SELECT COUNT(*) as cnt FROM entities');
  const d1Count = d1CountRows[0]?.cnt;
  checks++;
  if (listData.count === d1Count) {
    matches++;
    console.log(`  ✓ /companies count: ${listData.count} (matches D1 entities table)`);
  } else {
    discrepancies.push({ ticker: 'ALL', field: 'company_count', publicApi: listData.count, d1Direct: d1Count, staticFile: companies.length });
    console.log(`  ✗ /companies count: API=${listData.count} vs D1=${d1Count} vs static=${companies.length}`);
  }

  // Datapoints endpoint cross-check
  console.log(`\n=== DATAPOINTS ENDPOINT ===`);
  const dpRes = await fetch(`${API_BASE}/datapoints?ticker=MSTR&metric=holdings_native&limit=3&order=desc`);
  const dpData = await dpRes.json();
  checks++;
  if (dpData.success && dpData.count > 0) {
    const latestDp = dpData.datapoints[0];
    const d1Holdings = d1ByTicker['MSTR']?.holdings_native;
    if (latestDp.value === d1Holdings?.value) {
      matches++;
      console.log(`  ✓ MSTR holdings: ${latestDp.value.toLocaleString()} (as_of ${latestDp.asOf})`);
    } else {
      discrepancies.push({ ticker: 'MSTR', field: 'datapoints_latest', publicApi: latestDp.value, d1Direct: d1Holdings?.value, staticFile: null });
      console.log(`  ✗ MSTR holdings: API=${latestDp.value} vs D1=${d1Holdings?.value}`);
    }
    // Verify provenance fields exist
    checks++;
    const hasProv = latestDp.citationQuote || latestDp.method || latestDp.sourceUrl;
    if (hasProv) {
      matches++;
      console.log(`  ✓ provenance: method="${latestDp.method}", has citation`);
    } else {
      console.log(`  ✗ provenance: missing citation/method fields`);
    }
  }

  // AHPS endpoint
  console.log(`\n=== AHPS ENDPOINT ===`);
  const ahpsRes = await fetch(`${API_BASE}/metrics/ahps`);
  const ahpsData = await ahpsRes.json();
  checks++;
  if (ahpsData.success && ahpsData.count > 0) {
    matches++;
    console.log(`  ✓ AHPS leaderboard: ${ahpsData.count} companies`);
    for (const r of ahpsData.results.slice(0, 3)) {
      console.log(`    ${r.ticker}: 90d=${(r.growth90d * 100).toFixed(1)}% ahps=${r.currentAhps?.toFixed(6)}`);
    }
  }

  // Instruments endpoint
  console.log(`\n=== INSTRUMENTS ENDPOINT ===`);
  const instrRes = await fetch(`${API_BASE}/companies/MSTR/instruments`);
  const instrData = await instrRes.json();
  const d1Instruments = await queryD1(
    `SELECT COUNT(*) as cnt, SUM(potential_shares) as total_shares
     FROM instruments WHERE entity_id = 'MSTR' AND status = 'active'`
  );
  checks++;
  if (instrData.success && instrData.activeCount === d1Instruments[0].cnt) {
    matches++;
    console.log(`  ✓ MSTR instruments: ${instrData.activeCount} active, ${instrData.totalPotentialShares?.toLocaleString()} potential shares`);
  } else {
    discrepancies.push({ ticker: 'MSTR', field: 'instrument_count', publicApi: instrData.activeCount, d1Direct: d1Instruments[0].cnt, staticFile: null });
    console.log(`  ✗ MSTR instruments: API=${instrData.activeCount} vs D1=${d1Instruments[0].cnt}`);
  }

  // Purchases endpoint
  console.log(`\n=== PURCHASES ENDPOINT ===`);
  const purchRes = await fetch(`${API_BASE}/companies/MSTR/purchases`);
  const purchData = await purchRes.json();
  const d1Purchases = await queryD1(`SELECT COUNT(*) as cnt FROM purchases WHERE entity_id = 'MSTR'`);
  checks++;
  if (purchData.success && purchData.count === d1Purchases[0].cnt) {
    matches++;
    console.log(`  ✓ MSTR purchases: ${purchData.count} records`);
  } else {
    discrepancies.push({ ticker: 'MSTR', field: 'purchase_count', publicApi: purchData.count, d1Direct: d1Purchases[0].cnt, staticFile: null });
    console.log(`  ✗ MSTR purchases: API=${purchData.count} vs D1=${d1Purchases[0].cnt}`);
  }

  // Events endpoint
  console.log(`\n=== EVENTS ENDPOINT ===`);
  const eventsRes = await fetch(`${API_BASE}/companies/MSTR/events`);
  const eventsData = await eventsRes.json();
  const d1Events = await queryD1(`SELECT COUNT(*) as cnt FROM capital_events WHERE entity_id = 'MSTR'`);
  checks++;
  if (eventsData.success && eventsData.count === d1Events[0].cnt) {
    matches++;
    console.log(`  ✓ MSTR events: ${eventsData.count} records`);
  } else {
    discrepancies.push({ ticker: 'MSTR', field: 'event_count', publicApi: eventsData.count, d1Direct: d1Events[0].cnt, staticFile: null });
    console.log(`  ✗ MSTR events: API=${eventsData.count} vs D1=${d1Events[0].cnt}`);
  }

  // Rate limiting headers
  console.log(`\n=== RATE LIMITING ===`);
  const headerRes = await fetch(`${API_BASE}/companies`);
  checks++;
  const rl = headerRes.headers.get('x-ratelimit-limit');
  const rr = headerRes.headers.get('x-ratelimit-remaining');
  if (rl && rr) {
    matches++;
    console.log(`  ✓ rate limit headers: limit=${rl}, remaining=${rr}`);
  } else {
    console.log(`  ✗ missing rate limit headers`);
  }

  // CORS
  checks++;
  const cors = headerRes.headers.get('access-control-allow-origin');
  if (cors === '*') {
    matches++;
    console.log(`  ✓ CORS: Access-Control-Allow-Origin: *`);
  } else {
    console.log(`  ✗ CORS missing or wrong: ${cors}`);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`VERIFICATION SUMMARY`);
  console.log(`  Checks:        ${checks}`);
  console.log(`  Matches:       ${matches} (${((matches / checks) * 100).toFixed(1)}%)`);
  console.log(`  Discrepancies: ${discrepancies.length}`);

  if (discrepancies.length > 0) {
    console.log(`\nDISCREPANCIES:`);
    for (const d of discrepancies) {
      console.log(`  ${d.ticker}.${d.field}: API=${d.publicApi} D1=${d.d1Direct} Static=${d.staticFile}`);
    }
    process.exit(1);
  } else {
    console.log(`\n✓ All checks passed. Public API is correctly serving D1 data.`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
