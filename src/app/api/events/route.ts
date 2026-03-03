import { NextRequest, NextResponse } from 'next/server';
import { insertEvent, type AdoptionEvent } from '@/lib/events';

const VALID_EVENTS = new Set([
  'api_call',
  'page_view',
  'citation_modal_open',
  'citation_source_click',
  'history_view',
]);

const VALID_CLIENTS = new Set(['web', 'agent', 'cron', 'unknown']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // --- validate required fields ---
    const { event, session_id } = body as Record<string, unknown>;
    if (typeof event !== 'string' || !VALID_EVENTS.has(event)) {
      return NextResponse.json(
        { success: false, error: `Invalid event. Must be one of: ${[...VALID_EVENTS].join(', ')}` },
        { status: 400 }
      );
    }
    if (typeof session_id !== 'string' || session_id.length < 8 || session_id.length > 128) {
      return NextResponse.json(
        { success: false, error: 'session_id must be a string (8-128 chars)' },
        { status: 400 }
      );
    }

    // --- determine client ---
    const headerClient = request.headers.get('x-client');
    let client: AdoptionEvent['client'] = 'web';
    if (headerClient && VALID_CLIENTS.has(headerClient)) {
      client = headerClient as AdoptionEvent['client'];
    } else if (typeof body.client === 'string' && VALID_CLIENTS.has(body.client)) {
      client = body.client as AdoptionEvent['client'];
    }

    // --- build event ---
    const evt: AdoptionEvent = {
      event,
      client,
      session_id: String(session_id),
      route: typeof body.route === 'string' ? body.route : undefined,
      ticker: typeof body.ticker === 'string' ? body.ticker.toUpperCase() : undefined,
      metric: typeof body.metric === 'string' ? body.metric : undefined,
      datapoint_id: typeof body.datapoint_id === 'string' ? body.datapoint_id : undefined,
      artifact_id: typeof body.artifact_id === 'string' ? body.artifact_id : undefined,
      run_id: typeof body.run_id === 'string' ? body.run_id : undefined,
      meta: typeof body.meta === 'object' && body.meta !== null ? body.meta : undefined,
    };

    const ok = await insertEvent(evt);
    return NextResponse.json({ success: true, accepted: ok });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
