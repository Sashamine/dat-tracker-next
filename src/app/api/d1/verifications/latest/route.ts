import { NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

// GET /api/d1/verifications/latest?entity_id=MSTR&metric=basic_shares&limit=50
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const entityId = (searchParams.get('entity_id') || '').trim().toUpperCase();
  const metric = (searchParams.get('metric') || '').trim();
  const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || '50')));

  if (!entityId) {
    return NextResponse.json({ ok: false, error: 'Missing query param: entity_id' }, { status: 400 });
  }

  const d1 = D1Client.fromEnv();

  const where: string[] = ['d.entity_id = ?'];
  const params: any[] = [entityId];

  if (metric) {
    where.push('d.metric = ?');
    params.push(metric);
  }

  const q = `
    SELECT
      v.verification_id,
      v.datapoint_id,
      v.verdict,
      v.checks_json,
      v.checked_at,
      v.verifier,
      v.code_sha,

      d.entity_id,
      d.metric,
      d.value,
      d.unit,
      d.as_of,
      d.reported_at,
      d.artifact_id,
      d.run_id,
      d.method,
      d.confidence,

      a.source_url
    FROM datapoint_verifications v
    JOIN datapoints d ON d.datapoint_id = v.datapoint_id
    LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
    WHERE ${where.join(' AND ')}
    ORDER BY v.checked_at DESC
    LIMIT ?;
  `;
  params.push(limit);

  const rows = await d1.query<any>(q, params);

  return NextResponse.json({ ok: true, rows: rows.results });
}
