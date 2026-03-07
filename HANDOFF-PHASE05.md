# Phase 0.5 — Product Framing Handoff

> For the UI agent (GPT 5.4). Contains everything needed to implement
> Phase 0.5 without touching the data pipeline.

**Last updated:** 2026-03-06

---

## The Goal

Reframe the homepage from "who holds the most crypto" to **"who is best at growing crypto per share."**

A first-time visitor should understand the DAT thesis in ~3 seconds:
> These companies raise capital to buy crypto. The best ones grow their crypto-per-share faster.

---

## What Is HPS?

**Holdings Per Share (HPS)** = `holdings / sharesForMnav`

- `holdings`: crypto units held (e.g., 712,647 BTC for MSTR)
- `sharesForMnav`: basic shares outstanding used for mNAV calculation

**HPS Growth** = percentage change in HPS over a period (90 days default).

A company can double its treasury, but if it tripled its share count, HPS went *down* — shareholders got diluted. HPS Growth reveals who actually creates value per share.

---

## Data Availability

| Metric | Source | Coverage |
|--------|--------|----------|
| `holdings` | `companies.ts` field | All 54 companies |
| `sharesForMnav` | `companies.ts` field | 55 companies |
| HPS (current) | Derived: `holdings / sharesForMnav` | 55 companies |
| HPS history | D1 API: holdings + shares time series | 54 companies with 90+ days |
| mNAV | Already computed in UI | All companies with sharesForMnav |

**No new data pipeline needed.** Everything required already exists.

---

## Deliverable 0.5.1 — Homepage Leaderboard Pivot

### Current Columns
`# | Company | Asset | mNAV | mNAV 24h | Leverage | Price | 24h% | Volume | Market Cap | Crypto | Other`

### Target Columns
`# | Company | Asset | HPS Growth (90D) | mNAV | Treasury Value | Leverage`

### Default Sort
Change from treasury size (holdingsValue desc) to **HPS Growth (90D) desc**.

### Computing HPS Growth (90D)

The function already exists in `src/lib/utils.ts`:

```typescript
// src/lib/utils.ts
export function calculateHoldingsGrowth(history: HoldingsSnapshot[]): {
  totalGrowth: number;      // % change over full period
  annualizedGrowth: number; // annualized %
  latestHoldingsPerShare: number;
  oldestHoldingsPerShare: number;
  periodYears: number;
} | null
```

To get 90-day HPS growth for a company:

1. Fetch holdings history from D1:
   ```
   GET /api/d1/history?ticker=MSTR&metric=holdings&order=asc
   GET /api/d1/history?ticker=MSTR&metric=shares_outstanding&order=asc
   ```

2. The `useHoldingsHistoryD1(ticker)` hook already does this and returns snapshots with `holdingsPerShare` computed.

3. Filter to last 90 days, pass to `calculateHoldingsGrowth()`.

For the leaderboard, you'll need to batch-fetch HPS growth for all companies. Two approaches:
- **Client-side**: Use existing hooks per-company (may be slow for 54 companies)
- **Server-side** (recommended): Create a new API route `/api/hps-growth` that computes 90D HPS growth for all companies in one D1 query

### Sector Summary Banner

Add a banner above the table:

```
Median HPS Growth: +X.X% | Median mNAV: X.Xx | Companies Growing HPS: XX/55
```

Compute from the same data used for the table.

### mNAV Color Context

Color mNAV relative to **sector median** (not absolute):
- `< 0.9x median` → green (undervalued relative to peers)
- `0.9x - 1.3x median` → neutral
- `> 1.3x median` → red (expensive relative to peers)

---

## Deliverable 0.5.2 — Dilution vs Accretion Chart (Company Page)

### Concept
Dual-axis chart showing BTC/share (line) and shares outstanding (bar) over time.

**What it reveals at a glance:**
- Good managers: HPS trending up, shares relatively stable
- Bad managers: shares exploding, HPS flat or declining

This is the "Moneyball chart" — the signature visualization.

### Data Source

The `HoldingsPerShareChart` component already exists at `src/components/holdings-per-share-chart.tsx`. It shows HPS over time as a line chart using `lightweight-charts`.

**To add the dual-axis:**
1. The history data already includes both `holdingsPerShare` and `sharesOutstanding` per snapshot
2. Add a bar/area series for shares outstanding on the right Y-axis
3. Keep the HPS line on the left Y-axis

### Existing Component

```typescript
// src/components/holdings-per-share-chart.tsx
interface HoldingsPerShareChartProps {
  ticker: string;
  asset: string;
  currentHoldingsPerShare: number | null;
  className?: string;
  currentProvenance?: { holdings: number; shares: number; sharesSource: "verified" | "estimated"; };
}
```

This already fetches history via `useHoldingsHistoryD1(ticker)` and renders a lightweight-charts line. Extend it with the second axis.

### History Data Shape

Each snapshot from the D1 hook:
```typescript
{
  date: string;           // "2025-06-30"
  holdings: number;       // 500000
  sharesOutstanding: number; // 200000000
  holdingsPerShare: number;  // 0.0025 (computed: holdings/shares)
  source?: string;
  sourceUrl?: string;
}
```

Both `holdingsPerShare` (for the line) and `sharesOutstanding` (for the bars) are already in each snapshot.

---

## Deliverable 0.5.3 — mNAV vs HPS Growth Scatter Plot

### Concept
- X-axis: mNAV (premium/discount to NAV)
- Y-axis: HPS Growth (90D)
- Dot size: treasury value (USD)
- Each dot = one DAT company, labeled with ticker

### Quadrants
| | Low mNAV (< 1.0x) | High mNAV (> 1.5x) |
|---|---|---|
| **High HPS Growth** | Efficient wrappers (buy zone) | Justified premium |
| **Low HPS Growth** | Stagnant / declining | Overpriced + weak (danger zone) |

### Data
All inputs already available per company:
- mNAV: computed in `data-table.tsx` via `getCompanyMNAV()`
- HPS Growth: from D1 history (see 0.5.1)
- Treasury value: `holdings * cryptoPrice`

### Placement
New component on the homepage, below or alongside the data table. Could be a tab ("Table | Scatter") or a collapsible section.

### Suggested Library
Use `recharts` (already a dependency) for labeled scatter plots with quadrant lines. More ergonomic than lightweight-charts for this use case.

---

## The Three-Variable Mental Model

Use this in tooltips and explainers:

| Variable | What It Measures | Who Cares |
|----------|-----------------|-----------|
| Crypto price | Macro (luck) | Traders |
| mNAV premium | Market sentiment toward the wrapper | Arb/relative value |
| HPS Growth | Management skill | Long-term fundamental investors |

A tooltip on the scatter plot quadrants:

> "Upper-left: companies trading at a discount despite strong HPS growth.
> These managers are growing crypto per share efficiently, but the market
> hasn't priced it in yet."

---

## Key Files

| File | Role |
|------|------|
| `src/components/data-table.tsx` | Homepage leaderboard — **modify for 0.5.1** |
| `src/components/holdings-per-share-chart.tsx` | Company HPS chart — **extend for 0.5.2** |
| `src/lib/utils.ts` | `calculateHoldingsGrowth()` — HPS growth math |
| `src/lib/hooks/use-holdings-history-d1.ts` | Hook: fetch holdings + shares history from D1 |
| `src/lib/calculations/mnav.ts` | mNAV calculation functions |
| `src/lib/utils/market-cap.ts` | `getMarketCapForMnavSync()` — market cap with dilution |
| `src/lib/data/companies.ts` | All company data (`holdings`, `sharesForMnav`, etc.) |
| `src/lib/types.ts` | Type definitions (`Company`, `HoldingsSnapshot`) |
| `src/app/page.tsx` | Homepage — renders DataTable |
| `src/app/company/[ticker]/page.tsx` | Company detail page |

---

## Design Constraints

1. **No new data pipeline needed** — all data exists in D1 + companies.ts
2. **Deploy to Vercel** — `git push` auto-deploys
3. **Mobile-first** — leaderboard must work on mobile (existing mobile card layout)
4. **lightweight-charts** for time-series (already used site-wide)
5. **recharts** available for scatter plots
6. **Tailwind CSS** + shadcn/ui (existing design system)
7. **Dark mode** support required (already site-wide)

---

## Testing

```bash
npx tsc --noEmit        # TypeScript check
npm test                 # Test suite (403 tests)
git push                 # Deploy to Vercel
```

Production: https://dat-tracker-next.vercel.app

---

## What NOT to Touch

- `companies.ts` data values (managed by data pipeline agents)
- D1 schema or ingestion scripts
- R2 document caching infrastructure
- Cross-check / verification scripts
- Provenance files in `src/lib/data/provenance/`
- `ROADMAP.md` (update via infrastructure agent)

The UI work is purely **presentation and visualization** of existing data.
