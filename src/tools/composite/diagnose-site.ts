import type { CapiClient } from '../../capi-client.js';

export const wpeDiagnoseSiteDef = {
  name: 'wpe_diagnose_site',
  description: 'Run a comprehensive health check on a single install: usage, domains, and SSL.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      install_id: { type: 'string', description: 'The install ID to diagnose' },
    },
    required: ['install_id'],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/installs/{install_id}',
    tag: 'Composite',
  },
};

export async function wpeDiagnoseSiteHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const installId = params.install_id as string;

  const [install, usage, domains, ssl] = await Promise.all([
    client.get(`/installs/${installId}`),
    client.get(`/installs/${installId}/usage`),
    client.get(`/installs/${installId}/domains`),
    client.get(`/installs/${installId}/ssl_certificates`),
  ]);

  if (!install.ok) {
    return { error: install.error };
  }

  const warnings: string[] = [];

  // Check SSL
  const sslData = ssl.ok ? ssl.data as { certificates?: Array<{ expires_at?: string }> } : null;
  if (!sslData?.certificates?.length) {
    warnings.push('No SSL certificates configured');
  } else {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const expiring = sslData.certificates.filter(
      (c) => c.expires_at && c.expires_at < thirtyDaysFromNow,
    );
    if (expiring.length > 0) {
      warnings.push(`${expiring.length} SSL certificate(s) expiring within 30 days`);
    }
  }

  return {
    install: install.data,
    usage: usage.ok ? usage.data : { error: usage.error },
    domains: domains.ok ? domains.data : { error: domains.error },
    ssl: ssl.ok ? ssl.data : { error: ssl.error },
    health: {
      warnings,
      status: warnings.length === 0 ? 'healthy' : 'attention_needed',
    },
  };
}
