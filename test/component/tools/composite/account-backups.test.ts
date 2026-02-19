import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeAccountBackupsHandler } from '../../../../src/tools/composite/account-backups.js';

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

describe('wpe_account_backups', () => {
  it('returns backups for all installs and flags missing backups', async () => {
    const recentDate = new Date().toISOString();
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    mockServer.use(
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({
          results: [
            { id: 'i1', name: 'prod', environment: 'production' },
            { id: 'i2', name: 'staging', environment: 'staging' },
          ],
          next: null, count: 2,
        })),
      http.get(`${BASE_URL}/installs/i1/backups`, () =>
        HttpResponse.json({ results: [{ id: 'b1', description: 'Daily', created_at: recentDate }] })),
      http.get(`${BASE_URL}/installs/i2/backups`, () =>
        HttpResponse.json({ results: [{ id: 'b2', description: 'Old', created_at: oldDate }] })),
    );

    const result = await wpeAccountBackupsHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    const summary = result.summary as { with_recent_backup: number; without_recent_backup: number };
    expect(summary.with_recent_backup).toBe(1);
    expect(summary.without_recent_backup).toBe(1);
    expect(result.warnings).toBeDefined();
  });

  it('handles account with no installs', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
    );

    const result = await wpeAccountBackupsHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    expect(result.message).toBeDefined();
  });

  it('flags installs without any backups', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({
          results: [{ id: 'i1', name: 'prod', environment: 'production' }],
          next: null, count: 1,
        })),
      http.get(`${BASE_URL}/installs/i1/backups`, () =>
        HttpResponse.json({ results: [] })),
    );

    const result = await wpeAccountBackupsHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    const summary = result.summary as { without_recent_backup: number };
    expect(summary.without_recent_backup).toBe(1);
  });
});
