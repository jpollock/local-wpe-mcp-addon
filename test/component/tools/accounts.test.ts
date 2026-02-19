import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../src/capi-client.js';
import { createAuthProvider } from '../../../src/auth.js';
import { wpeGetAccountsHandler, wpeGetAccountHandler, wpeGetAccountLimitsHandler } from '../../../src/tools/generated/account.js';
import { accountFixtures, errorFixtures } from '../../fixtures/index.js';

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

describe('Account tools', () => {
  describe('wpe_get_accounts', () => {
    it('returns list of accounts', async () => {
      mockServer.use(http.get(`${BASE_URL}/accounts`, () => HttpResponse.json(accountFixtures.list)));
      const result = await wpeGetAccountsHandler({}, createClient());
      const data = result as typeof accountFixtures.list;
      expect(data.results).toHaveLength(2);
      expect(data.results[0].name).toBe('Production Account');
    });

    it('handles auth error', async () => {
      mockServer.use(http.get(`${BASE_URL}/accounts`, () =>
        HttpResponse.json(errorFixtures.unauthorized.body, { status: 401 })));
      const result = await wpeGetAccountsHandler({}, createClient()) as { error: unknown };
      expect(result.error).toBeDefined();
    });
  });

  describe('wpe_get_account', () => {
    it('returns account details with path parameter', async () => {
      mockServer.use(http.get(`${BASE_URL}/accounts/acc-1`, () => HttpResponse.json(accountFixtures.single)));
      const result = await wpeGetAccountHandler({ account_id: 'acc-1' }, createClient());
      expect(result).toEqual(accountFixtures.single);
    });

    it('handles not found', async () => {
      mockServer.use(http.get(`${BASE_URL}/accounts/bad-id`, () =>
        HttpResponse.json(errorFixtures.notFound.body, { status: 404 })));
      const result = await wpeGetAccountHandler({ account_id: 'bad-id' }, createClient()) as { error: unknown };
      expect(result.error).toBeDefined();
    });
  });

  describe('wpe_get_account_limits', () => {
    it('returns account limits', async () => {
      mockServer.use(http.get(`${BASE_URL}/accounts/acc-1/limits`, () => HttpResponse.json(accountFixtures.limits)));
      const result = await wpeGetAccountLimitsHandler({ account_id: 'acc-1' }, createClient());
      expect(result).toEqual(accountFixtures.limits);
    });
  });
});
