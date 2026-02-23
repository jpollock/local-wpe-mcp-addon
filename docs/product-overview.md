# Product Overview

## Problem

Managing WordPress hosting on WP Engine involves frequent switching between AI assistants and the WP Engine portal. Checking site health, reviewing SSL certificates, comparing environments, or diagnosing issues requires navigating the portal UI manually — even when an AI assistant is already part of the workflow.

For agencies managing multiple WP Engine accounts with dozens of sites, this context-switching is especially costly. Questions like "which of my 50 sites is using the most storage?" or "do all my production installs have valid SSL?" require checking each site individually.

## Solution

The WP Engine CAPI MCP Server bridges AI agents and the WP Engine Customer API. It gives AI assistants like Claude the same capabilities as the WP Engine portal — viewing accounts, managing domains, checking SSL, diagnosing issues, and more — through natural language.

Instead of navigating the portal, users ask their AI assistant directly:

- "How many sites do I have across all accounts?"
- "Diagnose the production install for mysite.com"
- "Add example.com to install abc123 and request an SSL certificate"
- "Run a security review for my account"

## Who It's For

- **WP Engine customers** using AI assistants (Claude Desktop, Claude Code, or other MCP-compatible clients)
- **Agencies** managing multiple WP Engine accounts and sites — portfolio views aggregate data across all accounts in a single query
- **Developers** who want to manage hosting infrastructure without leaving their IDE or terminal
- **DevOps/platform teams** looking to integrate WP Engine operations into automated workflows

## Capabilities

### Full API Coverage

66 tools covering every WP Engine Customer API endpoint:

- **Accounts** — List, view details, manage users
- **Sites** — Create, list, view, update, delete
- **Installs** — Create, list, view, copy between environments
- **Domains** — Add, remove, set primary, bulk status checks
- **SSL Certificates** — Request, view, check expiration across installs
- **Backups** — Create, check status
- **Cache** — Purge CDN and server caches
- **Usage** — Bandwidth, storage, visit metrics with rollups and trends

### Cross-Account Portfolio Views

Two portfolio tools aggregate data across all accessible accounts:

- **Portfolio overview** — Total accounts, sites, installs with breakdowns by environment, PHP version, and status
- **Portfolio usage** — Usage metrics ranked across all accounts, showing top consumers

### Automated Health Checks

Composite tools that combine multiple API calls into actionable assessments:

- **Site diagnosis** — Install details, usage metrics, domain status, SSL health in one view
- **Go-live checklist** — Pre-launch verification covering domains, SSL, and install health
- **Environment diff** — Side-by-side comparison of two installs
- **SSL audit** — Certificate status across all installs in an account

### User Management

Cross-account user operations for agencies managing multiple accounts:

- **User audit** — All users across all accounts, deduplicated by email, with MFA and invite warnings
- **Bulk add** — Add a user to multiple accounts with a specified role
- **Bulk remove** — Remove a user from one or all accounts with last-owner protection
- **Role update** — Change a user's role on an account with last-owner demotion guard

### Guided Workflows

6 MCP prompt templates encode common multi-step procedures:

- Diagnose site health
- Assess account health
- Set up staging environments
- Run go-live checklists
- Migrate domains
- Review security posture

### Knowledge Layer

The server includes embedded domain knowledge — entity hierarchies, troubleshooting patterns, workflow guides — delivered as MCP resources that the AI reads on demand.

## Limitations

- **No WordPress admin operations** — Plugin management, content editing, theme changes, and WP-CLI commands are outside the CAPI scope
- **No direct server access** — SSH, SFTP, and file system operations are not available through the CAPI
- **No billing or plan changes** — Account plan management is not exposed by the CAPI
- **Async provisioning** — Site and install creation return immediately but take minutes to provision; the AI must poll for completion
- **No backup listing** — The CAPI supports creating backups and checking status by ID, but does not provide an endpoint to list all backups for an install
- **No webhook support** — The server polls for status; it does not receive push notifications from WP Engine

## Safety

A three-tier safety system prevents accidental destructive operations:

- **Tier 1 (Read)** — No restrictions. AI agents can browse freely.
- **Tier 2 (Modify)** — Logged. Updates and non-destructive creation.
- **Tier 3 (Destructive)** — Requires explicit confirmation with a time-limited, parameter-bound token. Includes deletes, data copies, and infrastructure creation.

All operations are audit-logged with sensitive parameters redacted.

## Distribution

### Local Addon (Recommended)

Install as a [Local](https://localwp.com/) addon for zero-config OAuth authentication. No API credentials to manage — Local handles the WP Engine OAuth flow.

### Standalone

Run directly with environment variable authentication for CI pipelines, CLI usage, or when Local isn't available. Supports both stdio and HTTP/SSE transports.
