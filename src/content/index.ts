import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getGuideContent(topic: string): string | null {
  const filePath = path.join(__dirname, `${topic}.md`);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return null;
}

export function getWorkflowContent(name: string): string | null {
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
- "Set up staging" → use \`wpe_setup_staging\` or read \`wpengine://guide/workflows/staging-refresh\`
- "Go live" / "launch" → use \`wpe_prepare_go_live\` or read \`wpengine://guide/workflows/go-live\`
- "Account status" / "overview" → use \`wpe_account_overview\`
- "Health check" / "diagnose" → use \`wpe_diagnose_site\`
- "Domain migration" → read \`wpengine://guide/workflows/domain-migration\`
- "Disaster recovery" → read \`wpengine://guide/workflows/disaster-recovery\`
- "New site" / "new environment" → read \`wpengine://guide/workflows/new-environment\`

## Composite Tools
Use composite tools for cross-install views:
- \`wpe_account_overview\` — account summary with limits and usage
- \`wpe_account_domains\` — all domains across all installs
- \`wpe_account_backups\` — backup coverage across all installs
- \`wpe_account_ssl_status\` — SSL certificate health across all installs
- \`wpe_account_environments\` — topology map of all sites and installs
- \`wpe_diagnose_site\` — comprehensive health check for one install
- \`wpe_environment_diff\` — compare two installs side by side

Use individual tools for targeted operations on specific resources.

## Safety Rules
- Read \`wpengine://guide/safety\` before performing Tier 3 (destructive) operations
- Never delete a production install without confirming a recent backup exists
- Always check \`install.environment\` before destructive operations
- Tier 3 tools will prompt for confirmation before executing
- All operations are audit-logged
`;
