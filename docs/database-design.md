# DAT Tracker Database Design

## Overview

This database schema supports the DAT Tracker application, which tracks public companies holding digital assets (Bitcoin, Ethereum, Solana, etc.). The schema is designed for:

1. **Data integrity** - Proper normalization with referential integrity
2. **Historical tracking** - Full history of holdings and prices
3. **Scraper support** - Infrastructure for automated data collection
4. **Admin workflow** - Review and approval process for scraped data
5. **Performance** - Denormalized current values for quick reads

## Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   assets    │     │     companies       │     │ company_sources  │
│─────────────│     │─────────────────────│     │──────────────────│
│ id (PK)     │◄────│ asset_id (FK)       │────►│ company_id (FK)  │
│ symbol      │     │ id (PK)             │     │ source_id (FK)   │
│ name        │     │ external_id         │     │ external_id      │
│ coingecko_id│     │ ticker              │     └──────────────────┘
│ binance_sym │     │ current_holdings    │              │
└─────────────┘     │ tier                │              ▼
      │             └─────────────────────┘     ┌──────────────────┐
      │                     │                   │  data_sources    │
      ▼                     │                   │──────────────────│
┌─────────────┐             ▼                   │ id (PK)          │
│crypto_prices│     ┌─────────────────────┐    │ name             │
│─────────────│     │ holdings_snapshots  │    │ type             │
│ asset_id(FK)│     │─────────────────────│    │ base_url         │
│ price_usd   │     │ company_id (FK)     │    └──────────────────┘
│ timestamp   │     │ holdings            │              │
└─────────────┘     │ snapshot_date       │              ▼
                    │ source              │     ┌──────────────────┐
                    │ status              │     │  scraper_jobs    │
                    └─────────────────────┘     │──────────────────│
                            │                   │ source_id (FK)   │
                            │                   │ company_id (FK)  │
                            ▼                   │ status           │
                    ┌─────────────────────┐    │ scheduled_at     │
                    │ company_financials  │    └──────────────────┘
                    │─────────────────────│
                    │ company_id (FK)     │
                    │ market_cap          │
                    │ effective_date      │
                    └─────────────────────┘
```

## Core Tables

### `assets`
Reference table for cryptocurrencies. Contains API identifiers for price fetching.

| Column | Purpose |
|--------|---------|
| symbol | Primary identifier (BTC, ETH) |
| coingecko_id | For CoinGecko API |
| binance_symbol | For Binance WebSocket |

### `companies`
Main company table. Contains:
- Identity (ticker, name, external_id)
- Current holdings (denormalized for performance)
- Company info (website, twitter, leadership)
- Classification (tier, is_miner, exchange)

**Design decision**: `current_holdings` is denormalized from `holdings_snapshots` for fast reads. A trigger updates it when a snapshot is approved.

### `company_financials`
Temporal table for financial data that changes over time:
- Cost basis, staking %, capital raised
- Market cap, shares outstanding
- Uses `effective_date` + `end_date` for point-in-time queries

### `holdings_snapshots`
The heart of the system. Every holdings update creates a snapshot:

| Column | Purpose |
|--------|---------|
| holdings | Number of tokens held |
| shares_outstanding | Diluted shares at that time |
| holdings_per_share | Calculated metric |
| source | Where data came from |
| status | pending/approved/rejected |
| raw_data | Original scraped JSON |

**Workflow**:
1. Scraper creates snapshot with `status = 'pending'`
2. Admin reviews in dashboard
3. Admin approves → trigger updates `companies.current_holdings`

### Price Tables

- `crypto_prices` - Historical crypto prices (from Binance/CoinGecko)
- `stock_prices` - Historical stock prices (from Alpaca)
- `latest_prices` - Cache of current prices for fast lookups

## Scraper Infrastructure

### `data_sources`
Configuration for each data source:
- SEC EDGAR (US filings)
- TSE (Tokyo Stock Exchange)
- HKEX (Hong Kong Exchange)
- GlobeNewswire, PR Newswire (press releases)

### `company_sources`
Maps companies to their data sources with source-specific identifiers:
- CIK numbers for SEC
- Stock codes for TSE/HKEX
- Can have multiple sources per company

### `scraper_jobs`
Job queue for scheduled scraping:
- Tracks execution status and results
- Stores raw response for debugging
- Links to created holdings_snapshots

## Admin Features

### `company_overrides`
For manual corrections from Google Sheets or admin UI:
- Temporary overrides (with expiration)
- Tracks original vs override values
- Can be deactivated without deletion

### `audit_log`
Complete audit trail of all changes for compliance.

## Key Queries

### Get current holdings with mNAV
```sql
SELECT * FROM v_company_holdings
WHERE asset = 'BTC'
ORDER BY holdings_value DESC;
```

### Get pending holdings for review
```sql
SELECT * FROM v_pending_holdings;
```

### Get holdings history for a company
```sql
SELECT *
FROM holdings_snapshots
WHERE company_id = ?
  AND status = 'approved'
ORDER BY snapshot_date;
```

### Calculate BTC Yield (holdings per share growth)
```sql
WITH periods AS (
  SELECT
    company_id,
    holdings_per_share,
    snapshot_date,
    LAG(holdings_per_share) OVER (
      PARTITION BY company_id
      ORDER BY snapshot_date
    ) as prev_holdings_per_share
  FROM holdings_snapshots
  WHERE status = 'approved'
)
SELECT
  company_id,
  snapshot_date,
  (holdings_per_share - prev_holdings_per_share) / prev_holdings_per_share * 100 as period_yield
FROM periods
WHERE prev_holdings_per_share IS NOT NULL;
```

## Indexes

Key indexes for performance:
- `companies(ticker)` - Lookups by ticker
- `companies(asset_id)` - Filter by asset
- `holdings_snapshots(company_id, snapshot_date DESC)` - Time series queries
- `holdings_snapshots(status)` - Admin queue
- `scraper_jobs(status, scheduled_at)` - Job queue processing

## Migration Strategy

1. Create all tables and indexes
2. Insert asset seed data
3. Run migration script to import from TypeScript files:
   - `companies.ts` → `companies` + `company_financials`
   - `holdings-history.ts` → `holdings_snapshots` (status = 'approved')
4. Set up price feeds to populate `crypto_prices` and `stock_prices`
5. Configure data sources and company mappings

## Future Considerations

1. **Partitioning**: If price tables grow large, partition by time
2. **Read replicas**: For the Next.js app to avoid write contention
3. **Caching layer**: Redis for real-time price updates
4. **Full-text search**: For company name/notes search
