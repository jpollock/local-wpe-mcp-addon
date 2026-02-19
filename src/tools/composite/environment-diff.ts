import type { CapiClient } from '../../capi-client.js';

export const wpeEnvironmentDiffDef = {
  name: 'wpe_environment_diff',
  description: 'Compare two installs side-by-side: configuration, domains, and usage differences.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      install_id_a: { type: 'string', description: 'First install ID' },
      install_id_b: { type: 'string', description: 'Second install ID' },
    },
    required: ['install_id_a', 'install_id_b'],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/installs',
    tag: 'Composite',
  },
};

export async function wpeEnvironmentDiffHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const idA = params.install_id_a as string;
  const idB = params.install_id_b as string;

  const [installA, installB, domainsA, domainsB, usageA, usageB] = await Promise.all([
    client.get(`/installs/${idA}`),
    client.get(`/installs/${idB}`),
    client.get(`/installs/${idA}/domains`),
    client.get(`/installs/${idB}/domains`),
    client.get(`/installs/${idA}/usage`),
    client.get(`/installs/${idB}/usage`),
  ]);

  if (!installA.ok) {
    return { error: installA.error, detail: `Install ${idA} not found` };
  }
  if (!installB.ok) {
    return { error: installB.error, detail: `Install ${idB} not found` };
  }

  const a = installA.data as Record<string, unknown>;
  const b = installB.data as Record<string, unknown>;

  const differences: Array<{ field: string; install_a: unknown; install_b: unknown }> = [];
  const compareFields = ['environment', 'php_version', 'caches', 'is_multisite'];
  for (const field of compareFields) {
    if (a[field] !== b[field]) {
      differences.push({ field, install_a: a[field], install_b: b[field] });
    }
  }

  return {
    install_a: {
      details: installA.data,
      domains: domainsA.ok ? domainsA.data : { error: domainsA.error },
      usage: usageA.ok ? usageA.data : { error: usageA.error },
    },
    install_b: {
      details: installB.data,
      domains: domainsB.ok ? domainsB.data : { error: domainsB.error },
      usage: usageB.ok ? usageB.data : { error: usageB.error },
    },
    differences,
  };
}
