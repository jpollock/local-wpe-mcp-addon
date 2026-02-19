// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: User

import type { CapiClient } from '../../capi-client.js';

export const wpeGetCurrentUserDef = {
  name: 'wpe_get_current_user',
  description: "Get the current user",
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/user',
    tag: 'User',
  },
};

export async function wpeGetCurrentUserHandler(
  _params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get('/user');
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeGetCurrentUserDef, handler: wpeGetCurrentUserHandler },
];
