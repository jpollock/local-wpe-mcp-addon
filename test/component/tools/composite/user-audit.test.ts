import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeUserAuditHandler } from '../../../../src/tools/composite/user-audit.js';

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

describe('wpe_user_audit', () => {
  it('deduplicates users across accounts and returns combined view', async () => {
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
                user_id: 'u1', account_id: 'acc-1',
                first_name: 'Alice', last_name: 'Smith',
                email: 'alice@example.com',
                invite_accepted: true, mfa_enabled: true,
                roles: 'full', last_owner: false, installs: ['inst-1'],
              },
              {
                user_id: 'u2', account_id: 'acc-1',
                first_name: 'Bob', last_name: 'Jones',
                email: 'bob@example.com',
                invite_accepted: true, mfa_enabled: true,
                roles: 'owner', last_owner: true, installs: null,
              },
            ],
            count: 2, next: null,
          });
        }
        return HttpResponse.json({
          results: [
            {
              user_id: 'u3', account_id: 'acc-2',
              first_name: 'Alice', last_name: 'Smith',
              email: 'alice@example.com',
              invite_accepted: true, mfa_enabled: true,
              roles: 'partial', last_owner: false, installs: ['inst-2'],
            },
          ],
          count: 1, next: null,
        });
      }),
    );

    const result = await wpeUserAuditHandler({}, createClient()) as Record<string, unknown>;

    expect(result.total_accounts).toBe(2);
    // Alice appears on both accounts but is deduplicated
    expect(result.total_users).toBe(2);

    const users = result.users as Array<Record<string, unknown>>;
    const alice = users.find((u) => u.email === 'alice@example.com')!;
    expect(alice).toBeDefined();
    expect(alice.accounts).toHaveLength(2);

    const bob = users.find((u) => u.email === 'bob@example.com')!;
    expect(bob).toBeDefined();
    expect(bob.accounts).toHaveLength(1);

    expect(result.warnings).toEqual([]);
    expect(result).not.toHaveProperty('errors');
  });

  it('flags MFA warnings and pending invites', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts`, () =>
        HttpResponse.json({
          results: [{ id: 'acc-1', name: 'Account One' }],
          next: null, count: 1,
        })),
      http.get(`${BASE_URL}/accounts/:accountId/account_users`, () =>
        HttpResponse.json({
          results: [
            {
              user_id: 'u1', account_id: 'acc-1',
              first_name: 'Alice', last_name: 'Smith',
              email: 'alice@example.com',
              invite_accepted: true, mfa_enabled: false,
              roles: 'full', last_owner: false, installs: [],
            },
            {
              user_id: 'u2', account_id: 'acc-1',
              first_name: 'Charlie', last_name: 'Brown',
              email: 'charlie@example.com',
              invite_accepted: false, mfa_enabled: true,
              roles: 'partial', last_owner: false, installs: [],
            },
          ],
          count: 2, next: null,
        })),
    );

    const result = await wpeUserAuditHandler({}, createClient()) as Record<string, unknown>;

    const warnings = result.warnings as string[];
    expect(warnings).toContainEqual(expect.stringContaining('alice@example.com'));
    expect(warnings).toContainEqual(expect.stringContaining('MFA'));
    expect(warnings).toContainEqual(expect.stringContaining('charlie@example.com'));
    expect(warnings).toContainEqual(expect.stringContaining('Invite pending'));
  });

  it('handles partial account failure with errors array', async () => {
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
                user_id: 'u1', account_id: 'acc-1',
                first_name: 'Alice', last_name: 'Smith',
                email: 'alice@example.com',
                invite_accepted: true, mfa_enabled: true,
                roles: 'full', last_owner: false, installs: [],
              },
            ],
            count: 1, next: null,
          });
        }
        return new HttpResponse(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
      }),
    );

    const result = await wpeUserAuditHandler({}, createClient()) as Record<string, unknown>;

    expect(result.total_users).toBe(1);
    const errors = result.errors as Array<Record<string, unknown>>;
    expect(errors).toBeDefined();
    expect(errors.some((e) => e.account_id === 'acc-2')).toBe(true);
  });

  it('handles empty accounts list', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/accounts`, () =>
        HttpResponse.json({ results: [], next: null, count: 0 })),
    );

    const result = await wpeUserAuditHandler({}, createClient()) as Record<string, unknown>;
    expect(result.total_users).toBe(0);
    expect(result.total_accounts).toBe(0);
    expect(result.users).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
