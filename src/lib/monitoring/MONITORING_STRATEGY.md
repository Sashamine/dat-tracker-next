# Automated Holdings Monitoring Strategy

## Data Source Hierarchy (by reliability)

### Tier 1: SEC EDGAR (Auto-approve)
- **8-K filings**: Press releases, shareholder letters, earnings announcements
- **10-Q filings**: Quarterly balance sheets with digital asset line items
- **10-K filings**: Annual reports

**Key learnings:**
- File patterns vary by company:
  - Standard: `ex99-1.htm`, `ex-99.1.htm`
  - MARA uses: `q3*shareholderletter.htm`, `*earningsannouncement.htm`
  - Some use: `press*.htm`, `release*.htm`
- Must search ALL .htm files in filing, not just ex99 exhibits
- Balance sheets report in thousands (e.g., "$5,247,000" = $5.247B)

### Tier 2: Company IR Pages (Auto-approve with high confidence)
- Direct press releases with holdings updates
- Monthly/quarterly production reports

**Companies with useful IR pages:**
- CLSK: `investors.cleanspark.com` - Monthly mining updates
- MARA: `ir.mara.com` - Quarterly only (stopped monthly Q3 2025)
- KULR: `kulr.ai/bitcoin/` + `kulrbitcointracker.com` (real-time)
- Metaplanet: `metaplanet.jp/en/analytics` (live holdings)

### Tier 3: Company Holdings Pages (Auto-approve)
Some companies publish real-time holdings:
- `xxi.money` - Twenty One Capital
- `kulrbitcointracker.com` - KULR
- `nakamoto.com` - Nakamoto Holdings
- `metaplanet.jp/en/analytics` - Metaplanet
- `h100.group` - H100 Group

### Tier 4: Early Signal Sources (Pre-filing alerts)

These sources detect acquisitions BEFORE official SEC filings:

#### Twitter/X Early Signals
Priority accounts monitored for acquisition announcements:
- **Executives**: @saylor (Michael Saylor announces MSTR purchases)
- **Company accounts**: @Strategy, @MARAHoldings, @RiotPlatforms, @CleanSpark_Inc
- **News/Analysts**: @BitcoinMagazine, @DocumentingBTC, @BTCArchive

**Signal type**: `twitter_announcement`
**Use case**: CEO tweets acquisition → Alert sent → Watch for SEC 8-K within 1-3 days

#### Arkham Intelligence (On-chain)
Monitors known company wallet addresses for BTC movements:
- Scrapes `intel.arkm.com/explorer/entity/{company}`
- Detects holdings changes >1%
- Public data, no API key required (yet)

**Signal type**: `arkham_alert`
**Use case**: Large BTC inflow to MSTR wallet → Alert sent → Watch for SEC 8-K

**Early signals are NOT auto-approved** - they generate "awaiting confirmation" alerts.

### Tier 5: Aggregators (Verification/fallback only)
- `bitcointreasuries.net` - Most comprehensive
- `bitbo.io/treasuries/` - Good for non-US companies
- `theblock.co/treasuries/` - Real-time tracking

**Use aggregators for:**
- Non-US companies without SEC filings (3350.T, 0434.HK, ALTBG, H100.ST)
- Cross-verification of SEC-extracted data
- Fallback when primary sources unavailable

**Note**: CoinGecko removed - data was unreliable/stale.

## Monitoring Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Hourly Cron Trigger                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌───────────────────┐                    ┌───────────────────┐
│  EARLY SIGNALS    │                    │  PRIMARY SOURCES  │
│  (Pre-filing)     │                    │  (Official data)  │
└─────────┬─────────┘                    └─────────┬─────────┘
          │                                        │
    ┌─────┴─────┐                           ┌──────┴──────┐
    ▼           ▼                           ▼             ▼
┌───────┐  ┌────────┐                 ┌──────────┐  ┌──────────┐
│Twitter│  │Arkham  │                 │SEC EDGAR │  │IR Pages  │
│Signals│  │On-Chain│                 │Filings   │  │Holdings  │
└───┬───┘  └───┬────┘                 └────┬─────┘  └────┬─────┘
    │          │                           │             │
    └────┬─────┘                           └──────┬──────┘
         │                                        │
         ▼                                        ▼
┌─────────────────────┐              ┌─────────────────────────┐
│ "Early Signal"      │              │ LLM Holdings Extraction │
│ Discord Alert       │              │ + Approval Logic        │
│ (Cyan embed)        │              │                         │
│                     │              │ SEC + high confidence   │
│ "Awaiting official  │              │    → Auto-approve       │
│  confirmation"      │              │ Low confidence/change   │
└─────────────────────┘              │    → Manual review      │
                                     └───────────┬─────────────┘
                                                 │
                                                 ▼
                                     ┌─────────────────────────┐
                                     │ Holdings Update Alert   │
                                     │ (Green/Purple embed)    │
                                     │                         │
                                     │ Update database if      │
                                     │ auto-approved           │
                                     └─────────────────────────┘
```

### Alert Types

| Alert Type | Color | Meaning |
|------------|-------|---------|
| Early Signal | Cyan | Unconfirmed - Twitter/on-chain detected, awaiting SEC filing |
| Holdings Update (auto) | Green | Confirmed - SEC filing verified, data updated |
| Holdings Update (pending) | Purple | Needs review - Lower confidence or large change |
| Discrepancy | Orange | Mismatch between our data and aggregator |
| Error | Red | System error during monitoring |

## Non-US Company Handling

| Company | Exchange | Primary Source | Fallback |
|---------|----------|----------------|----------|
| 3350.T (Metaplanet) | Tokyo | metaplanet.jp/analytics | bitcointreasuries.net |
| 0434.HK (Boyaa) | Hong Kong | HKEX announcements | bitbo.io |
| ALTBG | Euronext Paris | Euronext filings | theblock.co |
| H100.ST | Nasdaq Stockholm | h100.group | bitcointreasuries.net |
| XXI | NYSE (new) | xxi.money | on-chain verification |

## LLM Extraction Prompts

### For 8-K Press Releases:
```
Find the TOTAL {asset} holdings. Look for:
- "holds X bitcoin" or "held X BTC"
- "treasury of X bitcoin"
- "total bitcoin holdings of X"
- "X BTC on balance sheet"
```

### For 10-Q Balance Sheets:
```
Find the TOTAL {asset} holdings from the balance sheet. Look for:
- "Digital assets" line item (may be in thousands)
- Number of {asset} held
- Fair value of holdings
- Notes mentioning {asset} quantity
```

### For Shareholder Letters:
```
Find the TOTAL {asset} holdings. Look for:
- "holdings increased to X BTC"
- "we held X bitcoin as of [date]"
- "bitcoin holdings of X"
```

## Rate Limiting

- SEC EDGAR: 10 requests/second max, use 300ms delay
- Company IR pages: 1 request/second per domain
- Aggregators: 1 request/5 seconds (be respectful)

## Error Handling

1. **Source unavailable**: Skip, try next source, log warning
2. **LLM extraction fails**: Log the text, continue with next company
3. **Confidence too low**: Save as pending, don't auto-approve
4. **Holdings decrease > 50%**: Flag for manual review (possible error)
