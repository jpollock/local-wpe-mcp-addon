export type SafetyTier = 1 | 2 | 3;

export interface SafetyConfig {
  tier: SafetyTier;
  confirmationMessage?: string;
  preChecks?: string[];
}

export function getDefaultTier(httpMethod: string): SafetyTier {
  switch (httpMethod.toUpperCase()) {
    case 'GET':
      return 1;
    case 'DELETE':
      return 3;
    default:
      return 2;
  }
}

/**
 * Tools that should be a higher tier than their HTTP method implies.
 * These are destructive or expensive POST operations that warrant confirmation.
 */
export const TIER_OVERRIDES: Record<string, SafetyTier> = {
  wpe_copy_install: 3,
  wpe_create_site: 3,
  wpe_create_install: 3,
  wpe_create_account_user: 3,
  wpe_promote_to_production: 3,
  wpe_add_user_to_accounts: 3,
  wpe_remove_user_from_accounts: 3,
  wpe_update_user_role: 3,
};

const CONFIRMATION_MESSAGES: Record<string, string> = {
  wpe_delete_site: 'This will permanently delete the site and ALL its installs.',
  wpe_delete_install: 'This will permanently delete the install and all its data.',
  wpe_delete_account_user: 'This will remove the user from the account.',
  wpe_delete_domain: 'This will remove the domain from the install.',
  wpe_delete_ssh_key: 'This will delete the SSH key.',
  wpe_copy_install: 'This will copy data between installs, potentially overwriting the destination.',
  wpe_create_site: 'This will create a new billable site on the account.',
  wpe_create_install: 'This will create a new install on the site.',
  wpe_create_account_user: 'This will grant a new user access to the account.',
  wpe_promote_to_production: 'This will backup production, then overwrite it with staging content (files and database).',
  wpe_add_user_to_accounts: 'This will add a user to the specified account(s) with the given role.',
  wpe_remove_user_from_accounts: 'This will remove a user from the specified account(s).',
  wpe_update_user_role: 'This will change the user\'s role on the specified account.',
};

const PRE_CHECKS: Record<string, string[]> = {
  wpe_delete_site: [
    'Verify all installs have recent backups',
    'Confirm no production installs will be affected',
  ],
  wpe_delete_install: [
    'Verify a recent backup exists',
    'Confirm this is not a production install',
  ],
  wpe_copy_install: [
    'Verify the destination install has a recent backup',
    'Confirm the source and destination are correct',
  ],
  wpe_create_site: [
    'Verify the account has available site capacity',
  ],
  wpe_create_install: [
    'Verify the site has available install capacity',
  ],
  wpe_create_account_user: [
    'Verify the user email is correct',
    'Confirm the intended access level',
  ],
  wpe_promote_to_production: [
    'Verify the staging install has been tested',
    'Confirm the production install ID is correct',
  ],
  wpe_add_user_to_accounts: [
    'Verify the email address is correct',
    'Confirm the intended role',
  ],
  wpe_remove_user_from_accounts: [
    'Verify you want to revoke this user\'s access',
    'Confirm the user email is correct',
  ],
  wpe_update_user_role: [
    'Verify the new role is correct',
    'Confirm the account ID',
  ],
};

export function getToolSafety(toolName: string, httpMethod: string): SafetyConfig {
  const tier = TIER_OVERRIDES[toolName] ?? getDefaultTier(httpMethod);

  if (tier < 3) {
    return { tier };
  }

  return {
    tier,
    confirmationMessage: CONFIRMATION_MESSAGES[toolName] ?? 'This action may have significant consequences.',
    preChecks: PRE_CHECKS[toolName],
  };
}
