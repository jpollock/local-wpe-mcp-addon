# Standalone Setup

Run the MCP server as a standalone Node.js process, without Local or any addon infrastructure.

## Prerequisites

- Node.js 18+
- WP Engine API credentials

## Authentication

Set environment variables:

```bash
export WP_ENGINE_API_USERNAME="your-api-username"
export WP_ENGINE_API_PASSWORD="your-api-password"
```

Get credentials from [WP Engine User Portal > API Access](https://my.wpengine.com/api_access).

## stdio Transport

The default transport for Claude Desktop and Claude Code:

```bash
npx tsx bin/mcp-stdio.ts
```

The server communicates via stdin/stdout using the MCP protocol. Startup info is printed to stderr.

## HTTP/SSE Transport

For browser-based AI tools or multi-client access:

```bash
npx tsx bin/mcp-http.ts
```

The server starts an HTTP server with Server-Sent Events for real-time communication.

## Testing with MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is useful for testing:

```bash
npx @modelcontextprotocol/inspector npx tsx bin/mcp-stdio.ts
```

This opens a web UI where you can:
- Browse all 60 tools and their schemas
- Call tools with custom parameters
- Browse MCP resources
- Test MCP prompts

## Building from Source

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm test             # Run test suite
```

## Packaging

```bash
npm run package      # Build + create npm tarball
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `WP_ENGINE_API_USERNAME` | Yes (standalone) | CAPI username |
| `WP_ENGINE_API_PASSWORD` | Yes (standalone) | CAPI password |

When running as a Local addon, OAuth handles authentication automatically.
