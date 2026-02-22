import type { CapiClient } from '../../capi-client.js';

export const wpePromoteToProductionDef = {
  name: 'wpe_promote_to_production',
  description:
    'Promote staging to production. Creates a backup of production, copies staging files and database to production, purges cache, and verifies health. Use instead of wpe_copy_install for staging-to-production promotions.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      staging_install_id: {
        type: 'string',
        description: 'The staging install ID (source)',
      },
      production_install_id: {
        type: 'string',
        description: 'The production install ID (destination)',
      },
      notification_emails: {
        type: 'array',
        description: 'Email addresses to notify when the copy completes',
        items: { type: 'string' },
      },
    },
    required: ['staging_install_id', 'production_install_id'],
  },
  annotations: {
    safetyTier: 3 as const,
    httpMethod: 'POST',
    apiPath: '/install_copy',
    tag: 'Composite',
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export async function wpePromoteToProductionHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const stagingId = params.staging_install_id as string;
  const productionId = params.production_install_id as string;
  const notificationEmails = params.notification_emails as string[] | undefined;

  // Step 1: Fetch both installs in parallel
  const [stagingResp, productionResp] = await Promise.all([
    client.get(`/installs/${stagingId}`),
    client.get(`/installs/${productionId}`),
  ]);

  if (!stagingResp.ok) {
    return { error: stagingResp.error, detail: `Staging install ${stagingId} not found` };
  }
  if (!productionResp.ok) {
    return { error: productionResp.error, detail: `Production install ${productionId} not found` };
  }

  const staging = stagingResp.data as AnyRecord;
  const production = productionResp.data as AnyRecord;

  const warnings: string[] = [];
  if (production.environment !== 'production') {
    warnings.push(
      `Destination install environment is "${production.environment}", not "production"`,
    );
  }

  // Step 2: Build diff
  const diffFields = ['php_version', 'status', 'environment', 'wp_version', 'primary_domain'];
  const diff: Array<{ field: string; staging: unknown; production: unknown }> = [];
  for (const field of diffFields) {
    if (staging[field] !== production[field]) {
      diff.push({ field, staging: staging[field], production: production[field] });
    }
  }

  // Step 3: Create backup of production
  const backupBody: AnyRecord = { description: 'Pre-promotion backup' };
  if (notificationEmails && notificationEmails.length > 0) {
    backupBody.notification_emails = notificationEmails;
  }
  const backupResp = await client.post(`/installs/${productionId}/backups`, backupBody);

  if (!backupResp.ok) {
    return {
      staging: extractInstallSummary(staging),
      production: extractInstallSummary(production),
      diff,
      warnings,
      backup: { error: backupResp.error },
      copy: { skipped: true, reason: 'Backup failed — copy not attempted' },
      cache_purge: { skipped: true },
      post_copy_status: null,
    };
  }

  const backupData = backupResp.data as AnyRecord;

  // Step 4: Copy staging to production
  const copyBody: AnyRecord = {
    source_environment_id: stagingId,
    destination_environment_id: productionId,
  };
  if (notificationEmails) {
    copyBody.notification_emails = notificationEmails;
  }

  const copyResp = await client.post('/install_copy', copyBody);

  if (!copyResp.ok) {
    return {
      staging: extractInstallSummary(staging),
      production: extractInstallSummary(production),
      diff,
      warnings,
      backup: { id: backupData.id, status: backupData.status },
      copy: { error: copyResp.error },
      cache_purge: { skipped: true },
      post_copy_status: null,
    };
  }

  // Step 5: Purge cache (non-fatal)
  const purgeResp = await client.post(`/installs/${productionId}/purge_cache`, { type: 'all' });
  const cachePurge = purgeResp.ok
    ? { success: true }
    : { error: purgeResp.error };

  // Step 6: Fetch production install post-copy
  const postCopyResp = await client.get(`/installs/${productionId}`);
  const postCopyStatus = postCopyResp.ok
    ? extractInstallSummary(postCopyResp.data as AnyRecord)
    : { error: postCopyResp.error };

  return {
    staging: extractInstallSummary(staging),
    production: extractInstallSummary(production),
    diff,
    warnings,
    backup: { id: backupData.id, status: backupData.status },
    copy: { success: true },
    cache_purge: cachePurge,
    post_copy_status: postCopyStatus,
  };
}

function extractInstallSummary(install: AnyRecord) {
  return {
    id: install.id,
    name: install.name,
    environment: install.environment ?? null,
    php_version: install.php_version ?? null,
    status: install.status ?? null,
    primary_domain: install.primary_domain ?? null,
  };
}
