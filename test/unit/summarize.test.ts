import { describe, it, expect } from 'vitest';
import { applySummarization, hasSummarizer, SUMMARIZERS } from '../../src/summarize.js';

describe('hasSummarizer', () => {
  it('returns true for registered tools', () => {
    expect(hasSummarizer('wpe_get_account_usage')).toBe(true);
    expect(hasSummarizer('wpe_get_install_usage')).toBe(true);
    expect(hasSummarizer('wpe_get_installs')).toBe(true);
    expect(hasSummarizer('wpe_get_sites')).toBe(true);
    expect(hasSummarizer('wpe_get_account_users')).toBe(true);
    expect(hasSummarizer('wpe_account_usage')).toBe(true);
    expect(hasSummarizer('wpe_account_domains')).toBe(true);
    expect(hasSummarizer('wpe_account_ssl_status')).toBe(true);
    expect(hasSummarizer('wpe_diagnose_site')).toBe(true);
    expect(hasSummarizer('wpe_portfolio_overview')).toBe(true);
    expect(hasSummarizer('wpe_portfolio_usage')).toBe(true);
    expect(hasSummarizer('wpe_fleet_health')).toBe(true);
  });

  it('returns false for unregistered tools', () => {
    expect(hasSummarizer('wpe_get_accounts')).toBe(false);
    expect(hasSummarizer('wpe_create_site')).toBe(false);
    expect(hasSummarizer('wpe_delete_install')).toBe(false);
  });

  it('registers exactly 12 summarizers', () => {
    expect(SUMMARIZERS.size).toBe(12);
  });
});

describe('applySummarization', () => {
  it('returns data unchanged when summaryEnabled is false', () => {
    const data = { environment_metrics: [{ metrics: [{}, {}] }] };
    const result = applySummarization('wpe_get_account_usage', data, false);
    expect(result).toBe(data); // same reference
  });

  it('returns data unchanged for tools without a summarizer', () => {
    const data = { results: [{ id: '1', name: 'acme' }] };
    const result = applySummarization('wpe_get_accounts', data, true);
    expect(result).toBe(data);
  });

  it('passes through error responses unchanged', () => {
    const data = { error: { status: 403, message: 'Forbidden' } };
    const result = applySummarization('wpe_get_account_usage', data, true);
    expect(result).toBe(data);
  });
});

describe('summarizeAccountUsage', () => {
  it('strips daily metrics, keeps rollups per environment', () => {
    const input = {
      environment_metrics: [
        {
          environment_name: 'production',
          metrics: Array.from({ length: 30 }, (_, i) => ({
            date: `2024-01-${String(i + 1).padStart(2, '0')}`,
            visit_count: 100 + i,
            storage_file_bytes: 1000000,
          })),
          metrics_rollup: {
            visit_count: { sum: 3000, average: 100, latest: { date: '2024-01-30', value: 129 } },
            storage_file_bytes: { sum: 30000000, average: 1000000, latest: { date: '2024-01-30', value: 1000000 } },
            storage_database_bytes: { sum: 15000000, average: 500000, latest: { date: '2024-01-30', value: 500000 } },
            network_total_bytes: { sum: 150000000, average: 5000000, latest: { date: '2024-01-30', value: 5000000 } },
          },
          storage_refresh_expected_time: '2024-01-30T12:00:00Z',
        },
        {
          environment_name: 'staging',
          metrics: [{ date: '2024-01-30', visit_count: 5 }],
          metrics_rollup: {
            visit_count: { sum: 50, average: 5, latest: { date: '2024-01-30', value: 5 } },
            storage_file_bytes: { sum: 500000, average: 50000, latest: { date: '2024-01-30', value: 50000 } },
            storage_database_bytes: { sum: 250000, average: 25000, latest: { date: '2024-01-30', value: 25000 } },
            network_total_bytes: { sum: 1000000, average: 100000, latest: { date: '2024-01-30', value: 100000 } },
          },
        },
      ],
      total_size: 2,
      all_environments_included: true,
    };

    const result = applySummarization('wpe_get_account_usage', input, true) as Record<string, unknown>;

    expect(result.summary).toBe(true);
    expect(result.total_environments).toBe(2);
    expect(result.all_included).toBe(true);

    const envs = result.environments as Array<Record<string, unknown>>;
    expect(envs).toHaveLength(2);

    expect(envs[0]).toEqual({
      name: 'production',
      storage_files_bytes: 1000000,
      storage_db_bytes: 500000,
      total_visits: 3000,
      total_bandwidth_bytes: 150000000,
    });

    expect(envs[1]).toEqual({
      name: 'staging',
      storage_files_bytes: 50000,
      storage_db_bytes: 25000,
      total_visits: 50,
      total_bandwidth_bytes: 1000000,
    });
  });

  it('handles empty environment_metrics', () => {
    const input = {
      environment_metrics: [],
      total_size: 0,
      all_environments_included: true,
    };

    const result = applySummarization('wpe_get_account_usage', input, true) as Record<string, unknown>;
    expect(result.summary).toBe(true);
    expect(result.total_environments).toBe(0);
    expect(result.environments).toEqual([]);
  });

  it('handles missing rollup fields with null fallback', () => {
    const input = {
      environment_metrics: [
        {
          environment_name: 'production',
          metrics: [],
          metrics_rollup: {},
        },
      ],
    };

    const result = applySummarization('wpe_get_account_usage', input, true) as Record<string, unknown>;
    const envs = result.environments as Array<Record<string, unknown>>;
    expect(envs[0]!.storage_files_bytes).toBeNull();
    expect(envs[0]!.total_visits).toBeNull();
  });
});

describe('summarizeInstallUsage', () => {
  it('drops daily metrics, keeps rollup and name', () => {
    const input = {
      install_name: 'my-site-prod',
      metrics: Array.from({ length: 30 }, () => ({ date: '2024-01-01', visit_count: 100 })),
      metrics_rollup: {
        visit_count: { sum: 3000 },
        storage_file_bytes: { latest: { value: 1000000 } },
      },
      storage_refresh_expected_time: '2024-01-30T12:00:00Z',
    };

    const result = applySummarization('wpe_get_install_usage', input, true) as Record<string, unknown>;

    expect(result.summary).toBe(true);
    expect(result.install_name).toBe('my-site-prod');
    expect(result.metrics_rollup).toEqual(input.metrics_rollup);
    // daily metrics array should NOT be present
    expect(result).not.toHaveProperty('metrics');
  });

  it('passes through if metrics_rollup is missing', () => {
    const input = { install_name: 'broken', some_field: 'value' };
    const result = applySummarization('wpe_get_install_usage', input, true);
    expect(result).toBe(input);
  });
});

describe('summarizeInstalls', () => {
  it('reduces to 7 key fields per install', () => {
    const input = {
      results: [
        {
          id: 'inst-1',
          name: 'my-site-prod',
          account: { id: 'acc-1', name: 'My Account' },
          php_version: '8.2',
          status: 'active',
          site: { id: 'site-1', name: 'My Site' },
          cname: 'my-site.wpengine.com',
          stable_ips: ['1.2.3.4', '5.6.7.8'],
          environment: 'production',
          primary_domain: 'example.com',
          is_multisite: false,
          created_at: '2023-01-01T00:00:00Z',
        },
      ],
      count: 1,
      next: null,
      previous: null,
    };

    const result = applySummarization('wpe_get_installs', input, true) as Record<string, unknown>;

    expect(result.summary).toBe(true);
    expect(result.total).toBe(1);

    const results = result.results as Array<Record<string, unknown>>;
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: 'inst-1',
      name: 'my-site-prod',
      environment: 'production',
      status: 'active',
      primary_domain: 'example.com',
      php_version: '8.2',
      site_id: 'site-1',
    });

    // Verbose fields should NOT be present
    expect(results[0]).not.toHaveProperty('account');
    expect(results[0]).not.toHaveProperty('cname');
    expect(results[0]).not.toHaveProperty('stable_ips');
    expect(results[0]).not.toHaveProperty('is_multisite');
    expect(results[0]).not.toHaveProperty('created_at');
  });

  it('handles missing site gracefully', () => {
    const input = {
      results: [{ id: 'inst-1', name: 'orphan', site: null }],
      count: 1,
    };

    const result = applySummarization('wpe_get_installs', input, true) as Record<string, unknown>;
    const results = result.results as Array<Record<string, unknown>>;
    expect(results[0]!.site_id).toBeNull();
  });
});

describe('summarizeSites', () => {
  it('condenses installs and derives type', () => {
    const input = {
      results: [
        {
          id: 'site-1',
          name: 'My Site',
          account: { id: 'acc-1' },
          group_name: 'Group A',
          tags: ['tag1'],
          created_at: '2023-01-01',
          sandbox: false,
          transferable: false,
          installs: [
            { id: 'i1', name: 'prod', environment: 'production', cname: 'x.com', php_version: '8.2', is_multisite: false },
            { id: 'i2', name: 'stage', environment: 'staging', cname: 'y.com', php_version: '8.2', is_multisite: false },
          ],
        },
        {
          id: 'site-2',
          name: 'Sandbox',
          account: { id: 'acc-1' },
          sandbox: true,
          transferable: false,
          installs: [],
        },
        {
          id: 'site-3',
          name: 'Transfer',
          account: { id: 'acc-1' },
          sandbox: false,
          transferable: true,
          installs: [{ id: 'i3', name: 'dev', environment: 'development' }],
        },
      ],
      count: 3,
    };

    const result = applySummarization('wpe_get_sites', input, true) as Record<string, unknown>;

    expect(result.summary).toBe(true);
    expect(result.total).toBe(3);

    const results = result.results as Array<Record<string, unknown>>;
    expect(results[0]).toEqual({
      id: 'site-1',
      name: 'My Site',
      type: 'standard',
      install_count: 2,
      installs: [
        { id: 'i1', name: 'prod', environment: 'production' },
        { id: 'i2', name: 'stage', environment: 'staging' },
      ],
    });
    expect(results[1]!.type).toBe('sandbox');
    expect(results[1]!.install_count).toBe(0);
    expect(results[2]!.type).toBe('transferable');
  });
});

describe('summarizeAccountUsers', () => {
  it('combines name, counts installs, maps active from invite_accepted', () => {
    const input = {
      results: [
        {
          user_id: 'u1',
          account_id: 'acc-1',
          first_name: 'Alice',
          last_name: 'Smith',
          email: 'alice@example.com',
          phone: '+1234567890',
          invite_accepted: true,
          mfa_enabled: true,
          roles: 'full',
          last_owner: false,
          installs: ['inst-1', 'inst-2', 'inst-3'],
        },
        {
          user_id: 'u2',
          account_id: 'acc-1',
          first_name: 'Bob',
          last_name: null,
          email: 'bob@example.com',
          phone: null,
          invite_accepted: false,
          mfa_enabled: false,
          roles: 'partial',
          last_owner: null,
          installs: null,
        },
      ],
      count: 2,
    };

    const result = applySummarization('wpe_get_account_users', input, true) as Record<string, unknown>;

    expect(result.summary).toBe(true);
    expect(result.total).toBe(2);

    const results = result.results as Array<Record<string, unknown>>;
    expect(results[0]).toEqual({
      user_id: 'u1',
      name: 'Alice Smith',
      email: 'alice@example.com',
      roles: 'full',
      active: true,
      mfa_enabled: true,
      install_count: 3,
    });
    expect(results[1]!.name).toBe('Bob');
    expect(results[1]!.active).toBe(false);
    expect(results[1]!.install_count).toBeNull();
  });
});

describe('summarizeCompositeAccountUsage', () => {
  it('summarizes nested usage data, keeps insights as-is', () => {
    const input = {
      usage: {
        environment_metrics: [
          {
            environment_name: 'production',
            metrics: [{ date: '2024-01-01' }],
            metrics_rollup: {
              visit_count: { sum: 3000 },
              storage_file_bytes: { latest: { value: 1000000 } },
              storage_database_bytes: { latest: { value: 500000 } },
              network_total_bytes: { sum: 150000000 },
            },
          },
        ],
        all_environments_included: true,
      },
      insights: { visit_count: { total: '3000' } },
    };

    const result = applySummarization('wpe_account_usage', input, true) as Record<string, unknown>;

    expect(result.summary).toBe(true);
    // Nested usage should be summarized
    const usage = result.usage as Record<string, unknown>;
    expect(usage.summary).toBe(true);
    expect(usage.environments).toBeDefined();
    // Insights passed through unchanged
    expect(result.insights).toEqual({ visit_count: { total: '3000' } });
  });
});

describe('summarizeAccountDomains', () => {
  it('strips domain/SSL arrays, keeps counts and primary', () => {
    const input = {
      installs: [
        {
          install_id: 'i1',
          install_name: 'prod-site',
          environment: 'production',
          domains: [
            { id: 'd1', name: 'example.com', primary: true, duplicate: false },
            { id: 'd2', name: 'www.example.com', primary: false, duplicate: false },
            { id: 'd3', name: 'old.example.com', primary: false, duplicate: false },
          ],
          ssl_certificates: { certificates: [{ id: 'c1', status: 'active' }] },
        },
        {
          install_id: 'i2',
          install_name: 'staging-site',
          environment: 'staging',
          domains: [],
          ssl_certificates: null,
        },
      ],
      total_domains: 3,
    };

    const result = applySummarization('wpe_account_domains', input, true) as Record<string, unknown>;

    expect(result.summary).toBe(true);
    expect(result.total_domains).toBe(3);

    const installs = result.installs as Array<Record<string, unknown>>;
    expect(installs).toHaveLength(2);
    expect(installs[0]).toEqual({
      install_name: 'prod-site',
      environment: 'production',
      domain_count: 3,
      primary_domain: 'example.com',
    });
    expect(installs[1]).toEqual({
      install_name: 'staging-site',
      environment: 'staging',
      domain_count: 0,
      primary_domain: null,
    });
  });

  it('preserves errors array', () => {
    const input = {
      installs: [],
      total_domains: 0,
      errors: [{ install_id: 'i1', error: 'forbidden' }],
    };

    const result = applySummarization('wpe_account_domains', input, true) as Record<string, unknown>;
    expect(result.errors).toEqual([{ install_id: 'i1', error: 'forbidden' }]);
  });
});

describe('summarizeAccountSslStatus', () => {
  it('strips cert arrays, keeps counts and flags', () => {
    const input = {
      installs: [
        {
          install_id: 'i1',
          install_name: 'prod-site',
          environment: 'production',
          certificate_count: 2,
          certificates: [{ id: 'c1' }, { id: 'c2' }],
          has_ssl: true,
          expiring_soon: [{ id: 'c2', expires_at: '2024-03-01' }],
        },
        {
          install_id: 'i2',
          install_name: 'staging-site',
          environment: 'staging',
          certificate_count: 0,
          certificates: [],
          has_ssl: false,
          expiring_soon: [],
        },
      ],
      summary: {
        total_installs: 2,
        with_ssl: 1,
        without_ssl: 1,
        expiring_soon: 1,
      },
      warnings: ['prod-site: SSL certificate expires 2024-03-01'],
    };

    const result = applySummarization('wpe_account_ssl_status', input, true) as Record<string, unknown>;

    expect(result.summary).toBe(true);

    const installs = result.installs as Array<Record<string, unknown>>;
    expect(installs[0]).toEqual({
      install_name: 'prod-site',
      environment: 'production',
      cert_count: 2,
      has_ssl: true,
      expiring_count: 1,
    });
    expect(installs[1]).toEqual({
      install_name: 'staging-site',
      environment: 'staging',
      cert_count: 0,
      has_ssl: false,
      expiring_count: 0,
    });

    // overview should be the original summary counts
    expect(result.overview).toEqual(input.summary);
    // warnings preserved
    expect(result.warnings).toEqual(input.warnings);
  });
});

describe('summarizeDiagnoseSite', () => {
  it('summarizes usage data, keeps everything else', () => {
    const input = {
      install: { id: 'i1', name: 'prod-site', environment: 'production' },
      usage: {
        install_name: 'prod-site',
        metrics: Array.from({ length: 30 }, () => ({ date: '2024-01-01', visit_count: 100 })),
        metrics_rollup: { visit_count: { sum: 3000 } },
      },
      domains: { results: [{ id: 'd1', name: 'example.com' }] },
      ssl: { certificates: [{ id: 'c1' }] },
      health: { status: 'healthy', warnings: [] },
    };

    const result = applySummarization('wpe_diagnose_site', input, true) as Record<string, unknown>;

    expect(result.summary).toBe(true);
    // Install preserved as-is
    expect(result.install).toEqual(input.install);
    // Usage should be summarized (no metrics array)
    const usage = result.usage as Record<string, unknown>;
    expect(usage.summary).toBe(true);
    expect(usage.install_name).toBe('prod-site');
    expect(usage.metrics_rollup).toEqual({ visit_count: { sum: 3000 } });
    expect(usage).not.toHaveProperty('metrics');
    // Other fields preserved as-is
    expect(result.domains).toEqual(input.domains);
    expect(result.ssl).toEqual(input.ssl);
    expect(result.health).toEqual(input.health);
  });

  it('passes through error responses', () => {
    const input = { error: { status: 404, message: 'Not found' } };
    const result = applySummarization('wpe_diagnose_site', input, true);
    expect(result).toBe(input);
  });
});

describe('summarizePortfolioOverview', () => {
  it('aggregates installs into distribution maps', () => {
    const input = {
      total_accounts: 2,
      total_sites: 3,
      total_installs: 4,
      accounts: [
        {
          account_id: 'acc-1',
          account_name: 'Account One',
          site_count: 1,
          install_count: 2,
          installs: [
            { id: 'i1', name: 'prod', environment: 'production', status: 'active', php_version: '8.2' },
            { id: 'i2', name: 'stage', environment: 'staging', status: 'active', php_version: '8.1' },
          ],
        },
        {
          account_id: 'acc-2',
          account_name: 'Account Two',
          site_count: 2,
          install_count: 2,
          installs: [
            { id: 'i3', name: 'prod2', environment: 'production', status: 'active', php_version: '8.2' },
            { id: 'i4', name: 'dev', environment: 'development', status: 'inactive', php_version: '8.2' },
          ],
        },
      ],
    };

    const result = applySummarization('wpe_portfolio_overview', input, true) as Record<string, unknown>;

    expect(result.summary).toBe(true);
    expect(result.total_accounts).toBe(2);
    expect(result.total_sites).toBe(3);
    expect(result.total_installs).toBe(4);

    expect(result.by_environment).toEqual({ production: 2, staging: 1, development: 1 });
    expect(result.by_php_version).toEqual({ '8.2': 3, '8.1': 1 });
    expect(result.by_status).toEqual({ active: 3, inactive: 1 });

    // Accounts should have counts but no install arrays
    const accounts = result.accounts as Array<Record<string, unknown>>;
    expect(accounts).toHaveLength(2);
    expect(accounts[0]).toEqual({
      account_id: 'acc-1',
      account_name: 'Account One',
      site_count: 1,
      install_count: 2,
    });
    expect(accounts[0]).not.toHaveProperty('installs');
  });

  it('passes through error responses', () => {
    const input = { error: { status: 403, message: 'Forbidden' } };
    const result = applySummarization('wpe_portfolio_overview', input, true);
    expect(result).toBe(input);
  });

  it('preserves errors array', () => {
    const input = {
      total_accounts: 2,
      accounts: [{ account_id: 'acc-1', account_name: 'OK', installs: [] }],
      errors: [{ account_id: 'acc-2', error: 'forbidden' }],
    };

    const result = applySummarization('wpe_portfolio_overview', input, true) as Record<string, unknown>;
    expect(result.errors).toEqual([{ account_id: 'acc-2', error: 'forbidden' }]);
  });
});

describe('summarizePortfolioUsage', () => {
  it('keeps top 20 installs sorted by visits', () => {
    const installs = Array.from({ length: 25 }, (_, i) => ({
      install_name: `site-${i}`,
      account_name: 'Test',
      total_visits: 1000 - i * 10,
      total_bandwidth_bytes: 5000000,
      storage_files_bytes: 1000000,
      storage_db_bytes: 500000,
    }));

    const input = {
      total_accounts: 1,
      installs,
    };

    const result = applySummarization('wpe_portfolio_usage', input, true) as Record<string, unknown>;

    expect(result.summary).toBe(true);
    expect(result.total_installs_with_data).toBe(25);
    expect(result.showing).toBe(20);

    const ranked = result.ranked_by_visits as Array<Record<string, unknown>>;
    expect(ranked).toHaveLength(20);
    expect(ranked[0]!.install_name).toBe('site-0');
    expect(ranked[0]!.total_visits).toBe(1000);
    expect(ranked[19]!.install_name).toBe('site-19');
  });

  it('handles fewer than 20 installs', () => {
    const input = {
      total_accounts: 1,
      installs: [
        { install_name: 'only-one', account_name: 'Test', total_visits: 500 },
      ],
    };

    const result = applySummarization('wpe_portfolio_usage', input, true) as Record<string, unknown>;
    expect(result.showing).toBe(1);
    expect(result.total_installs_with_data).toBe(1);
  });

  it('passes through error responses', () => {
    const input = { error: { status: 403, message: 'Forbidden' } };
    const result = applySummarization('wpe_portfolio_usage', input, true);
    expect(result).toBe(input);
  });

  it('preserves errors array', () => {
    const input = {
      total_accounts: 2,
      installs: [],
      errors: [{ account_id: 'acc-2', error: 'forbidden' }],
    };

    const result = applySummarization('wpe_portfolio_usage', input, true) as Record<string, unknown>;
    expect(result.errors).toEqual([{ account_id: 'acc-2', error: 'forbidden' }]);
  });
});

describe('summarizeFleetHealth', () => {
  it('strips per-account headroom, keeps issue counts', () => {
    const input = {
      total_accounts: 2,
      total_installs: 3,
      issues: [
        { severity: 'critical', category: 'ssl', account_id: 'acc-1', account_name: 'Account One', install_name: 'prod', message: 'SSL expired' },
        { severity: 'warning', category: 'capacity', account_id: 'acc-2', account_name: 'Account Two', message: 'Storage at 85%' },
      ],
      accounts: [
        {
          account_id: 'acc-1',
          account_name: 'Account One',
          install_count: 1,
          headroom: {
            visitors: { allowed: 100000, used: 50000, percent_used: 50 },
            storage: { allowed: 20000000000, used: 5000000000, percent_used: 25 },
          },
          issue_count: { critical: 1, warning: 0, info: 0 },
        },
        {
          account_id: 'acc-2',
          account_name: 'Account Two',
          install_count: 2,
          headroom: {
            visitors: { allowed: 100000, used: 60000, percent_used: 60 },
            storage: { allowed: 20000000000, used: 17000000000, percent_used: 85 },
          },
          issue_count: { critical: 0, warning: 1, info: 0 },
        },
      ],
    };

    const result = applySummarization('wpe_fleet_health', input, true) as Record<string, unknown>;

    expect(result.summary).toBe(true);
    expect(result.total_accounts).toBe(2);
    expect(result.total_installs).toBe(3);
    expect(result.issues).toEqual(input.issues);

    const accounts = result.accounts as Array<Record<string, unknown>>;
    expect(accounts).toHaveLength(2);
    // Headroom should be stripped
    expect(accounts[0]).toEqual({
      account_id: 'acc-1',
      account_name: 'Account One',
      install_count: 1,
      issue_count: { critical: 1, warning: 0, info: 0 },
    });
    expect(accounts[0]).not.toHaveProperty('headroom');
    expect(accounts[1]).not.toHaveProperty('headroom');
  });

  it('passes through error responses', () => {
    const input = { error: { status: 403, message: 'Forbidden' } };
    const result = applySummarization('wpe_fleet_health', input, true);
    expect(result).toBe(input);
  });

  it('preserves errors array', () => {
    const input = {
      total_accounts: 2,
      total_installs: 1,
      issues: [],
      accounts: [{ account_id: 'acc-1', account_name: 'OK', install_count: 1, issue_count: { critical: 0, warning: 0, info: 0 } }],
      errors: [{ account_id: 'acc-2', error: 'forbidden' }],
    };

    const result = applySummarization('wpe_fleet_health', input, true) as Record<string, unknown>;
    expect(result.errors).toEqual([{ account_id: 'acc-2', error: 'forbidden' }]);
  });
});
