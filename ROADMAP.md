# DAT Tracker Data Architecture Roadmap

> **Last Updated**: 2026-01-22
> **Current Phase**: 7a - Share Count Estimation Process
> **Status**: IN PROGRESS - designing adversarial review system

---

## RESUME HERE

**Session 2026-01-22 (continued):**

**What happened:**
1. Started Phase 7 to fix MARA share discrepancy
2. Discovered the previous "fix" (378M) was WRONG - grabbed basic shares instead of diluted
3. Traced the error: SEC has multiple fields, we grabbed the wrong one
4. Realized: single-agent fixes are error-prone, need adversarial review

**The MARA case study:**
- Original estimate: 495M (actually reasonable)
- "Fixed" to: 378M (WRONG - EntityCommonStockSharesOutstanding = basic)
- Correct value: 470M (WeightedAverageNumberOfDilutedSharesOutstanding = diluted)
- Current estimate: 495M (470M + 25M ATM) ← fixed with proper provenance

**Key insight:** A confident single agent grabbed the wrong SEC field. Adversarial review would have caught this via:
- "Which exact SEC XBRL tag?" → Forces specificity
- "Profit or loss quarter?" → Q3 2025 was profit, so diluted > basic
- "Cross-reference mNAV.com?" → They show 470M, not 378M

**What we built:**
- Drafted adversarial agent prompts (proposer, challenger, resolution)
- Drafted audit file format with provenance
- Ran manual adversarial review on MARA
- Fixed MARA with proper documentation

**Next steps (Phase 7a):**
- Implement adversarial agents as callable functions
- Create audit/ directory structure
- Define auto-approve vs human-review thresholds

**Then (Phase 7b):**
- Run adversarial review on remaining discrepancies
- Apply fixes with audit trail

**The Problem with Share Counts:**
- **PIPE/Merger dilution** → Disclosed in 8-K ✅
- **ATM dilution** → NOT in 8-K, only in quarterly 10-Q/10-K ❌
- This means share counts can drift between quarters even if we watch 8-Ks

**Solution: Hybrid Approach**
1. **Companies with dashboards** → Use real-time dashboard data
2. **Companies without dashboards** → Accept quarterly lag from 10-Q/10-K
3. **Be transparent** → Show data source and freshness for each company

**Next Steps:**
1. Identify which companies have real-time share data (dashboards)
2. Build/verify fetchers for those dashboards
3. For the rest, establish quarterly update process from 10-Q
4. Then apply fixes using the correct process
5. Build verification to catch drift

---

## Data Acquisition Strategy

### Share Counts - Hybrid Approach

**Tier 1: Real-time dashboards with shares**
| Company | Dashboard | Shares? | Holdings? |
|---------|-----------|---------|-----------|
| MSTR | strategy.com | ✅ fdShares in API | ✅ |

**Tier 1b: Dashboards with holdings only (no shares)**
| Company | Dashboard | Shares? | Holdings? |
|---------|-----------|---------|-----------|
| SBET | sharplink.com/eth-dashboard | ❌ | ✅ |
| Metaplanet | metaplanet.jp/analytics | ❌ | ✅ |
| DFDV | defidevcorp.com | ❌ | ✅ |
| LITS | litestrategy.com | ❌ | ✅ |

**Note**: mNAV.com provides shares for 15 companies but is a secondary source (missed XXI Class B shares).

**Tier 2: SEC quarterly (accept lag)**
- All other US companies
- Update shares after each 10-Q/10-K filing
- Show "as of Q3 2025" on company page

#### Quarterly Update Process (Tier 2 companies)

1. **When to update**: After each 10-Q (Q1, Q2, Q3) or 10-K (annual) filing
2. **Where to find shares**: Look for "WeightedAverageNumberOfDilutedSharesOutstanding" in filing
3. **How to update**:
   - Update `holdings-history.ts` with new share count, date, and SEC filing URL
   - The system derives `sharesForMnav` from holdings-history.ts
4. **What to display**: Show "as of Q3 2025" or similar on company page
5. **Dual-class companies**: Sum all share classes (Class A + Class B = total)

**Tier 3: Foreign companies**
- 3350.T, 0434.HK, H100.ST, ALTBG
- Use exchange filings or company announcements
- May have different disclosure schedules

### The ATM Gap

When a company uses ATM to fund BTC purchases:
1. **8-K filed** → "We bought X BTC" ✅
2. **Shares sold** → NOT disclosed until 10-Q ❌

This is unavoidable. Options:
- **Estimate**: If they bought $100M BTC at $10/share, ~10M new shares
- **Wait**: Accept that shares are stale until 10-Q
- **Dashboard**: Some companies (MSTR) publish real-time

**Decision:** Use dashboards where available, accept quarterly lag otherwise, be transparent about freshness.

### Market Cap - Calculate, Don't Override

**For US stocks:** `marketCap = sharesForMnav × liveStockPrice`
- Remove all hardcoded overrides
- Requires accurate share count (see above)
- Requires reliable price API (FMP)

**For foreign stocks only:** Keep override with reason
- 3350.T (Tokyo - need JPY conversion)
- 0434.HK (Hong Kong - need HKD conversion)
- H100.ST (Stockholm - need SEK conversion)
- ALTBG (Paris - need EUR conversion)

---

## Discrepancies Found (for reference)

### Shares Outstanding

| Ticker | Current | Correct | Root Cause |
|--------|---------|---------|------------|
| PURR | 32M | 127M | Sonnet merger (Dec 2025) |
| FWDI | 42M | 85M | $1.65B PIPE (Sep 2025) |
| RIOT | 403M | 350M | Overstated dilution |
| DJT | 288M | 278M | Drift |
| BTBT | 335M | 324M | Drift |
| KULR | 49M | 45.67M | Internal inconsistency |

### Total Debt

| Ticker | Current | Correct | Root Cause |
|--------|---------|---------|------------|
| MSTR | $10B | $8.2B | Note redemptions |

### Market Cap (remove, don't fix)

| Ticker | Current | Action |
|--------|---------|--------|
| NAKA | $1.5B | Remove override, calculate |
| KULR | $600M | Remove override, calculate |
| DJT | $6.4B | Remove override, calculate |
| MSTR | $57.4B | Remove override, calculate |
| XXI | $6.12B | Remove override, calculate |
| CORZ | $4.5B | Remove override, calculate |
| BTDR | $2.8B | Remove override, calculate |

---

## Phase 4: Data Quality & Architecture
**Status**: COMPLETE

### 4.1 Holdings Audit - COMPLETE
- [x] Audit all 54 companies
- [x] Fix 14 major discrepancies

### 4.2 mNAV Inputs Audit - COMPLETE
- [x] Audit sharesForMnav (6 discrepancies)
- [x] Audit totalDebt (1 discrepancy)
- [x] Audit marketCap overrides (7 to remove)
- [x] Root cause analysis

### 4.3 Establish Data Acquisition Process - COMPLETE
- [x] Identify companies with real-time share dashboards (only MSTR has shares)
- [x] Update strategy.com fetcher to extract fdShares
- [x] Document quarterly update process for non-dashboard companies
- [x] Decide: estimate ATM dilution or accept lag? → Accept lag, be transparent

### 4.4 Share Architecture - COMPLETE
- [x] Add `sharesOutstandingBasic` and `sharesOutstandingDiluted` to holdings-history.ts
- [x] Add `sharesAsOf` date and `sharesSource` fields
- [x] Derive `sharesForMnav` from holdings-history.ts (single source of truth)
- [x] Remove marketCap overrides for US stocks (7 removed: MSTR, XXI, KULR, NAKA, DJT, CORZ, BTDR)
- [x] Update mNAV calculation to use `shares × price` (already implemented in market-cap.ts)
- [x] Fix broken tests (strategy.test.ts - updated for fdShares extraction)

### 4.4b Data Provenance & Cash/Debt Architecture - COMPLETE

**Data Provenance (show where each number comes from):**
- [x] Add source/date tracking for shares: `sharesSource`, `sharesSourceUrl`, `sharesAsOf`
- [x] Add source/date tracking for debt: `debtSource`, `debtSourceUrl`, `debtAsOf`
- [x] Add source/date tracking for cash: `cashSource`, `cashSourceUrl`, `cashAsOf`
- [x] Add source/date tracking for preferred: `preferredSource`, `preferredSourceUrl`, `preferredAsOf`
- [x] Propagate sources through calculation pipeline (use-company-overrides.ts)
- [x] Update mNAV tooltip to show component sources with links

**Cash/Debt Formula:**
- [x] Decide formula: use `freeCash = cashReserves - restrictedCash` (only subtract unencumbered cash)
- [x] Add `restrictedCash` field for companies with encumbered cash
- [x] Document which companies have complex debt structures (convertibles, secured debt, etc.)

**Testing:**
- [ ] Add tests for source propagation through calculation pipeline
- [x] Ensure all tests pass (160 passing)

### 4.5 Apply Fixes Using New Process - COMPLETE
- [x] Update share counts using dashboard data or latest 10-Q
  - PURR: 32M → 127M (Sonnet merger Dec 2025)
  - FWDI: 42M → 85M ($1.65B PIPE Sep 2025)
  - RIOT: 403M → 350M (overstated dilution corrected)
  - DJT: 280M → 278M (minor drift)
  - BTBT: 335M → 324M (overstated dilution corrected)
  - KULR: 49M → 45.67M (internal inconsistency fixed)
- [x] Fix MSTR totalDebt ($10B → $8.2B) - note redemptions
- [x] Research and update debt structures for all companies
- [x] Audit cash treatment per company (free vs restricted)

### 4.6 Documentation - COMPLETE
- [x] Document data source for each company (now self-documenting via debtSource/cashSource fields in code)
- [x] Document update cadence (already in ROADMAP.md Tier 1/2/3 system)
- [x] Document how to add a new company (added to CLAUDE.md)

---

## Phase 5: Delete Old Monitoring System
**Status**: COMPLETE

- [x] Remove `src/lib/monitoring/` directory (moved SEC/LLM files to `src/lib/sec/`)
- [x] Remove related cron jobs (monitoring, realtime, financials crons deleted)
- [x] Drop unused database tables (no database - project uses TypeScript files)
- [x] Remove `/api/monitoring/*` routes
- [x] Remove `/admin/pending` page
- [x] Update imports throughout codebase

---

## Phase 6: Simple Verification System
**Status**: COMPLETE

- [x] Fix comparison engine to use holdings-history.ts (same source as frontend)
- [x] Add Discord webhook notifications for discrepancy alerts
- [x] Add Yahoo Finance fetcher as second source for share validation
- [x] Cron runs twice daily (2pm and 5pm UTC) at `/api/cron/comparison`
- [x] Manual trigger: `?manual=true&dryRun=true` for testing

**Initial Results (2026-01-22):** 66 discrepancies found (49 major, 7 moderate, 10 minor)

---

## Phase 7a: Share Count Estimation Process
**Status**: IN PROGRESS

**Problem discovered**: We tried to "fix" MARA shares and grabbed the wrong SEC field (basic instead of diluted). A single agent confidently made the wrong fix. We need adversarial review to catch these errors.

**The challenge with ATM companies**:
- SEC filings are quarterly (stale between filings)
- ATM dilution happens continuously but isn't disclosed until 10-Q
- Multiple SEC fields exist (basic vs diluted vs fully diluted)
- Profit vs loss quarters affect which securities are included in diluted count

**Adversarial Review Process**:
```
Proposer Agent → Challenger Agent → Resolution → Audit File
     ↓                  ↓                ↓            ↓
  Proposes #      Challenges with    Adjudicates   Documents
  with reasoning  specific prompts   disagreements  provenance
```

**Tasks**:
- [x] Draft adversarial agent prompts (proposer, challenger, resolution)
- [x] Draft audit file format (audit/shares/YYYY-MM-DD-TICKER.md)
- [x] Define challenge prompts:
  - SEC field verification (basic vs diluted vs fully diluted)
  - Profit/loss quarter check (antidilutive exclusions)
  - ATM calculation audit (BTC × price ÷ stock price)
  - External cross-reference (mNAV.com, FinanceCharts)
  - Temporal consistency (shares shouldn't shrink)
  - Edge case scan (splits, buybacks, conversions)
  - Confidence calibration
- [ ] Implement agents as callable functions
- [ ] Create audit/ directory structure
- [ ] Define thresholds:
  - Auto-approve: agreement + high confidence + <5% change
  - Flag for review: disagreement OR low confidence OR >10% change
  - Block: factual error OR >25% change
- [ ] Document which companies need ATM estimation:
  - MSTR (21/21 plan - massive ATM)
  - MARA (active BTC purchases via ATM)
  - RIOT (similar)
  - Others with active ATM programs

**Data Provenance in UI**:
When share count is an estimate (not direct from SEC filing), display must:
- [ ] Indicate it's an estimate (e.g., "~495M" or "495M (est)")
- [ ] Show methodology on hover/click (e.g., "SEC Q3 diluted + ATM estimate")
- [ ] Show confidence level (high/medium/low)
- [ ] Show confidence range when applicable (e.g., "470M - 500M")
- [ ] Link to audit file or source documentation

**Schema for estimates** (in holdings-history.ts or new structure):
```typescript
{
  sharesOutstandingDiluted: 495_000_000,
  sharesSource: "ESTIMATE: SEC Q3 diluted + ATM",
  sharesMethodology: "sec-diluted-plus-atm",
  sharesConfidence: "medium",
  sharesConfidenceRange: { floor: 470_000_000, ceiling: 500_000_000 },
  sharesAuditFile: "audit/shares/2026-01-22-MARA.md"  // optional
}
```

**Key Insight**: The adversarial process adds friction, but the MARA mistake (378M instead of 470M) cost credibility and debugging time. The friction is worth it.

---

## Phase 7b: Apply Fixes Using Adversarial Process
**Status**: BLOCKED by 7a

Once the adversarial process is implemented, use it to fix data:

**Already fixed (manual adversarial review 2026-01-22)**:
- [x] MARA: 378M → 495M (470M SEC diluted + 25M ATM estimate)
  - Root cause: Previous "fix" grabbed EntityCommonStockSharesOutstanding (basic) instead of WeightedAverageNumberOfDilutedSharesOutstanding (diluted)
  - Audit: Inline comments in holdings-history.ts (audit file pending)

**Pending fixes (require adversarial review)**:
- [ ] Metaplanet: Verify 1.43B share count (includes preferred conversions)
- [ ] GAME: Verify 98M share count
- [ ] RIOT: Verify current share count
- [ ] Review remaining 66 discrepancies from Phase 6

**Infrastructure**:
- [ ] Add DISCORD_WEBHOOK_URL to Vercel production environment
- [ ] Decide: Exclude foreign companies from mNAV.com comparisons (currency mismatch)?

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-21 | Hybrid approach for shares | Dashboards where available, quarterly 10-Q otherwise |
| 2026-01-21 | Accept ATM lag | Can't know ATM dilution until 10-Q, be transparent |
| 2026-01-21 | Calculate market cap, don't override | Static overrides go stale immediately |
| 2026-01-21 | Fix process before fixing data | Otherwise fixes just drift again |
| 2026-01-21 | Track basic AND diluted shares | Display both, use diluted for mNAV |
| 2026-01-21 | Delete old monitoring system | Untested, complex, doesn't work |
| 2026-01-21 | Audit cash/debt after share architecture | Same SEC data source, don't expand scope mid-phase |
| 2026-01-21 | Add source citations to mNAV components | Users need to verify data, catch errors like XXI Class B |
| 2026-01-21 | Add restrictedCash field for encumbered cash | freeCash = cashReserves - restrictedCash; display shows "Free Cash" when restricted |
| 2026-01-21 | Document debt structures with source tracking | debtSource/debtAsOf fields for 11 major companies; enables user verification |
| 2026-01-21 | Add cash source tracking | cashSource/cashAsOf fields for 17 companies with significant cash reserves |
| 2026-01-21 | Skip redundant documentation tasks | Data sources now self-documenting in code; only added "how to add company" guide to CLAUDE.md |
| 2026-01-21 | Delete old monitoring system | Removed complex untested monitoring; kept SEC auto-update (simpler, git-based); moved reusable SEC/LLM code to src/lib/sec/ |
| 2026-01-22 | Fix comparison engine data source | Changed loadOurValues() to use holdings-history.ts (same as frontend) instead of stale companies.ts |
| 2026-01-22 | Add Discord notifications | Send alerts when discrepancies > 5% found; summarize by severity |
| 2026-01-22 | Add Yahoo Finance fetcher | Second source for share count validation beyond mNAV.com |
| 2026-01-22 | Adversarial review for share counts | Single-agent fixes are error-prone (MARA 378M mistake); need proposer→challenger→resolution flow |
| 2026-01-22 | Split Phase 7 into 7a/7b | Must establish estimation process before applying fixes; "fix process before fixing data" |
| 2026-01-22 | MARA: 470M diluted + 25M ATM = 495M | Previous "fix" to 378M was wrong (used basic not diluted); Q3 2025 was profit quarter |
| 2026-01-22 | Show estimates with provenance in UI | When shares are estimated (not direct SEC), display must indicate estimate, methodology, confidence, and range |

---

## Completed Phases

### Phase 0-3: Planning, Schema, Fetchers, Comparison
- All complete, see git history
- 160 tests passing
- Fetchers built for: mNAV, Strategy, SharpLink, SEC XBRL, Metaplanet, LiteStrategy
