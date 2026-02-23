# Deviations from Original Requirements

This document tracks all deviations between the original requirements (`docs/requirements.md`) and the actual implementation, with rationale for each.

## Summary

The core architecture and API coverage shipped as specified. Deviations fall into two categories:

1. **Removals** — Composite tools that depend on CAPI endpoints that don't exist or on synchronous provisioning that isn't possible
2. **Additions** — Capabilities discovered as necessary during real-world usage with AI agents

## Deviation Table

| # | Deviation | Original Spec | Actual Implementation | Rationale |
|---|---|---|---|---|
| D-1 | `wpe_account_backups` removed | FR-2 composite tool — backup recency per environment | Not implemented | CAPI has no list-backups-by-install endpoint; `GET /installs/{id}/backups` doesn't exist in the swagger spec. Individual backup operations (create, get status) exist but listing is not supported. |
| D-2 | `wpe_setup_staging` removed | FR-2 composite tool — create staging from production | Removed; `setup-staging` prompt updated to guide through individual steps | Install creation is async (minutes to provision). The composite tried to chain create → copy → list domains sequentially, but the install isn't ready for copy operations until provisioning completes. An AI agent can't block for minutes waiting. |
| D-3 | Backup checks removed from `wpe_diagnose_site` | Part of health check composite | Backup section removed from diagnostic output | Same as D-1 — no list-backups endpoint to query. |
| D-4 | Backup checks removed from `wpe_prepare_go_live` | Part of go-live checklist | Backup verification removed from checklist | Same as D-1 — no list-backups endpoint to query. |
| D-5 | Multi-account aggregation added | "Out of scope" per requirements | `wpe_portfolio_overview` + `wpe_portfolio_usage` tools added | Cross-account queries are essential for users with multiple WP Engine accounts. AI agents give up or produce incomplete answers after 2-3 sequential per-account calls. Portfolio tools fan out across all accessible accounts in a single call. |
| D-6 | Summarization layer added | Not in spec | 11 summarizers in `src/summarize.ts`; `summary` parameter on all tools with summarizers (default: true) | Context overflow in Claude Desktop with accounts that have 100+ installs. Raw API responses for usage, installs, and domains can exceed 1MB, blowing past tool result limits. Summarization strips daily time-series arrays and verbose fields while keeping rollups and key identifiers. |
| D-7 | `_confirmationToken` in tool schema | Not specified how confirmation works | Tier 3 tools expose `_confirmationToken` as an input parameter in their schema | AI agents couldn't discover the confirmation flow without the parameter being visible in the tool schema. The original spec described confirmation as a behavioral flow but didn't address discoverability. |
| D-8 | Async provisioning guidance | Not specified | INSTRUCTIONS text + workflow docs include polling guidance | Install and site creation return immediately but take minutes to provision. Composite tools that chain operations after creation fail because the install isn't ready. Guidance directs agents to poll `wpe_get_install` until status is "active". |
| D-9 | `setup-staging` prompt updated | Referenced `wpe_setup_staging` composite tool | Guides AI through individual tool calls: create install → poll → copy → verify | Prompt template preserved but content updated since the composite tool was removed (D-2). The prompt now encodes the same workflow as step-by-step instructions. |

| D-10 | User management composites added | Not in original spec | 4 tools: `wpe_user_audit`, `wpe_add_user_to_accounts`, `wpe_remove_user_from_accounts`, `wpe_update_user_role` | Agencies managing multiple WP Engine accounts need cross-account user management. The existing generated tools operate on a single account at a time. These composites give agents bulk user onboarding/offboarding, cross-account audit with deduplication by email, and last-owner protection. |

## Impact Assessment

### Reduced Capability

- No automated backup recency checking across an account (D-1, D-3, D-4)
- No single-tool staging setup (D-2) — agents must follow multi-step guidance instead

### Added Capability

- Cross-account portfolio views (D-5) — not planned but critical for real usage
- Context-aware summarization (D-6) — prevents tool result overflow in AI clients
- Better AI discoverability of safety flows (D-7)
- Reliable async operation handling (D-8, D-9)
- Cross-account user management (D-10) — bulk user operations for agency workflows

## Related Documents

- `docs/requirements.md` — Updated FR-2 table and added FR-10
- `docs/decisions.md` — ADRs 014-017 cover the architectural rationale
