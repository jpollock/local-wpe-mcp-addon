import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../src/capi-client.js';
import { createAuthProvider } from '../../../src/auth.js';
import {
  wpeGetAccountUsageHandler, wpeRefreshAccountDiskUsageHandler,
  wpeGetAccountUsageSummaryHandler, wpeGetAccountUsageInsightsHandler,
  wpeGetInstallUsageHandler, wpeRefreshInstallDiskUsageHandler,
} from '../../../src/tools/generated/usage.js';
import { usageFixtures } from '../../fixtures/index.js';

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

describe('Usage tools', () => {
  describe('wpe_get_account_usage', () => {
    it('returns account usage metrics', async () => {
      mockServer.use(http.get(`${BASE_URL}/accounts/acc-1/usage`, () =>
        HttpResponse.json(usageFixtures.accountUsage)));
      const result = await wpeGetAccountUsageHandler({ account_id: 'acc-1' }, createClient());
      expect(result).toEqual(usageFixtures.accountUsage);
    });

    it('passes query parameters', async () => {
      let capturedUrl: string | undefined;
      mockServer.use(http.get(`${BASE_URL}/accounts/acc-1/usage`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(usageFixtures.accountUsage);
      }));
      await wpeGetAccountUsageHandler({
        account_id: 'acc-1', first_date: '2024-06-01', last_date: '2024-06-30',
      }, createClient());
      expect(capturedUrl).toContain('first_date=2024-06-01');
      expect(capturedUrl).toContain('last_date=2024-06-30');
    });
  });

  describe('wpe_refresh_account_disk_usage', () => {
    it('refreshes account disk usage', async () => {
      mockServer.use(http.post(`${BASE_URL}/accounts/acc-1/usage/refresh_disk_usage`, () =>
        HttpResponse.json(usageFixtures.refreshDisk)));
      const result = await wpeRefreshAccountDiskUsageHandler({ account_id: 'acc-1' }, createClient());
      expect(result).toEqual(usageFixtures.refreshDisk);
    });
  });

  describe('wpe_get_account_usage_summary', () => {
    it('returns usage summary', async () => {
      mockServer.use(http.get(`${BASE_URL}/accounts/acc-1/usage/summary`, () =>
        HttpResponse.json(usageFixtures.summary)));
      const result = await wpeGetAccountUsageSummaryHandler({ account_id: 'acc-1' }, createClient());
      expect(result).toEqual(usageFixtures.summary);
    });
  });

  describe('wpe_get_account_usage_insights', () => {
    it('returns usage insights', async () => {
      mockServer.use(http.get(`${BASE_URL}/accounts/acc-1/usage/insights`, () =>
        HttpResponse.json(usageFixtures.insights)));
      const result = await wpeGetAccountUsageInsightsHandler({ account_id: 'acc-1' }, createClient());
      expect(result).toEqual(usageFixtures.insights);
    });
  });

  describe('wpe_get_install_usage', () => {
    it('returns install usage metrics', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/inst-1/usage`, () =>
        HttpResponse.json(usageFixtures.installUsage)));
      const result = await wpeGetInstallUsageHandler({ install_id: 'inst-1' }, createClient());
      expect(result).toEqual(usageFixtures.installUsage);
    });
  });

  describe('wpe_refresh_install_disk_usage', () => {
    it('refreshes install disk usage', async () => {
      mockServer.use(http.post(`${BASE_URL}/installs/inst-1/usage/refresh_disk_usage`, () =>
        HttpResponse.json(usageFixtures.refreshDisk)));
      const result = await wpeRefreshInstallDiskUsageHandler({ install_id: 'inst-1' }, createClient());
      expect(result).toEqual(usageFixtures.refreshDisk);
    });
  });
});
