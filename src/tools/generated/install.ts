// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: Install

import type { CapiClient } from '../../capi-client.js';

export const wpeGetInstallsDef = {
  name: 'wpe_get_installs',
  description: "List your WordPress installations",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "account_id": {
            "type": "string",
            "description": "(Optional) The uuid of an account"
        }
    },
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/installs',
    tag: 'Install',
  },
};

export async function wpeGetInstallsHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const queryParams: Record<string, string> = {};
  if (params['account_id'] !== undefined) queryParams['account_id'] = String(params['account_id']);
  const response = await client.get('/installs', queryParams);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeCreateInstallDef = {
  name: 'wpe_create_install',
  description: "Create a new WordPress installation",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "name": {
            "type": "string",
            "description": "The name of the install"
        },
        "account_id": {
            "type": "string",
            "description": "The ID of the account that the install will belong to"
        },
        "site_id": {
            "type": "string",
            "description": "The ID of the site that the install will belong to"
        },
        "environment": {
            "type": "string",
            "description": "The site environment that the install will fill"
        }
    },
    required: ["name","account_id"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/installs',
    tag: 'Install',
  },
};

export async function wpeCreateInstallHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['name'] !== undefined) body['name'] = params['name'];
  if (params['account_id'] !== undefined) body['account_id'] = params['account_id'];
  if (params['site_id'] !== undefined) body['site_id'] = params['site_id'];
  if (params['environment'] !== undefined) body['environment'] = params['environment'];
  const response = await client.post('/installs', body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetInstallDef = {
  name: 'wpe_get_install',
  description: "Get an install by ID",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "ID of install"
        }
    },
    required: ["install_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/installs/{install_id}',
    tag: 'Install',
  },
};

export async function wpeGetInstallHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/installs/${params.install_id as string}`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeDeleteInstallDef = {
  name: 'wpe_delete_install',
  description: "Delete an install by ID",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "ID of install"
        }
    },
    required: ["install_id"],
  },
  annotations: {
    safetyTier: 3 as const,
    httpMethod: 'DELETE',
    apiPath: '/installs/{install_id}',
    tag: 'Install',
  },
};

export async function wpeDeleteInstallHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.delete(`/installs/${params.install_id as string}`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeUpdateInstallDef = {
  name: 'wpe_update_install',
  description: "Update a WordPress installation",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "The install ID"
        },
        "site_id": {
            "type": "string",
            "description": "The site ID"
        },
        "environment": {
            "type": "string"
        }
    },
    required: ["install_id"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'PATCH',
    apiPath: '/installs/{install_id}',
    tag: 'Install',
  },
};

export async function wpeUpdateInstallHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['site_id'] !== undefined) body['site_id'] = params['site_id'];
  if (params['environment'] !== undefined) body['environment'] = params['environment'];
  const response = await client.patch(`/installs/${params.install_id as string}`, body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeCopyInstallDef = {
  name: 'wpe_copy_install',
  description: "Copy the full file system and database from one WordPress installation to another",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "source_environment_id": {
            "type": "string",
            "description": "The ID of the environment to copy from"
        },
        "destination_environment_id": {
            "type": "string",
            "description": "The ID of the environment to copy to"
        },
        "notification_emails": {
            "type": "array",
            "description": "An array of email addresses to notify when the copy is complete"
        },
        "custom_options": {
            "type": "string",
            "description": "Optional fields to customize how the install should be copied"
        }
    },
    required: ["source_environment_id","destination_environment_id"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/install_copy',
    tag: 'Install',
  },
};

export async function wpeCopyInstallHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['source_environment_id'] !== undefined) body['source_environment_id'] = params['source_environment_id'];
  if (params['destination_environment_id'] !== undefined) body['destination_environment_id'] = params['destination_environment_id'];
  if (params['notification_emails'] !== undefined) body['notification_emails'] = params['notification_emails'];
  if (params['custom_options'] !== undefined) body['custom_options'] = params['custom_options'];
  const response = await client.post('/install_copy', body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeGetInstallsDef, handler: wpeGetInstallsHandler },
  { def: wpeCreateInstallDef, handler: wpeCreateInstallHandler },
  { def: wpeGetInstallDef, handler: wpeGetInstallHandler },
  { def: wpeDeleteInstallDef, handler: wpeDeleteInstallHandler },
  { def: wpeUpdateInstallDef, handler: wpeUpdateInstallHandler },
  { def: wpeCopyInstallDef, handler: wpeCopyInstallHandler },
];
