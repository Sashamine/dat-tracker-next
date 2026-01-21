/**
 * Vitest Setup File
 *
 * This runs before each test file. Use for:
 * - Global mocks
 * - Environment setup
 * - Test utilities
 */

import { vi } from 'vitest';

// Note: NODE_ENV is typically set by the test runner, no need to set it here

// Note: Individual tests should mock fetch using vi.stubGlobal('fetch', mockFn)
// Do NOT set a global fetch mock here as it interferes with test-specific mocks
