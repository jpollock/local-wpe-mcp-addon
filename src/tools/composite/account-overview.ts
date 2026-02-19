import type { CapiClient } from '../../capi-client.js';

export const wpeAccountOverviewDef = {
  name: 'wpe_account_overview',
  description: 'Get a comprehensive overview of a WP Engine account: details, limits, usage summary, and site/install counts.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      account_id: { type: 'string', description: 'The account ID' },
    },
    required: ['account_id'],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/accounts/{account_id}',
    tag: 'Composite',
  },
};

export async function wpeAccountOverviewHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const accountId = params.account_id as string;

  const [account, limits, usage, sites, installs] = await Promise.all([
    client.get(`/accounts/${accountId}`),
    client.get(`/accounts/${accountId}/limits`),
    client.get(`/accounts/${accountId}/usage/summary`),
    client.getAll(`/sites`, { account_id: accountId }),
    client.getAll(`/installs`, { account_id: accountId }),
  ]);

  if (!account.ok) {
    return { error: account.error };
  }

  return {
    account: account.data,
    limits: limits.ok ? limits.data : { error: limits.error },
    usage_summary: usage.ok ? usage.data : { error: usage.error },
    site_count: sites.ok ? (sites.data as unknown[]).length : 0,
    install_count: installs.ok ? (installs.data as unknown[]).length : 0,
  };
}
