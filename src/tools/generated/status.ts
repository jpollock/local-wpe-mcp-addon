// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: Status

import type { CapiClient } from '../../capi-client.js';

export const wpeGetStatusDef = {
  name: 'wpe_get_status',
  description: "The status of the WP Engine Hosting Platform API",
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/status',
    tag: 'Status',
  },
};

export async function wpeGetStatusHandler(
  _params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get('/status');
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeGetStatusDef, handler: wpeGetStatusHandler },
];
