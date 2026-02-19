// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: Offload Settings

import type { CapiClient } from '../../capi-client.js';

export const wpeGetLargefsValidationDef = {
  name: 'wpe_get_largefs_validation',
  description: "Get the validation file needed to configure LargeFS",
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
    apiPath: '/installs/{install_id}/offload_settings/largefs_validation_file',
    tag: 'Offload Settings',
  },
};

export async function wpeGetLargefsValidationHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/installs/${params.install_id as string}/offload_settings/largefs_validation_file`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetOffloadSettingsDef = {
  name: 'wpe_get_offload_settings',
  description: "Get the offload settings for an install",
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
    apiPath: '/installs/{install_id}/offload_settings/files',
    tag: 'Offload Settings',
  },
};

export async function wpeGetOffloadSettingsHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/installs/${params.install_id as string}/offload_settings/files`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeConfigureOffloadSettingsDef = {
  name: 'wpe_configure_offload_settings',
  description: "Configure offload settings for an install",
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
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/installs/{install_id}/offload_settings/files',
    tag: 'Offload Settings',
  },
};

export async function wpeConfigureOffloadSettingsHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.post(`/installs/${params.install_id as string}/offload_settings/files`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeUpdateOffloadSettingsDef = {
  name: 'wpe_update_offload_settings',
  description: "Update specific offload settings for an install",
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
    safetyTier: 2 as const,
    httpMethod: 'PATCH',
    apiPath: '/installs/{install_id}/offload_settings/files',
    tag: 'Offload Settings',
  },
};

export async function wpeUpdateOffloadSettingsHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.patch(`/installs/${params.install_id as string}/offload_settings/files`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeGetLargefsValidationDef, handler: wpeGetLargefsValidationHandler },
  { def: wpeGetOffloadSettingsDef, handler: wpeGetOffloadSettingsHandler },
  { def: wpeConfigureOffloadSettingsDef, handler: wpeConfigureOffloadSettingsHandler },
  { def: wpeUpdateOffloadSettingsDef, handler: wpeUpdateOffloadSettingsHandler },
];
