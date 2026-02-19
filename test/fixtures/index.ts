// CAPI response fixtures for testing
// Derived from swagger.json response schemas

export const accountFixtures = {
  list: {
    results: [
      { id: 'acc-1', name: 'Production Account', nickname: 'prod' },
      { id: 'acc-2', name: 'Development Account', nickname: 'dev' },
    ],
    count: 2,
    next: null,
    previous: null,
  },
  single: { id: 'acc-1', name: 'Production Account', nickname: 'prod' },
  limits: {
    visitors: { allowed: 100000, used: 45000 },
    storage: { allowed: 20000000000, used: 8500000000 },
    bandwidth: { allowed: 50000000000, used: 12000000000 },
  },
};

export const accountUserFixtures = {
  list: {
    results: [
      {
        user_id: 'user-1', account_id: 'acc-1',
        first_name: 'Alice', last_name: 'Smith',
        email: 'alice@example.com', phone: '555-0001',
        invite_accepted: true, mfa_enabled: true,
        roles: ['full'], last_owner: false, installs: ['inst-1'],
      },
      {
        user_id: 'user-2', account_id: 'acc-1',
        first_name: 'Bob', last_name: 'Jones',
        email: 'bob@example.com', phone: '555-0002',
        invite_accepted: false, mfa_enabled: false,
        roles: ['partial'], last_owner: false, installs: [],
      },
    ],
    count: 2,
    next: null,
    previous: null,
  },
  single: {
    user_id: 'user-1', account_id: 'acc-1',
    first_name: 'Alice', last_name: 'Smith',
    email: 'alice@example.com', phone: '555-0001',
    invite_accepted: true, mfa_enabled: true,
    roles: ['full'], last_owner: false, installs: ['inst-1'],
  },
  created: {
    user_id: 'user-3', account_id: 'acc-1',
    first_name: 'Charlie', last_name: 'Brown',
    email: 'charlie@example.com', phone: '555-0003',
    invite_accepted: false, mfa_enabled: false,
    roles: ['partial'], last_owner: false, installs: [],
  },
};

export const siteFixtures = {
  list: {
    results: [
      {
        id: 'site-1', name: 'my-site', account: { id: 'acc-1' },
        group_name: null, tags: [], created_at: '2024-01-15T10:00:00Z',
        sandbox: false, transferable: false,
        installs: [{ id: 'inst-1', name: 'mysiteprod', environment: 'production' }],
      },
      {
        id: 'site-2', name: 'staging-site', account: { id: 'acc-1' },
        group_name: 'Marketing', tags: ['marketing'], created_at: '2024-03-01T12:00:00Z',
        sandbox: false, transferable: false,
        installs: [{ id: 'inst-2', name: 'stagingsite', environment: 'staging' }],
      },
    ],
    count: 2,
    next: null,
    previous: null,
  },
  single: {
    id: 'site-1', name: 'my-site', account: { id: 'acc-1' },
    group_name: null, tags: [], created_at: '2024-01-15T10:00:00Z',
    sandbox: false, transferable: false,
    installs: [{ id: 'inst-1', name: 'mysiteprod', environment: 'production' }],
  },
  created: { id: 'site-3', name: 'new-site', account: { id: 'acc-1' } },
};

export const installFixtures = {
  list: {
    results: [
      {
        id: 'inst-1', name: 'mysiteprod', account: { id: 'acc-1' },
        php_version: '8.2', status: 'active',
        site: { id: 'site-1' }, cname: 'mysiteprod.wpengine.com',
        stable_ips: ['1.2.3.4'], environment: 'production',
        primary_domain: 'example.com', is_multisite: false,
        created_at: '2024-01-15T10:00:00Z',
        wp_version: '6.5', defer_wordpress_upgrades_until: null,
      },
      {
        id: 'inst-2', name: 'mysitestg', account: { id: 'acc-1' },
        php_version: '8.2', status: 'active',
        site: { id: 'site-1' }, cname: 'mysitestg.wpengine.com',
        stable_ips: ['5.6.7.8'], environment: 'staging',
        primary_domain: 'staging.example.com', is_multisite: false,
        created_at: '2024-02-01T10:00:00Z',
        wp_version: '6.5', defer_wordpress_upgrades_until: null,
      },
    ],
    count: 2,
    next: null,
    previous: null,
  },
  single: {
    id: 'inst-1', name: 'mysiteprod', account: { id: 'acc-1' },
    php_version: '8.2', status: 'active',
    site: { id: 'site-1' }, cname: 'mysiteprod.wpengine.com',
    stable_ips: ['1.2.3.4'], environment: 'production',
    primary_domain: 'example.com', is_multisite: false,
    created_at: '2024-01-15T10:00:00Z',
    wp_version: '6.5', defer_wordpress_upgrades_until: null,
  },
  created: { id: 'inst-3', name: 'newinstall', environment: 'development' },
  copyResult: { id: 'inst-4', name: 'copiedinstall', environment: 'staging' },
};

export const domainFixtures = {
  list: {
    results: [
      { id: 'dom-1', name: 'example.com', primary: true, duplicate: false, redirects_to: null, network_type: null, network_details: null, secure_all_urls: true },
      { id: 'dom-2', name: 'www.example.com', primary: false, duplicate: false, redirects_to: 'example.com', network_type: null, network_details: null, secure_all_urls: true },
    ],
    count: 2,
    next: null,
    previous: null,
  },
  single: { id: 'dom-1', name: 'example.com', primary: true, duplicate: false, redirects_to: null, network_type: null, network_details: null, secure_all_urls: true },
  created: { id: 'dom-3', name: 'new.example.com', primary: false },
  bulkCreated: {
    results: [
      { id: 'dom-4', name: 'bulk1.example.com' },
      { id: 'dom-5', name: 'bulk2.example.com' },
    ],
  },
  checkStatus: { report_id: 'report-1' },
  statusReport: {
    complete: true, id: 'report-1', install_name: 'mysiteprod',
    install_ip: '1.2.3.4', admin: true,
    domains: [
      { name: 'example.com', cname: true, a_record: true, complete: true, result: 'pass' },
    ],
  },
};

export const backupFixtures = {
  created: { id: 'backup-1', status: 'pending' },
  single: { id: 'backup-1', status: 'complete' },
};

export const cacheFixtures = {
  purged: { success: true },
};

export const certificateFixtures = {
  list: {
    certificates: [
      {
        id: 'cert-1', account: { id: 'acc-1' }, auto_renew: true,
        common_name: '*.example.com', cert_source: 'letsencrypt',
        wildcard: true, domains: ['example.com', '*.example.com'],
        status: 'active', expires_time: '2025-12-31T00:00:00Z',
      },
    ],
    next_page_token: null,
  },
  domainCert: {
    cert_name: 'example.com', cert_info: { issuer: 'Let\'s Encrypt' },
    certificate: 'cert-1', criteria: 'valid',
  },
  order: { email_address: 'admin@example.com' },
  imported: { certificate: 'cert-data', private_key: 'key-data' },
};

export const usageFixtures = {
  accountUsage: {
    environment_metrics: [
      {
        environment_name: 'mysiteprod',
        metrics: [
          { date: '2024-06-01', visit_count: 1000, billable_visits: 950, network_total_bytes: 5000000, storage_file_bytes: 2000000, storage_database_bytes: 500000 },
        ],
        metrics_rollup: { visit_count: { sum: 30000 }, network_total_bytes: { sum: 150000000 } },
      },
    ],
    total_size: 1,
    next_page_token: null,
    all_environments_included: true,
    last_account_storage_refresh_time: '2024-06-15T10:00:00Z',
    account_storage_refresh_expected_time: '2024-06-15T11:00:00Z',
  },
  refreshDisk: { success: true },
  summary: {
    visit_count: { total: 30000, environment_types: { production: 28000, staging: 2000, development: 0 } },
    network_total_bytes: { total: 150000000 },
    storage_file_bytes: { total: 2000000 },
    storage_database_bytes: { total: 500000 },
  },
  insights: {
    visit_count: 30000, billable_visits: 28500,
    network_origin_bytes: 50000000, network_cdn_bytes: 100000000,
    network_total_bytes: 150000000, storage_file_bytes: 2000000,
    storage_database_bytes: 500000, request_origin_count: 45000,
  },
  installUsage: {
    install_name: 'mysiteprod',
    metrics: [
      { date: '2024-06-01', visit_count: 1000, billable_visits: 950, network_total_bytes: 5000000, storage_file_bytes: 2000000, storage_database_bytes: 500000 },
    ],
    metrics_rollup: { visit_count: { sum: 30000 } },
  },
};

export const offloadFixtures = {
  largefsValidation: { name: '.largefs', content: 'validation-content' },
  settings: { largefs_settings: { enabled: true, provider: 's3', bucket: 'my-bucket' } },
  configured: { largefs_settings: { enabled: true, provider: 's3', bucket: 'new-bucket' } },
};

export const sshKeyFixtures = {
  list: {
    results: [
      { uuid: 'key-1', comment: 'alice@laptop', fingerprint: 'SHA256:abc123', created_at: '2024-01-01T00:00:00Z' },
      { uuid: 'key-2', comment: 'bob@desktop', fingerprint: 'SHA256:def456', created_at: '2024-02-01T00:00:00Z' },
    ],
    count: 2,
    next: null,
    previous: null,
  },
  created: { uuid: 'key-3', comment: 'new-key', fingerprint: 'SHA256:ghi789', created_at: '2024-06-01T00:00:00Z' },
};

export const statusFixtures = {
  status: { success: true, created_on: '2024-01-01T00:00:00Z' },
};

export const userFixtures = {
  currentUser: {
    id: 'user-1', first_name: 'Alice', last_name: 'Smith',
    email: 'alice@example.com', phone_number: '555-0001',
  },
};

export const errorFixtures = {
  unauthorized: { status: 401, body: { message: 'Invalid credentials', documentation_url: 'https://docs.wpengine.com' } },
  forbidden: { status: 403, body: { message: 'Access denied', documentation_url: 'https://docs.wpengine.com' } },
  notFound: { status: 404, body: { message: 'Not found', documentation_url: 'https://docs.wpengine.com' } },
};
