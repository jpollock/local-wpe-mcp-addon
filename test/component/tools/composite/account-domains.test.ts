import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeAccountDomainsHandler } from '../../../../src/tools/composite/account-domains.js';

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

describe('wpe_account_domains', () => {
  it('aggregates domains across all installs', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({
          results: [
            { id: 'i1', name: 'prod', environment: 'production' },
            { id: 'i2', name: 'staging', environment: 'staging' },
          ],
          next: null, count: 2,
        })),
      http.get(`${BASE_URL}/installs/i1/domains`, () =>
        HttpResponse.json({ results: [{ id: 'd1', name: 'example.com', primary: true }] })),
      http.get(`${BASE_URL}/installs/i1/ssl_certificates`, () =>
        HttpResponse.json({ certificates: [{ type: 'lets_encrypt' }] })),
      http.get(`${BASE_URL}/installs/i2/domains`, () =>
        HttpResponse.json({ results: [{ id: 'd2', name: 'staging.example.com', primary: false }] })),
      http.get(`${BASE_URL}/installs/i2/ssl_certificates`, () =>
        HttpResponse.json({ certificates: [] })),
    );

    const result = await wpeAccountDomainsHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    expect(result.total_domains).toBe(2);
    expect((result.installs as unknown[]).length).toBe(2);
  });

  it('handles account with no installs', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
    );

    const result = await wpeAccountDomainsHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    expect(result.total_domains).toBe(0);
    expect(result.message).toBeDefined();
  });

  it('handles partial failures gracefully', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({
          results: [
            { id: 'i1', name: 'prod', environment: 'production' },
            { id: 'i2', name: 'staging', environment: 'staging' },
          ],
          next: null, count: 2,
        })),
      http.get(`${BASE_URL}/installs/i1/domains`, () =>
        HttpResponse.json({ results: [{ id: 'd1', name: 'example.com', primary: true }] })),
      http.get(`${BASE_URL}/installs/i1/ssl_certificates`, () =>
        HttpResponse.json({ certificates: [] })),
      http.get(`${BASE_URL}/installs/i2/domains`, () =>
        HttpResponse.json({ error: 'Forbidden' }, { status: 403 })),
      http.get(`${BASE_URL}/installs/i2/ssl_certificates`, () =>
        HttpResponse.json({ error: 'Forbidden' }, { status: 403 })),
    );

    const result = await wpeAccountDomainsHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    // Should still return results for the successful install
    expect(result.total_domains).toBe(1);
  });
});
