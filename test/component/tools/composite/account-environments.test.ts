import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeAccountEnvironmentsHandler } from '../../../../src/tools/composite/account-environments.js';

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

describe('wpe_account_environments', () => {
  it('builds topology map with environment distribution', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/sites`, () =>
        HttpResponse.json({
          results: [
            { id: 's1', name: 'Main Site' },
            { id: 's2', name: 'Blog' },
          ],
          next: null, count: 2,
        })),
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({
          results: [
            { id: 'i1', name: 'prod', environment: 'production', php_version: '8.2', site: { id: 's1', name: 'Main Site' } },
            { id: 'i2', name: 'stg', environment: 'staging', php_version: '8.2', site: { id: 's1', name: 'Main Site' } },
            { id: 'i3', name: 'blog-prod', environment: 'production', php_version: '8.1', site: { id: 's2', name: 'Blog' } },
          ],
          next: null, count: 3,
        })),
    );

    const result = await wpeAccountEnvironmentsHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    const topology = result.topology as Array<{ site_name: string; has_staging: boolean; environments: unknown[] }>;
    expect(topology).toHaveLength(2);

    const mainSite = topology.find((t) => t.site_name === 'Main Site')!;
    expect(mainSite.has_staging).toBe(true);
    expect(mainSite.environments).toHaveLength(2);

    const blog = topology.find((t) => t.site_name === 'Blog')!;
    expect(blog.has_staging).toBe(false);

    const summary = result.summary as Record<string, unknown>;
    expect(summary.total_sites).toBe(2);
    expect(summary.total_installs).toBe(3);
    expect(summary.sites_with_staging).toBe(1);
    expect(summary.sites_without_staging).toBe(1);
    expect((summary.php_version_distribution as Record<string, number>)['8.2']).toBe(2);
    expect((summary.php_version_distribution as Record<string, number>)['8.1']).toBe(1);
  });

  it('handles empty account', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/sites`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
      http.get(`${BASE_URL}/installs`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
    );

    const result = await wpeAccountEnvironmentsHandler({ account_id: 'acc-1' }, createClient()) as Record<string, unknown>;
    const summary = result.summary as { total_sites: number; total_installs: number };
    expect(summary.total_sites).toBe(0);
    expect(summary.total_installs).toBe(0);
  });
});
