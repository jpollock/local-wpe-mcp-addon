# WP Engine CAPI MCP Server

An MCP server that gives AI agents full access to the [WP Engine Customer API](https://wpengineapi.com/). Manage sites, installs, domains, SSL certificates, backups, cache, usage metrics, and more — directly from Claude Desktop, Claude Code, or any MCP-compatible client.

## Features

- **66 tools** — 50 auto-generated from the CAPI swagger spec + 16 hand-written composite tools
- **3-tier safety system** — Read (Tier 1), Modify (Tier 2), Destructive (Tier 3) with confirmation tokens
- **Summarization** — Large responses condensed by default to prevent context overflow
- **Portfolio views** — Cross-account aggregation for users with multiple accounts
- **Knowledge layer** — Domain model docs, workflow guides, troubleshooting patterns, and safety rules delivered as MCP resources
- **6 MCP prompts** — Pre-built workflows for site diagnosis, go-live, staging, domain migration, and security review
- **Dual transport** — stdio and HTTP/SSE
- **Drift detection** — Detect API changes between vendored and live swagger specs
- **Local addon** — OAuth authentication via [Local](https://localwp.com/) with env var fallback

## Quick Start (Standalone)

### 1. Set credentials

```bash
export WP_ENGINE_API_USERNAME="your-api-username"
export WP_ENGINE_API_PASSWORD="your-api-password"
```

Get credentials from the [WP Engine User Portal](https://my.wpengine.com/api_access).

### 2. Run the server

```bash
npx tsx bin/mcp-stdio.ts
```

### 3. Verify

The server prints the tool count and auth method to stderr on startup.

## Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wpengine": {
      "command": "npx",
      "args": ["tsx", "/path/to/local-wpe-mcp-addon/bin/mcp-stdio.ts"],
      "env": {
        "WP_ENGINE_API_USERNAME": "your-api-username",
        "WP_ENGINE_API_PASSWORD": "your-api-password"
      }
    }
  }
}
```

### Claude Code

Add to `.claude/settings.json` or run:

```bash
claude mcp add wpengine -- npx tsx /path/to/local-wpe-mcp-addon/bin/mcp-stdio.ts
```

Set the environment variables in your shell profile.

### Local Addon

When installed as a Local addon, authentication is handled automatically via OAuth. No env vars needed.

## Tool Reference

See [`docs/reference/tools.md`](docs/reference/tools.md) for the complete tool catalog.

Regenerate with:

```bash
npm run generate-reference
```

## User Guides

- [Getting Started](docs/user-guide/getting-started.md)
- [Example Prompts](docs/user-guide/example-prompts.md)
- [Claude Desktop Setup](docs/user-guide/claude-desktop-setup.md)
- [Claude Code Setup](docs/user-guide/claude-code-setup.md)
- [Standalone Setup](docs/user-guide/standalone-setup.md)
- [Troubleshooting](docs/user-guide/troubleshooting.md)

## Development

```bash
npm install              # Install dependencies
npm run build            # Compile TypeScript
npm test                 # Run all tests (285 tests)
npm run test:unit        # Unit tests only
npm run test:component   # Component tests only (mocked CAPI)
npm run codegen          # Regenerate tools from swagger.json
npm run drift-check      # Compare vendored swagger vs. live API
npm run start:stdio      # Start server (stdio transport)
npm run start:http       # Start server (HTTP/SSE transport)
```

### Architecture

The core MCP server is a standalone Node.js process with zero dependency on Local/Electron. The Local addon is a thin wrapper that provides OAuth auth and lifecycle management. See [`CLAUDE.md`](CLAUDE.md) for the full project structure and [`docs/decisions.md`](docs/decisions.md) for architecture decision records.

### Testing

Tests use [Vitest](https://vitest.dev/) with [MSW](https://mswjs.io/) for HTTP-level CAPI mocking. No live API credentials needed for unit or component tests.

## Documentation

- [Product Overview](docs/product-overview.md) — What this is, who it's for, what it can and can't do
- [Architecture](docs/architecture.md) — How the system fits together
- [Roadmap](docs/roadmap.md) — Current state and potential future work
- [Known Issues](docs/known-issues.md) — Deferred findings and rationale
- [Contributing](CONTRIBUTING.md) — Dev setup, PR process, testing
- [Security](SECURITY.md) — Safety model, auth, audit logging

## Support & Feedback

- **Issues:** File bugs and feature requests at the project repository
- **Troubleshooting:** See the [troubleshooting guide](docs/user-guide/troubleshooting.md)

## License

Proprietary — WP Engine internal use.
