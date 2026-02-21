import type { CapiClient } from '../../capi-client.js';
import { fanOut } from '../../fan-out.js';
import { findExpiringSslCerts } from '../../ssl-utils.js';

export const wpeFleetHealthDef = {
  name: 'wpe_fleet_health',
  description: 'Run a health assessment across all accounts. Checks SSL certificates, capacity headroom, PHP version consistency, and install status. Returns prioritized issues ranked by severity.',
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

interface Install {
  id: string;
  name: string;
  environment?: string;
  status?: string;
  php_version?: string;
  site?: { id: string };
}

interface SslCertificate {
  type: string;
  expires_at?: string;
  primary_domain?: string;
}

interface AccountLimits {
  visitors?: { allowed: number; used: number };
  storage?: { allowed: number; used: number };
  bandwidth?: { allowed: number; used: number };
}

interface HealthIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'ssl' | 'capacity' | 'php_version' | 'status';
  account_id: string;
  account_name: string;
  install_id?: string;
  install_name?: string;
  message: string;
}

interface MetricHeadroom {
  allowed: number;
  used: number;
  percent_used: number;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

function sortIssues(issues: HealthIssue[]): HealthIssue[] {
  return issues.sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity]! - SEVERITY_ORDER[b.severity]!;
    if (severityDiff !== 0) return severityDiff;
    return a.message.localeCompare(b.message);
  });
}

function computeHeadroom(allowed: number, used: number): MetricHeadroom {
  const percentUsed = allowed > 0 ? Math.round((used / allowed) * 100) : 0;
  return { allowed, used, percent_used: percentUsed };
}

function checkCapacity(
  limits: AccountLimits,
  accountId: string,
  accountName: string,
): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const metrics: Array<{ key: keyof AccountLimits; label: string }> = [
    { key: 'visitors', label: 'Visitors' },
    { key: 'storage', label: 'Storage' },
    { key: 'bandwidth', label: 'Bandwidth' },
  ];

  for (const { key, label } of metrics) {
    const metric = limits[key];
    if (!metric || !metric.allowed || metric.allowed === 0) continue;

    const percentUsed = Math.round((metric.used / metric.allowed) * 100);
    if (percentUsed > 95) {
      issues.push({
        severity: 'critical',
        category: 'capacity',
        account_id: accountId,
        account_name: accountName,
        message: `${label} at ${percentUsed}% of limit on account ${accountName}`,
      });
    } else if (percentUsed > 80) {
      issues.push({
        severity: 'warning',
        category: 'capacity',
        account_id: accountId,
        account_name: accountName,
        message: `${label} at ${percentUsed}% of limit on account ${accountName}`,
      });
    }
  }

  return issues;
}

function checkPhpVersionMismatches(
  installs: Install[],
  accountId: string,
  accountName: string,
): HealthIssue[] {
  const issues: HealthIssue[] = [];

  // Group installs by site
  const bySite = new Map<string, Install[]>();
  for (const install of installs) {
    const siteId = install.site?.id;
    if (!siteId) continue;
    const group = bySite.get(siteId) ?? [];
    group.push(install);
    bySite.set(siteId, group);
  }

  for (const [, siteInstalls] of bySite) {
    const prodInstalls = siteInstalls.filter((i) => i.environment === 'production');
    if (prodInstalls.length === 0) continue;

    const prodPhp = prodInstalls[0]!.php_version;
    if (!prodPhp) continue;

    for (const install of siteInstalls) {
      if (install.environment === 'production') continue;
      if (!install.php_version) continue;
      if (install.php_version !== prodPhp) {
        issues.push({
          severity: 'info',
          category: 'php_version',
          account_id: accountId,
          account_name: accountName,
          install_id: install.id,
          install_name: install.name,
          message: `PHP version mismatch: ${prodInstalls[0]!.name} (${prodPhp}) vs ${install.name} (${install.php_version})`,
        });
      }
    }
  }

  return issues;
}

export async function wpeFleetHealthHandler(
  _params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const accountsResp = await client.getAll<Account>('/accounts');
  if (!accountsResp.ok || !accountsResp.data) {
    return { error: accountsResp.error };
  }

  const accounts = accountsResp.data;
  if (accounts.length === 0) {
    return { total_accounts: 0, total_installs: 0, issues: [], accounts: [] };
  }

  const results = await fanOut(accounts, async (account) => {
    const [installsResp, limitsResp] = await Promise.all([
      client.getAll<Install>('/installs', { account_id: account.id }),
      client.get<AccountLimits>(`/accounts/${account.id}/limits`),
    ]);

    if (!installsResp.ok || !installsResp.data) {
      throw new Error(installsResp.error?.message ?? 'Failed to fetch installs');
    }

    const installs = installsResp.data;
    const limits = limitsResp.ok ? (limitsResp.data as AccountLimits) : ({} as AccountLimits);

    // Fetch SSL certs for each install
    const sslResults = await Promise.all(
      installs.map(async (install) => {
        const sslResp = await client.get<{ certificates: SslCertificate[] }>(
          `/installs/${install.id}/ssl_certificates`,
        );
        return {
          installId: install.id,
          installName: install.name,
          environment: install.environment ?? 'unknown',
          certs: sslResp.ok ? (sslResp.data?.certificates ?? []) : [],
        };
      }),
    );

    // Collect issues
    const issues: HealthIssue[] = [];

    // SSL checks
    const now = new Date().toISOString();
    for (const ssl of sslResults) {
      if (ssl.certs.length === 0) {
        issues.push({
          severity: 'warning',
          category: 'ssl',
          account_id: account.id,
          account_name: account.name,
          install_id: ssl.installId,
          install_name: ssl.installName,
          message: `Install ${ssl.installName} (${ssl.environment}) has no SSL certificate`,
        });
        continue;
      }

      // Check for expired certs
      const expiredCerts = ssl.certs.filter((c) => c.expires_at && c.expires_at < now);
      for (const cert of expiredCerts) {
        issues.push({
          severity: 'critical',
          category: 'ssl',
          account_id: account.id,
          account_name: account.name,
          install_id: ssl.installId,
          install_name: ssl.installName,
          message: `SSL certificate expired on ${ssl.installName} (${ssl.environment}), expired ${cert.expires_at}`,
        });
      }

      // Check for expiring certs (not already expired)
      const nonExpiredCerts = ssl.certs.filter((c) => !c.expires_at || c.expires_at >= now);
      const expiringSoon = findExpiringSslCerts(nonExpiredCerts);
      for (const cert of expiringSoon) {
        issues.push({
          severity: 'warning',
          category: 'ssl',
          account_id: account.id,
          account_name: account.name,
          install_id: ssl.installId,
          install_name: ssl.installName,
          message: `SSL certificate expiring on ${ssl.installName} (${ssl.environment}), expires ${cert.expires_at}`,
        });
      }
    }

    // Capacity checks
    issues.push(...checkCapacity(limits, account.id, account.name));

    // PHP version mismatch checks
    issues.push(...checkPhpVersionMismatches(installs, account.id, account.name));

    // Status checks
    for (const install of installs) {
      if (install.status && install.status !== 'active') {
        issues.push({
          severity: 'warning',
          category: 'status',
          account_id: account.id,
          account_name: account.name,
          install_id: install.id,
          install_name: install.name,
          message: `Install ${install.name} (${install.environment ?? 'unknown'}) has status '${install.status}'`,
        });
      }
    }

    // Build headroom
    const headroom: Record<string, MetricHeadroom> = {};
    if (limits.visitors) headroom.visitors = computeHeadroom(limits.visitors.allowed, limits.visitors.used);
    if (limits.storage) headroom.storage = computeHeadroom(limits.storage.allowed, limits.storage.used);
    if (limits.bandwidth) headroom.bandwidth = computeHeadroom(limits.bandwidth.allowed, limits.bandwidth.used);

    // Count issues by severity
    const issueCounts = { critical: 0, warning: 0, info: 0 };
    for (const issue of issues) {
      issueCounts[issue.severity]++;
    }

    return {
      account_id: account.id,
      account_name: account.name,
      install_count: installs.length,
      headroom,
      issue_count: issueCounts,
      issues,
    };
  });

  const successResults = results.filter((r) => r.result !== null).map((r) => r.result!);
  const errors = results.filter((r) => r.error).map((r) => ({
    account_id: r.item.id,
    account_name: r.item.name,
    error: r.error,
  }));

  // Aggregate issues from all accounts and sort
  const allIssues: HealthIssue[] = [];
  for (const r of successResults) {
    allIssues.push(...(r.issues as HealthIssue[]));
  }
  const sortedIssues = sortIssues(allIssues);

  // Build account summaries (without the per-account issues)
  const accountSummaries = successResults.map((r) => ({
    account_id: r.account_id,
    account_name: r.account_name,
    install_count: r.install_count,
    headroom: r.headroom,
    issue_count: r.issue_count,
  }));

  const totalInstalls = successResults.reduce((sum, r) => sum + (r.install_count as number), 0);

  return {
    total_accounts: accounts.length,
    total_installs: totalInstalls,
    issues: sortedIssues,
    accounts: accountSummaries,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
