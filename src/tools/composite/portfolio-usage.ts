import type { CapiClient } from '../../capi-client.js';
import { fanOut } from '../../fan-out.js';

export const wpePortfolioUsageDef = {
  name: 'wpe_portfolio_usage',
  description: 'Get usage metrics across all accounts, ranked by visits. Use for cross-account questions like "what are my most visited sites?" or "which sites use the most storage?"',
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface InstallUsage {
  install_name: string;
  account_name: string;
  total_visits: number | null;
  total_bandwidth_bytes: number | null;
  storage_files_bytes: number | null;
  storage_db_bytes: number | null;
}

export async function wpePortfolioUsageHandler(
  _params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const accountsResp = await client.getAll<Account>('/accounts');
  if (!accountsResp.ok || !accountsResp.data) {
    return { error: accountsResp.error };
  }

  const accounts = accountsResp.data;
  if (accounts.length === 0) {
    return { total_accounts: 0, installs: [] };
  }

  const results = await fanOut(accounts, async (account) => {
    const usageResp = await client.get<AnyRecord>(`/accounts/${account.id}/usage`);

    if (!usageResp.ok || !usageResp.data) {
      return { account, installs: [] as InstallUsage[] };
    }

    const envMetrics = (usageResp.data.environment_metrics as AnyRecord[] | undefined) ?? [];

    const installs: InstallUsage[] = envMetrics.map((env) => ({
      install_name: env.environment_name ?? 'unknown',
      account_name: account.name,
      total_visits: env.metrics_rollup?.visit_count?.sum ?? null,
      total_bandwidth_bytes: env.metrics_rollup?.network_total_bytes?.sum ?? null,
      storage_files_bytes: env.metrics_rollup?.storage_file_bytes?.latest?.value ?? null,
      storage_db_bytes: env.metrics_rollup?.storage_database_bytes?.latest?.value ?? null,
    }));

    return { account, installs };
  });

  const allInstalls: InstallUsage[] = [];
  const errors: Array<{ account_id: string; account_name: string; error: string }> = [];

  for (const r of results) {
    if (r.error) {
      errors.push({
        account_id: r.item.id,
        account_name: r.item.name,
        error: r.error,
      });
    } else if (r.result) {
      allInstalls.push(...r.result.installs);
    }
  }

  // Sort by visits descending (nulls last)
  allInstalls.sort((a, b) => (b.total_visits ?? -1) - (a.total_visits ?? -1));

  return {
    total_accounts: accounts.length,
    installs: allInstalls,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
