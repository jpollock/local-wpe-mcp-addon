import type { CapiClient } from '../../capi-client.js';

export const wpePrepareGoLiveDef = {
  name: 'wpe_prepare_go_live',
  description: 'Run a pre-launch checklist for an install: verify domains, SSL certificates, and recent backups.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      install_id: { type: 'string', description: 'The install ID to check' },
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

interface CheckResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  detail: string;
}

export async function wpePrepareGoLiveHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const installId = params.install_id as string;

  const [install, domains, ssl, backups] = await Promise.all([
    client.get(`/installs/${installId}`),
    client.get(`/installs/${installId}/domains`),
    client.get(`/installs/${installId}/ssl_certificates`),
    client.get(`/installs/${installId}/backups`),
  ]);

  if (!install.ok) {
    return { error: install.error };
  }

  const checks: CheckResult[] = [];

  // Check: domains configured
  const domainData = domains.ok ? domains.data as { results?: Array<{ name: string; primary: boolean }> } : null;
  const domainList = domainData?.results ?? [];
  if (domainList.length === 0) {
    checks.push({ check: 'domains_configured', status: 'fail', detail: 'No domains configured' });
  } else {
    const hasPrimary = domainList.some((d) => d.primary);
    checks.push({
      check: 'domains_configured',
      status: 'pass',
      detail: `${domainList.length} domain(s) configured${hasPrimary ? ', primary domain set' : ' (no primary domain)'}`,
    });
    if (!hasPrimary) {
      checks.push({ check: 'primary_domain', status: 'warning', detail: 'No primary domain set' });
    }
  }

  // Check: SSL certificates
  const sslData = ssl.ok ? ssl.data as { certificates?: Array<{ expires_at?: string; type: string }> } : null;
  const certs = sslData?.certificates ?? [];
  if (certs.length === 0) {
    checks.push({ check: 'ssl_configured', status: 'fail', detail: 'No SSL certificates configured' });
  } else {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const expiring = certs.filter((c) => c.expires_at && c.expires_at < thirtyDaysFromNow);
    if (expiring.length > 0) {
      checks.push({
        check: 'ssl_configured',
        status: 'warning',
        detail: `${certs.length} certificate(s), but ${expiring.length} expiring within 30 days`,
      });
    } else {
      checks.push({ check: 'ssl_configured', status: 'pass', detail: `${certs.length} valid SSL certificate(s)` });
    }
  }

  // Check: recent backup
  const backupData = backups.ok ? backups.data as { results?: Array<{ created_at: string }> } : null;
  const backupList = backupData?.results ?? [];
  if (backupList.length === 0) {
    checks.push({ check: 'recent_backup', status: 'fail', detail: 'No backups found' });
  } else {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const latestBackup = backupList[0]!;
    if (latestBackup.created_at >= oneDayAgo) {
      checks.push({ check: 'recent_backup', status: 'pass', detail: `Latest backup: ${latestBackup.created_at}` });
    } else {
      checks.push({ check: 'recent_backup', status: 'warning', detail: `Latest backup is over 24 hours old: ${latestBackup.created_at}` });
    }
  }

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warning').length;

  return {
    install: install.data,
    checklist: checks,
    summary: {
      total_checks: checks.length,
      passed: passCount,
      failed: failCount,
      warnings: warnCount,
      ready: failCount === 0,
    },
  };
}
