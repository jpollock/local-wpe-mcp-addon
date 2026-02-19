import type { CapiClient } from '../../capi-client.js';
import { fanOut } from '../../fan-out.js';

export const wpeAccountDomainsDef = {
  name: 'wpe_account_domains',
  description: 'List all domains across all installs in an account, grouped by install with SSL status.',
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
    apiPath: '/installs',
    tag: 'Composite',
  },
};

interface Install {
  id: string;
  name: string;
  environment: string;
  site?: { id: string; name: string };
}

interface Domain {
  id: string;
  name: string;
  primary: boolean;
}

export async function wpeAccountDomainsHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const accountId = params.account_id as string;

  const installsResp = await client.getAll<Install>('/installs', { account_id: accountId });
  if (!installsResp.ok || !installsResp.data) {
    return { error: installsResp.error };
  }

  const installs = installsResp.data;
  if (installs.length === 0) {
    return { installs: [], total_domains: 0, message: 'No installs found for this account.' };
  }

  const results = await fanOut(installs, async (install) => {
    const [domainsResp, sslResp] = await Promise.all([
      client.get<{ results: Domain[] }>(`/installs/${install.id}/domains`),
      client.get(`/installs/${install.id}/ssl_certificates`),
    ]);

    return {
      install_id: install.id,
      install_name: install.name,
      environment: install.environment,
      domains: domainsResp.ok ? (domainsResp.data?.results ?? []) : [],
      ssl_certificates: sslResp.ok ? sslResp.data : null,
      error: !domainsResp.ok ? domainsResp.error : undefined,
    };
  });

  const successResults = results.filter((r) => r.result !== null).map((r) => r.result!);
  const errors = results.filter((r) => r.error).map((r) => ({
    install_id: r.item.id,
    install_name: r.item.name,
    error: r.error,
  }));

  const totalDomains = successResults.reduce(
    (sum, r) => sum + (r.domains?.length ?? 0), 0,
  );

  return {
    installs: successResults,
    total_domains: totalDomains,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
