import type { CapiClient } from '../../capi-client.js';
import { fanOut } from '../../fan-out.js';

export const wpeAccountBackupsDef = {
  name: 'wpe_account_backups',
  description: 'List recent backups across all installs in an account, flagging installs without recent backups.',
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

interface Backup {
  id: string;
  description: string;
  created_at: string;
}

export async function wpeAccountBackupsHandler(
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

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const results = await fanOut(installs, async (install) => {
    const backupsResp = await client.get<{ results: Backup[] }>(`/installs/${install.id}/backups`);

    const backups = backupsResp.ok ? (backupsResp.data?.results ?? []) : [];
    const latestBackup = backups.length > 0 ? backups[0] : null;
    const hasRecentBackup = latestBackup ? latestBackup.created_at >= oneDayAgo : false;

    return {
      install_id: install.id,
      install_name: install.name,
      environment: install.environment,
      backup_count: backups.length,
      latest_backup: latestBackup,
      has_recent_backup: hasRecentBackup,
      error: !backupsResp.ok ? backupsResp.error : undefined,
    };
  });

  const successResults = results.filter((r) => r.result !== null).map((r) => r.result!);
  const errors = results.filter((r) => r.error).map((r) => ({
    install_id: r.item.id,
    error: r.error,
  }));

  const missingBackups = successResults.filter((r) => !r.has_recent_backup && !r.error);

  return {
    installs: successResults,
    summary: {
      total_installs: installs.length,
      with_recent_backup: successResults.filter((r) => r.has_recent_backup).length,
      without_recent_backup: missingBackups.length,
    },
    ...(missingBackups.length > 0 ? {
      warnings: missingBackups.map((r) => `${r.install_name} (${r.environment}) has no backup in the last 24 hours`),
    } : {}),
    ...(errors.length > 0 ? { errors } : {}),
  };
}
