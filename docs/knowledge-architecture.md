# Knowledge Architecture

How domain knowledge is embedded in and delivered by the MCP server.

Modeled after the multi-layer pattern in `pm-ai-toolkit-mcp`.

---

## Delivery Mechanism Overview

```
AI Agent connects to MCP server
    │
    ├── INSTRUCTIONS (Layer 1)
    │   Delivered automatically on session start.
    │   Contains behavioral routing: what to do for different
    │   user intents, which resources to read when, safety rules.
    │
    ├── Resources — Knowledge (Layers 2-5)
    │   Delivered on-demand when AI agent reads a resource URI.
    │   wpengine://guide/*     → workflow guides, domain model, safety
    │   wpengine://api/*       → auto-generated API reference
    │
    ├── Resources — Live Data
    │   Delivered on-demand, calls CAPI.
    │   wpengine://accounts    → browsable account hierarchy
    │   wpengine://install/*   → install details
    │
    └── Tools
        Invoked by AI agent to perform operations.
        Generated (1:1 from swagger) + Composite (hand-written).
```

---

## Layer 1: INSTRUCTIONS

Embedded string in server code. Sent to AI client on every session.

### Responsibilities

- **Intent routing:** Map user questions to resources and tools
- **Entity navigation:** Guide the agent through Account → Site → Install hierarchy
- **Safety rules:** When to confirm, when to warn, what to check first
- **Composite tool guidance:** When to use `wpe_account_overview` vs. individual `wpe_get_account` + `wpe_get_sites`

### Structure (outline)

```
## First Use
- Check authentication status
- Read wpengine://guide/domain-model to understand entity hierarchy

## Navigation
When a user asks about their WP Engine infrastructure:
1. get_current_user to establish identity
2. get_accounts to scope to right account
3. Navigate: Account → Sites → Installs → Objects

## Common Workflows
When a user asks to "set up staging": read wpengine://guide/workflows/staging-setup
When a user asks to "go live": read wpengine://guide/workflows/go-live
When a user asks "what's the status of my account": use account_overview
...

## Safety
- Always read wpengine://guide/safety before Tier 3 operations
- Never delete a production install without confirming backup exists
- Always check install.environment before destructive operations

## Composite Tools
- Use account_* tools for cross-install views
- Use individual tools for targeted operations
- Composite tools handle pagination and rate limiting automatically
```

---

## Layer 2: Workflow Guides

Static markdown content served via `wpengine://guide/workflows/{name}`.

### Planned Guides

| Guide | Content |
|---|---|
| `new-environment` | Create site → create install → configure domains → request SSL → verify |
| `go-live` | Pre-launch checklist: domains, SSL, DNS, cache, backups, redirects |
| `staging-refresh` | Copy production to staging: backup → install_copy → verify |
| `domain-migration` | Add new domain → configure DNS → verify propagation → set primary → remove old |
| `disaster-recovery` | Check backup status → create backup → restore procedures |

### Guide Structure

Each guide follows a consistent template:

```markdown
# Workflow: [Name]

## When to Use
[Trigger conditions]

## Prerequisites
[What must be true before starting]

## Steps
1. [Action] — [why]
   - Tool: `tool_name(params)`
   - Check: [what to verify]
2. ...

## Common Issues
- [Issue]: [Resolution]

## Related Tools
- [tool_name] — [how it relates]
```

**Status:** Net-new content. To be authored iteratively as tools are built.

---

## Layer 3: Domain Model

Static markdown served via `wpengine://guide/domain-model`.

### Content Outline

```markdown
# WP Engine Domain Model

## Entity Hierarchy
Account
 └── Site (logical grouping)
      └── Install (WordPress environment)
           ├── Domains
           ├── Backups
           ├── SSL Certificates
           └── Offload Settings

## Key Concepts

### Account
- Billing unit. Has plan limits (sites, storage, bandwidth).
- One user can belong to multiple accounts.
- Account users have roles and permissions.

### Site
- Logical container for related WordPress environments.
- Typically has production + staging + development installs.
- Deleting a site deletes ALL its installs.

### Install
- A single WordPress environment (production, staging, or development).
- Has its own domains, PHP version, cache settings.
- `environment` field: "production", "staging", "development".
- `install_copy` overwrites the TARGET install's files and database.

### Domains
- Each install can have multiple domains.
- One domain is "primary" — used for WordPress site URL.
- Domains can be redirects (301/302 to primary).
- SSL certificates are per-domain.

### Backups
- Point-in-time snapshots of an install.
- Created on-demand or by WP Engine's automated schedule.
- Creating a backup is async — poll `get_backup` for status.

### Cache
- Three layers: object cache, page cache, CDN cache.
- Cache purge (`wpe_purge_cache`) can target specific layers or all.
- CDN purge propagates to all edge nodes (may take up to 60 seconds).
```

---

## Layer 4: API Reference

Auto-generated from swagger spec, served via `wpengine://api/{tag}`.

One resource per swagger tag:
- `wpengine://api/account` — account endpoints, parameters, response shapes
- `wpengine://api/site` — site endpoints
- `wpengine://api/install` — install endpoints
- `wpengine://api/domain` — domain endpoints
- `wpengine://api/backup` — backup endpoints
- `wpengine://api/cache` — cache endpoints
- `wpengine://api/certificates` — SSL certificate endpoints
- `wpengine://api/usage` — usage/metrics endpoints
- `wpengine://api/account-user` — account user endpoints
- `wpengine://api/offload-settings` — offload configuration endpoints

Content is regenerated from vendored swagger spec during build.

---

## Layer 5: Safety Documentation

Static markdown served via `wpengine://guide/safety`.

### Content Outline

```markdown
# Safety Guide

## Tier Classification

### Tier 1 — Read (no confirmation)
All GET operations. Safe to call freely.

### Tier 2 — Modify (logged, optional confirmation)
- update_site, update_install, update_domain, update_account_user
- purge_cache (affects live site performance temporarily)
- create_backup (consumes backup slot)
- request_ssl_certificate, import_ssl_certificate
- create_domain, create_domains_bulk
- configure/update offload settings
- refresh disk usage

### Tier 3 — Destructive (requires confirmation + logged)
- delete_site — DELETES ALL INSTALLS IN THE SITE
- delete_install — permanently removes WordPress environment
- delete_domain — removes domain routing
- delete_account_user — removes user access
- create_site, create_install — provisions billable infrastructure
- copy_install — OVERWRITES target install's files and database

## Pre-Check Requirements

Before delete_site:
  ✓ Confirm no production installs (or user explicitly acknowledges)
  ✓ List all installs that will be deleted
  ✓ Verify recent backup exists for each install

Before delete_install:
  ✓ Check install.environment — warn loudly if "production"
  ✓ Verify recent backup exists
  ✓ List domains that will become orphaned

Before copy_install:
  ✓ Identify source and target environments
  ✓ Warn that target will be OVERWRITTEN
  ✓ Verify backup of target exists
  ✓ List what will change (files + database)

Before create_site / create_install:
  ✓ Check account limits (may incur billing)
  ✓ Confirm intended account
```

---

## Resource URI Summary

| URI Pattern | Type | Source |
|---|---|---|
| `wpengine://guide/domain-model` | Knowledge | Static markdown |
| `wpengine://guide/workflows/{name}` | Knowledge | Static markdown |
| `wpengine://guide/safety` | Knowledge | Static markdown |
| `wpengine://guide/troubleshooting` | Knowledge | Static markdown |
| `wpengine://api/{tag}` | Reference | Auto-generated from swagger |
| `wpengine://accounts` | Live data | CAPI call |
| `wpengine://account/{id}` | Live data | CAPI call |
| `wpengine://account/{id}/sites` | Live data | CAPI call |
| `wpengine://site/{id}` | Live data | CAPI call |
| `wpengine://site/{id}/installs` | Live data | CAPI call |
| `wpengine://install/{id}` | Live data | CAPI call |
