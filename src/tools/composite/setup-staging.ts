import type { CapiClient } from '../../capi-client.js';

export const wpeSetupStagingDef = {
  name: 'wpe_setup_staging',
  description: 'Create a staging environment by creating a new install and copying from a source install. Requires confirmation (Tier 3).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: 'Name for the new staging install' },
      site_id: { type: 'string', description: 'The site ID to create the staging install under' },
      account_id: { type: 'string', description: 'The account ID' },
      source_install_id: { type: 'string', description: 'The install ID to copy from' },
    },
    required: ['name', 'site_id', 'account_id', 'source_install_id'],
  },
  annotations: {
    safetyTier: 3 as const,
    httpMethod: 'POST',
    apiPath: '/installs',
    tag: 'Composite',
  },
};

export async function wpeSetupStagingHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const name = params.name as string;
  const siteId = params.site_id as string;
  const accountId = params.account_id as string;
  const sourceInstallId = params.source_install_id as string;

  // Step 1: Create staging install
  const createResp = await client.post('/installs', {
    name,
    site_id: siteId,
    account_id: accountId,
    environment: 'staging',
  });

  if (!createResp.ok) {
    return { error: createResp.error, step: 'create_install' };
  }

  const newInstall = createResp.data as { id: string; name: string };

  // Step 2: Copy from source install
  const copyResp = await client.post('/install_copy', {
    source_install_id: sourceInstallId,
    destination_install_id: newInstall.id,
  });

  if (!copyResp.ok) {
    return {
      partial_success: true,
      install_created: newInstall,
      copy_error: copyResp.error,
      step: 'copy_install',
    };
  }

  // Step 3: Get resulting domains
  const domainsResp = await client.get(`/installs/${newInstall.id}/domains`);

  return {
    install: newInstall,
    copy: copyResp.data,
    domains: domainsResp.ok ? domainsResp.data : { error: domainsResp.error },
  };
}
