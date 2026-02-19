import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeAccountSslStatusHandler } from '../../../../src/tools/composite/account-ssl-status.js';

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

describe('wpe_account_ssl_status', () => {
  it('flags expiring and missing SSL certificates', async () => {
    const expiringDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const validDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    mockServer.use(
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({
          results: [
            { id: 'i1', name: 'prod', environment: 'production' },
            { id: 'i2', name: 'staging', environment: 'staging' },
            { id: 'i3', name: 'dev', environment: 'development' },
          ],
          next: null, count: 3,
        })),
      http.get(`${BASE_URL}/installs/i1/ssl_certificates`, () =>
        HttpResponse.json({ certificates: [{ type: 'lets_encrypt', expires_at: validDate }] })),
      http.get(`${BASE_URL}/installs/i2/ssl_certificates`, () =>
        HttpResponse.json({ certificates: [{ type: 'lets_encrypt', expires_at: expiringDate }] })),
      http.get(`${BASE_URL}/installs/i3/ssl_certificates`, () =>
        HttpResponse.json({ certificates: [] })),
    );

    const result = await wpeAccountSslStatusHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    const summary = result.summary as { with_ssl: number; without_ssl: number; expiring_soon: number };
    expect(summary.with_ssl).toBe(2);
    expect(summary.without_ssl).toBe(1);
    expect(summary.expiring_soon).toBe(1);
    expect(result.warnings).toBeDefined();
    expect((result.warnings as string[]).length).toBe(2); // missing + expiring
  });

  it('handles account with no installs', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
    );

    const result = await wpeAccountSslStatusHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    expect(result.message).toBeDefined();
  });
});
