# WP Engine Customer API MCP Server — Requirements

## Overview

An MCP (Model Context Protocol) server that provides AI agents access to the WP Engine Customer API (CAPI). Distributed as a Local (by Flywheel) addon to leverage Local's OAuth2 authentication infrastructure.

## Problem Statement

AI agents need programmatic access to WP Engine hosting infrastructure — managing sites, installs, domains, backups, cache, and more. The WP Engine Customer API provides this access, but connecting an MCP server to it requires authentication management. Local already has OAuth2 integration with WP Engine, making it a natural distribution vehicle.

## Prior Art

| Project | Role in This Project |
|---|---|
| `local-addon-mcp-server` (in local/cli/) | Reference for Local addon MCP server patterns — transport, auth, tool organization, GraphQL integration |
| `local-addon-wpe-usage-metrics-oauth2` | Reference for CAPI access via Local's wpeOAuth service — dual auth, secure storage, IPC handlers |
| `wpengine-mcp-ts` (GitHub) | Reference for CAPI endpoint coverage — treat as prior art for _what_ to cover, not _how_ to build |

---

## Functional Requirements

### FR-1: API Coverage — 1:1 Swagger Mapping

Every operation in the WP Engine Customer API (`https://api.wpengineapi.com/v1/swagger`, version 1.10.0) is exposed as an MCP tool. Current surface: 60+ operations across 47 paths.

**API Tags / Groups:**
- Status (system status)
- Account (list, get, limits)
- Account User (CRUD)
- Usage (account-level and install-level metrics, summary, insights, disk refresh)
- Site (CRUD)
- Install (CRUD, copy)
- Domain (CRUD, bulk add, status check)
- Certificates (list, get, request Let's Encrypt, import third-party)
- Backup (create, get status)
- Cache (purge)
- Offload Settings (LargeFS validation, file offload config)

No endpoints are excluded.

### FR-2: Composite / Higher-Level Tools

Beyond 1:1 mapping, provide tools that chain multiple API calls and encode domain expertise:

| Tool | Description | Fan-Out Pattern |
|---|---|---|
| `wpe_account_overview` | Account details + plan limits + usage summary + site/install counts | No — account-level APIs exist |
| `wpe_account_usage` | Bandwidth, visits, storage across all installs with insights | No — account-level API exists |
| `wpe_account_domains` | All domains across all installs, grouped by environment, SSL status included | Yes — per install |
| `wpe_account_backups` | Backup recency per environment, flag installs without recent backups | Yes — per install |
| `wpe_account_ssl_status` | Cert status per domain, flag expiring or missing SSL | Yes — per install |
| `wpe_account_environments` | Full environment topology — which sites have staging, PHP versions, etc. | Minimal |
| `wpe_diagnose_site` | Health snapshot: usage + domains + SSL + cache + backups | Yes — multiple per install |
| `wpe_setup_staging` | Create staging from production: create_install + install_copy + list domains | No — sequential mutations |
| `wpe_prepare_go_live` | Pre-launch checklist: domains + SSL + DNS + backups verified | Yes — multiple per install |
| `wpe_environment_diff` | Side-by-side comparison of two installs | Parallel — two installs |

**Fan-out pattern requirements:**
- Respect CAPI rate limits (handle 429 responses)
- Paginate automatically on list endpoints
- Cache intermediate results within a single composite call
- Report progress for large accounts

### FR-3: MCP Resources

Two categories of resources:

**A. Entity browsing (live API data):**
- `wpengine://accounts` — list accounts
- `wpengine://account/{id}` — account details
- `wpengine://account/{id}/sites` — sites in account
- `wpengine://site/{id}` — site details
- `wpengine://site/{id}/installs` — installs in site
- `wpengine://install/{id}` — install details

These let AI agents explore the account hierarchy without tool calls.

**B. Knowledge guides (static content):**
- `wpengine://guide/domain-model` — entity hierarchy and what each means
- `wpengine://guide/workflows/{name}` — step-by-step orchestrations
- `wpengine://guide/safety` — destructive operations, what to check, confirmation requirements
- `wpengine://guide/troubleshooting` — diagnostic patterns
- `wpengine://api/{tag}` — auto-generated API reference grouped by swagger tag

### FR-4: Knowledge Layer

Following the multi-layer pattern from pm-ai-toolkit-mcp:

| Layer | Content | Delivery |
|---|---|---|
| Layer 1: INSTRUCTIONS | Behavioral routing — how to navigate entities, when to read guides, safety rules | Embedded in server, sent on every session |
| Layer 2: Workflow Guides | Step-by-step orchestrations — new-environment, go-live, staging-refresh, domain-migration, disaster-recovery | MCP resources (`wpengine://guide/workflows/*`) |
| Layer 3: Domain Model | Entity hierarchy, environment types, relationship explanations | MCP resource (`wpengine://guide/domain-model`) |
| Layer 4: API Reference | Per-tag endpoint details, auto-generated from swagger | MCP resources (`wpengine://api/*`) |
| Layer 5: Safety Docs | Tier classifications, confirmation rules, pre-check requirements | MCP resource (`wpengine://guide/safety`) |

Workflow guide content is **net-new** — to be written iteratively as tools are built.

### FR-5: Authentication

**Primary:** Local's `wpeOAuth` service
- Access via `LocalMain.getServiceContainer().cradle.wpeOAuth`
- Call `wpeOAuth.getAccessToken()` for Bearer token
- Automatic token refresh handled by Local

**Fallback:** Environment variables
- `WP_ENGINE_API_USERNAME` + `WP_ENGINE_API_PASSWORD`
- Used as HTTP Basic Auth
- Enables use outside Local (CI pipelines, standalone)

**Error handling:**
- No auth available → surface clear error to AI client with setup instructions
- Auth expired → attempt refresh, then surface error if still failing

### FR-6: Transport

Support both MCP transport protocols:

- **stdio** — for Claude Desktop, Claude Code, and other local AI tools
- **HTTP/SSE** — for browser-based AI tools or multi-client access

Follow patterns from existing `local-addon-mcp-server`.

### FR-7: Safety & Guardrails

**Three-tier classification:**

| Tier | HTTP Methods | Behavior |
|---|---|---|
| Tier 1 — Read | GET | No confirmation needed |
| Tier 2 — Modify | PATCH, non-destructive POST (backup, cache purge, SSL request) | Log, optional confirmation |
| Tier 3 — Destructive | DELETE, infrastructure-creating POST (create site/install), `install_copy` | Require explicit confirmation + log |

**Audit logging:**
- Structured log entry for every tool invocation
- Fields: timestamp, tool name, tier, parameters, confirmation status, result
- Persistent per session

**Confirmation flow:**
- Tier 3 operations return a confirmation prompt before executing
- Include what will happen, what can't be undone, and what to check first
- Reference `wpengine://guide/safety` in confirmation messages

---

## Non-Functional Requirements

### NFR-1: Swagger Sync

**Approach:** Vendored spec + build-time codegen + drift detection

```
/v1/swagger (live API)
    ↓ (periodic fetch, checked into repo)
data/swagger.json (vendored copy)
    ↓ (build-time codegen script)
src/tools/generated/     ← 1:1 MCP tools
src/resources/api/       ← auto-generated API reference
```

**What gets auto-generated per endpoint:**
- Tool name (from operationId or path)
- Parameters (from swagger parameters with types)
- Description (from swagger description)
- Default safety tier (from HTTP method)
- Return type hints

**What stays manual:**
- Composite tools
- Workflow guides
- Safety tier overrides (e.g., `install_copy` is POST but Tier 3)
- INSTRUCTIONS routing logic

**Drift detection:**
- Script or CI job periodically fetches live swagger
- Diffs against vendored copy
- Opens PR or alerts when changes detected

### NFR-2: Architecture

- **Standalone-first:** Core MCP server is a standalone Node.js process with zero Local/Electron dependency
- Local addon wraps the core, providing OAuth auth and lifecycle management
- `src/` contains the core — no imports from `@getflywheel/local`
- `src/local-addon/` is the only code that touches Local SDK
- Separate Local addon (not extending existing `local-addon-mcp-server`)
- TypeScript with strict mode
- Modern async patterns
- No code reuse from `wpengine-mcp-ts` (treat as concept reference only)

### NFR-3: Pagination

All list endpoints in CAPI use `limit`/`offset` pagination. The MCP tools should:
- Auto-paginate by default (fetch all pages)
- Support optional `limit` parameter for partial results
- Handle pagination transparently in composite tools

### NFR-4: Error Handling

- Map CAPI error codes to helpful messages
- 401 → auth expired, guide to re-authenticate
- 403 → access denied, explain permissions needed
- 404 → resource not found, suggest alternatives
- 429 → rate limited, implement backoff and retry
- 5xx → service issue, suggest retry

---

### FR-8: MCP Prompts

Pre-built prompt templates that guide AI agents through multi-step workflows:

| Prompt | Description |
|---|---|
| `diagnose-site` | Health check for one install — uses diagnose_site tool + troubleshooting guide |
| `account-health` | Overall account health assessment across all installs |
| `setup-staging` | Guided staging environment creation with safety checks |
| `go-live-checklist` | Pre-launch verification workflow |
| `domain-migration` | Guided domain migration with DNS verification |
| `security-review` | SSL coverage + user access review |

Prompts bridge tools (actions) and resources (knowledge) by providing orchestration instructions.

### FR-9: Standalone Mode

The core MCP server runs as a standalone Node.js process without Local:
- Entry point: `bin/mcp-stdio.ts`
- Auth: environment variables only (`WP_ENGINE_API_USERNAME` / `WP_ENGINE_API_PASSWORD`)
- Transport: stdio
- No dependency on Local SDK, Electron, or any addon infrastructure

Standalone mode is the primary development and testing target. Local addon wraps the standalone core.

---

## Out of Scope (for initial version)

- WordPress application-level operations (WP-CLI, plugin management) — handled by existing `local-addon-mcp-server`
- Push/pull sync operations — handled by existing Local addon
- Site creation wizard UI — this is a headless MCP server
- Multi-account aggregation — composite tools scope to single account initially (designed to relax in future)
