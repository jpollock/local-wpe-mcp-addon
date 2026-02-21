# Architecture

This document describes how the system fits together. For individual decision rationale, see [decisions.md](decisions.md).

## System Overview

```
┌─────────────────┐       MCP Protocol        ┌──────────────────┐       HTTPS        ┌──────────────┐
│   AI Client     │ ◄═══════════════════════► │   MCP Server     │ ◄════════════════► │  WP Engine   │
│ (Claude Desktop,│    stdio or HTTP/SSE      │                  │   Basic / Bearer   │  CAPI (v1)   │
│  Claude Code)   │                           │                  │                    │              │
└─────────────────┘                           └──────────────────┘                    └──────────────┘
```

The MCP server translates MCP tool calls into WP Engine Customer API (CAPI) HTTP requests. It adds safety classification, confirmation flows, audit logging, summarization, and domain knowledge on top of the raw API.

## Standalone-First Design

The core MCP server (`src/`) is a standalone Node.js process with **zero dependency on Local or Electron**. The Local addon (`src/local-addon/`) is a thin wrapper that provides OAuth auth and lifecycle management. This design enables:

- Testing without Local running
- Standalone usage via CLI or CI pipelines
- Faster development iteration (no Electron rebuild cycle)
- Portability if the distribution model changes

The boundary is strict: nothing in `src/` imports from `@getflywheel/local`. Only `src/local-addon/` does.

## Core Modules

### `server.ts` — MCP Server

The central module. Creates the MCP server instance, registers all handlers (tools, resources, prompts), and wires up the middleware pipeline. Manages the pending confirmation token store for Tier 3 operations.

### `auth.ts` — Auth Provider

Abstraction over authentication methods. Tries OAuth first (if configured), falls back to environment variables for Basic Auth. Returns an `Authorization` header string. The server calls `getAuthHeader()` on every CAPI request — no caching.

### `capi-client.ts` — HTTP Client

Thin HTTP client for the WP Engine CAPI. Handles:
- Request construction (URL building, JSON serialization)
- Response parsing and error formatting
- Automatic retry on 429 (rate limit) with exponential backoff and jitter
- Auto-pagination via `getAll()` — follows `next` links to collect all pages

### `safety.ts` — Tier Classification

Classifies tools into safety tiers (1/2/3) based on HTTP method with manual overrides for operations where the method doesn't reflect the risk. Provides confirmation messages and pre-check lists for Tier 3 operations.

### `audit.ts` — Audit Logging

Structured logging of all tool invocations. Redacts sensitive parameter values before logging. Writes newline-delimited JSON to a file with restrictive permissions (`0o600`).

### `summarize.ts` — Summarization Middleware

11 summarizer functions that condense large API responses. Applied after the tool handler returns, controlled by a `summary` parameter (default: `true`). Summarizers strip daily time-series arrays and verbose fields while keeping rollups, identifiers, and status indicators.

### `content/` — Knowledge Layer

Markdown content served as MCP resources:
- **Guides** — Domain model, safety rules, troubleshooting patterns
- **Workflows** — Step-by-step procedures (go-live, staging, domain migration, disaster recovery, new environment)
- **INSTRUCTIONS** — Behavioral routing string embedded in the server's MCP capabilities

## Tool Pipeline

Every tool call follows this pipeline:

```
Request
  │
  ▼
┌─────────────────┐
│ Lookup tool      │ → Unknown tool? Return error
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Safety check     │ → Tier 1/2: proceed
│                  │ → Tier 3 without token: return confirmation request + log
│                  │ → Tier 3 with token: validate (not expired, params match, single-use)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Handler          │ → Generated: single CAPI call
│                  │ → Composite: fan-out across multiple CAPI calls
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Summarization    │ → If summarizer registered and summary ≠ false, condense response
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Audit log        │ → Log tool name, tier, params (redacted), result, duration
└────────┬────────┘
         │
         ▼
Response
```

## Tool Types

### Generated Tools (50)

Auto-generated from `data/swagger.json` by `codegen/generate.ts`. Each tool maps 1:1 to a CAPI endpoint. Generated code lives in `src/tools/generated/` and must not be edited by hand.

### Composite Tools (10)

Hand-written tools in `src/tools/composite/` that orchestrate multiple CAPI calls:

| Tool | Pattern |
|------|---------|
| `wpe_account_overview` | Single account summary (limits, users, installs) |
| `wpe_account_domains` | Fan-out: domains across all installs in an account |
| `wpe_account_ssl_status` | Fan-out: SSL certs across all installs in an account |
| `wpe_account_environments` | Fan-out: topology map of sites and installs |
| `wpe_account_usage` | Single call: usage metrics with insights |
| `wpe_diagnose_site` | Aggregate: install details + usage + domains + SSL |
| `wpe_prepare_go_live` | Aggregate: domain, SSL, and health checks |
| `wpe_environment_diff` | Parallel fetch: compare two installs |
| `wpe_portfolio_overview` | Fan-out: all accounts → all sites → all installs |
| `wpe_portfolio_usage` | Fan-out: all accounts → usage per install, ranked |

## MCP Surface

### Resources

- **Static guides** — `wpengine://guide/{topic}` (domain-model, safety, troubleshooting)
- **Workflows** — `wpengine://guide/workflows/{name}` (go-live, staging-refresh, domain-migration, disaster-recovery, new-environment)
- **Entity browser** — `wpengine://account/{id}`, `wpengine://account/{id}/sites`, `wpengine://install/{id}` (live data)

### Prompts

6 prompt templates encode guided workflows:
- `diagnose-site`, `account-health`, `setup-staging`, `go-live-checklist`, `domain-migration`, `security-review`

Each prompt references specific tools and resources, providing the AI with step-by-step instructions.

## Extension Points

### Adding CAPI coverage

When the CAPI adds new endpoints:

1. Update `data/swagger.json`
2. Run `npm run codegen` — new tools are generated automatically
3. Add safety overrides if needed (`src/safety.ts`)
4. Add summarizers if responses are large (`src/summarize.ts`)

### Adding composite tools

Create a new file in `src/tools/composite/`, export a `ToolRegistration`, and register it in the composite index. Add a summarizer if the tool fans out across many resources.

### Adding knowledge content

Drop a markdown file in `src/content/` (guide) or `src/content/workflows/` (workflow). Update the topic list in `src/content/index.ts` if adding a new guide. Workflows are auto-discovered from the directory.

## Related Documents

- [decisions.md](decisions.md) — Architecture Decision Records (ADR-001 through ADR-017)
- [deviations.md](deviations.md) — Differences between spec and implementation
- [requirements.md](requirements.md) — Functional and non-functional requirements
- [reference/tools.md](reference/tools.md) — Auto-generated tool catalog
