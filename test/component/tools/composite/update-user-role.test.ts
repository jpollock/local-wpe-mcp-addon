import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeUpdateUserRoleHandler } from '../../../../src/tools/composite/update-user-role.js';

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

describe('wpe_update_user_role', () => {
  it('updates user role successfully', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts/:accountId/account_users`, () =>
        HttpResponse.json({
          results: [
            {
              user_id: 'u1', email: 'alice@example.com',
              roles: 'partial', last_owner: false,
            },
          ],
          count: 1, next: null,
        })),
      http.patch(`${BASE_URL}/accounts/:accountId/account_users/:userId`, () =>
        HttpResponse.json({
          user_id: 'u1', email: 'alice@example.com',
          roles: 'full', last_owner: false,
        })),
    );

    const result = await wpeUpdateUserRoleHandler({
      email: 'alice@example.com',
      account_id: 'acc-1',
      roles: 'full',
    }, createClient()) as Record<string, unknown>;

    expect(result.status).toBe('updated');
    expect(result.email).toBe('alice@example.com');
    expect(result.previous_roles).toBe('partial');
    expect(result.new_roles).toBe('full');
  });

  it('refuses to demote last owner', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts/:accountId/account_users`, () =>
        HttpResponse.json({
          results: [
            {
              user_id: 'u1', email: 'owner@example.com',
              roles: 'owner', last_owner: true,
            },
          ],
          count: 1, next: null,
        })),
    );

    const result = await wpeUpdateUserRoleHandler({
      email: 'owner@example.com',
      account_id: 'acc-1',
      roles: 'full',
    }, createClient()) as Record<string, unknown>;

    expect(result.status).toBe('error');
    expect(result.error).toContain('last owner');
    expect(result.warning).toContain('Transfer ownership');
  });

  it('returns error when user not found on account', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts/:accountId/account_users`, () =>
        HttpResponse.json({
          results: [
            {
              user_id: 'u1', email: 'other@example.com',
              roles: 'full', last_owner: false,
            },
          ],
          count: 1, next: null,
        })),
    );

    const result = await wpeUpdateUserRoleHandler({
      email: 'missing@example.com',
      account_id: 'acc-1',
      roles: 'full',
    }, createClient()) as Record<string, unknown>;

    expect(result.status).toBe('error');
    expect(result.error).toContain('not found');
  });
});
