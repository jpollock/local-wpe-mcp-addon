import type { CapiClient } from '../../capi-client.js';
import { fanOut } from '../../fan-out.js';
import { findExpiringSslCerts } from '../../ssl-utils.js';

export const wpeAccountSslStatusDef = {
  name: 'wpe_account_ssl_status',
  description: 'Check SSL certificate status across all installs in an account, flagging expiring or missing certificates.',
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
}

interface SslCertificate {
  type: string;
  expires_at?: string;
  primary_domain?: string;
}

export async function wpeAccountSslStatusHandler(
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
    return { installs: [], message: 'No installs found for this account.' };
  }

  const results = await fanOut(installs, async (install) => {
    const sslResp = await client.get<{ certificates: SslCertificate[] }>(
      `/installs/${install.id}/ssl_certificates`,
    );

    const certs = sslResp.ok ? (sslResp.data?.certificates ?? []) : [];
    const expiringSoon = findExpiringSslCerts(certs);

    return {
      install_id: install.id,
      install_name: install.name,
      environment: install.environment,
      certificate_count: certs.length,
      certificates: certs,
      has_ssl: certs.length > 0,
      expiring_soon: expiringSoon,
      error: !sslResp.ok ? sslResp.error : undefined,
    };
  });

  const successResults = results.filter((r) => r.result !== null).map((r) => r.result!);
  const errors = results.filter((r) => r.error).map((r) => ({
    install_id: r.item.id,
    error: r.error,
  }));

  const warnings: string[] = [];
  for (const r of successResults) {
    if (!r.has_ssl && !r.error) {
      warnings.push(`${r.install_name} (${r.environment}) has no SSL certificate`);
    }
    for (const cert of r.expiring_soon) {
      warnings.push(`${r.install_name}: SSL certificate expires ${cert.expires_at}`);
    }
  }

  return {
    installs: successResults,
    summary: {
      total_installs: installs.length,
      with_ssl: successResults.filter((r) => r.has_ssl).length,
      without_ssl: successResults.filter((r) => !r.has_ssl && !r.error).length,
      expiring_soon: successResults.reduce((n, r) => n + r.expiring_soon.length, 0),
    },
    ...(warnings.length > 0 ? { warnings } : {}),
    ...(errors.length > 0 ? { errors } : {}),
  };
}
