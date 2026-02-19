// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: Usage

import type { CapiClient } from '../../capi-client.js';

export const wpeGetAccountUsageDef = {
  name: 'wpe_get_account_usage',
  description: "Get account usage metrics",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "account_id": {
            "type": "string",
            "description": "ID of account"
        },
        "first_date": {
            "type": "string",
            "description": "The start date for the requested metrics range (inclusive).\nFormat: `YYYY-mm-dd`. Cannot be older than 13 months.\nIf `first_date` is provided, `last_date` must also be provided."
        },
        "last_date": {
            "type": "string",
            "description": "The end date for the requested metrics range (inclusive).\nFormat: `YYYY-mm-dd`.\nIf `last_date` is provided, `first_date` must also be provided."
        }
    },
    required: ["account_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/accounts/{account_id}/usage',
    tag: 'Usage',
  },
};

export async function wpeGetAccountUsageHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const queryParams: Record<string, string> = {};
  if (params['first_date'] !== undefined) queryParams['first_date'] = String(params['first_date']);
  if (params['last_date'] !== undefined) queryParams['last_date'] = String(params['last_date']);
  const response = await client.get(`/accounts/${params.account_id as string}/usage`, queryParams);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeRefreshAccountDiskUsageDef = {
  name: 'wpe_refresh_account_disk_usage',
  description: "Refresh Disk Usage for all installs associated with account",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "account_id": {
            "type": "string",
            "description": "The unique identifier (UUID) of the account."
        }
    },
    required: ["account_id"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/accounts/{account_id}/usage/refresh_disk_usage',
    tag: 'Usage',
  },
};

export async function wpeRefreshAccountDiskUsageHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.post(`/accounts/${params.account_id as string}/usage/refresh_disk_usage`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetAccountUsageSummaryDef = {
  name: 'wpe_get_account_usage_summary',
  description: "Get account level usage summary",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "account_id": {
            "type": "string",
            "description": "ID of account"
        },
        "first_date": {
            "type": "string",
            "description": "The start date for the requested metrics range (inclusive).\nFormat: `YYYY-mm-dd`. Cannot be older than 13 months.\nIf `first_date` is provided, `last_date` must also be provided."
        },
        "last_date": {
            "type": "string",
            "description": "The end date for the requested metrics range (inclusive).\nFormat: `YYYY-mm-dd`.\nIf `last_date` is provided, `first_date` must also be provided."
        }
    },
    required: ["account_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/accounts/{account_id}/usage/summary',
    tag: 'Usage',
  },
};

export async function wpeGetAccountUsageSummaryHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const queryParams: Record<string, string> = {};
  if (params['first_date'] !== undefined) queryParams['first_date'] = String(params['first_date']);
  if (params['last_date'] !== undefined) queryParams['last_date'] = String(params['last_date']);
  const response = await client.get(`/accounts/${params.account_id as string}/usage/summary`, queryParams);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetAccountUsageInsightsDef = {
  name: 'wpe_get_account_usage_insights',
  description: "Get account usage insights",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "account_id": {
            "type": "string",
            "description": "ID of account"
        },
        "first_date": {
            "type": "string",
            "description": "The start date for the requested metrics range (inclusive).\nFormat: `YYYY-mm-dd`. Cannot be older than 13 months.\nIf `first_date` is provided, `last_date` must also be provided."
        },
        "last_date": {
            "type": "string",
            "description": "The end date for the requested metrics range (inclusive).\nFormat: `YYYY-mm-dd`.\nIf `last_date` is provided, `first_date` must also be provided."
        }
    },
    required: ["account_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/accounts/{account_id}/usage/insights',
    tag: 'Usage',
  },
};

export async function wpeGetAccountUsageInsightsHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const queryParams: Record<string, string> = {};
  if (params['first_date'] !== undefined) queryParams['first_date'] = String(params['first_date']);
  if (params['last_date'] !== undefined) queryParams['last_date'] = String(params['last_date']);
  const response = await client.get(`/accounts/${params.account_id as string}/usage/insights`, queryParams);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetInstallUsageDef = {
  name: 'wpe_get_install_usage',
  description: "Get a list of daily usage metrics",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "The UUID of the install."
        },
        "first_date": {
            "type": "string",
            "description": "The start date for the requested metrics range (inclusive).\nFormat: `YYYY-mm-dd`. Cannot be older than 13 months.\nIf `first_date` is provided, `last_date` must also be provided."
        },
        "last_date": {
            "type": "string",
            "description": "The end date for the requested metrics range (inclusive).\nFormat: `YYYY-mm-dd`.\nIf `last_date` is provided, `first_date` must also be provided."
        }
    },
    required: ["install_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/installs/{install_id}/usage',
    tag: 'Usage',
  },
};

export async function wpeGetInstallUsageHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const queryParams: Record<string, string> = {};
  if (params['first_date'] !== undefined) queryParams['first_date'] = String(params['first_date']);
  if (params['last_date'] !== undefined) queryParams['last_date'] = String(params['last_date']);
  const response = await client.get(`/installs/${params.install_id as string}/usage`, queryParams);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeRefreshInstallDiskUsageDef = {
  name: 'wpe_refresh_install_disk_usage',
  description: "Refresh disk usage for the given WordPress site environment",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "The UUID of the install."
        }
    },
    required: ["install_id"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/installs/{install_id}/usage/refresh_disk_usage',
    tag: 'Usage',
  },
};

export async function wpeRefreshInstallDiskUsageHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.post(`/installs/${params.install_id as string}/usage/refresh_disk_usage`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeGetAccountUsageDef, handler: wpeGetAccountUsageHandler },
  { def: wpeRefreshAccountDiskUsageDef, handler: wpeRefreshAccountDiskUsageHandler },
  { def: wpeGetAccountUsageSummaryDef, handler: wpeGetAccountUsageSummaryHandler },
  { def: wpeGetAccountUsageInsightsDef, handler: wpeGetAccountUsageInsightsHandler },
  { def: wpeGetInstallUsageDef, handler: wpeGetInstallUsageHandler },
  { def: wpeRefreshInstallDiskUsageDef, handler: wpeRefreshInstallDiskUsageHandler },
];
