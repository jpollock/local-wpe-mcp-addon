import type { CapiClient } from '../../capi-client.js';

export const wpeAccountEnvironmentsDef = {
  name: 'wpe_account_environments',
  description: 'Build a topology map of all sites and installs in an account, showing environment types and PHP versions.',
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
    apiPath: '/sites',
    tag: 'Composite',
  },
};

interface Site {
  id: string;
  name: string;
}

interface Install {
  id: string;
  name: string;
  environment: string;
  php_version?: string;
  site?: { id: string; name: string };
}

export async function wpeAccountEnvironmentsHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const accountId = params.account_id as string;

  const [sitesResp, installsResp] = await Promise.all([
    client.getAll<Site>('/sites', { account_id: accountId }),
    client.getAll<Install>('/installs', { account_id: accountId }),
  ]);

  if (!sitesResp.ok) {
    return { error: sitesResp.error };
  }

  const sites = sitesResp.data ?? [];
  const installs = installsResp.ok ? (installsResp.data ?? []) : [];

  // Group installs by site
  const siteMap = new Map<string, { site: Site; installs: Install[] }>();
  for (const site of sites) {
    siteMap.set(site.id, { site, installs: [] });
  }

  for (const install of installs) {
    const siteId = install.site?.id;
    if (siteId && siteMap.has(siteId)) {
      siteMap.get(siteId)!.installs.push(install);
    }
  }

  // Collect PHP version distribution
  const phpVersions: Record<string, number> = {};
  for (const install of installs) {
    const v = install.php_version ?? 'unknown';
    phpVersions[v] = (phpVersions[v] ?? 0) + 1;
  }

  // Identify sites with/without staging
  const envTypes: Record<string, number> = {};
  for (const install of installs) {
    const env = install.environment ?? 'unknown';
    envTypes[env] = (envTypes[env] ?? 0) + 1;
  }

  const topology = Array.from(siteMap.values()).map(({ site, installs: siteInstalls }) => ({
    site_id: site.id,
    site_name: site.name,
    environments: siteInstalls.map((i) => ({
      install_id: i.id,
      install_name: i.name,
      environment: i.environment,
      php_version: i.php_version,
    })),
    has_staging: siteInstalls.some((i) => i.environment === 'staging'),
    has_development: siteInstalls.some((i) => i.environment === 'development'),
  }));

  return {
    topology,
    summary: {
      total_sites: sites.length,
      total_installs: installs.length,
      environment_distribution: envTypes,
      php_version_distribution: phpVersions,
      sites_with_staging: topology.filter((t) => t.has_staging).length,
      sites_without_staging: topology.filter((t) => !t.has_staging).length,
    },
  };
}
