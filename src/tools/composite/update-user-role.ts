import type { CapiClient } from '../../capi-client.js';

export const wpeUpdateUserRoleDef = {
  name: 'wpe_update_user_role',
  description:
    "Change a user's role on a specific WP Engine account. Refuses to demote the last owner. Use for adjusting team member permissions.",
  inputSchema: {
    type: 'object' as const,
    properties: {
      email: {
        type: 'string',
        description: 'Email address of the user to update',
      },
      account_id: {
        type: 'string',
        description: 'Account ID where the role change applies',
      },
      roles: {
        type: 'string',
        description: "New role to assign. Valid values: 'owner', 'full', 'full,billing', 'partial', 'partial,billing'",
      },
      install_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Install IDs for partial role users (optional)',
      },
    },
    required: ['email', 'account_id', 'roles'],
  },
  annotations: {
    safetyTier: 3 as const,
    httpMethod: 'PATCH',
    apiPath: '/accounts/{account_id}/account_users/{user_id}',
    tag: 'Composite',
  },
};

interface AccountUser {
  user_id: string;
  email: string;
  roles: string | string[];
  last_owner: boolean;
}

export async function wpeUpdateUserRoleHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const email = params.email as string;
  const accountId = params.account_id as string;
  const newRoles = params.roles as string;
  const installIds = params.install_ids as string[] | undefined;

  // Fetch users for this account
  const usersResp = await client.get<{ results: AccountUser[] }>(
    `/accounts/${accountId}/account_users`,
  );

  if (!usersResp.ok || !usersResp.data) {
    return {
      email,
      account_id: accountId,
      status: 'error',
      error: usersResp.error?.message ?? 'Failed to fetch users',
    };
  }

  const users = usersResp.data.results ?? [];
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return {
      email,
      account_id: accountId,
      status: 'error',
      error: `User ${email} not found on account ${accountId}`,
    };
  }

  const previousRoles = user.roles;

  // Refuse to demote the last owner
  const isOwner = typeof previousRoles === 'string'
    ? previousRoles === 'owner'
    : Array.isArray(previousRoles) && previousRoles.includes('owner');
  const isDemotion = newRoles !== 'owner';

  if (user.last_owner && isOwner && isDemotion) {
    return {
      email,
      account_id: accountId,
      previous_roles: previousRoles,
      new_roles: newRoles,
      status: 'error',
      error: 'Cannot demote the last owner of this account',
      warning: 'Transfer ownership to another user before changing this role',
    };
  }

  // Patch the user role
  const body: Record<string, unknown> = { roles: newRoles };
  if (installIds) body.install_ids = installIds;

  const patchResp = await client.patch(
    `/accounts/${accountId}/account_users/${user.user_id}`,
    body,
  );

  if (!patchResp.ok) {
    return {
      email,
      account_id: accountId,
      previous_roles: previousRoles,
      new_roles: newRoles,
      status: 'error',
      error: patchResp.error?.message ?? `HTTP ${patchResp.status}`,
    };
  }

  return {
    email,
    account_id: accountId,
    previous_roles: previousRoles,
    new_roles: newRoles,
    status: 'updated',
  };
}
