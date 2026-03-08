# DATCAP Product Model

> Canonical reference for site structure and metric philosophy.
> All UI suggestions, ranking logic, and metric calculations must reinforce this model.

---

## Core Insight

DAT companies are evaluated through **three independent dimensions**.

1. **Size** — Treasury Value
2. **Growth** — HPS Growth (Holdings Per Share Growth)
3. **Efficiency** — Wrapper Efficiency (Growth relative to premium)

Each answers a different question. They should **not be collapsed into a single ranking metric**.

---

## The Three Dimensions

### 1. Size (Sector Structure)

**Metric:** Treasury value (total crypto holdings in USD)

**Question:** Who are the major players in the DAT sector?

**Purpose:** Sector orientation, market structure, liquidity context.

**This is the default view of the homepage.**

**Why default:**
The DAT industry is still small and uneven. Growth metrics alone produce misleading rankings.
A $48M treasury can show 700% growth while a $50B treasury grows 15%.
Default size ranking avoids this statistical distortion.

### 2. Growth (Treasury Execution)

**Metric:** HPS Growth (Holdings Per Share Growth)

**Definition:**
```
HPS = crypto holdings / fully diluted shares
HPS Growth = % change in HPS over time period
```

**Question:** Which treasury managers are increasing crypto per share fastest?

**Interpretation:** This measures **execution skill**. This is the **Moneyball view** of DATs.

### 3. Efficiency (Wrapper Valuation)

**Metric:** Wrapper Efficiency = HPS Growth / mNAV

**Question:** How much crypto-per-share growth do investors receive for the premium they pay?

**Interpretation:** This measures **valuation efficiency**.

A company with 20% HPS growth and 1.5x mNAV is less efficient than one with 15% HPS growth and 0.8x mNAV.

---

## Homepage Structure

The homepage supports three views via a tab toggle:

```
[ Size ]   [ Growth ]   [ Efficiency ]
```

- **Size** (default): sorted by treasury value
- **Growth**: sorted by HPS Growth (90D)
- **Efficiency**: sorted by Wrapper Efficiency (HPS Growth / mNAV)

Each view shows the same companies with different sort + column emphasis.

### Per-View Summary Banner

| View | Banner Stats |
|------|-------------|
| Size | Total treasury value, company count, asset breakdown |
| Growth | Median HPS growth, companies growing HPS, best/worst |
| Efficiency | Median efficiency, best value plays |

---

## Design Principles

1. **Do not merge** these metrics into a single composite score.
2. The default view prioritizes **sector orientation**, not performance.
3. Growth and efficiency views are **analytical lenses**, not the primary ranking.
4. Metrics remain **simple and auditable** — always derivable from: holdings, shares, HPS, mNAV.

---

## Mental Model

```
crypto price  →  macro driver (external)
HPS growth    →  treasury execution (management skill)
mNAV          →  market valuation (investor sentiment)
```

DATCAP visualizes the relationships between these variables rather than compressing them into a single number.

---

## Primitive Variables

All derived analytics must be interpretable from these primitives:

- `holdings` — total crypto held
- `shares` — fully diluted shares outstanding
- `HPS` — holdings / shares
- `mNAV` — enterprise value / crypto NAV
- `cryptoPrice` — spot price of underlying asset

No metric should be introduced that cannot be explained as a function of these five values.
