import type { CapiClient } from '../../capi-client.js';

import { wpeAccountOverviewDef, wpeAccountOverviewHandler } from './account-overview.js';
import { wpeAccountUsageDef, wpeAccountUsageHandler } from './account-usage.js';
import { wpeAccountDomainsDef, wpeAccountDomainsHandler } from './account-domains.js';
import { wpeAccountBackupsDef, wpeAccountBackupsHandler } from './account-backups.js';
import { wpeAccountSslStatusDef, wpeAccountSslStatusHandler } from './account-ssl-status.js';
import { wpeAccountEnvironmentsDef, wpeAccountEnvironmentsHandler } from './account-environments.js';
import { wpeDiagnoseSiteDef, wpeDiagnoseSiteHandler } from './diagnose-site.js';
import { wpeSetupStagingDef, wpeSetupStagingHandler } from './setup-staging.js';
import { wpePrepareGoLiveDef, wpePrepareGoLiveHandler } from './prepare-go-live.js';
import { wpeEnvironmentDiffDef, wpeEnvironmentDiffHandler } from './environment-diff.js';

export interface CompositeToolRegistration {
  def: {
    name: string;
    description: string;
    inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
    annotations: { safetyTier: 1 | 2 | 3; httpMethod: string; apiPath: string; tag: string };
  };
  handler: (params: Record<string, unknown>, client: CapiClient) => Promise<unknown>;
}

export const allCompositeTools: CompositeToolRegistration[] = [
  { def: wpeAccountOverviewDef, handler: wpeAccountOverviewHandler },
  { def: wpeAccountUsageDef, handler: wpeAccountUsageHandler },
  { def: wpeAccountDomainsDef, handler: wpeAccountDomainsHandler },
  { def: wpeAccountBackupsDef, handler: wpeAccountBackupsHandler },
  { def: wpeAccountSslStatusDef, handler: wpeAccountSslStatusHandler },
  { def: wpeAccountEnvironmentsDef, handler: wpeAccountEnvironmentsHandler },
  { def: wpeDiagnoseSiteDef, handler: wpeDiagnoseSiteHandler },
  { def: wpeSetupStagingDef, handler: wpeSetupStagingHandler },
  { def: wpePrepareGoLiveDef, handler: wpePrepareGoLiveHandler },
  { def: wpeEnvironmentDiffDef, handler: wpeEnvironmentDiffHandler },
];
