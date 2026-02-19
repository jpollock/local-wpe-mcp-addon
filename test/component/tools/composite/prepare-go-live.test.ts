import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpePrepareGoLiveHandler } from '../../../../src/tools/composite/prepare-go-live.js';

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

describe('wpe_prepare_go_live', () => {
  it('produces passing checklist when everything is configured', async () => {
    const recentBackup = new Date().toISOString();
    const validExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    mockServer.use(
      http.get(`${BASE_URL}/installs/inst-1`, () =>
        HttpResponse.json({ id: 'inst-1', name: 'production' })),
      http.get(`${BASE_URL}/installs/inst-1/domains`, () =>
        HttpResponse.json({ results: [{ id: 'd1', name: 'example.com', primary: true }] })),
      http.get(`${BASE_URL}/installs/inst-1/ssl_certificates`, () =>
        HttpResponse.json({ certificates: [{ type: 'lets_encrypt', expires_at: validExpiry }] })),
      http.get(`${BASE_URL}/installs/inst-1/backups`, () =>
        HttpResponse.json({ results: [{ id: 'b1', created_at: recentBackup }] })),
    );

    const result = await wpePrepareGoLiveHandler({ install_id: 'inst-1' }, createClient()) as Record<string, unknown>;
    const summary = result.summary as { ready: boolean; passed: number; failed: number };
    expect(summary.ready).toBe(true);
    expect(summary.failed).toBe(0);
    expect(summary.passed).toBeGreaterThan(0);
  });

  it('produces failing checklist when things are missing', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs/inst-1`, () =>
        HttpResponse.json({ id: 'inst-1', name: 'production' })),
      http.get(`${BASE_URL}/installs/inst-1/domains`, () =>
        HttpResponse.json({ results: [] })),
      http.get(`${BASE_URL}/installs/inst-1/ssl_certificates`, () =>
        HttpResponse.json({ certificates: [] })),
      http.get(`${BASE_URL}/installs/inst-1/backups`, () =>
        HttpResponse.json({ results: [] })),
    );

    const result = await wpePrepareGoLiveHandler({ install_id: 'inst-1' }, createClient()) as Record<string, unknown>;
    const summary = result.summary as { ready: boolean; failed: number };
    expect(summary.ready).toBe(false);
    expect(summary.failed).toBeGreaterThan(0);
  });

  it('warns about old backups', async () => {
    const oldBackup = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const validExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    mockServer.use(
      http.get(`${BASE_URL}/installs/inst-1`, () =>
        HttpResponse.json({ id: 'inst-1', name: 'production' })),
      http.get(`${BASE_URL}/installs/inst-1/domains`, () =>
        HttpResponse.json({ results: [{ id: 'd1', name: 'example.com', primary: true }] })),
      http.get(`${BASE_URL}/installs/inst-1/ssl_certificates`, () =>
        HttpResponse.json({ certificates: [{ type: 'lets_encrypt', expires_at: validExpiry }] })),
      http.get(`${BASE_URL}/installs/inst-1/backups`, () =>
        HttpResponse.json({ results: [{ id: 'b1', created_at: oldBackup }] })),
    );

    const result = await wpePrepareGoLiveHandler({ install_id: 'inst-1' }, createClient()) as Record<string, unknown>;
    const checklist = result.checklist as Array<{ check: string; status: string }>;
    const backupCheck = checklist.find((c) => c.check === 'recent_backup')!;
    expect(backupCheck.status).toBe('warning');
  });
});
