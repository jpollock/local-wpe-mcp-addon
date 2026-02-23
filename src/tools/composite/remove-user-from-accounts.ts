import type { CapiClient } from '../../capi-client.js';

export const wpeRemoveUserFromAccountsDef = {
  name: 'wpe_remove_user_from_accounts',
  description:
    'Remove a user from one or more WP Engine accounts. If no account_ids are provided, removes the user from ALL accounts. Protects against removing the last owner. Use for offboarding a team member across an agency portfolio.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      email: {
        type: 'string',
        description: 'Email address of the user to remove',
      },
      account_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Account IDs to remove the user from. If omitted, removes from ALL accounts.',
      },
    },
    required: ['email'],
  },
  annotations: {
    safetyTier: 3 as const,
    httpMethod: 'DELETE',
    apiPath: '/accounts/{account_id}/account_users',
    tag: 'Composite',
  },
};

interface AccountUser {
  user_id: string;
  email: string;
  last_owner: boolean;
}

interface RemoveResult {
  account_id: string;
  status: 'removed' | 'skipped' | 'not_found' | 'error';
  reason?: string;
}

export async function wpeRemoveUserFromAccountsHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const email = params.email as string;
  let accountIds = params.account_ids as string[] | undefined;

  // If no account_ids provided, discover all accounts
  if (!accountIds || accountIds.length === 0) {
    const accountsResp = await client.getAll<{ id: string }>('/accounts');
    if (!accountsResp.ok || !accountsResp.data) {
      return { error: accountsResp.error, detail: 'Failed to fetch accounts' };
    }
    accountIds = accountsResp.data.map((a) => a.id);
  }

  const results: RemoveResult[] = [];
  const warnings: string[] = [];

  for (const accountId of accountIds) {
    // Fetch users for this account
    const usersResp = await client.get<{ results: AccountUser[] }>(
      `/accounts/${accountId}/account_users`,
    );

    if (!usersResp.ok || !usersResp.data) {
      results.push({
        account_id: accountId,
        status: 'error',
        reason: usersResp.error?.message ?? 'Failed to fetch users',
      });
      continue;
    }

    const users = usersResp.data.results ?? [];
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      results.push({ account_id: accountId, status: 'not_found' });
      continue;
    }

    if (user.last_owner) {
      results.push({
        account_id: accountId,
        status: 'skipped',
        reason: 'User is the last owner of this account',
      });
      warnings.push(`${email} is the last owner of account ${accountId} — cannot remove`);
      continue;
    }

    const deleteResp = await client.delete(
      `/accounts/${accountId}/account_users/${user.user_id}`,
    );

    if (deleteResp.ok) {
      results.push({ account_id: accountId, status: 'removed' });
    } else {
      results.push({
        account_id: accountId,
        status: 'error',
        reason: deleteResp.error?.message ?? `HTTP ${deleteResp.status}`,
      });
    }
  }

  const summary = {
    removed: results.filter((r) => r.status === 'removed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    not_found: results.filter((r) => r.status === 'not_found').length,
    errors: results.filter((r) => r.status === 'error').length,
  };

  return {
    email,
    results,
    summary,
    warnings,
  };
}
