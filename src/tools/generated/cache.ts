// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: Cache

import type { CapiClient } from '../../capi-client.js';

export const wpePurgeCacheDef = {
  name: 'wpe_purge_cache',
  description: "Purge an install's cache",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "ID of install"
        },
        "type": {
            "type": "string"
        }
    },
    required: ["install_id","type"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/installs/{install_id}/purge_cache',
    tag: 'Cache',
  },
};

export async function wpePurgeCacheHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['type'] !== undefined) body['type'] = params['type'];
  const response = await client.post(`/installs/${params.install_id as string}/purge_cache`, body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpePurgeCacheDef, handler: wpePurgeCacheHandler },
];
