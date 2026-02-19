// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: Account

import type { CapiClient } from '../../capi-client.js';

export const wpeGetAccountsDef = {
  name: 'wpe_get_accounts',
  description: "List your WP Engine accounts",
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/accounts',
    tag: 'Account',
  },
};

export async function wpeGetAccountsHandler(
  _params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get('/accounts');
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetAccountDef = {
  name: 'wpe_get_account',
  description: "Get an account by ID",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "account_id": {
            "type": "string",
            "description": "ID of account"
        }
    },
    required: ["account_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/accounts/{account_id}',
    tag: 'Account',
  },
};

export async function wpeGetAccountHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/accounts/${params.account_id as string}`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetAccountLimitsDef = {
  name: 'wpe_get_account_limits',
  description: "Fetch account usage limits",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "account_id": {
            "type": "string",
            "description": "ID of account"
        }
    },
    required: ["account_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/accounts/{account_id}/limits',
    tag: 'Account',
  },
};

export async function wpeGetAccountLimitsHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/accounts/${params.account_id as string}/limits`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeGetAccountsDef, handler: wpeGetAccountsHandler },
  { def: wpeGetAccountDef, handler: wpeGetAccountHandler },
  { def: wpeGetAccountLimitsDef, handler: wpeGetAccountLimitsHandler },
];
