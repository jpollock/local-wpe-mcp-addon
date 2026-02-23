import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeAddUserToAccountsHandler } from '../../../../src/tools/composite/add-user-to-accounts.js';

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

describe('wpe_add_user_to_accounts', () => {
  it('adds user to multiple accounts successfully', async () => {
    mockServer.use(
      http.post(`${BASE_URL}/accounts/:accountId/account_users`, () =>
        HttpResponse.json({
          user_id: 'new-user-1',
          email: 'new@example.com',
          first_name: 'New',
          last_name: 'User',
          roles: 'full',
        }, { status: 201 })),
    );

    const result = await wpeAddUserToAccountsHandler({
      email: 'new@example.com',
      first_name: 'New',
      last_name: 'User',
      roles: 'full',
      account_ids: ['acc-1', 'acc-2'],
    }, createClient()) as Record<string, unknown>;

    expect(result.email).toBe('new@example.com');

    const results = result.results as Array<Record<string, unknown>>;
    expect(results).toHaveLength(2);
    expect(results[0]!.status).toBe('added');
    expect(results[1]!.status).toBe('added');

    const summary = result.summary as Record<string, number>;
    expect(summary.added).toBe(2);
    expect(summary.skipped).toBe(0);
    expect(summary.errors).toBe(0);
  });

  it('skips accounts where user already exists (400)', async () => {
    mockServer.use(
      http.post(`${BASE_URL}/accounts/:accountId/account_users`, ({ params }) => {
        if (params['accountId'] === 'acc-1') {
          return HttpResponse.json({
            user_id: 'new-user-1',
            email: 'existing@example.com',
          }, { status: 201 });
        }
        return HttpResponse.json(
          { message: 'User already exists on this account' },
          { status: 400 },
        );
      }),
    );

    const result = await wpeAddUserToAccountsHandler({
      email: 'existing@example.com',
      first_name: 'Existing',
      last_name: 'User',
      roles: 'full',
      account_ids: ['acc-1', 'acc-2'],
    }, createClient()) as Record<string, unknown>;

    const results = result.results as Array<Record<string, unknown>>;
    expect(results[0]!.status).toBe('added');
    expect(results[1]!.status).toBe('skipped');

    const summary = result.summary as Record<string, number>;
    expect(summary.added).toBe(1);
    expect(summary.skipped).toBe(1);
  });

  it('records errors for failed accounts', async () => {
    mockServer.use(
      http.post(`${BASE_URL}/accounts/:accountId/account_users`, ({ params }) => {
        if (params['accountId'] === 'acc-1') {
          return HttpResponse.json({ user_id: 'new-user-1' }, { status: 201 });
        }
        return HttpResponse.json(
          { message: 'Internal server error' },
          { status: 500 },
        );
      }),
    );

    const result = await wpeAddUserToAccountsHandler({
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      roles: 'full',
      account_ids: ['acc-1', 'acc-2'],
    }, createClient()) as Record<string, unknown>;

    const results = result.results as Array<Record<string, unknown>>;
    expect(results[0]!.status).toBe('added');
    expect(results[1]!.status).toBe('error');
    expect(results[1]!.error).toBeDefined();

    const summary = result.summary as Record<string, number>;
    expect(summary.added).toBe(1);
    expect(summary.errors).toBe(1);
  });
});
