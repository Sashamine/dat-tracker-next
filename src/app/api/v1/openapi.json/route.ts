import { NextResponse } from 'next/server';

/**
 * GET /api/v1/openapi.json
 *
 * Returns the OpenAPI 3.1 specification for the DAT Tracker public API.
 */
export async function GET() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'DAT Tracker API',
      version: '1.0.0',
      description: 'Public API for Digital Asset Treasury (DAT) company data. All financial data is sourced from Cloudflare D1 with full SEC filing provenance.',
      contact: {
        name: 'DAT Tracker',
        url: 'https://dat-tracker-next.vercel.app',
      },
    },
    servers: [
      { url: 'https://dat-tracker-next.vercel.app/api/v1', description: 'Production' },
    ],
    paths: {
      '/companies': {
        get: {
          summary: 'List all companies',
          description: 'Returns all tracked entities with their latest financial metrics from D1.',
          parameters: [
            { name: 'asset', in: 'query', schema: { type: 'string', enum: ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'LTC', 'ZEC', 'SUI', 'TRX', 'HYPE'] }, description: 'Filter by primary crypto asset' },
          ],
          responses: {
            200: { description: 'List of companies with metrics', content: { 'application/json': { schema: { $ref: '#/components/schemas/CompanyListResponse' } } } },
          },
        },
      },
      '/companies/{ticker}': {
        get: {
          summary: 'Get company profile',
          description: 'Returns full company profile: metadata, latest metrics with provenance, instruments, secondary holdings, and investments.',
          parameters: [
            { name: 'ticker', in: 'path', required: true, schema: { type: 'string' }, description: 'Company ticker (e.g. MSTR, KULR)' },
          ],
          responses: {
            200: { description: 'Full company profile' },
            404: { description: 'Company not found' },
          },
        },
      },
      '/companies/{ticker}/history': {
        get: {
          summary: 'Get historical datapoints',
          description: 'Returns historical financial datapoints with provenance.',
          parameters: [
            { name: 'ticker', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'metric', in: 'query', schema: { type: 'string', enum: ['holdings_native', 'basic_shares', 'debt_usd', 'cash_usd', 'preferred_equity_usd'] }, description: 'Filter by metric name' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 500, maximum: 1000 } },
            { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
          ],
          responses: { 200: { description: 'Historical datapoints' } },
        },
      },
      '/companies/{ticker}/mnav': {
        get: {
          summary: 'Calculate mNAV',
          description: 'Returns current mNAV calculation with full input breakdown. Requires stock and crypto prices as query params.',
          parameters: [
            { name: 'ticker', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'stockPrice', in: 'query', required: true, schema: { type: 'number' }, description: 'Current stock price in USD' },
            { name: 'cryptoPrice', in: 'query', required: true, schema: { type: 'number' }, description: 'Current crypto asset price in USD' },
          ],
          responses: {
            200: { description: 'mNAV calculation with inputs and methodology' },
            400: { description: 'Missing required price parameters' },
            404: { description: 'Company not found' },
            422: { description: 'Cannot calculate mNAV (no holdings)' },
          },
        },
      },
      '/companies/{ticker}/instruments': {
        get: {
          summary: 'Get dilutive instruments',
          description: 'Returns convertibles, warrants, and options with optional in-the-money status.',
          parameters: [
            { name: 'ticker', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'stockPrice', in: 'query', schema: { type: 'number' }, description: 'Stock price to determine ITM status' },
          ],
          responses: { 200: { description: 'List of instruments' }, 404: { description: 'Company not found' } },
        },
      },
      '/companies/{ticker}/purchases': {
        get: {
          summary: 'Get purchase history',
          description: 'Returns crypto purchase history with cost basis statistics.',
          parameters: [
            { name: 'ticker', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Purchase history with stats' }, 404: { description: 'Company not found' } },
        },
      },
      '/companies/{ticker}/events': {
        get: {
          summary: 'Get capital events',
          description: 'Returns capital events timeline (BTC purchases, debt issuances, preferred stock, ATM programs).',
          parameters: [
            { name: 'ticker', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['BTC', 'DEBT', 'PREF', 'ATM', 'DEBT_EVENT', 'CORP'] }, description: 'Filter by event type' },
          ],
          responses: { 200: { description: 'Capital events' }, 404: { description: 'Company not found' } },
        },
      },
      '/metrics/mnav': {
        get: {
          summary: 'mNAV leaderboard',
          description: 'Returns mNAV for all companies. Requires crypto and stock prices.',
          parameters: [
            { name: 'cryptoPrices', in: 'query', required: true, schema: { type: 'string' }, description: 'Comma-separated asset:price pairs (e.g. BTC:88000,ETH:3200)' },
            { name: 'stockPrices', in: 'query', required: true, schema: { type: 'string' }, description: 'Comma-separated ticker:price pairs (e.g. MSTR:160,KULR:3)' },
          ],
          responses: { 200: { description: 'mNAV leaderboard sorted ascending' }, 400: { description: 'Missing price params' } },
        },
      },
      '/metrics/ahps': {
        get: {
          summary: 'AHPS growth leaderboard',
          description: 'Returns Asset Holdings Per Share growth metrics (30d, 90d, 1y) for all companies with sufficient history.',
          responses: { 200: { description: 'AHPS growth leaderboard sorted by 90d growth' } },
        },
      },
      '/datapoints': {
        get: {
          summary: 'Raw datapoints',
          description: 'Power-user endpoint for accessing raw D1 datapoints with full provenance chain.',
          parameters: [
            { name: 'ticker', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'metric', in: 'query', schema: { type: 'string' }, description: 'Filter by metric name' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 500 } },
            { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
            { name: 'status', in: 'query', schema: { type: 'string', default: 'approved' } },
          ],
          responses: { 200: { description: 'Raw datapoints with provenance' }, 400: { description: 'Missing ticker param' } },
        },
      },
    },
    components: {
      schemas: {
        CompanyListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            count: { type: 'integer' },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ticker: { type: 'string' },
                  name: { type: 'string' },
                  asset: { type: 'string' },
                  tier: { type: 'integer' },
                  isMiner: { type: 'boolean' },
                  metrics: { type: 'object', description: 'Latest financial metrics keyed by metric name' },
                },
              },
            },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
