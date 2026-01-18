// Database client for PostgreSQL
import { Pool } from 'pg';

// Create a connection pool (reused across requests)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 10, // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Helper to run queries
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// Helper to run a single query and get one result
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const result = await pool.query(text, params);
  return (result.rows[0] as T) || null;
}

// Types for database entities
export interface DbCompany {
  id: number;
  external_id: string;
  name: string;
  ticker: string;
  asset_id: number;
  asset: string; // From join
  tier: '1' | '2' | '3';
  current_holdings: number;
  holdings_last_updated: string | null;
  holdings_source: string | null;
  website: string | null;
  twitter: string | null;
  logo_url: string | null;
  tokenized_address: string | null;
  tokenized_chain: string | null;
  is_miner: boolean;
  dat_start_date: string | null;
  leader: string | null;
  strategy: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCompanyFinancials {
  id: number;
  company_id: number;
  cost_basis_avg: number | null;
  staking_pct: number | null;
  staking_apy: number | null;
  staking_method: string | null;
  quarterly_burn_usd: number | null;
  capital_raised_atm: number | null;
  capital_raised_pipe: number | null;
  capital_raised_converts: number | null;
  atm_remaining: number | null;
  avg_daily_volume: number | null;
  has_options: boolean;
  options_oi: number | null;
  market_cap: number | null;
  shares_outstanding: number | null;
  leverage_ratio: number | null;
  btc_mined_annual: number | null;
  cash_reserves: number | null;
  other_investments: number | null;
  effective_date: string;
}

export interface DbHoldingsSnapshot {
  id: number;
  company_id: number;
  holdings: number;
  shares_outstanding: number | null;
  holdings_per_share: number | null;
  source: string;
  source_url: string | null;
  source_document: string | null;
  snapshot_date: string;
  filing_date: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'superseded';
}

export interface DbAsset {
  id: number;
  symbol: string;
  name: string;
  coingecko_id: string | null;
  binance_symbol: string | null;
}

// Export pool for direct access if needed
export { pool };
