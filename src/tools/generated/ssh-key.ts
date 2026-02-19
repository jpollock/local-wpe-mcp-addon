// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: SSH Key

import type { CapiClient } from '../../capi-client.js';

export const wpeGetSshKeysDef = {
  name: 'wpe_get_ssh_keys',
  description: "Get your SSH keys",
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/ssh_keys',
    tag: 'SSH Key',
  },
};

export async function wpeGetSshKeysHandler(
  _params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get('/ssh_keys');
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeCreateSshKeyDef = {
  name: 'wpe_create_ssh_key',
  description: "Add a new SSH key",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "public_key": {
            "type": "string"
        }
    },
    required: ["public_key"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/ssh_keys',
    tag: 'SSH Key',
  },
};

export async function wpeCreateSshKeyHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['public_key'] !== undefined) body['public_key'] = params['public_key'];
  const response = await client.post('/ssh_keys', body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeDeleteSshKeyDef = {
  name: 'wpe_delete_ssh_key',
  description: "Delete an existing SSH key",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "ssh_key_id": {
            "type": "string",
            "description": "The ID of the SSH key to delete"
        }
    },
    required: ["ssh_key_id"],
  },
  annotations: {
    safetyTier: 3 as const,
    httpMethod: 'DELETE',
    apiPath: '/ssh_keys/{ssh_key_id}',
    tag: 'SSH Key',
  },
};

export async function wpeDeleteSshKeyHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.delete(`/ssh_keys/${params.ssh_key_id as string}`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeGetSshKeysDef, handler: wpeGetSshKeysHandler },
  { def: wpeCreateSshKeyDef, handler: wpeCreateSshKeyHandler },
  { def: wpeDeleteSshKeyDef, handler: wpeDeleteSshKeyHandler },
];
