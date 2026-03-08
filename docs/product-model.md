# DATCAP Product Model

> Canonical reference for site structure, metric philosophy, and page layout.
> All UI suggestions, ranking logic, and metric calculations must reinforce this model.
> Updated: 2026-03-07

---

## Product Purpose

DATCAP is: **CoinMarketCap for Digital Asset Treasury (DAT) companies.**

The platform allows users to:

1. Understand the structure of the DAT sector
2. Identify which treasury managers are executing best
3. Evaluate whether wrappers justify their premium

Priorities: **clarity, transparency, simple financial primitives.**

---

## Core Analytical Model

DAT companies are understood through three independent variables:

```
crypto price  →  macro driver (external)
HPS growth    →  treasury execution (management skill)
mNAV          →  wrapper valuation (investor sentiment)
```

Definitions:

```
HPS = crypto holdings / fully diluted shares
Wrapper Efficiency = HPS Growth / mNAV
```

HPS and mNAV are **primitive variables**.
Efficiency is a **derived analytical lens**.

---

## Metric Hierarchy

### Primitive Metrics (Core)

These must remain simple, auditable, and visible:

- Treasury Value
- HPS
- HPS Growth
- mNAV

### Derived Metrics

- Wrapper Efficiency = HPS Growth / mNAV

**No composite scoring systems should be introduced.**

---

## Primitive Variables

All derived analytics must be interpretable from these primitives:

- `holdings` — total crypto held
- `shares` — fully diluted shares outstanding
- `HPS` — holdings / shares
- `mNAV` — enterprise value / crypto NAV
- `cryptoPrice` — spot price of underlying asset

No metric should be introduced that cannot be explained as a function of these five values.

---

## Overview Page Structure

Layout (top to bottom):

```
Header
  ↓
Primary sector chart (scatter plot)
  ↓
Filters
  ↓
Leaderboard
```

The **leaderboard** must remain the dominant element of the page.

---

## Homepage Chart

A single primary visualization: **HPS Growth vs mNAV**

```
Y-axis  →  HPS Growth (90D)
X-axis  →  mNAV
Dot size →  Treasury Value
```

Purpose: Reveal execution vs valuation across the entire DAT sector.

### Quadrants

| Position | Label | Meaning |
|----------|-------|---------|
| Top-left | Undervalued performers | High growth, low premium — most interesting candidates |
| Top-right | Elite wrappers | High growth, high premium — market recognizes execution |
| Bottom-left | Turnaround candidates | Low growth, low premium — struggling or early-stage |
| Bottom-right | Overpriced wrappers | Low growth, high premium — most fragile positions |

Quadrant boundaries:
- Vertical: mNAV = 1.0x (at-NAV vs premium)
- Horizontal: Sector median HPS Growth

This is the **"Moneyball chart"** — it reveals mispricing by comparing market price vs treasury execution.

### Chart Interaction

- Hover tooltips: Company, Treasury Value, HPS, HPS Growth, mNAV
- Click: opens company page
- Compare mode: select up to 4 companies for simultaneous visualization

---

## Leaderboard Structure

Default ranking: **Treasury Value (Size view)**

This prevents statistical distortions from very small companies dominating growth rankings.

Three toggle views:

```
[ Size ]   [ Growth ]   [ Efficiency ]
```

### Size View

Rank by: Treasury Value

| Column | Purpose |
|--------|---------|
| Company | Name + ticker |
| Asset | BTC, ETH, etc. |
| Treasury Value | Total crypto holdings in USD |
| HPS | Holdings per share |
| mNAV | Premium/discount |
| Leverage | Debt / Crypto NAV |

### Growth View

Rank by: HPS Growth (90D)

| Column | Purpose |
|--------|---------|
| Company | Name + ticker |
| Asset | BTC, ETH, etc. |
| HPS Growth (90D) | Treasury execution |
| mNAV | Premium/discount |
| Treasury Value | Scale context |

### Efficiency View

Rank by: Wrapper Efficiency = HPS Growth / mNAV

| Column | Purpose |
|--------|---------|
| Company | Name + ticker |
| Asset | BTC, ETH, etc. |
| Efficiency | Growth per unit of premium |
| HPS Growth | Execution input |
| mNAV | Valuation input |
| Treasury Value | Scale context |

---

## Analytics Page

Separate page (`/analytics`) with four charts:

### 1. Treasury Density vs Scale

```
Y-axis  →  HPS (holdings per share)
X-axis  →  Treasury Value
Dot size →  Market Cap
```

Purpose: Reveal trade-offs between treasury scale and per-share crypto exposure.

### 2. Flywheel Dynamics

```
Y-axis  →  HPS Growth
X-axis  →  mNAV change
```

Purpose: Reveal whether companies convert premium expansion into treasury growth.

### 3. Sector Growth Distribution

Histogram of HPS Growth across all DAT companies.

Purpose: Reveal dispersion of treasury execution across the sector.

### 4. Sector mNAV History

Time series showing median mNAV and average mNAV.

Purpose: Reveal macro valuation cycles in the DAT sector.

---

## Company Page Structure

Layout (top to bottom):

```
Company Header
  ↓
Balance Sheet
  ↓
Key Metrics
  ↓
Performance Chart
  ↓
Strategy / Overview
  ↓
Holdings History
```

### Company Header

- Company name
- Ticker
- Asset focus
- Treasury Value

### Balance Sheet

DAT companies are balance-sheet vehicles. Display this first.

```
Crypto + Cash - Debt - Preferred = Equity NAV
```

Fields:
- Crypto holdings (quantity + USD value)
- Cash
- Debt
- Preferred equity
- Shares outstanding
- Equity NAV (computed)

### Key Metrics

- HPS
- HPS Growth (90D, 1Y)
- mNAV
- Leverage

### Performance Chart

Show on one chart:
- Price
- mNAV
- HPS

Provide anchor link: "Jump to performance chart"

### Strategy Section

- Treasury accumulation strategy
- Capital markets strategy
- Financing structure

### Holdings History

Timeline:
- Date
- Crypto added or removed
- Source filing
- Updated holdings total

---

## Design Principles

1. **Do not merge** metrics into a single composite score
2. The default view prioritizes **sector orientation**, not performance
3. Growth and efficiency views are **analytical lenses**, not the primary ranking
4. Metrics remain **simple and auditable** — always derivable from primitives
5. The scatter plot is the **signature visualization** — it compresses the framework into one picture

---

## Key Questions the Site Must Answer

1. Who controls the most crypto?
2. Which treasury managers are increasing crypto per share fastest?
3. Which wrappers justify their premium?

Everything in the UI should reinforce these questions.

---

## Product Philosophy

DATCAP functions as:

```
sector map + Moneyball scoreboard
```

It reveals relationships between treasury scale, treasury execution, and market valuation — without compressing them into a single score.
