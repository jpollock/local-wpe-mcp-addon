import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeFleetHealthHandler } from '../../../../src/tools/composite/fleet-health.js';

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

interface HealthIssue {
  severity: string;
  category: string;
  account_id: string;
  account_name: string;
  install_id?: string;
  install_name?: string;
  message: string;
}

describe('wpe_fleet_health', () => {
  it('reports healthy fleet with no issues', async () => {
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    mockServer.use(
      http.get(`${BASE_URL}/accounts`, () =>
        HttpResponse.json({
          results: [
            { id: 'acc-1', name: 'Account One' },
            { id: 'acc-2', name: 'Account Two' },
          ],
          next: null, count: 2,
        })),
      http.get(`${BASE_URL}/installs`, ({ request }) => {
        const url = new URL(request.url);
        const accountId = url.searchParams.get('account_id');
        if (accountId === 'acc-1') {
          return HttpResponse.json({
            results: [
              { id: 'i1', name: 'prod', environment: 'production', status: 'active', php_version: '8.2', site: { id: 's1' } },
            ],
            next: null, count: 1,
          });
        }
        return HttpResponse.json({
          results: [
            { id: 'i2', name: 'prod2', environment: 'production', status: 'active', php_version: '8.2', site: { id: 's2' } },
          ],
          next: null, count: 1,
        });
      }),
      http.get(`${BASE_URL}/accounts/:accountId/limits`, () =>
        HttpResponse.json({
          visitors: { allowed: 100000, used: 50000 },
          storage: { allowed: 20000000000, used: 5000000000 },
          bandwidth: { allowed: 50000000000, used: 10000000000 },
        })),
      http.get(`${BASE_URL}/installs/:installId/ssl_certificates`, () =>
        HttpResponse.json({
          certificates: [
            { type: 'letsencrypt', expires_at: futureDate, primary_domain: 'example.com' },
          ],
        })),
    );

    const result = await wpeFleetHealthHandler({}, createClient()) as Record<string, unknown>;

    expect(result.total_accounts).toBe(2);
    expect(result.total_installs).toBe(2);

    const issues = result.issues as HealthIssue[];
    expect(issues).toEqual([]);

    const accounts = result.accounts as Array<Record<string, unknown>>;
    expect(accounts).toHaveLength(2);

    // Check headroom is populated
    const headroom = accounts[0]!.headroom as Record<string, Record<string, unknown>>;
    expect(headroom.visitors.percent_used).toBe(50);
    expect(headroom.storage.percent_used).toBe(25);
    expect(headroom.bandwidth.percent_used).toBe(20);

    expect(result).not.toHaveProperty('errors');
  });

  it('detects mixed health issues across accounts', async () => {
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const expiredDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

    mockServer.use(
      http.get(`${BASE_URL}/accounts`, () =>
        HttpResponse.json({
          results: [
            { id: 'acc-1', name: 'Account One' },
            { id: 'acc-2', name: 'Account Two' },
          ],
          next: null, count: 2,
        })),
      http.get(`${BASE_URL}/installs`, ({ request }) => {
        const url = new URL(request.url);
        const accountId = url.searchParams.get('account_id');
        if (accountId === 'acc-1') {
          return HttpResponse.json({
            results: [
              { id: 'i1', name: 'no-ssl-install', environment: 'production', status: 'active', php_version: '8.2', site: { id: 's1' } },
            ],
            next: null, count: 1,
          });
        }
        return HttpResponse.json({
          results: [
            { id: 'i2', name: 'expired-ssl', environment: 'production', status: 'active', php_version: '8.2', site: { id: 's2' } },
            { id: 'i3', name: 'staging-php', environment: 'staging', status: 'active', php_version: '8.1', site: { id: 's2' } },
          ],
          next: null, count: 2,
        });
      }),
      http.get(`${BASE_URL}/accounts/:accountId/limits`, ({ params }) => {
        if (params['accountId'] === 'acc-1') {
          return HttpResponse.json({
            visitors: { allowed: 100000, used: 92000 },
            storage: { allowed: 20000000000, used: 5000000000 },
            bandwidth: { allowed: 50000000000, used: 10000000000 },
          });
        }
        return HttpResponse.json({
          visitors: { allowed: 100000, used: 50000 },
          storage: { allowed: 20000000000, used: 19500000000 },
          bandwidth: { allowed: 50000000000, used: 10000000000 },
        });
      }),
      http.get(`${BASE_URL}/installs/:installId/ssl_certificates`, ({ params }) => {
        const installId = params['installId'];
        if (installId === 'i1') {
          // No SSL certs
          return HttpResponse.json({ certificates: [] });
        }
        if (installId === 'i2') {
          // Expired SSL
          return HttpResponse.json({
            certificates: [
              { type: 'letsencrypt', expires_at: expiredDate, primary_domain: 'expired.com' },
            ],
          });
        }
        // i3 — valid SSL
        return HttpResponse.json({
          certificates: [
            { type: 'letsencrypt', expires_at: futureDate, primary_domain: 'staging.com' },
          ],
        });
      }),
    );

    const result = await wpeFleetHealthHandler({}, createClient()) as Record<string, unknown>;

    expect(result.total_accounts).toBe(2);
    expect(result.total_installs).toBe(3);

    const issues = result.issues as HealthIssue[];
    expect(issues.length).toBeGreaterThan(0);

    // Critical issues should come first
    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    const warningIssues = issues.filter((i) => i.severity === 'warning');
    const infoIssues = issues.filter((i) => i.severity === 'info');

    // Expired SSL is critical
    expect(criticalIssues.some((i) => i.category === 'ssl' && i.install_name === 'expired-ssl')).toBe(true);

    // Storage at 97.5% is critical
    expect(criticalIssues.some((i) => i.category === 'capacity' && i.account_name === 'Account Two')).toBe(true);

    // Visitors at 92% is warning
    expect(warningIssues.some((i) => i.category === 'capacity' && i.account_name === 'Account One')).toBe(true);

    // No SSL is warning
    expect(warningIssues.some((i) => i.category === 'ssl' && i.install_name === 'no-ssl-install')).toBe(true);

    // PHP mismatch is info
    expect(infoIssues.some((i) => i.category === 'php_version')).toBe(true);

    // Verify ordering: all criticals before all warnings before all infos
    const severityOrder = issues.map((i) => i.severity);
    const criticalEnd = severityOrder.lastIndexOf('critical');
    const warningStart = severityOrder.indexOf('warning');
    const warningEnd = severityOrder.lastIndexOf('warning');
    const infoStart = severityOrder.indexOf('info');

    if (criticalEnd >= 0 && warningStart >= 0) {
      expect(criticalEnd).toBeLessThan(warningStart);
    }
    if (warningEnd >= 0 && infoStart >= 0) {
      expect(warningEnd).toBeLessThan(infoStart);
    }

    expect(result).not.toHaveProperty('errors');
  });

  it('handles empty accounts list', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
    );

    const result = await wpeFleetHealthHandler({}, createClient()) as Record<string, unknown>;
    expect(result.total_accounts).toBe(0);
    expect(result.total_installs).toBe(0);
    expect(result.issues).toEqual([]);
    expect(result.accounts).toEqual([]);
  });

  it('handles partial failure with errors array', async () => {
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    mockServer.use(
      http.get(`${BASE_URL}/accounts`, () =>
        HttpResponse.json({
          results: [
            { id: 'acc-1', name: 'Account One' },
            { id: 'acc-2', name: 'Account Two' },
          ],
          next: null, count: 2,
        })),
      http.get(`${BASE_URL}/installs`, ({ request }) => {
        const url = new URL(request.url);
        const accountId = url.searchParams.get('account_id');
        if (accountId === 'acc-1') {
          return HttpResponse.json({
            results: [
              { id: 'i1', name: 'prod', environment: 'production', status: 'active', php_version: '8.2', site: { id: 's1' } },
            ],
            next: null, count: 1,
          });
        }
        // acc-2 returns 403
        return new HttpResponse(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
      }),
      http.get(`${BASE_URL}/accounts/:accountId/limits`, ({ params }) => {
        if (params['accountId'] === 'acc-1') {
          return HttpResponse.json({
            visitors: { allowed: 100000, used: 50000 },
            storage: { allowed: 20000000000, used: 5000000000 },
            bandwidth: { allowed: 50000000000, used: 10000000000 },
          });
        }
        return new HttpResponse(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
      }),
      http.get(`${BASE_URL}/installs/:installId/ssl_certificates`, () =>
        HttpResponse.json({
          certificates: [
            { type: 'letsencrypt', expires_at: futureDate, primary_domain: 'example.com' },
          ],
        })),
    );

    const result = await wpeFleetHealthHandler({}, createClient()) as Record<string, unknown>;

    // Account One should succeed
    const accounts = result.accounts as Array<Record<string, unknown>>;
    expect(accounts.length).toBeGreaterThanOrEqual(1);
    expect(accounts.some((a) => a.account_name === 'Account One')).toBe(true);

    // Should have errors for Account Two
    const errors = result.errors as Array<Record<string, unknown>>;
    expect(errors).toBeDefined();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.account_id === 'acc-2')).toBe(true);
  });
});
