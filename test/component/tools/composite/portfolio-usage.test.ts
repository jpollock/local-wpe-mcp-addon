import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpePortfolioUsageHandler } from '../../../../src/tools/composite/portfolio-usage.js';

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

describe('wpe_portfolio_usage', () => {
  it('consolidates usage across accounts and ranks by visits', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts`, () =>
        HttpResponse.json({
          results: [
            { id: 'acc-1', name: 'Account One' },
            { id: 'acc-2', name: 'Account Two' },
          ],
          next: null, count: 2,
        })),
      http.get(`${BASE_URL}/accounts/acc-1/usage`, () =>
        HttpResponse.json({
          environment_metrics: [
            {
              environment_name: 'prod-site',
              metrics: [],
              metrics_rollup: {
                visit_count: { sum: 100 },
                network_total_bytes: { sum: 5000000 },
                storage_file_bytes: { latest: { value: 1000000 } },
                storage_database_bytes: { latest: { value: 500000 } },
              },
            },
          ],
        })),
      http.get(`${BASE_URL}/accounts/acc-2/usage`, () =>
        HttpResponse.json({
          environment_metrics: [
            {
              environment_name: 'high-traffic',
              metrics: [],
              metrics_rollup: {
                visit_count: { sum: 5000 },
                network_total_bytes: { sum: 90000000 },
                storage_file_bytes: { latest: { value: 2000000 } },
                storage_database_bytes: { latest: { value: 800000 } },
              },
            },
            {
              environment_name: 'low-traffic',
              metrics: [],
              metrics_rollup: {
                visit_count: { sum: 10 },
                network_total_bytes: { sum: 50000 },
                storage_file_bytes: { latest: { value: 100000 } },
                storage_database_bytes: { latest: { value: 50000 } },
              },
            },
          ],
        })),
    );

    const result = await wpePortfolioUsageHandler({}, createClient()) as Record<string, unknown>;

    expect(result.total_accounts).toBe(2);

    const installs = result.installs as Array<Record<string, unknown>>;
    expect(installs).toHaveLength(3);

    // Should be sorted by visits descending
    expect(installs[0]!.install_name).toBe('high-traffic');
    expect(installs[0]!.total_visits).toBe(5000);
    expect(installs[0]!.account_name).toBe('Account Two');

    expect(installs[1]!.install_name).toBe('prod-site');
    expect(installs[1]!.total_visits).toBe(100);

    expect(installs[2]!.install_name).toBe('low-traffic');
    expect(installs[2]!.total_visits).toBe(10);

    expect(result).not.toHaveProperty('errors');
  });

  it('handles empty accounts list', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
    );

    const result = await wpePortfolioUsageHandler({}, createClient()) as Record<string, unknown>;
    expect(result.total_accounts).toBe(0);
    expect((result.installs as unknown[]).length).toBe(0);
  });
});
