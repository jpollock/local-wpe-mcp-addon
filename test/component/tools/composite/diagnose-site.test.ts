import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeDiagnoseSiteHandler } from '../../../../src/tools/composite/diagnose-site.js';

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

describe('wpe_diagnose_site', () => {
  it('returns all health dimensions when healthy', async () => {
    const validExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    mockServer.use(
      http.get(`${BASE_URL}/installs/inst-1`, () =>
        HttpResponse.json({ id: 'inst-1', name: 'production', environment: 'production' })),
      http.get(`${BASE_URL}/installs/inst-1/usage`, () =>
        HttpResponse.json({ bandwidth: 1024, visits: 5000 })),
      http.get(`${BASE_URL}/installs/inst-1/domains`, () =>
        HttpResponse.json({ results: [{ id: 'd1', name: 'example.com' }] })),
      http.get(`${BASE_URL}/installs/inst-1/ssl_certificates`, () =>
        HttpResponse.json({ certificates: [{ type: 'lets_encrypt', expires_at: validExpiry }] })),
    );

    const result = await wpeDiagnoseSiteHandler({ install_id: 'inst-1' }, createClient()) as Record<string, unknown>;
    expect(result.install).toBeDefined();
    expect(result.usage).toBeDefined();
    expect(result.domains).toBeDefined();
    expect(result.ssl).toBeDefined();
    const health = result.health as { status: string; warnings: string[] };
    expect(health.status).toBe('healthy');
    expect(health.warnings).toHaveLength(0);
  });

  it('flags expiring SSL', async () => {
    const expiringCert = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    mockServer.use(
      http.get(`${BASE_URL}/installs/inst-1`, () =>
        HttpResponse.json({ id: 'inst-1', name: 'production' })),
      http.get(`${BASE_URL}/installs/inst-1/usage`, () =>
        HttpResponse.json({ bandwidth: 1024 })),
      http.get(`${BASE_URL}/installs/inst-1/domains`, () =>
        HttpResponse.json({ results: [] })),
      http.get(`${BASE_URL}/installs/inst-1/ssl_certificates`, () =>
        HttpResponse.json({ certificates: [{ type: 'lets_encrypt', expires_at: expiringCert }] })),
    );

    const result = await wpeDiagnoseSiteHandler({ install_id: 'inst-1' }, createClient()) as Record<string, unknown>;
    const health = result.health as { status: string; warnings: string[] };
    expect(health.status).toBe('attention_needed');
    expect(health.warnings.length).toBeGreaterThanOrEqual(1);
    expect(health.warnings.some((w) => w.includes('SSL'))).toBe(true);
  });

  it('handles install not found', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs/bad`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
      http.get(`${BASE_URL}/installs/bad/usage`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
      http.get(`${BASE_URL}/installs/bad/domains`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
      http.get(`${BASE_URL}/installs/bad/ssl_certificates`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
    );

    const result = await wpeDiagnoseSiteHandler({ install_id: 'bad' }, createClient()) as Record<string, unknown>;
    expect(result.error).toBeDefined();
  });
});
