// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: Backup

import type { CapiClient } from '../../capi-client.js';

export const wpeCreateBackupDef = {
  name: 'wpe_create_backup',
  description: "Requests a new backup of a WordPress installation",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "ID of install"
        },
        "description": {
            "type": "string",
            "description": "A description of this backup."
        },
        "notification_emails": {
            "type": "array",
            "description": "The email address(es) that will receive an email once the backup has completed."
        }
    },
    required: ["install_id","description","notification_emails"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/installs/{install_id}/backups',
    tag: 'Backup',
  },
};

export async function wpeCreateBackupHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['description'] !== undefined) body['description'] = params['description'];
  if (params['notification_emails'] !== undefined) body['notification_emails'] = params['notification_emails'];
  const response = await client.post(`/installs/${params.install_id as string}/backups`, body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetBackupDef = {
  name: 'wpe_get_backup',
  description: "Retrieves the status of a backup of a WordPress installation",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "ID of install"
        },
        "backup_id": {
            "type": "string",
            "description": "ID of backup"
        }
    },
    required: ["install_id","backup_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/installs/{install_id}/backups/{backup_id}',
    tag: 'Backup',
  },
};

export async function wpeGetBackupHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/installs/${params.install_id as string}/backups/${params.backup_id as string}`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeCreateBackupDef, handler: wpeCreateBackupHandler },
  { def: wpeGetBackupDef, handler: wpeGetBackupHandler },
];
