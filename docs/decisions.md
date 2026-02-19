# Architecture Decision Record

Decisions made during requirements discussion, 2026-02-19.

---

## ADR-001: Distribution via Local Addon

**Status:** Accepted

**Context:** The MCP server needs authentication with WP Engine's Customer API. Managing OAuth2 flows independently is complex. Local (by Flywheel) already has OAuth2 integration with WP Engine via its `wpeOAuth` service.

**Decision:** Distribute the MCP server as a Local addon, accessing Local's `wpeOAuth` service for authentication.

**Consequences:**
- Users get seamless auth without managing API credentials
- Ties primary auth path to Local being installed and running
- Env var fallback preserves standalone usage for CI/power users
- Must follow Local addon patterns (main/renderer processes, IPC handlers, service permissions)

---

## ADR-002: Separate Addon (Not Extension of Existing MCP Server)

**Status:** Accepted

**Context:** The existing `local-addon-mcp-server` already provides 40 MCP tools for local WordPress site management and has some WPE integration (push, pull, sync). We could either extend it or build a new addon.

**Decision:** Build a separate addon focused purely on WP Engine Customer API.

**Rationale:**
- Clear separation of concerns — local site management vs. cloud infrastructure management
- Independent release cycle
- Avoids bloating the existing addon
- Different auth model (CAPI OAuth vs. Local GraphQL token)

**Consequences:**
- Two MCP servers running in Local (existing + this one)
- AI agents configure two separate MCP server connections
- Some conceptual overlap in WPE site listing (existing has `listWpeSites`, this will have `wpe_get_sites`)

---

## ADR-003: OAuth Primary, Environment Variable Fallback

**Status:** Accepted

**Context:** Three auth approaches considered: OAuth only, dual auth (OAuth + keychain Basic Auth like usage-metrics addon), or OAuth + env var fallback.

**Decision:** OAuth primary via Local's `wpeOAuth.getAccessToken()`, falling back to `WP_ENGINE_API_USERNAME` / `WP_ENGINE_API_PASSWORD` environment variables for Basic Auth.

**Rationale:**
- OAuth via Local is the seamless path for most users
- Env vars enable CI/pipeline usage without Local running
- Simpler than the usage-metrics addon's keychain approach — env vars are standard for dev tools
- No UI needed for credential management (unlike the Preferences panel in usage-metrics)

**Consequences:**
- No secure credential storage needed in the addon itself
- Users in CI must set env vars manually
- No UI preferences panel required for auth

---

## ADR-004: 1:1 Swagger Mapping + Composite Tools

**Status:** Accepted

**Context:** The WP Engine Customer API has 60+ operations. We could expose a curated subset, 1:1 mapping, or higher-level abstractions.

**Decision:** Expose every CAPI endpoint as an individual MCP tool (1:1 mapping), plus hand-written composite tools for multi-step workflows.

**Rationale:**
- 1:1 mapping ensures full API coverage with no gaps
- Composite tools add value the raw API can't provide (fan-out aggregation, anomaly flagging, workflow automation)
- Codegen from swagger keeps 1:1 tools current automatically
- AI agents can choose the appropriate level of abstraction

**Consequences:**
- Large tool surface (60+ generated + ~10 composite)
- AI agents need guidance on when to use composite vs. individual tools (handled by INSTRUCTIONS)
- Composite tools must handle pagination and rate limiting for fan-out patterns

---

## ADR-005: Vendored Swagger Spec + Build-Time Codegen

**Status:** Accepted

**Context:** Three approaches to staying in sync with the CAPI swagger spec: build-time codegen, runtime spec fetch, or vendored spec with drift detection.

**Decision:** Vendor the swagger spec in the repo, generate MCP tool definitions at build time, and detect drift via periodic comparison against the live `/v1/swagger` endpoint.

**Rationale:**
- Build-time codegen is testable and predictable
- Vendored spec gives control over when to adopt API changes
- Drift detection prevents silent staleness
- Runtime fetch rejected — adds startup latency and network dependency

**Consequences:**
- Need a codegen script that transforms swagger operations into MCP tool definitions
- Need a drift detection script (CI job or manual)
- Generated code should be committed (reviewable diffs when spec changes)
- Manual safety tier overrides needed for operations where HTTP method doesn't indicate risk (e.g., `install_copy` is POST but destructive)

---

## ADR-006: TypeScript

**Status:** Accepted

**Context:** Two options: TypeScript (matching Local addon ecosystem and `wpengine-mcp-ts`) or Python (matching `pm-ai-toolkit-mcp`).

**Decision:** TypeScript with strict mode.

**Rationale:**
- Local addon ecosystem is TypeScript/Electron
- Existing `local-addon-mcp-server` provides TypeScript patterns for MCP in Local
- Type safety aligns well with codegen from swagger

**Constraints:**
- Do not reuse code from `wpengine-mcp-ts` — that project predates modern TypeScript and AI tooling practices
- Use it only as a conceptual reference for endpoint coverage

---

## ADR-007: Dual Transport (stdio + HTTP/SSE)

**Status:** Accepted

**Context:** MCP supports multiple transports. The existing Local MCP addon supports both stdio and HTTP/SSE.

**Decision:** Support both stdio and HTTP/SSE transports.

**Rationale:**
- stdio is simplest for Claude Desktop / Claude Code
- HTTP/SSE enables browser-based AI tools and multi-client scenarios
- Existing addon already has the dual-transport pattern to reference

---

## ADR-008: Three-Tier Safety Classification

**Status:** Accepted

**Context:** The CAPI includes destructive operations (delete site, delete install, etc.) that an AI agent could invoke. Need guardrails.

**Decision:** Classify all operations into three tiers with escalating safety measures.

| Tier | Operations | Behavior |
|---|---|---|
| 1 — Read | All GET | No confirmation |
| 2 — Modify | PATCH, non-destructive POST | Log + optional confirmation |
| 3 — Destructive | DELETE, `install_copy`, infrastructure-creating POST | Require confirmation + log |

**Rationale:**
- Allows AI agents to browse freely (Tier 1) while preventing accidental destruction (Tier 3)
- Logging provides audit trail for all operations
- Confirmation flow gives human-in-the-loop for dangerous actions

**Override cases:** Some POST operations are more destructive than their HTTP method suggests:
- `install_copy` — overwrites target environment (Tier 3)
- `wpe_create_site` / `wpe_create_install` — provisions billable infrastructure (Tier 3)

---

## ADR-009: Knowledge Embedded in MCP Server

**Status:** Accepted

**Context:** AI agents need domain knowledge about WP Engine infrastructure to use the tools effectively. This knowledge could live in external documentation, client-side prompts, or within the MCP server itself.

**Decision:** Embed knowledge directly in the MCP server using the multi-layer pattern from `pm-ai-toolkit-mcp`.

**Layers:**
1. INSTRUCTIONS string — behavioral routing (embedded in server code)
2. Workflow guides — step-by-step orchestrations (MCP resources)
3. Domain model — entity hierarchy (MCP resource)
4. API reference — auto-generated from swagger (MCP resources)
5. Safety documentation — tier classifications and pre-checks (MCP resource)

**Rationale:**
- Proven pattern from pm-ai-toolkit-mcp
- Knowledge travels with the server — any AI client gets it automatically
- Resources are lazy-loaded — AI agent reads them on demand, not all upfront
- INSTRUCTIONS routing tells the agent which resource to read for each situation

**Consequences:**
- Workflow guide content is net-new and must be authored
- INSTRUCTIONS string must be maintained as tools evolve
- Knowledge content is part of the codebase (versioned, reviewable)

---

## ADR-010: Tool Name Namespace (`wpe_` prefix)

**Status:** Accepted

**Context:** AI agents may have multiple MCP servers connected simultaneously. Tool names need to be unambiguous. The existing Local MCP server has tools like `list_sites`, `create_site`, etc. Without namespacing, name collisions are likely.

**Decision:** All tool names use the `wpe_` prefix. Examples: `wpe_get_accounts`, `wpe_create_site`, `wpe_account_overview`.

**Rationale:**
- Prevents collisions with other MCP servers (especially the existing Local MCP server)
- Makes tool provenance clear in AI agent logs and conversations
- Short prefix — doesn't bloat tool names excessively
- Consistent with `wpengine://` resource URI prefix

**Consequences:**
- Codegen must prepend `wpe_` to all generated tool names
- Composite tools also use `wpe_` prefix
- INSTRUCTIONS and knowledge content must reference `wpe_`-prefixed names

---

## ADR-011: Standalone-First Architecture

**Status:** Accepted

**Context:** The MCP server could be built directly as a Local addon (tightly coupled to Electron/Local) or as a standalone server that Local wraps.

**Decision:** Build the core MCP server as a standalone Node.js process with zero dependency on Local/Electron. The Local addon is a thin wrapper that provides OAuth auth and lifecycle management.

**Rationale:**
- Enables testing without Local running (critical for early development and CI)
- Cleaner architecture — Local is a distribution mechanism, not an architectural dependency
- Enables standalone usage (CLI, CI pipelines) via env var auth
- Faster development iteration (no Electron rebuild cycle)
- Core logic is portable if distribution model changes

**Consequences:**
- Two entry points: `bin/mcp-stdio.ts` (standalone) and `src/local-addon/main/index.ts` (addon)
- Auth provider must abstract over both OAuth and env var paths
- `src/` has no imports from `@getflywheel/local` — only `src/local-addon/` does
- Local addon integration deferred to Phase 6 (after core is tested)

---

## ADR-012: MCP Prompts for Guided Workflows

**Status:** Accepted

**Context:** We have workflow knowledge (go-live checklist, staging setup, etc.) that could be delivered as: (a) resources the AI reads, (b) composite tools it calls, or (c) MCP Prompts that guide the AI through multi-step workflows.

**Decision:** Implement MCP Prompts as pre-built prompt templates in addition to resources and composite tools. Prompts encode the "when and how" of using tools together.

**Rationale:**
- Prompts are a first-class MCP primitive — AI clients can list and invoke them
- Prompts bridge the gap between tools (actions) and resources (knowledge) by providing orchestration
- More natural for users: "run the go-live checklist" vs. manually reading guides and calling tools
- Prompts can reference both tools and resources, creating guided workflows

**Planned prompts:**
- `diagnose-site` — health check for one install
- `account-health` — overall account health assessment
- `setup-staging` — guided staging environment creation
- `go-live-checklist` — pre-launch verification
- `domain-migration` — guided domain migration
- `security-review` — SSL + user access review

**Consequences:**
- Additional MCP surface to maintain
- Prompt content must stay in sync with tool names and resource URIs
- Prompts are authored alongside workflow guides (Phase 5)

---

## ADR-013: Test-Driven Development

**Status:** Accepted

**Context:** Need a development approach that maximizes confidence in output quality and enables AI-driven execution across session boundaries.

**Decision:** Strict TDD — tests written before implementation for every phase. Tests serve as the executable specification.

**Rationale:**
- Tests encode "done" in a verifiable way — no subjective judgment needed
- When starting a new session, running tests reveals exactly what's failing and what to work on next
- Tests against mocked CAPI (via MSW) enable development without live API access
- TDD prevents scope creep — only implement what tests require

**Approach:**
- Phase test plan in `docs/test-plan.md` — all test descriptions written upfront
- Vitest as test framework (TypeScript-native, fast)
- MSW for HTTP-level CAPI mocking (no internal interface mocking)
- Fixtures derived from swagger response schemas
- Four test layers: unit → component → integration → E2E
- E2E requires live CAPI credentials; run manually, not in CI

**Consequences:**
- Tests are written before implementation code
- Each phase gate is: "all tests pass"
- Test plan is a reviewable artifact alongside the implementation spec
- Higher upfront effort, but each phase ships with verified quality
