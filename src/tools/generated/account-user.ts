// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: Account User

import type { CapiClient } from '../../capi-client.js';

export const wpeGetAccountUsersDef = {
  name: 'wpe_get_account_users',
  description: "List your account users",
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
    apiPath: '/accounts/{account_id}/account_users',
    tag: 'Account User',
  },
};

export async function wpeGetAccountUsersHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/accounts/${params.account_id as string}/account_users`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeCreateAccountUserDef = {
  name: 'wpe_create_account_user',
  description: "Create a new account user",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "account_id": {
            "type": "string",
            "description": "ID of account"
        },
        "user": {
            "type": "string",
            "description": "The user that will be created"
        }
    },
    required: ["account_id","user"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/accounts/{account_id}/account_users',
    tag: 'Account User',
  },
};

export async function wpeCreateAccountUserHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['user'] !== undefined) body['user'] = params['user'];
  const response = await client.post(`/accounts/${params.account_id as string}/account_users`, body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetAccountUserDef = {
  name: 'wpe_get_account_user',
  description: "Get an account user by ID",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "account_id": {
            "type": "string",
            "description": "ID of account"
        },
        "user_id": {
            "type": "string",
            "description": "ID of the user"
        }
    },
    required: ["account_id","user_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/accounts/{account_id}/account_users/{user_id}',
    tag: 'Account User',
  },
};

export async function wpeGetAccountUserHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/accounts/${params.account_id as string}/account_users/${params.user_id as string}`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeUpdateAccountUserDef = {
  name: 'wpe_update_account_user',
  description: "Update an account user",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "account_id": {
            "type": "string",
            "description": "ID of account"
        },
        "user_id": {
            "type": "string",
            "description": "ID of the user"
        },
        "roles": {
            "type": "string",
            "description": "choose from 'owner', 'full,billing', 'full', 'partial,billing', and 'partial'"
        },
        "install_ids": {
            "type": "array"
        }
    },
    required: ["account_id","user_id","roles"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'PATCH',
    apiPath: '/accounts/{account_id}/account_users/{user_id}',
    tag: 'Account User',
  },
};

export async function wpeUpdateAccountUserHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['roles'] !== undefined) body['roles'] = params['roles'];
  if (params['install_ids'] !== undefined) body['install_ids'] = params['install_ids'];
  const response = await client.patch(`/accounts/${params.account_id as string}/account_users/${params.user_id as string}`, body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeDeleteAccountUserDef = {
  name: 'wpe_delete_account_user',
  description: "Delete an account user",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "account_id": {
            "type": "string",
            "description": "ID of account"
        },
        "user_id": {
            "type": "string",
            "description": "ID of the user"
        }
    },
    required: ["account_id","user_id"],
  },
  annotations: {
    safetyTier: 3 as const,
    httpMethod: 'DELETE',
    apiPath: '/accounts/{account_id}/account_users/{user_id}',
    tag: 'Account User',
  },
};

export async function wpeDeleteAccountUserHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.delete(`/accounts/${params.account_id as string}/account_users/${params.user_id as string}`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeGetAccountUsersDef, handler: wpeGetAccountUsersHandler },
  { def: wpeCreateAccountUserDef, handler: wpeCreateAccountUserHandler },
  { def: wpeGetAccountUserDef, handler: wpeGetAccountUserHandler },
  { def: wpeUpdateAccountUserDef, handler: wpeUpdateAccountUserHandler },
  { def: wpeDeleteAccountUserDef, handler: wpeDeleteAccountUserHandler },
];
