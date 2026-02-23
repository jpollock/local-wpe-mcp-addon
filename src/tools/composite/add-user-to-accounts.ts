import type { CapiClient } from '../../capi-client.js';

export const wpeAddUserToAccountsDef = {
  name: 'wpe_add_user_to_accounts',
  description:
    'Add a user to multiple WP Engine accounts with a specified role. Processes accounts sequentially and skips accounts where the user already exists. Use for onboarding a team member across an agency portfolio.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      email: {
        type: 'string',
        description: 'Email address of the user to add',
      },
      first_name: {
        type: 'string',
        description: 'First name of the user',
      },
      last_name: {
        type: 'string',
        description: 'Last name of the user',
      },
      roles: {
        type: 'string',
        description: "Role to assign. Valid values: 'owner', 'full', 'full,billing', 'partial', 'partial,billing'",
      },
      account_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Account IDs to add the user to',
      },
      install_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Install IDs for partial role users (optional)',
      },
    },
    required: ['email', 'first_name', 'last_name', 'roles', 'account_ids'],
  },
  annotations: {
    safetyTier: 3 as const,
    httpMethod: 'POST',
    apiPath: '/accounts/{account_id}/account_users',
    tag: 'Composite',
  },
};

interface AddResult {
  account_id: string;
  status: 'added' | 'skipped' | 'error';
  error?: string;
}

export async function wpeAddUserToAccountsHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const email = params.email as string;
  const firstName = params.first_name as string;
  const lastName = params.last_name as string;
  const roles = params.roles as string;
  const accountIds = params.account_ids as string[];
  const installIds = params.install_ids as string[] | undefined;

  const results: AddResult[] = [];

  for (const accountId of accountIds) {
    const body: Record<string, unknown> = {
      user: {
        account_id: accountId,
        first_name: firstName,
        last_name: lastName,
        email,
        roles,
        ...(installIds ? { install_ids: installIds } : {}),
      },
    };

    const resp = await client.post(`/accounts/${accountId}/account_users`, body);

    if (resp.ok) {
      results.push({ account_id: accountId, status: 'added' });
    } else if (resp.status === 400) {
      results.push({ account_id: accountId, status: 'skipped', error: resp.error?.message ?? 'Already exists' });
    } else {
      results.push({ account_id: accountId, status: 'error', error: resp.error?.message ?? `HTTP ${resp.status}` });
    }
  }

  const summary = {
    added: results.filter((r) => r.status === 'added').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    errors: results.filter((r) => r.status === 'error').length,
  };

  return { email, results, summary };
}
