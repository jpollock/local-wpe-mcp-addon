import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeAccountUsageHandler } from '../../../../src/tools/composite/account-usage.js';

const BASE_URL = 'https://api.wpengineapi.com/v1';
const mockServer = setupServer();

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());

function createClient() {
  process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
  process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';
  return new CapiClient({ authProvider: createAuthProvider() });
}

describe('wpe_account_usage', () => {
  it('returns usage with insights', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts/acc-1/usage`, () =>
        HttpResponse.json({ bandwidth: 1024, visits: 50000 })),
      http.get(`${BASE_URL}/accounts/acc-1/usage/insights`, () =>
        HttpResponse.json({ trend: 'increasing', top_pages: ['/home'] })),
    );

    const result = await wpeAccountUsageHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    expect(result.usage).toEqual({ bandwidth: 1024, visits: 50000 });
    expect(result.insights).toEqual({ trend: 'increasing', top_pages: ['/home'] });
  });

  it('handles usage error', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts/acc-1/usage`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
      http.get(`${BASE_URL}/accounts/acc-1/usage/insights`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
    );

    const result = await wpeAccountUsageHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    expect(result.error).toBeDefined();
  });
});
