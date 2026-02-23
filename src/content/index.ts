import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Validate that a resource name contains no path traversal sequences.
 * Rejects names containing '..', '/', or '\'.
 */
function isSafeName(name: string): boolean {
  return !/[/\\]/.test(name) && !name.includes('..');
}

export function getGuideContent(topic: string): string | null {
  if (!isSafeName(topic)) return null;
  const filePath = path.join(__dirname, `${topic}.md`);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return null;
}

export function getWorkflowContent(name: string): string | null {
  if (!isSafeName(name)) return null;
  const filePath = path.join(__dirname, 'workflows', `${name}.md`);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return null;
}

export function listWorkflows(): string[] {
  const workflowDir = path.join(__dirname, 'workflows');
  if (!fs.existsSync(workflowDir)) return [];
  return fs.readdirSync(workflowDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''));
}

export const INSTRUCTIONS = `# WP Engine CAPI MCP Server

You are connected to a WP Engine Customer API (CAPI) MCP server that provides tools to manage WordPress hosting infrastructure.

## First Use
- Use \`wpe_get_current_user\` to verify authentication
- Read the resource \`wpengine://guide/domain-model\` to understand the entity hierarchy

## Navigation
WP Engine uses a hierarchical model: Account > Site > Install > (Domains, Backups, SSL, etc.)

1. Use \`wpe_get_accounts\` to identify the target account
2. Use \`wpe_get_sites\` (filter by account_id) to find sites
3. Use \`wpe_get_installs\` (filter by account_id) to find installs
4. Navigate to specific objects: domains, backups, SSL, usage

## Common Workflows
- "How many sites?" / "all my sites" → use \`wpe_portfolio_overview\`
- "Most visited" / "top sites by traffic" / "storage usage" → use \`wpe_portfolio_usage\`
- "Set up staging" → read \`wpengine://guide/workflows/staging-refresh\` for step-by-step guidance
- "Go live" / "launch" → use \`wpe_prepare_go_live\` or read \`wpengine://guide/workflows/go-live\`
- "Fleet health" / "what needs attention" → use \`wpe_fleet_health\`
- "Account status" / "overview" → use \`wpe_account_overview\`
- "Health check" / "diagnose" → use \`wpe_diagnose_site\`
- "Promote" / "push to production" / "deploy staging" → use \`wpe_promote_to_production\`
- "User audit" / "who has access" / "list all users" → use \`wpe_user_audit\`
- "Add user" / "onboard user" → use \`wpe_add_user_to_accounts\`
- "Remove user" / "offboard user" → use \`wpe_remove_user_from_accounts\`
- "Change role" / "update permissions" → use \`wpe_update_user_role\`
- "Domain migration" → read \`wpengine://guide/workflows/domain-migration\`
- "Disaster recovery" → read \`wpengine://guide/workflows/disaster-recovery\`
- "New site" / "new environment" → read \`wpengine://guide/workflows/new-environment\`

## Composite Tools

For cross-account questions, use portfolio tools instead of querying each account individually:
- \`wpe_portfolio_overview\` — all accounts, sites, and installs in one view
- \`wpe_portfolio_usage\` — usage ranked across all accounts
- \`wpe_fleet_health\` — scored health assessment across all accounts (SSL, capacity, PHP, status)

For single-account views:
- \`wpe_account_overview\` — account summary with limits and usage
- \`wpe_account_domains\` — all domains across all installs
- \`wpe_account_ssl_status\` — SSL certificate health across all installs
- \`wpe_account_environments\` — topology map of all sites and installs
- \`wpe_diagnose_site\` — comprehensive health check for one install
- \`wpe_environment_diff\` — compare two installs side by side
- \`wpe_promote_to_production\` — backup, copy staging to production, purge, verify

For user management across accounts:
- \`wpe_user_audit\` — cross-account user report with deduplication and security warnings
- \`wpe_add_user_to_accounts\` — add a user to multiple accounts at once
- \`wpe_remove_user_from_accounts\` — remove a user from one or all accounts (last-owner protected)
- \`wpe_update_user_role\` — change a user's role on an account (last-owner protected)

Use individual tools for targeted operations on specific resources.

## Data Strategy
Most tools return summarized data by default to avoid context overflow.
Summaries keep rollup metrics, key identifiers, and status indicators
while stripping daily time-series arrays and verbose field sets.

- Use default summary mode for browsing, comparing, and overviews
- Pass summary=false only when investigating a specific install's daily trends
  or when you need complete domain/SSL/backup details
- For usage across many installs, prefer summary mode — full data can be 50x larger
- Tools that support summarization note this in their descriptions

## Async Provisioning
Install creation (\`wpe_create_install\`) and site creation (\`wpe_create_site\`) are async.
The API returns immediately, but the install may take several minutes to provision.

- After creating an install, poll \`wpe_get_install\` until its status is "active"
- Do NOT attempt copy, domain, or SSL operations on an install that is still provisioning
- For staging setup: create install → poll until active → copy from source → verify

## Safety Rules
- Read \`wpengine://guide/safety\` before performing Tier 3 (destructive) operations
- Never delete a production install without confirming a recent backup exists
- Always check \`install.environment\` before destructive operations
- Tier 3 tools will prompt for confirmation before executing
- All operations are audit-logged
`;
