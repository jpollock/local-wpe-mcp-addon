import type { CapiClient } from '../../capi-client.js';
import { fanOut } from '../../fan-out.js';

export const wpePortfolioOverviewDef = {
  name: 'wpe_portfolio_overview',
  description: 'Get a consolidated view of all accounts, sites, and installs the user has access to. Use for cross-account questions like "how many sites do I have?" or "what PHP versions am I running?"',
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

interface Site {
  id: string;
  name: string;
}

interface Install {
  id: string;
  name: string;
  environment?: string;
  status?: string;
  php_version?: string;
  primary_domain?: string;
  site?: { id: string };
}

export async function wpePortfolioOverviewHandler(
  _params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const accountsResp = await client.getAll<Account>('/accounts');
  if (!accountsResp.ok || !accountsResp.data) {
    return { error: accountsResp.error };
  }

  const accounts = accountsResp.data;
  if (accounts.length === 0) {
    return { total_accounts: 0, total_sites: 0, total_installs: 0, accounts: [] };
  }

  const results = await fanOut(accounts, async (account) => {
    const [sitesResp, installsResp] = await Promise.all([
      client.getAll<Site>('/sites', { account_id: account.id }),
      client.getAll<Install>('/installs', { account_id: account.id }),
    ]);

    const sites = sitesResp.ok ? (sitesResp.data ?? []) : [];
    const installs = installsResp.ok ? (installsResp.data ?? []) : [];

    return {
      account_id: account.id,
      account_name: account.name,
      site_count: sites.length,
      install_count: installs.length,
      installs: installs.map((inst) => ({
        id: inst.id,
        name: inst.name,
        environment: inst.environment ?? null,
        status: inst.status ?? null,
        php_version: inst.php_version ?? null,
        primary_domain: inst.primary_domain ?? null,
        site_id: inst.site?.id ?? null,
      })),
    };
  });

  const successResults = results.filter((r) => r.result !== null).map((r) => r.result!);
  const errors = results.filter((r) => r.error).map((r) => ({
    account_id: r.item.id,
    account_name: r.item.name,
    error: r.error,
  }));

  const totalSites = successResults.reduce((sum, r) => sum + r.site_count, 0);
  const totalInstalls = successResults.reduce((sum, r) => sum + r.install_count, 0);

  return {
    total_accounts: accounts.length,
    total_sites: totalSites,
    total_installs: totalInstalls,
    accounts: successResults,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
