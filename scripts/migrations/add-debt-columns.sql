-- Migration: Add totalDebt and preferredEquity columns for EV-based mNAV calculation
-- Industry standard mNAV = (Market Cap + Debt + Preferred - Cash) / Crypto NAV

-- Add columns to company_financials table
ALTER TABLE company_financials
ADD COLUMN IF NOT EXISTS total_debt DECIMAL(20, 2),
ADD COLUMN IF NOT EXISTS preferred_equity DECIMAL(20, 2);

-- Add comments explaining the columns
COMMENT ON COLUMN company_financials.total_debt IS 'Total debt outstanding (convertible notes, bonds, credit facilities) in USD';
COMMENT ON COLUMN company_financials.preferred_equity IS 'Preferred stock notional value (MSTR-style STRK/STRF perpetual preferred) in USD';

-- Update MSTR debt data (from Jan 2026 filings)
UPDATE company_financials cf
SET
  total_debt = 8200000000,        -- $8.2B in convertible debt
  preferred_equity = 7800000000   -- $7.8B in preferred stock (STRK/STRF/STRC/STRD)
FROM companies c
WHERE cf.company_id = c.id
  AND c.ticker = 'MSTR'
  AND cf.end_date IS NULL;

-- Update MARA debt data
UPDATE company_financials cf
SET total_debt = 1800000000       -- $1.8B in 0% convertible notes
FROM companies c
WHERE cf.company_id = c.id
  AND c.ticker = 'MARA'
  AND cf.end_date IS NULL;

-- Update RIOT debt data
UPDATE company_financials cf
SET total_debt = 794000000        -- $594M 0.75% converts + $200M BTC-backed credit
FROM companies c
WHERE cf.company_id = c.id
  AND c.ticker = 'RIOT'
  AND cf.end_date IS NULL;

-- Update CLSK debt data
UPDATE company_financials cf
SET total_debt = 1150000000       -- $650M 0% converts + $400M BTC-backed credit + $100M facility
FROM companies c
WHERE cf.company_id = c.id
  AND c.ticker = 'CLSK'
  AND cf.end_date IS NULL;

-- Verify the updates
SELECT c.ticker, cf.total_debt, cf.preferred_equity, cf.cash_reserves
FROM companies c
JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL
WHERE c.ticker IN ('MSTR', 'MARA', 'RIOT', 'CLSK')
ORDER BY c.ticker;
