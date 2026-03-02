import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

export const runtime = 'nodejs';

/**
 * Lookup a D1 artifact by artifact_id.
 * GET /api/d1/artifact?artifact_id=...
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const artifactId = (searchParams.get('artifact_id') || '').trim();

  if (!artifactId) {
    return NextResponse.json({ success: false, error: 'Missing artifact_id' }, { status: 400 });
  }

  try {
    const d1 = D1Client.fromEnv();
    const out = await d1.query<any>(
      `SELECT artifact_id, source_type, source_url, fetched_at, r2_bucket, r2_key, cik, ticker, accession
       FROM artifacts
       WHERE artifact_id = ?
       LIMIT 1;`,
      [artifactId]
    );

    const artifact = out.results?.[0] || null;
    return NextResponse.json({ success: true, artifact_id: artifactId, artifact });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
