import type { CapiClient } from '../../capi-client.js';
import { fanOut } from '../../fan-out.js';

export const wpeUserAuditDef = {
  name: 'wpe_user_audit',
  description:
    'Cross-account user audit. Lists all users across all accounts, deduplicates by email, and flags security concerns (no MFA, pending invites). Use for agency-wide user access reviews.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/accounts',
    tag: 'Composite',
  },
};

interface Account {
  id: string;
  name: string;
}

interface AccountUser {
  user_id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  email: string;
  invite_accepted: boolean;
  mfa_enabled: boolean;
  roles: string | string[];
  last_owner: boolean;
  installs: string[] | null;
}

interface UserAccountEntry {
  account_id: string;
  account_name: string;
  roles: string | string[];
  last_owner: boolean;
  installs: string[] | null;
}

interface DeduplicatedUser {
  email: string;
  first_name: string;
  last_name: string;
  mfa_enabled: boolean;
  invite_accepted: boolean;
  accounts: UserAccountEntry[];
}

export async function wpeUserAuditHandler(
  _params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const accountsResp = await client.getAll<Account>('/accounts');
  if (!accountsResp.ok || !accountsResp.data) {
    return { error: accountsResp.error };
  }

  const accounts = accountsResp.data;
  if (accounts.length === 0) {
    return { total_users: 0, total_accounts: 0, users: [], warnings: [] };
  }

  const results = await fanOut(accounts, async (account) => {
    const usersResp = await client.get<{ results: AccountUser[] }>(
      `/accounts/${account.id}/account_users`,
    );
    if (!usersResp.ok || !usersResp.data) {
      throw new Error(usersResp.error?.message ?? 'Failed to fetch account users');
    }
    return {
      account,
      users: usersResp.data.results ?? [],
    };
  });

  const errors = results
    .filter((r) => r.error)
    .map((r) => ({ account_id: r.item.id, error: r.error }));

  // Deduplicate by email
  const userMap = new Map<string, DeduplicatedUser>();

  for (const r of results) {
    if (!r.result) continue;
    const { account, users } = r.result;

    for (const user of users) {
      const email = user.email.toLowerCase();
      let entry = userMap.get(email);
      if (!entry) {
        entry = {
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          mfa_enabled: user.mfa_enabled,
          invite_accepted: user.invite_accepted,
          accounts: [],
        };
        userMap.set(email, entry);
      }
      // Update flags: if any account shows MFA disabled, flag it
      if (!user.mfa_enabled) entry.mfa_enabled = false;
      if (!user.invite_accepted) entry.invite_accepted = false;

      entry.accounts.push({
        account_id: account.id,
        account_name: account.name,
        roles: user.roles,
        last_owner: user.last_owner,
        installs: user.installs,
      });
    }
  }

  const users = Array.from(userMap.values());
  const warnings: string[] = [];

  for (const user of users) {
    if (!user.mfa_enabled) {
      warnings.push(`${user.email}: MFA not enabled`);
    }
    if (!user.invite_accepted) {
      warnings.push(`${user.email}: Invite pending`);
    }
  }

  return {
    total_users: users.length,
    total_accounts: accounts.length,
    users,
    warnings,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
