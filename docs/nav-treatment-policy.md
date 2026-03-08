# NAV Treatment Policy

> Canonical reference for how different asset types enter the NAV calculation.
> Updated: 2026-03-07

---

## Asset Treatment Rules

### 1. Direct Crypto Holdings

**Treatment:** Included at full spot value.
**Source field:** `company.holdings` + `company.asset`
**Price:** Live from Alpaca/CoinGecko

### 2. Secondary Crypto Holdings

**Treatment:** Included at full spot value.
**Source field:** `company.secondaryCryptoHoldings[]`
**Example:** A BTC company that also holds ETH directly.
**Price:** Live from Alpaca/CoinGecko

### 3. LSTs / Liquid Staked Wrappers

**Treatment:** Included at par, look-through to underlying crypto.
**Source field:** `company.cryptoInvestments[]` where `type: "lst"`
**Valuation:** `lstAmount * exchangeRate * underlyingPrice`
**Exchange rate:** Live if available, stored fallback otherwise.
**Example:** jitoSOL → SOL, stHYPE → HYPE

### 4. Crypto Investments (fund, equity, etf)

**Treatment:** Included at full reported fair value. No haircut.
**Source field:** `company.cryptoInvestments[]` where `type: "fund" | "equity" | "etf"`
**Valuation:** Static `fairValue` from most recent SEC filing.
**Example:** GAME's Dialectic ETH fund ($64.5M)

### 5. Other Investments

**Treatment:** Included at full value only when material.
**Source field:** `company.otherInvestments`
**Materiality threshold:** `otherInvestments / baseCryptoNav > 5%`
**If below threshold:** Excluded from NAV.
**If above threshold:** Included at full reported value.

---

## Current Company Treatment

| Company | Asset Type | Treatment | Notes |
|---------|-----------|-----------|-------|
| GAME | Dialectic ETH fund | cryptoInvestments (fund) | Included at par ($64.5M) |
| BMNR | Beast Industries + Eightco | otherInvestments | Included (material) |
| BTBT | WhiteFiber stake | otherInvestments | Included (very material) |
| STKE | Equity investments | Not yet modeled | Mentioned in notes but not in cryptoInvestments or otherInvestments |
| HYPD | Kinetiq stHYPE | cryptoInvestments (lst) | Included at par via exchange rate |

---

## Policy Characterization

The current system is:

- **Spot-consistent** for direct crypto and LSTs
- **Fair-value-consistent** for indirect fund/equity exposures
- **Not yet market-treatment-consistent** (no mark-to-market for private funds/equity)

This means the system uses a **reported-fair-value convention**, not a **market-haircut convention**.

---

## Future: Strict NAV vs Expanded NAV

Long-term, the site should support two NAV views:

1. **Strict NAV** — Direct crypto + LSTs only (spot-verifiable, no trust required)
2. **Expanded NAV** — Strict + funds + equity stakes + material other investments

This allows users to choose their own trust level. Strict NAV is the conservative view; Expanded NAV is the comprehensive view.

---

## Action Items

- [ ] Model STKE equity investments in `cryptoInvestments` or `otherInvestments`
- [ ] Add explicit notes to companies using non-direct crypto treatment
- [ ] Future: implement Strict/Expanded NAV toggle in UI
