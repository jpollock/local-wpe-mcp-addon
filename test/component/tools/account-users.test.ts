import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../src/capi-client.js';
import { createAuthProvider } from '../../../src/auth.js';
import {
  wpeGetAccountUsersHandler, wpeCreateAccountUserHandler,
  wpeGetAccountUserHandler, wpeUpdateAccountUserHandler,
  wpeDeleteAccountUserHandler,
} from '../../../src/tools/generated/account-user.js';
import { accountUserFixtures, errorFixtures } from '../../fixtures/index.js';

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

describe('Account User tools', () => {
  describe('wpe_get_account_users', () => {
    it('returns list of account users', async () => {
      mockServer.use(http.get(`${BASE_URL}/accounts/acc-1/account_users`, () =>
        HttpResponse.json(accountUserFixtures.list)));
      const result = await wpeGetAccountUsersHandler({ account_id: 'acc-1' }, createClient());
      const data = result as typeof accountUserFixtures.list;
      expect(data.results).toHaveLength(2);
    });
  });

  describe('wpe_create_account_user', () => {
    it('creates account user with body params', async () => {
      let capturedBody: unknown;
      mockServer.use(http.post(`${BASE_URL}/accounts/acc-1/account_users`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(accountUserFixtures.created, { status: 201 });
      }));
      const result = await wpeCreateAccountUserHandler({
        account_id: 'acc-1', user: { email: 'charlie@example.com', roles: ['partial'] },
      }, createClient());
      expect(result).toEqual(accountUserFixtures.created);
      expect(capturedBody).toEqual({ user: { email: 'charlie@example.com', roles: ['partial'] } });
    });
  });

  describe('wpe_get_account_user', () => {
    it('returns account user by ID', async () => {
      mockServer.use(http.get(`${BASE_URL}/accounts/acc-1/account_users/user-1`, () =>
        HttpResponse.json(accountUserFixtures.single)));
      const result = await wpeGetAccountUserHandler({ account_id: 'acc-1', user_id: 'user-1' }, createClient());
      expect(result).toEqual(accountUserFixtures.single);
    });

    it('handles not found', async () => {
      mockServer.use(http.get(`${BASE_URL}/accounts/acc-1/account_users/bad`, () =>
        HttpResponse.json(errorFixtures.notFound.body, { status: 404 })));
      const result = await wpeGetAccountUserHandler({ account_id: 'acc-1', user_id: 'bad' }, createClient()) as { error: unknown };
      expect(result.error).toBeDefined();
    });
  });

  describe('wpe_update_account_user', () => {
    it('updates account user', async () => {
      let capturedBody: unknown;
      mockServer.use(http.patch(`${BASE_URL}/accounts/acc-1/account_users/user-1`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ...accountUserFixtures.single, roles: ['full'] });
      }));
      const result = await wpeUpdateAccountUserHandler({
        account_id: 'acc-1', user_id: 'user-1', roles: ['full'],
      }, createClient());
      const data = result as { roles: string[] };
      expect(data.roles).toContain('full');
      expect(capturedBody).toEqual({ roles: ['full'] });
    });
  });

  describe('wpe_delete_account_user', () => {
    it('deletes account user', async () => {
      mockServer.use(http.delete(`${BASE_URL}/accounts/acc-1/account_users/user-1`, () =>
        new HttpResponse(null, { status: 204 })));
      const result = await wpeDeleteAccountUserHandler({ account_id: 'acc-1', user_id: 'user-1' }, createClient());
      expect(result).toBeUndefined();
    });
  });
});
