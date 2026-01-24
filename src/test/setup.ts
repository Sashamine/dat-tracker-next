/**
 * Test Setup
 *
 * Global setup for vitest tests.
 */

// Mock fetch globally if not available
if (typeof global.fetch === 'undefined') {
  global.fetch = async () => {
    throw new Error('fetch not mocked for this test');
  };
}

// Set test environment
(process.env as Record<string, string>).NODE_ENV = 'test';
