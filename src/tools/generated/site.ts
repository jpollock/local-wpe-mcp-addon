// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: Site

import type { CapiClient } from '../../capi-client.js';

export const wpeGetSitesDef = {
  name: 'wpe_get_sites',
  description: "List your sites",
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
    apiPath: '/sites',
    tag: 'Site',
  },
};

export async function wpeGetSitesHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const queryParams: Record<string, string> = {};
  if (params['account_id'] !== undefined) queryParams['account_id'] = String(params['account_id']);
  const response = await client.get('/sites', queryParams);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeCreateSiteDef = {
  name: 'wpe_create_site',
  description: "Create a new site",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "name": {
            "type": "string"
        },
        "account_id": {
            "type": "string",
            "description": "The account ID"
        }
    },
    required: ["name","account_id"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/sites',
    tag: 'Site',
  },
};

export async function wpeCreateSiteHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['name'] !== undefined) body['name'] = params['name'];
  if (params['account_id'] !== undefined) body['account_id'] = params['account_id'];
  const response = await client.post('/sites', body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetSiteDef = {
  name: 'wpe_get_site',
  description: "Get a site by ID",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "site_id": {
            "type": "string",
            "description": "The site ID"
        }
    },
    required: ["site_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/sites/{site_id}',
    tag: 'Site',
  },
};

export async function wpeGetSiteHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/sites/${params.site_id as string}`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeUpdateSiteDef = {
  name: 'wpe_update_site',
  description: "Change a site name",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "site_id": {
            "type": "string",
            "description": "The ID of the site to change the name of *(For accounts with sites enabled)*"
        },
        "name": {
            "type": "string",
            "description": "The new site name"
        }
    },
    required: ["site_id"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'PATCH',
    apiPath: '/sites/{site_id}',
    tag: 'Site',
  },
};

export async function wpeUpdateSiteHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['name'] !== undefined) body['name'] = params['name'];
  const response = await client.patch(`/sites/${params.site_id as string}`, body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeDeleteSiteDef = {
  name: 'wpe_delete_site',
  description: "Delete a site",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "site_id": {
            "type": "string",
            "description": "The ID of the site to delete *(For accounts with sites enabled)*"
        }
    },
    required: ["site_id"],
  },
  annotations: {
    safetyTier: 3 as const,
    httpMethod: 'DELETE',
    apiPath: '/sites/{site_id}',
    tag: 'Site',
  },
};

export async function wpeDeleteSiteHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.delete(`/sites/${params.site_id as string}`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeGetSitesDef, handler: wpeGetSitesHandler },
  { def: wpeCreateSiteDef, handler: wpeCreateSiteHandler },
  { def: wpeGetSiteDef, handler: wpeGetSiteHandler },
  { def: wpeUpdateSiteDef, handler: wpeUpdateSiteHandler },
  { def: wpeDeleteSiteDef, handler: wpeDeleteSiteHandler },
];
