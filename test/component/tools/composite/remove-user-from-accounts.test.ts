import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeRemoveUserFromAccountsHandler } from '../../../../src/tools/composite/remove-user-from-accounts.js';

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

describe('wpe_remove_user_from_accounts', () => {
  it('removes user from specified accounts', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts/:accountId/account_users`, () =>
        HttpResponse.json({
          results: [
            {
              user_id: 'u1', email: 'alice@example.com',
              last_owner: false, roles: 'full',
            },
            {
              user_id: 'u2', email: 'bob@example.com',
              last_owner: true, roles: 'owner',
            },
          ],
          count: 2, next: null,
        })),
      http.delete(`${BASE_URL}/accounts/:accountId/account_users/:userId`, () =>
        new HttpResponse(null, { status: 204 })),
    );

    const result = await wpeRemoveUserFromAccountsHandler({
      email: 'alice@example.com',
      account_ids: ['acc-1', 'acc-2'],
    }, createClient()) as Record<string, unknown>;

    expect(result.email).toBe('alice@example.com');

    const results = result.results as Array<Record<string, unknown>>;
    expect(results).toHaveLength(2);
    expect(results[0]!.status).toBe('removed');
    expect(results[1]!.status).toBe('removed');

    const summary = result.summary as Record<string, number>;
    expect(summary.removed).toBe(2);
  });

  it('skips last owner with warning', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts/:accountId/account_users`, () =>
        HttpResponse.json({
          results: [
            {
              user_id: 'u1', email: 'owner@example.com',
              last_owner: true, roles: 'owner',
            },
          ],
          count: 1, next: null,
        })),
    );

    const result = await wpeRemoveUserFromAccountsHandler({
      email: 'owner@example.com',
      account_ids: ['acc-1'],
    }, createClient()) as Record<string, unknown>;

    const results = result.results as Array<Record<string, unknown>>;
    expect(results[0]!.status).toBe('skipped');
    expect(results[0]!.reason).toContain('last owner');

    const warnings = result.warnings as string[];
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('last owner');
  });

  it('returns not_found when user does not exist on account', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts/:accountId/account_users`, () =>
        HttpResponse.json({
          results: [
            {
              user_id: 'u1', email: 'other@example.com',
              last_owner: false, roles: 'full',
            },
          ],
          count: 1, next: null,
        })),
    );

    const result = await wpeRemoveUserFromAccountsHandler({
      email: 'missing@example.com',
      account_ids: ['acc-1'],
    }, createClient()) as Record<string, unknown>;

    const results = result.results as Array<Record<string, unknown>>;
    expect(results[0]!.status).toBe('not_found');

    const summary = result.summary as Record<string, number>;
    expect(summary.not_found).toBe(1);
  });

  it('discovers all accounts when account_ids not provided', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts`, () =>
        HttpResponse.json({
          results: [
            { id: 'acc-1', name: 'Account One' },
            { id: 'acc-2', name: 'Account Two' },
          ],
          next: null, count: 2,
        })),
      http.get(`${BASE_URL}/accounts/:accountId/account_users`, ({ params }) => {
        if (params['accountId'] === 'acc-1') {
          return HttpResponse.json({
            results: [
              {
                user_id: 'u1', email: 'alice@example.com',
                last_owner: false, roles: 'full',
              },
            ],
            count: 1, next: null,
          });
        }
        return HttpResponse.json({
          results: [
            {
              user_id: 'u2', email: 'alice@example.com',
              last_owner: false, roles: 'partial',
            },
          ],
          count: 1, next: null,
        });
      }),
      http.delete(`${BASE_URL}/accounts/:accountId/account_users/:userId`, () =>
        new HttpResponse(null, { status: 204 })),
    );

    const result = await wpeRemoveUserFromAccountsHandler({
      email: 'alice@example.com',
    }, createClient()) as Record<string, unknown>;

    const results = result.results as Array<Record<string, unknown>>;
    expect(results).toHaveLength(2);
    expect(results[0]!.status).toBe('removed');
    expect(results[1]!.status).toBe('removed');

    const summary = result.summary as Record<string, number>;
    expect(summary.removed).toBe(2);
  });
});
