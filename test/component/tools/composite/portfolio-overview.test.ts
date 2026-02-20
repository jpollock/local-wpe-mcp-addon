import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpePortfolioOverviewHandler } from '../../../../src/tools/composite/portfolio-overview.js';

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

describe('wpe_portfolio_overview', () => {
  it('consolidates sites and installs across multiple accounts', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts`, () =>
        HttpResponse.json({
          results: [
            { id: 'acc-1', name: 'Account One' },
            { id: 'acc-2', name: 'Account Two' },
          ],
          next: null, count: 2,
        })),
      http.get(`${BASE_URL}/sites`, ({ request }) => {
        const url = new URL(request.url);
        const accountId = url.searchParams.get('account_id');
        if (accountId === 'acc-1') {
          return HttpResponse.json({ results: [{ id: 's1', name: 'Site One' }], next: null, count: 1 });
        }
        return HttpResponse.json({ results: [{ id: 's2', name: 'Site Two' }, { id: 's3', name: 'Site Three' }], next: null, count: 2 });
      }),
      http.get(`${BASE_URL}/installs`, ({ request }) => {
        const url = new URL(request.url);
        const accountId = url.searchParams.get('account_id');
        if (accountId === 'acc-1') {
          return HttpResponse.json({
            results: [
              { id: 'i1', name: 'prod', environment: 'production', status: 'active', php_version: '8.2', primary_domain: 'example.com', site: { id: 's1' } },
            ],
            next: null, count: 1,
          });
        }
        return HttpResponse.json({
          results: [
            { id: 'i2', name: 'staging', environment: 'staging', status: 'active', php_version: '8.1', site: { id: 's2' } },
            { id: 'i3', name: 'dev', environment: 'development', status: 'active', php_version: '8.2', site: { id: 's3' } },
          ],
          next: null, count: 2,
        });
      }),
    );

    const result = await wpePortfolioOverviewHandler({}, createClient()) as Record<string, unknown>;

    expect(result.total_accounts).toBe(2);
    expect(result.total_sites).toBe(3);
    expect(result.total_installs).toBe(3);

    const accounts = result.accounts as Array<Record<string, unknown>>;
    expect(accounts).toHaveLength(2);
    expect(accounts[0]!.account_name).toBe('Account One');
    expect(accounts[0]!.site_count).toBe(1);
    expect(accounts[0]!.install_count).toBe(1);
    expect(accounts[1]!.account_name).toBe('Account Two');
    expect(accounts[1]!.site_count).toBe(2);
    expect(accounts[1]!.install_count).toBe(2);

    // Verify install fields are condensed
    const installs = accounts[0]!.installs as Array<Record<string, unknown>>;
    expect(installs[0]).toEqual({
      id: 'i1',
      name: 'prod',
      environment: 'production',
      status: 'active',
      php_version: '8.2',
      primary_domain: 'example.com',
      site_id: 's1',
    });

    expect(result).not.toHaveProperty('errors');
  });

  it('handles empty accounts list', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
    );

    const result = await wpePortfolioOverviewHandler({}, createClient()) as Record<string, unknown>;
    expect(result.total_accounts).toBe(0);
    expect(result.total_sites).toBe(0);
    expect(result.total_installs).toBe(0);
  });
});
