import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

export const runtime = 'nodejs';
export const maxDuration = 30;

type TableRow = { name: string };
type ColumnRow = { name: string };

type SqlSpec = {
  id: string;
  sql: string;
  params: Array<string | number>;
};

function requireAdminAuth(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;
  const secretParam = request.nextUrl.searchParams.get('secret') || '';
  const secretHeader = request.headers.get('x-admin-secret') || '';
  return secretParam === adminSecret || secretHeader === adminSecret;
}

function parseWindowDays(raw: string | null): number {
  const value = (raw || '7d').trim().toLowerCase();
  const m = value.match(/^(\d{1,3})d$/);
  if (!m) return 7;
  const days = parseInt(m[1], 10);
  if (!Number.isFinite(days)) return 7;
  return Math.max(1, Math.min(90, days));
}

function parseTopN(raw: string | null, fallback: number): number {
  const n = parseInt(raw || String(fallback), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(100, n));
}

function parseOffsetDays(raw: string | null): number {
  const n = parseInt(raw || '0', 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(365, n));
}

function qident(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function pickColumn(columns: Set<string>, candidates: string[]): string | null {
  for (const c of candidates) {
    if (columns.has(c)) return c;
  }
  return null;
}

function fieldExpr(
  columns: Set<string>,
  candidates: string[],
  payloadCol: string | null,
  jsonPaths: string[]
): string | null {
  const direct = pickColumn(columns, candidates);
  const parts: string[] = [];

  if (direct) parts.push(`${qident(direct)}`);
  if (payloadCol) {
    for (const p of jsonPaths) {
      parts.push(`json_extract(${qident(payloadCol)}, '$.${p}')`);
    }
  }

  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];
  return `COALESCE(${parts.join(', ')})`;
}

async function resolveEventsTable(d1: D1Client): Promise<{ table: string; columns: Set<string> }> {
  const tables = await d1.query<TableRow>(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
  );

  const tableNames = tables.results.map(r => r.name);
  const preferred = [
    'events',
    'app_events',
    'adoption_events',
    'ui_events',
    'tracking_events',
    'telemetry_events',
  ];

  let table = preferred.find(name => tableNames.includes(name)) || null;
  if (!table) {
    table = tableNames.find(name => /event/i.test(name)) || null;
  }
  if (!table) {
    throw new Error('No events-like table found in D1 (looked for events/ui_events/app_events/tracking_events).');
  }

  const info = await d1.query<ColumnRow>(`PRAGMA table_info(${qident(table)});`);
  const columns = new Set(info.results.map(r => r.name));
  return { table, columns };
}

export async function GET(request: NextRequest) {
  if (!requireAdminAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_D1_DATABASE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Missing Cloudflare D1 env (need CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN)',
      },
      { status: 500 }
    );
  }

  const sp = request.nextUrl.searchParams;
  const days = parseWindowDays(sp.get('window'));
  const offsetDays = parseOffsetDays(sp.get('offsetDays'));
  const topN = parseTopN(sp.get('topN'), 10);
  const heatmapTopN = parseTopN(sp.get('heatmapTopN'), 20);

  try {
    const d1 = D1Client.fromEnv();
    const { table, columns } = await resolveEventsTable(d1);

    const payloadCol = pickColumn(columns, [
      'payload_json',
      'payload',
      'metadata',
      'meta_json',
      'data',
      'props',
      'properties',
      'context_json',
      'context',
    ]);

    const sessionExpr = fieldExpr(columns, ['session_id', 'sessionId', 'sid'], payloadCol, [
      'session_id',
      'sessionId',
      'sid',
    ]);
    const tsExpr = fieldExpr(columns, ['created_at', 'event_time', 'timestamp', 'ts'], payloadCol, [
      'created_at',
      'event_time',
      'timestamp',
      'ts',
    ]);
    const eventExpr = fieldExpr(columns, ['event', 'event_name', 'event_type', 'name', 'action', 'type'], payloadCol, [
      'event',
      'event_name',
      'event_type',
      'name',
      'action',
      'type',
    ]);
    const routeExpr = fieldExpr(columns, ['route', 'path', 'api_route', 'endpoint'], payloadCol, [
      'route',
      'path',
      'api_route',
      'endpoint',
    ]);
    const tickerExpr = fieldExpr(columns, ['ticker', 'entity_id', 'symbol'], payloadCol, [
      'ticker',
      'entity_id',
      'symbol',
    ]);
    const metricExpr = fieldExpr(columns, ['metric', 'metric_name'], payloadCol, ['metric', 'metric_name']);
    const clientExpr = fieldExpr(columns, ['client', 'caller', 'source'], payloadCol, [
      'client',
      'caller',
      'source',
    ]);

    if (!sessionExpr || !tsExpr) {
      return NextResponse.json(
        {
          success: false,
          error: 'Events table is missing required fields (session_id and timestamp) for adoption aggregates.',
          detected: { table, columns: Array.from(columns).sort() },
        },
        { status: 500 }
      );
    }

    const normalizedSql = `
      WITH normalized AS (
        SELECT
          CAST(${sessionExpr} AS TEXT) AS session_id,
          datetime(CAST(${tsExpr} AS TEXT)) AS event_ts,
          LOWER(COALESCE(CAST(${eventExpr || "''"} AS TEXT), '')) AS event_name,
          LOWER(COALESCE(NULLIF(TRIM(CAST(${clientExpr || "''"} AS TEXT)), ''), 'unknown')) AS client_type,
          NULLIF(TRIM(CAST(${routeExpr || 'NULL'} AS TEXT)), '') AS route,
          UPPER(NULLIF(TRIM(CAST(${tickerExpr || 'NULL'} AS TEXT)), '')) AS ticker,
          LOWER(NULLIF(TRIM(CAST(${metricExpr || 'NULL'} AS TEXT)), '')) AS metric
        FROM ${qident(table)}
        WHERE ${tsExpr} IS NOT NULL
      ),
      scoped AS (
        SELECT *
        FROM normalized
        WHERE event_ts >= datetime('now', ?)
          AND event_ts < datetime('now', ?)
      )
    `;

    const windowStart = `-${offsetDays + days} day`;
    const windowEnd = `-${offsetDays} day`;
    const priorWindowStart = `-${offsetDays + days * 2} day`;
    const priorWindowEnd = `-${offsetDays + days} day`;

    const queries: SqlSpec[] = [
      {
        id: 'users',
        sql: `
          ${normalizedSql},
          current_sessions AS (
            SELECT DISTINCT session_id
            FROM normalized
            WHERE event_ts >= datetime('now', ?)
              AND event_ts < datetime('now', ?)
              AND session_id IS NOT NULL
          ),
          prior_sessions AS (
            SELECT DISTINCT session_id
            FROM normalized
            WHERE event_ts >= datetime('now', ?)
              AND event_ts < datetime('now', ?)
              AND session_id IS NOT NULL
          )
          SELECT
            (SELECT COUNT(1) FROM current_sessions) AS unique_users,
            (
              SELECT COUNT(1)
              FROM current_sessions c
              INNER JOIN prior_sessions p ON c.session_id = p.session_id
            ) AS returning_users;
        `,
        params: [windowStart, windowEnd, priorWindowStart, priorWindowEnd],
      },
      {
        id: 'api_calls_by_route',
        sql: `
          ${normalizedSql}
          SELECT route, COUNT(1) AS count
          FROM scoped
          WHERE route IS NOT NULL
            AND (
              event_name IN ('api_call', 'api_request', 'api_hit')
              OR route LIKE '/api/%'
            )
          GROUP BY route
          ORDER BY count DESC, route ASC
          LIMIT ?;
        `,
        params: [windowStart, windowEnd, topN],
      },
      {
        id: 'api_calls_by_client',
        sql: `
          ${normalizedSql}
          SELECT
            CASE
              WHEN client_type IN ('web', 'agent', 'cron', 'unknown') THEN client_type
              ELSE 'unknown'
            END AS client,
            COUNT(1) AS count
          FROM scoped
          WHERE event_name IN ('api_call', 'api_request', 'api_hit')
             OR route LIKE '/api/%'
          GROUP BY client
          ORDER BY count DESC, client ASC;
        `,
        params: [windowStart, windowEnd],
      },
      {
        id: 'most_viewed_companies',
        sql: `
          ${normalizedSql}
          SELECT ticker, COUNT(1) AS count
          FROM scoped
          WHERE ticker IS NOT NULL
            AND (
              event_name IN ('company_view', 'company_page_view', 'company_open')
              OR route LIKE '/company/%'
            )
          GROUP BY ticker
          ORDER BY count DESC, ticker ASC
          LIMIT ?;
        `,
        params: [windowStart, windowEnd, topN],
      },
      {
        id: 'most_queried_metrics',
        sql: `
          ${normalizedSql}
          SELECT metric, COUNT(1) AS count
          FROM scoped
          WHERE metric IS NOT NULL
            AND (
              event_name IN ('metric_query', 'history_query', 'metric_selected', 'history_view')
              OR route LIKE '%/history%'
            )
          GROUP BY metric
          ORDER BY count DESC, metric ASC
          LIMIT ?;
        `,
        params: [windowStart, windowEnd, topN],
      },
      {
        id: 'citation_ctr',
        sql: `
          ${normalizedSql},
          agg AS (
            SELECT
              SUM(CASE WHEN event_name IN ('citation_open', 'citation_opened', 'citation_modal_open') THEN 1 ELSE 0 END) AS citation_opens,
              SUM(CASE WHEN event_name IN ('source_click', 'source_clicked', 'citation_source_click') THEN 1 ELSE 0 END) AS source_clicks
            FROM scoped
          )
          SELECT
            citation_opens,
            source_clicks,
            CASE
              WHEN citation_opens = 0 THEN 0.0
              ELSE ROUND((source_clicks * 1.0) / citation_opens, 4)
            END AS ctr
          FROM agg;
        `,
        params: [windowStart, windowEnd],
      },
      {
        id: 'history_usage_heatmap',
        sql: `
          ${normalizedSql}
          SELECT metric, ticker, COUNT(1) AS count
          FROM scoped
          WHERE metric IS NOT NULL
            AND ticker IS NOT NULL
            AND (
              event_name IN ('history_query', 'metric_query', 'history_view')
              OR route LIKE '%/history%'
            )
          GROUP BY metric, ticker
          ORDER BY count DESC, metric ASC, ticker ASC
          LIMIT ?;
        `,
        params: [windowStart, windowEnd, heatmapTopN],
      },
    ];

    const [
      usersRes,
      apiCallsRes,
      apiCallsByClientRes,
      viewedRes,
      metricsRes,
      ctrRes,
      heatmapRes,
    ] = await Promise.all(queries.map(q => d1.query<Record<string, unknown>>(q.sql, q.params)));

    const users = usersRes.results[0] || { unique_users: 0, returning_users: 0 };
    const ctr = ctrRes.results[0] || { citation_opens: 0, source_clicks: 0, ctr: 0 };
    const clientCounts = new Map(
      apiCallsByClientRes.results.map(r => [String(r.client || 'unknown'), Number(r.count || 0)])
    );
    const uniqueUsers = Number(users.unique_users || 0);
    const citationOpens = Number(ctr.citation_opens || 0);
    const sourceClicks = Number(ctr.source_clicks || 0);
    const apiCallsTotal = apiCallsByClientRes.results.reduce((sum, r) => sum + Number(r.count || 0), 0);
    const historyUsageTotal = heatmapRes.results.reduce((sum, r) => sum + Number(r.count || 0), 0);
    const citationOpenRate = uniqueUsers === 0 ? 0 : Number((citationOpens / uniqueUsers).toFixed(4));
    const sourceClickRate = uniqueUsers === 0 ? 0 : Number((sourceClicks / uniqueUsers).toFixed(4));
    const historyUsageRate = uniqueUsers === 0 ? 0 : Number((historyUsageTotal / uniqueUsers).toFixed(4));

    return NextResponse.json({
      success: true,
      window: `${days}d`,
      offsetDays,
      generated_at: new Date().toISOString(),
      window_bounds: {
        start_offset: windowStart,
        end_offset: windowEnd,
      },
      source: {
        table,
        columns: Array.from(columns).sort(),
      },
      metrics: {
        unique_users: uniqueUsers,
        returning_users: Number(users.returning_users || 0),
        api_calls_by_route: apiCallsRes.results.map(r => ({
          route: String(r.route),
          count: Number(r.count || 0),
        })),
        api_calls_by_client: ['web', 'agent', 'cron', 'unknown'].map((client) => ({
          client,
          count: clientCounts.get(client) || 0,
        })),
        most_viewed_companies: viewedRes.results.map(r => ({
          ticker: String(r.ticker),
          count: Number(r.count || 0),
        })),
        most_queried_metrics: metricsRes.results.map(r => ({
          metric: String(r.metric),
          count: Number(r.count || 0),
        })),
        citations: {
          opens: citationOpens,
          source_clicks: sourceClicks,
          ctr: Number(ctr.ctr || 0),
        },
        history_usage_heatmap: heatmapRes.results.map(r => ({
          metric: String(r.metric),
          ticker: String(r.ticker),
          count: Number(r.count || 0),
        })),
        adoption_summary: {
          api_calls_total: apiCallsTotal,
          citation_open_rate: citationOpenRate,
          source_click_rate: sourceClickRate,
          history_usage_rate: historyUsageRate,
        },
      },
      sql: queries,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
