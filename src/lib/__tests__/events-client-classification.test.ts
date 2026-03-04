import { describe, expect, it } from 'vitest';
import { inferApiCallClient } from '@/lib/events';

describe('inferApiCallClient', () => {
  it('prefers explicit hinted client values', () => {
    expect(inferApiCallClient('/api/d1/latest-metrics', 'agent')).toBe('agent');
    expect(inferApiCallClient('/api/d1/latest-metrics', 'cron')).toBe('cron');
    expect(inferApiCallClient('/api/d1/latest-metrics', 'unknown')).toBe('unknown');
  });

  it('defaults cron routes to cron', () => {
    expect(inferApiCallClient('/api/cron/sec-update')).toBe('cron');
    expect(inferApiCallClient('/api/cron/adoption-events-retention')).toBe('cron');
  });

  it('defaults non-cron routes to web', () => {
    expect(inferApiCallClient('/api/d1/latest-metrics')).toBe('web');
    expect(inferApiCallClient('/api/company/[ticker]/metrics')).toBe('web');
    expect(inferApiCallClient(undefined)).toBe('web');
  });
});

