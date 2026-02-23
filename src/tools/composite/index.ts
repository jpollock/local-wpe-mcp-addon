import type { ToolRegistration } from '../generated/index.js';

import { wpeAccountOverviewDef, wpeAccountOverviewHandler } from './account-overview.js';
import { wpeAccountUsageDef, wpeAccountUsageHandler } from './account-usage.js';
import { wpeAccountDomainsDef, wpeAccountDomainsHandler } from './account-domains.js';
import { wpeAccountSslStatusDef, wpeAccountSslStatusHandler } from './account-ssl-status.js';
import { wpeAccountEnvironmentsDef, wpeAccountEnvironmentsHandler } from './account-environments.js';
import { wpeDiagnoseSiteDef, wpeDiagnoseSiteHandler } from './diagnose-site.js';
import { wpePrepareGoLiveDef, wpePrepareGoLiveHandler } from './prepare-go-live.js';
import { wpeEnvironmentDiffDef, wpeEnvironmentDiffHandler } from './environment-diff.js';
import { wpePortfolioOverviewDef, wpePortfolioOverviewHandler } from './portfolio-overview.js';
import { wpePortfolioUsageDef, wpePortfolioUsageHandler } from './portfolio-usage.js';
import { wpeFleetHealthDef, wpeFleetHealthHandler } from './fleet-health.js';
import { wpePromoteToProductionDef, wpePromoteToProductionHandler } from './promote-to-production.js';
import { wpeUserAuditDef, wpeUserAuditHandler } from './user-audit.js';
import { wpeAddUserToAccountsDef, wpeAddUserToAccountsHandler } from './add-user-to-accounts.js';
import { wpeRemoveUserFromAccountsDef, wpeRemoveUserFromAccountsHandler } from './remove-user-from-accounts.js';
import { wpeUpdateUserRoleDef, wpeUpdateUserRoleHandler } from './update-user-role.js';

export const allCompositeTools: ToolRegistration[] = [
  { def: wpeAccountOverviewDef, handler: wpeAccountOverviewHandler },
  { def: wpeAccountUsageDef, handler: wpeAccountUsageHandler },
  { def: wpeAccountDomainsDef, handler: wpeAccountDomainsHandler },
  { def: wpeAccountSslStatusDef, handler: wpeAccountSslStatusHandler },
  { def: wpeAccountEnvironmentsDef, handler: wpeAccountEnvironmentsHandler },
  { def: wpeDiagnoseSiteDef, handler: wpeDiagnoseSiteHandler },
  { def: wpePrepareGoLiveDef, handler: wpePrepareGoLiveHandler },
  { def: wpeEnvironmentDiffDef, handler: wpeEnvironmentDiffHandler },
  { def: wpePortfolioOverviewDef, handler: wpePortfolioOverviewHandler },
  { def: wpePortfolioUsageDef, handler: wpePortfolioUsageHandler },
  { def: wpeFleetHealthDef, handler: wpeFleetHealthHandler },
  { def: wpePromoteToProductionDef, handler: wpePromoteToProductionHandler },
  { def: wpeUserAuditDef, handler: wpeUserAuditHandler },
  { def: wpeAddUserToAccountsDef, handler: wpeAddUserToAccountsHandler },
  { def: wpeRemoveUserFromAccountsDef, handler: wpeRemoveUserFromAccountsHandler },
  { def: wpeUpdateUserRoleDef, handler: wpeUpdateUserRoleHandler },
];
