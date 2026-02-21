# Security

## Security Model Overview

The WP Engine CAPI MCP Server acts as a bridge between AI agents and the WP Engine Customer API. Its security model is designed to prevent accidental destructive operations while maintaining a full audit trail.

### Three-Tier Safety System

Every tool is classified into one of three safety tiers based on its impact:

| Tier | Operations | Behavior |
|------|------------|----------|
| 1 — Read | All GET operations | No confirmation required |
| 2 — Modify | PATCH, non-destructive POST | Logged |
| 3 — Destructive | DELETE, `wpe_copy_install`, `wpe_create_site`, `wpe_create_install`, `wpe_create_account_user` | Confirmation required + logged |

Tier assignment defaults to the HTTP method but is overridden for operations where the method doesn't reflect the risk (e.g., `wpe_copy_install` is a POST but overwrites data, so it's Tier 3).

### Confirmation Tokens

Tier 3 operations use a two-step confirmation flow:

1. **First call** — The server returns a `confirmationToken` (random 16-byte hex), a warning message, and pre-checks (e.g., "verify a recent backup exists")
2. **Second call** — The agent calls the same tool with the same parameters plus `_confirmationToken`

Tokens are:
- **Single-use** — Deleted after successful confirmation
- **Time-limited** — 5-minute TTL; expired tokens are rejected
- **Parameter-bound** — The server verifies that parameters match between the request and confirmation; changed parameters are rejected
- **Tool-scoped** — A token for `wpe_delete_site` cannot be used with `wpe_delete_install`

## Audit Logging

All tool invocations are logged with structured entries containing:

- Timestamp
- Tool name
- Safety tier
- Parameters (with sensitive values redacted)
- Confirmation status (confirmed / not confirmed / not applicable)
- Result (success / error / confirmation_required)
- Duration

### Redaction

Parameters with keys matching `password`, `token`, `secret`, or `key` (case-insensitive) are automatically replaced with `[REDACTED]` before logging. Redaction applies recursively to nested objects and arrays.

### Log file

When an audit log path is configured, entries are appended as newline-delimited JSON with file permissions `0o600` (owner read/write only).

## Authentication Architecture

### OAuth (Primary — via Local)

When running as a Local addon, the server uses Local's `wpeOAuth` service to obtain access tokens. Tokens are obtained on each request via `getAccessToken()` and sent as `Bearer` tokens. The MCP server never stores OAuth tokens.

### Environment Variables (Fallback)

For standalone usage (CI, CLI), the server reads `WP_ENGINE_API_USERNAME` and `WP_ENGINE_API_PASSWORD` and sends them as HTTP Basic Auth. Credentials are read from the environment on each request and are never logged, cached, or written to disk.

### Auth Precedence

1. Try OAuth (if an OAuth provider is configured)
2. Fall back to environment variables
3. Return an error if neither is available

## HTTP Transport Security

When running in HTTP/SSE mode (`bin/mcp-http.ts`):

- **Localhost-only binding** — The server binds to `127.0.0.1` by default, preventing network access
- **Bearer token auth** — A 32-byte random token is generated at startup; every request must include it in the `Authorization` header
- **Connection info file** — Token and endpoint are written to a JSON file with `0o600` permissions (owner-only access)
- **Request body limit** — Bodies larger than 1 MB are rejected
- **Session management** — Each client gets an isolated session via MCP session IDs

## Content Security

MCP resource URIs (`wpengine://guide/{topic}`) validate topic names to prevent path traversal. Names containing `..`, `/`, or `\` are rejected.

## Reporting Vulnerabilities

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do not** open a public issue
2. Email the security team or contact the project maintainers directly
3. Include a description of the vulnerability, steps to reproduce, and potential impact
4. Allow time for the issue to be addressed before any public disclosure
