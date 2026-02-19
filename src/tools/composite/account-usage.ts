import type { CapiClient } from '../../capi-client.js';

export const wpeAccountUsageDef = {
  name: 'wpe_account_usage',
  description: 'Get account usage metrics with insights and trends.',
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
    apiPath: '/accounts/{account_id}/usage',
    tag: 'Composite',
  },
};

export async function wpeAccountUsageHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const accountId = params.account_id as string;

  const [usage, insights] = await Promise.all([
    client.get(`/accounts/${accountId}/usage`),
    client.get(`/accounts/${accountId}/usage/insights`),
  ]);

  if (!usage.ok) {
    return { error: usage.error };
  }

  return {
    usage: usage.data,
    insights: insights.ok ? insights.data : { error: insights.error },
  };
}
