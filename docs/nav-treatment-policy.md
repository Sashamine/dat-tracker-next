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

**Treatment:** Always included at full reported value.
**Source field:** `company.otherInvestments`
**Note:** Previously used a 5% materiality threshold (removed 2026-03-08). All `otherInvestments` now flow into NAV unconditionally to avoid confusing threshold flip-flop behavior.

---

## Current Company Treatment

| Company | Asset Type | Treatment | Notes |
|---------|-----------|-----------|-------|
| GAME | Dialectic ETH fund | cryptoInvestments (fund) | Included at par ($32.5M). Source: Mar 2026 Investor Update |
| BMNR | Beast Industries + Eightco | otherInvestments | $214M. Always included (threshold removed) |
| BTBT | WhiteFiber (WYFI) stake | otherInvestments | $528M. ~46% of crypto NAV at ~$2,500 ETH — very material, included |
| SBET | USDC stablecoins | otherInvestments | $26.7M (Q3 2025). Always included (threshold removed) |
| STKE | Equity investments | Excluded (immaterial) | CAD $686K total (Chia $489K, Ngrave $197K). 0.96% of crypto NAV — below 5% threshold. Source: 40-F FY2025 Exhibit 99.2 Note 9 |
| HYPD | Kinetiq iHYPE | cryptoInvestments (lst) | Included at par via exchange rate (kHYPE rate as proxy) |
| SUIG | Legacy portfolio | Not modeled | ~$20.7M (short-term loans, commercial loans, common stock). Commented out in companies.ts |

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

- [x] STKE equity investments: assessed as immaterial (CAD $686K = 0.96% of crypto NAV). No modeling needed.
- [x] Add explicit notes to companies using non-direct crypto treatment — completed 2026-03-07. BMNR notes corrected (was "not in mNAV", now explains dynamic materiality). SBET, SUIG added to policy table.
- [ ] Future: implement Strict/Expanded NAV toggle in UI
