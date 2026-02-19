// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: Swagger

import type { CapiClient } from '../../capi-client.js';

export const wpeGetSwaggerDef = {
  name: 'wpe_get_swagger',
  description: "The current swagger specification",
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/swagger',
    tag: 'Swagger',
  },
};

export async function wpeGetSwaggerHandler(
  _params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get('/swagger');
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeGetSwaggerDef, handler: wpeGetSwaggerHandler },
];
