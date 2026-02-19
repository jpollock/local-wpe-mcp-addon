import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeAccountOverviewHandler } from '../../../../src/tools/composite/account-overview.js';

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

describe('wpe_account_overview', () => {
  it('returns aggregated account data', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts/acc-1`, () =>
        HttpResponse.json({ id: 'acc-1', name: 'Test Account' })),
      http.get(`${BASE_URL}/accounts/acc-1/limits`, () =>
        HttpResponse.json({ sites: 10, installs: 30 })),
      http.get(`${BASE_URL}/accounts/acc-1/usage/summary`, () =>
        HttpResponse.json({ bandwidth: '500GB', visits: 100000 })),
      http.get(`${BASE_URL}/sites`, () =>
        HttpResponse.json({ results: [{ id: 's1' }, { id: 's2' }], next: null, count: 2 })),
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({ results: [{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }], next: null, count: 3 })),
    );

    const result = await wpeAccountOverviewHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    expect(result.account).toEqual({ id: 'acc-1', name: 'Test Account' });
    expect(result.limits).toEqual({ sites: 10, installs: 30 });
    expect(result.usage_summary).toEqual({ bandwidth: '500GB', visits: 100000 });
    expect(result.site_count).toBe(2);
    expect(result.install_count).toBe(3);
  });

  it('handles account not found', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts/bad`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
      http.get(`${BASE_URL}/accounts/bad/limits`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
      http.get(`${BASE_URL}/accounts/bad/usage/summary`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
      http.get(`${BASE_URL}/sites`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
    );

    const result = await wpeAccountOverviewHandler({ account_id: 'bad' }, createClient()) as Record<string, unknown>;
    expect(result.error).toBeDefined();
  });

  it('handles partial failures gracefully', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts/acc-1`, () =>
        HttpResponse.json({ id: 'acc-1', name: 'Test Account' })),
      http.get(`${BASE_URL}/accounts/acc-1/limits`, () =>
        HttpResponse.json({ error: 'Forbidden' }, { status: 403 })),
      http.get(`${BASE_URL}/accounts/acc-1/usage/summary`, () =>
        HttpResponse.json({ bandwidth: '500GB' })),
      http.get(`${BASE_URL}/sites`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
    );

    const result = await wpeAccountOverviewHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    expect(result.account).toEqual({ id: 'acc-1', name: 'Test Account' });
    const limits = result.limits as Record<string, unknown>;
    expect(limits.error).toBeDefined();
    expect(result.usage_summary).toEqual({ bandwidth: '500GB' });
  });
});
