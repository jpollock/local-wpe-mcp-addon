// AUTO-GENERATED FROM swagger.json — DO NOT EDIT

export { toolDefs as accountTools } from './account.js';
export { toolDefs as accountUserTools } from './account-user.js';
export { toolDefs as backupTools } from './backup.js';
export { toolDefs as cacheTools } from './cache.js';
export { toolDefs as certificatesTools } from './certificates.js';
export { toolDefs as domainTools } from './domain.js';
export { toolDefs as installTools } from './install.js';
export { toolDefs as offloadSettingsTools } from './offload-settings.js';
export { toolDefs as sSHKeyTools } from './ssh-key.js';
export { toolDefs as siteTools } from './site.js';
export { toolDefs as statusTools } from './status.js';
export { toolDefs as swaggerTools } from './swagger.js';
export { toolDefs as usageTools } from './usage.js';
export { toolDefs as userTools } from './user.js';

import type { CapiClient } from '../../capi-client.js';

import { toolDefs as _account } from './account.js';
import { toolDefs as _accountUser } from './account-user.js';
import { toolDefs as _backup } from './backup.js';
import { toolDefs as _cache } from './cache.js';
import { toolDefs as _certificates } from './certificates.js';
import { toolDefs as _domain } from './domain.js';
import { toolDefs as _install } from './install.js';
import { toolDefs as _offloadSettings } from './offload-settings.js';
import { toolDefs as _sSHKey } from './ssh-key.js';
import { toolDefs as _site } from './site.js';
import { toolDefs as _status } from './status.js';
import { toolDefs as _swagger } from './swagger.js';
import { toolDefs as _usage } from './usage.js';
import { toolDefs as _user } from './user.js';

export interface ToolRegistration {
  def: {
    name: string;
    description: string;
    inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
    annotations: { safetyTier: 1 | 2 | 3; httpMethod: string; apiPath: string; tag: string };
  };
  handler: (params: Record<string, unknown>, client: CapiClient) => Promise<unknown>;
}

export const allGeneratedTools: ToolRegistration[] = [
  ..._account,
  ..._accountUser,
  ..._backup,
  ..._cache,
  ..._certificates,
  ..._domain,
  ..._install,
  ..._offloadSettings,
  ..._sSHKey,
  ..._site,
  ..._status,
  ..._swagger,
  ..._usage,
  ..._user,
];
