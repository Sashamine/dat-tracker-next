-- Add cash_reserves and other_investments columns to company_financials
ALTER TABLE company_financials
ADD COLUMN IF NOT EXISTS cash_reserves DECIMAL(20, 2),
ADD COLUMN IF NOT EXISTS other_investments DECIMAL(20, 2);

-- Add comments for documentation
COMMENT ON COLUMN company_financials.cash_reserves IS 'USD cash on balance sheet';
COMMENT ON COLUMN company_financials.other_investments IS 'Equity stakes and other non-crypto assets (USD value)';
