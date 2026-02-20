/**
 * Summarization middleware for MCP tools.
 *
 * Tools that return large responses (usage time-series, install lists, fan-out composites)
 * register a summarizer here. The server applies summarization after the handler returns,
 * controlled by a `summary` parameter (default: true).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export type Summarizer = (data: unknown) => unknown;

// ---------------------------------------------------------------------------
// Individual summarizers
// ---------------------------------------------------------------------------

/**
 * wpe_get_account_usage — strip daily metrics arrays, keep rollups per environment.
 */
function summarizeAccountUsage(data: unknown): unknown {
  const d = data as AnyRecord;
  if (d?.error || !d?.environment_metrics) return data;

  const envMetrics = d.environment_metrics as AnyRecord[];
  return {
    summary: true,
    total_environments: envMetrics.length,
    all_included: d.all_environments_included ?? null,
    environments: envMetrics.map((env) => ({
      name: env.environment_name ?? 'unknown',
      storage_files_bytes: env.metrics_rollup?.storage_file_bytes?.latest?.value ?? null,
      storage_db_bytes: env.metrics_rollup?.storage_database_bytes?.latest?.value ?? null,
      total_visits: env.metrics_rollup?.visit_count?.sum ?? null,
      total_bandwidth_bytes: env.metrics_rollup?.network_total_bytes?.sum ?? null,
    })),
  };
}

/**
 * wpe_get_install_usage — drop daily metrics array, keep rollup and name.
 */
function summarizeInstallUsage(data: unknown): unknown {
  const d = data as AnyRecord;
  if (d?.error || !d?.metrics_rollup) return data;

  return {
    summary: true,
    install_name: d.install_name ?? null,
    metrics_rollup: d.metrics_rollup,
  };
}

/**
 * wpe_get_installs — reduce to 7 key fields per install.
 */
function summarizeInstalls(data: unknown): unknown {
  const d = data as AnyRecord;
  if (d?.error || !d?.results) return data;

  const results = d.results as AnyRecord[];
  return {
    summary: true,
    total: d.count ?? results.length,
    results: results.map((inst) => ({
      id: inst.id,
      name: inst.name,
      environment: inst.environment ?? null,
      status: inst.status ?? null,
      primary_domain: inst.primary_domain ?? null,
      php_version: inst.php_version ?? null,
      site_id: inst.site?.id ?? null,
    })),
  };
}

/**
 * wpe_get_sites — condense install arrays, derive type from flags.
 */
function summarizeSites(data: unknown): unknown {
  const d = data as AnyRecord;
  if (d?.error || !d?.results) return data;

  const results = d.results as AnyRecord[];
  return {
    summary: true,
    total: d.count ?? results.length,
    results: results.map((site) => {
      const type = site.sandbox ? 'sandbox' : site.transferable ? 'transferable' : 'standard';
      const installs = (site.installs as AnyRecord[] | undefined) ?? [];
      return {
        id: site.id,
        name: site.name,
        type,
        install_count: installs.length,
        installs: installs.map((i) => ({
          id: i.id,
          name: i.name,
          environment: i.environment ?? null,
        })),
      };
    }),
  };
}

/**
 * wpe_get_account_users — reduce to key fields, combine name, count installs.
 */
function summarizeAccountUsers(data: unknown): unknown {
  const d = data as AnyRecord;
  if (d?.error || !d?.results) return data;

  const results = d.results as AnyRecord[];
  return {
    summary: true,
    total: d.count ?? results.length,
    results: results.map((user) => {
      const installs = user.installs as unknown[] | undefined;
      return {
        user_id: user.user_id,
        name: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
        email: user.email ?? null,
        roles: user.roles ?? null,
        active: user.invite_accepted ?? null,
        mfa_enabled: user.mfa_enabled ?? null,
        install_count: installs?.length ?? null,
      };
    }),
  };
}

/**
 * wpe_account_usage (composite) — summarize the nested usage data, keep insights as-is.
 */
function summarizeCompositeAccountUsage(data: unknown): unknown {
  const d = data as AnyRecord;
  if (d?.error) return data;

  return {
    summary: true,
    usage: d.usage ? summarizeAccountUsage(d.usage) : d.usage,
    insights: d.insights,
  };
}

/**
 * wpe_account_domains (composite) — strip domain/SSL arrays, keep counts + primary.
 */
function summarizeAccountDomains(data: unknown): unknown {
  const d = data as AnyRecord;
  if (d?.error || !d?.installs) return data;

  const installs = d.installs as AnyRecord[];
  return {
    summary: true,
    total_domains: d.total_domains ?? 0,
    installs: installs.map((inst) => {
      const domains = (inst.domains as AnyRecord[] | undefined) ?? [];
      const primary = domains.find((dom) => dom.primary);
      return {
        install_name: inst.install_name ?? inst.name ?? null,
        environment: inst.environment ?? null,
        domain_count: domains.length,
        primary_domain: primary?.name ?? null,
      };
    }),
    ...(d.errors ? { errors: d.errors } : {}),
  };
}

/**
 * wpe_account_ssl_status (composite) — strip cert arrays, keep counts + flags.
 */
function summarizeAccountSslStatus(data: unknown): unknown {
  const d = data as AnyRecord;
  if (d?.error || !d?.installs) return data;

  const installs = d.installs as AnyRecord[];
  return {
    summary: true,
    installs: installs.map((inst) => ({
      install_name: inst.install_name ?? inst.name ?? null,
      environment: inst.environment ?? null,
      cert_count: inst.certificate_count ?? 0,
      has_ssl: inst.has_ssl ?? false,
      expiring_count: (inst.expiring_soon as unknown[] | undefined)?.length ?? 0,
    })),
    overview: d.summary ?? null,
    ...(d.warnings ? { warnings: d.warnings } : {}),
    ...(d.errors ? { errors: d.errors } : {}),
  };
}

/**
 * wpe_diagnose_site (composite) — summarize usage data, keep everything else.
 */
function summarizeDiagnoseSite(data: unknown): unknown {
  const d = data as AnyRecord;
  if (d?.error) return data;

  return {
    summary: true,
    install: d.install,
    usage: d.usage ? summarizeInstallUsage(d.usage) : d.usage,
    domains: d.domains,
    ssl: d.ssl,
    health: d.health,
  };
}

/**
 * wpe_portfolio_overview — aggregate installs into distribution maps, strip per-account install arrays.
 */
function summarizePortfolioOverview(data: unknown): unknown {
  const d = data as AnyRecord;
  if (d?.error || !d?.accounts) return data;

  const accounts = d.accounts as AnyRecord[];
  const byEnvironment: Record<string, number> = {};
  const byPhpVersion: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const account of accounts) {
    const installs = (account.installs as AnyRecord[] | undefined) ?? [];
    for (const inst of installs) {
      const env = (inst.environment as string) ?? 'unknown';
      byEnvironment[env] = (byEnvironment[env] ?? 0) + 1;

      const php = (inst.php_version as string) ?? 'unknown';
      byPhpVersion[php] = (byPhpVersion[php] ?? 0) + 1;

      const status = (inst.status as string) ?? 'unknown';
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }
  }

  return {
    summary: true,
    total_accounts: d.total_accounts ?? accounts.length,
    total_sites: d.total_sites ?? 0,
    total_installs: d.total_installs ?? 0,
    by_environment: byEnvironment,
    by_php_version: byPhpVersion,
    by_status: byStatus,
    accounts: accounts.map((a) => ({
      account_id: a.account_id,
      account_name: a.account_name,
      site_count: a.site_count ?? 0,
      install_count: a.install_count ?? 0,
    })),
    ...(d.errors ? { errors: d.errors } : {}),
  };
}

/**
 * wpe_portfolio_usage — keep top 20 installs by visits.
 */
function summarizePortfolioUsage(data: unknown): unknown {
  const d = data as AnyRecord;
  if (d?.error || !d?.installs) return data;

  const installs = d.installs as AnyRecord[];
  const top20 = installs.slice(0, 20);

  return {
    summary: true,
    total_accounts: d.total_accounts ?? 0,
    total_installs_with_data: installs.length,
    showing: top20.length,
    ranked_by_visits: top20,
    ...(d.errors ? { errors: d.errors } : {}),
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const SUMMARIZERS: ReadonlyMap<string, Summarizer> = new Map<string, Summarizer>([
  ['wpe_get_account_usage', summarizeAccountUsage],
  ['wpe_get_install_usage', summarizeInstallUsage],
  ['wpe_get_installs', summarizeInstalls],
  ['wpe_get_sites', summarizeSites],
  ['wpe_get_account_users', summarizeAccountUsers],
  ['wpe_account_usage', summarizeCompositeAccountUsage],
  ['wpe_account_domains', summarizeAccountDomains],
  ['wpe_account_ssl_status', summarizeAccountSslStatus],
  ['wpe_diagnose_site', summarizeDiagnoseSite],
  ['wpe_portfolio_overview', summarizePortfolioOverview],
  ['wpe_portfolio_usage', summarizePortfolioUsage],
]);

export function hasSummarizer(toolName: string): boolean {
  return SUMMARIZERS.has(toolName);
}

/**
 * Apply summarization if enabled and a summarizer is registered for the tool.
 * Returns data unchanged if summary is disabled, no summarizer exists, or on error.
 */
export function applySummarization(
  toolName: string,
  data: unknown,
  summaryEnabled: boolean,
): unknown {
  if (!summaryEnabled) return data;

  const summarizer = SUMMARIZERS.get(toolName);
  if (!summarizer) return data;

  return summarizer(data);
}
