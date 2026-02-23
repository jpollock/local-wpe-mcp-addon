# Getting Started

## Overview

The WP Engine CAPI MCP Server gives AI agents access to the WP Engine Customer API. Once connected, you can ask your AI assistant to manage sites, check usage, diagnose issues, migrate domains, and more — all through natural language.

## Prerequisites

- **Node.js 18+** — Required to run the server
- **WP Engine account** — With API access enabled
- **AI client** — Claude Desktop, Claude Code, or any MCP-compatible client

## Authentication

The server supports two authentication methods:

### Option A: Environment Variables (Standalone)

1. Log in to the [WP Engine User Portal](https://my.wpengine.com/api_access)
2. Generate API credentials (username + password)
3. Set environment variables:

```bash
export WP_ENGINE_API_USERNAME="your-api-username"
export WP_ENGINE_API_PASSWORD="your-api-password"
```

These are used as HTTP Basic Auth credentials against the CAPI.

### Option B: OAuth via Local (Addon)

When installed as a Local addon, authentication is handled via Local's OAuth integration with WP Engine. No manual credential management needed.

## Verify Connection

After configuring your AI client, test the connection:

> "Use wpe_get_current_user to verify my WP Engine connection"

The agent should return your WP Engine user details.

## What You Can Do

### Browse infrastructure
- "Show me all my WP Engine accounts and sites"
- "What installs does site X have?"

### Check health
- "Diagnose the production install for mysite.com"
- "Run a go-live checklist for install abc123"

### Manage resources
- "Add the domain example.com to install abc123"
- "Request an SSL certificate for example.com"
- "Purge the cache on install abc123"

### Deploy and promote
- "Promote staging to production for my site"
- "What needs attention across all my accounts?"

### Manage users
- "Who has access across all my accounts?"
- "Add alice@example.com to accounts X, Y, and Z as a full user"
- "Remove bob@example.com from all accounts"
- "Change Alice's role to partial on account X"

### Cross-account views
- "How many total sites do I have across all accounts?"
- "Which installs have the most traffic?"

See [Example Prompts](example-prompts.md) for a full cookbook with detailed workflows and expected tool usage.

## MCP Prompts

The server includes 6 pre-built prompt templates for common workflows. In AI clients that support MCP prompts (e.g., Claude Desktop), these appear as selectable prompts:

- **diagnose-site** — Health check for a specific install
- **account-health** — Overall account health assessment
- **setup-staging** — Guided staging environment creation
- **go-live-checklist** — Pre-launch verification
- **domain-migration** — Step-by-step domain migration
- **security-review** — SSL and user access review

Each prompt asks for the relevant IDs (install, account, site) and then guides the AI through the full workflow using the appropriate tools and knowledge resources.

See the [MCP Prompts section](example-prompts.md#mcp-prompts) of the example prompts guide for details on each prompt.

## Next Steps

- [Example Prompts](example-prompts.md) — Detailed prompt cookbook with workflows
- [Claude Desktop Setup](claude-desktop-setup.md) — Configure Claude Desktop
- [Claude Code Setup](claude-code-setup.md) — Configure Claude Code
- [Standalone Setup](standalone-setup.md) — Run the server directly
- [Troubleshooting](troubleshooting.md) — Common issues and fixes

## Support

- **Troubleshooting:** See the [troubleshooting guide](troubleshooting.md) for common issues
- **Issues:** File bugs and feature requests at the project repository
