# Roadmap

## Current State

**v0.1.0** — Feature-complete initial release.

- 60 tools (50 generated from CAPI swagger + 10 composite)
- 254 tests across unit, component, and integration layers
- 11 summarizers for large-response tools
- 6 MCP prompts for guided workflows
- 8 knowledge resources (guides + workflows)
- Dual transport (stdio + HTTP/SSE)
- 3-tier safety system with confirmation tokens
- Structured audit logging
- Local addon with OAuth + standalone with env var auth
- Drift detection for API changes

## Strategic Themes

Five themes guide the roadmap. Each represents a context dimension that determines what AI agents can reason about and act on.

### 1. Infrastructure Intelligence → Application Intelligence

The MCP today sees the container but not what's inside it. It knows an install exists, its PHP version, its bandwidth — but not what plugins are installed, whether WordPress is current, or what the error rate looks like. Every interesting workflow (security audit, migration, performance optimization) hits a wall at "we can't see inside the install."

Closing this gap means the agent shifts from "your install uses 4GB of storage" to "that's because you have 47 unused plugins and 2GB of orphaned media."

### 2. Reactive Queries → Proactive Fleet Management

Today all context is pull-based: the agent answers questions the user thinks to ask. The high-value shift is toward surfacing things the user *should* know — expiring SSL, installs approaching plan limits, PHP version mismatches between staging and production, environments without recent backups. The agent becomes an advisor, not just a query engine.

### 3. Single Operations → Orchestrated Workflows

Individual tools are building blocks. Value compounds when they're chained into workflows that encode institutional knowledge — "this is how we promote staging to production," "this is how we launch a site," "this is how we onboard a new client." The design question is where the line sits between prompt-guided workflows (agent follows instructions across multiple tool calls) and composite tools (server executes a multi-step operation atomically).

### 4. Single-Install Focus → Portfolio-Scale Operations

The CAPI is designed around individual resources. Agencies think in portfolios — "all my client sites," "every production install," "which sites need attention." The portfolio composites in v0.1.0 are early versions of this. The theme extends to: bulk provisioning, fleet-wide updates, cross-site security audits, and aggregate usage reporting for client billing.

### 5. Hosting MCP → WordPress Platform MCP

The long-horizon play. WordPress Core is building its own MCP surface (Abilities API + MCP Adapter). Every host will be able to offer infrastructure MCP. The differentiation is bridging infrastructure and application — managing the hosting *and* the WordPress in one conversation. WP Engine's unique position is ACF: structured content operations that no other host can offer because no other host owns a comparable plugin ecosystem.

## Competitive Landscape

| Host | API Maturity | MCP Story | Unique Angle |
|------|-------------|-----------|-------------|
| **Kinsta** | Most aggressive expansion. WP-CLI via API, plugin/theme management, log access, DNS CRUD, analytics, file browsing. | Community `kinsta-mcp` npm package. | Deepest per-install context (plugins, logs, analytics). |
| **WordPress.com** | Broad REST API across sites, content, stats. | Official Claude Connector with OAuth 2.1. MCP-first architecture. First host to ship MCP. | Cross-product MCP (WordPress.com, Pressable, Tumblr). Platform layer via Abilities API. |
| **WordPress VIP** | REST + GraphQL + MCP. Parse.ly integration. | AI content intelligence. Streaming data firehose. | Enterprise AI positioning. Content analytics. |
| **Pressable** | REST API for hosting ops. Webhook support. Data sync. | No dedicated MCP. | Event-driven automation via webhooks. |
| **WP Engine** | Full CAPI coverage for infrastructure. No application-layer endpoints. | This project. 60 tools, composite workflows, knowledge layer. | Strongest portfolio/fleet breadth. ACF ecosystem (untapped). |

**Key gap vs. Kinsta:** Per-install application context — plugins, logs, analytics. Kinsta's agent can reason about what's *running* on the install, ours can only reason about the install itself.

**Key advantage vs. all:** Portfolio-scale operations. No competitor offers cross-account fleet aggregation. ACF content operations are a unique differentiator if application-layer access is added.

## Phase 1: Fleet Intelligence (Current CAPI)

Build composite tools on existing endpoints. No CAPI changes needed.

### Fleet Health Report (`wpe_fleet_health`)

Orchestrates `portfolio_overview`, `portfolio_usage`, `account_ssl_status`, and `account_domains` into a scored, prioritized assessment.

**Output:** Ranked action list — SSL expiring in <30 days, installs at >80% of plan limits, PHP version mismatches between staging and production environments, domain configuration issues.

**Value:** Weekly agency health check in one command instead of clicking through dozens of dashboards.

### Account Capacity Planner (`wpe_capacity_planner`)

Compares usage metrics against account limits to compute headroom.

**Output:** Per-metric headroom percentages, installs consuming disproportionate resources, trend analysis (are you growing into your limits?), plan optimization suggestions.

**Value:** Ops/finance teams making hosting budget decisions.

### Workflow Prompt Templates

- **promote-to-production** — Environment diff → create backup → poll backup status → copy install → purge cache → verify. Guided as a prompt template because the backup polling step requires the agent to wait and retry.
- **provision-sites** — Bulk site creation for agencies onboarding multiple clients. Prompt-guided because async provisioning means the agent polls each install until active before proceeding to domains and SSL.

## Phase 2: Close Competitive Gaps (CAPI Enhancements)

Ranked by impact on agent context depth. These are requests to the CAPI team, not MCP implementation items.

### Backup Listing (High Impact, Low Effort)

`GET /installs/{id}/backups` — list backups for an install.

**What it unlocks:** Re-enables backup auditing in `diagnose_site`, `prepare_go_live`, and fleet health. Unblocks the "does every production install have a recent backup?" question that is currently unanswerable. Also enables reliable promotion pipelines (create backup → poll list until complete → proceed).

### Log Access (High Impact)

`GET /installs/{id}/logs?type={error|access}&lines={n}&since={duration}`

**What it unlocks:**
- Post-deployment verification: promote staging → check error logs for new fatals → alert if count increased
- Performance debugging: correlate error spikes with usage metrics
- Security incident response: access log analysis for attack patterns
- Proactive monitoring: scheduled log checks that surface new error patterns

### Plugin/Theme Inventory (High Impact)

`GET /installs/{id}/plugins` — list with version, update status, active/inactive. Same pattern for themes. Optionally `GET /accounts/{id}/plugins` for fleet-wide aggregation.

**What it unlocks:**
- Fleet-wide plugin audit: "which of my 47 sites still run WooCommerce 7.x?"
- Vulnerability scanning: cross-reference installed plugins against advisory databases
- License compliance: identify premium plugins across fleet
- Update planning: which sites are affected by a specific plugin update?

### WP-CLI via CAPI (Highest Impact, Highest Effort)

`POST /installs/{id}/wp-cli` — execute whitelisted WP-CLI commands, return output. Async operation model with status polling.

**What it unlocks:** Everything in Theme 1. The agent gains full application-layer context: content operations, configuration management, database operations, user management, search-replace. This is the single most important CAPI enhancement because it transforms the MCP from an infrastructure dashboard into a WordPress management platform.

Priority commands: `wp plugin list`, `wp theme list`, `wp option get`, `wp search-replace`, `wp user list`.

**Security consideration:** Command whitelisting, not arbitrary execution. Read-only commands at Tier 1, mutations at Tier 2/3 with the existing safety system.

### Webhooks / Events (Medium Impact)

`POST /webhooks` — subscribe to events (backup_completed, install_provisioned, ssl_expiring, usage_threshold).

**What it unlocks:** Theme 2 — proactive context. The agent learns about state changes without polling. Enables event-driven automation: auto-create backup when usage spikes, notify when SSL expires, confirm when provisioning completes.

### Enhanced Analytics (Medium Impact)

Expand `GET /installs/{id}/usage` to include: response time percentiles, error rates (4xx/5xx), cache hit ratio, CDN vs. origin bandwidth.

**What it unlocks:** Performance regression detection (before/after deployment), SLA monitoring, optimization recommendations.

## Phase 3: Platform Differentiation

These are opportunities to leapfrog competitors rather than catch up. They depend on Phase 2 CAPI enhancements and WordPress ecosystem developments.

### Unified Hosting + WordPress MCP

Bridge the infrastructure MCP (this project) with WordPress Core's Abilities API (shipping in Core 6.9). The WPE MCP discovers and proxies site-level Abilities through the hosting layer.

**What this looks like:**

> "Update the ACF field group on production to add a featured_video field, then push staging to production and verify the field is live."

One conversation. Infrastructure and application operations unified.

**Depends on:** WordPress 6.9 shipping Abilities API + MCP Adapter. CAPI adding a secure proxy endpoint to install-level MCP/REST.

### ACF Content Operations

The differentiator only WP Engine can offer. ACF registers structured content Abilities that no other plugin ecosystem matches.

- Content modeling: "Create a field group for real estate listings with address, price, bedrooms, photos"
- Structured content migration: move ACF data between installs preserving field relationships
- Content schema audit: field usage analysis, unused field detection, optimization suggestions
- AI content generation: "Generate 10 property listings using the real_estate field group"

**Depends on:** WP-CLI via CAPI (for ACF CLI) or WordPress MCP bridge (for ACF Abilities).

### Intelligent Migration

AI-assisted site migration workflow:

1. Analyze source site: plugins, themes, content volume, custom post types, ACF fields
2. Provision target environment on WPE
3. Generate migration plan with compatibility analysis
4. Execute migration (database + files via copy_install)
5. Search-replace for domain changes
6. Verify content integrity
7. Configure DNS and SSL
8. Generate before/after comparison report

**Depends on:** WP-CLI, enhanced analytics, log access.

### Security Posture Management

Proactive security across the fleet:

- Plugin vulnerability scanning against advisory databases
- SSL monitoring and renewal verification
- User access audit (admin accounts, inactive users, overly broad roles)
- WordPress Core version compliance
- Post-incident log analysis

**Depends on:** Plugin inventory, log access, WP-CLI for user enumeration.

## Architectural Foundations

Three architectural investments underpin the phased plan. These are not features — they are infrastructure that makes features possible.

### Multi-API Adapter Architecture

The MCP server today is a single-API client: every tool handler gets a `CapiClient` bound to `api.wpengineapi.com`. To integrate additional APIs (WP REST API on hosted installs, NitroPack, WPE Headless, future WPE product APIs), the server needs an adapter layer.

**What varies per API:**

| Concern | CAPI | WP REST API | NitroPack | WPE Headless |
|---------|------|-------------|-----------|-------------|
| Base URL | `api.wpengineapi.com/v1` | `{install_domain}/wp-json/wp/v2` | `api.nitropack.io/v1` | TBD |
| Auth | Basic / OAuth Bearer | Application Passwords / JWT | API key header | Likely OAuth |
| Discovery | Static (one base URL) | Per-install (need the domain) | Per-site (need site ID) | TBD |
| Pagination | Offset + `next` links | `X-WP-TotalPages` header | Varies | TBD |
| Schema | Vendored swagger, codegen | Discoverable at `/wp-json`, varies per install | Fixed | TBD |

**Key insight: CAPI is the discovery layer.** You use CAPI to find installs, then use the install's domain to call its WP REST API. The relationship is hierarchical — CAPI tells you *where* things are, other APIs tell you *what's on* them.

**Design direction:** An API registry that manages multiple adapter instances. Each adapter handles its own auth, pagination, base URL resolution, and error formatting. Tool handlers declare which adapter(s) they need. Composite tools that span APIs (e.g., "diagnose site" fetching infrastructure from CAPI + plugins from WP REST API) receive a registry, not a single client.

The WP REST API adapter is special: it's parameterized per-install. A `getClientForInstall(installId)` call looks up the install's domain via CAPI and constructs a client targeting that specific site. Auth is the hardest problem — CAPI credentials don't grant WP REST API access. Options range from per-install application passwords (doesn't scale) to a CAPI-mediated proxy (cleanest UX, requires CAPI work) to a mu-plugin JWT bridge.

**Starting point:** NitroPack is the simplest second adapter — one API key, one base URL, fixed schema. It can prove the pattern before tackling the per-install complexity of WP REST API.

### Startup Reconciliation (Events Without Infrastructure)

The MCP server is a **local process on the user's machine**. In stdio mode, it's a child process spawned by the AI client — it lives only for the duration of the session and dies when the conversation ends. In HTTP mode, it's a localhost-bound process the user starts manually. It is not a cloud service. It is not a daemon. It has no persistent lifecycle.

This rules out traditional event architectures:
- **Webhooks** can't reach a local process (no public endpoint, no persistent listener)
- **Server-side polling** doesn't work because there's no server running between sessions
- **Background processes** would be a fundamentally different thing from the MCP server itself

**Design direction: startup reconciliation.** Instead of receiving events in real time, the server catches up when it starts:

```
Server starts
  │
  ▼
Read cached snapshot from disk (if exists)
  │
  ▼
Build fresh snapshot from live CAPI
  │
  ▼
Diff: what changed since last session?
  │
  ▼
Surface changes as initial context to the agent
  │
  ▼
Write updated snapshot to disk
```

The "since your last session" delta provides the proactive context from Theme 2 without any event infrastructure. It's just a diff. Examples:

- "Since your last session: 2 SSL certificates expired, install xyz was provisioned, account storage increased 12%"
- "Warning: install abc123 is now at 94% of visit allocation (was 78% last session)"

This is honest architecture — it doesn't pretend to be always-on. It says: "I'll catch you up when you reconnect."

**Future evolution:** If the CAPI adds webhook support, a small cloud-hosted relay service could receive webhooks and queue events. The MCP server reads the queue at startup in addition to diffing snapshots. The startup reconciliation pattern remains the same — only the data sources expand.

### Persistent Context Cache

The server is currently stateless — every tool call hits the CAPI fresh. This has three costs:

1. **Latency** — portfolio fan-out makes dozens of sequential API calls. A cached account structure would make subsequent queries faster.
2. **Rate limits** — fan-out across many accounts risks 429s. Caching reduces API calls.
3. **Context loss** — the agent re-discovers the user's infrastructure every session. It doesn't "remember" that you have 3 accounts, 47 installs, and 2 expiring SSL certs.

**Design direction: on-disk context snapshot** served as an MCP resource.

The snapshot is not raw API responses cached to disk. It's a distilled model of the user's infrastructure, purpose-built for agent context:

```json
{
  "snapshot_at": "2026-02-21T10:00:00Z",
  "accounts": [
    {
      "id": "abc",
      "name": "Agency Account",
      "sites": 12,
      "installs": 28,
      "ssl_issues": 2,
      "limit_headroom": { "visits": "62%", "storage": "34%" }
    }
  ],
  "alerts": [
    "SSL expiring in 7 days on install xyz (example.com)",
    "Install def is at 91% of visit allocation"
  ]
}
```

Exposed as `wpengine://snapshot`, the agent reads it at session start and immediately has ambient context — the lay of the land without making 20 tool calls.

**Cache tiers:**

| Data | Staleness tolerance | Invalidation |
|------|-------------------|-------------|
| Account list, site/install structure | Hours | Create/delete operations |
| Install details (PHP, WP version, status) | Minutes | Update operations |
| Domain/SSL configuration | Minutes | Domain/cert operations |
| Usage metrics | Daily (data is 24-48h delayed) | Not within a session |
| Snapshot summary | Hours | Rebuild on startup via reconciliation |

**Security:** Cached data contains customer infrastructure details. Snapshot file written with `0o600` permissions (owner-only), same as the audit log. Location: `~/.wpe-mcp/snapshot.json` (or platform-appropriate equivalent).

**Write-through invalidation:** When the agent creates a domain, the server invalidates the domain cache for that install and marks the snapshot as stale. Next startup rebuilds it.

**How these three connect:**

```
Multiple APIs ──adapters──► Cache ──snapshot/resources──► Agent Context
                              ▲
Startup reconciliation ──────┘  (diff against last snapshot)
```

The adapter architecture determines *what data sources exist*. The cache aggregates data from all of them into a unified model. Startup reconciliation detects changes across sessions. The agent gets a coherent, current view of the user's infrastructure regardless of which API the data came from.

## API Evolution

The server tracks the CAPI swagger spec through:

1. **Vendored spec** — `data/swagger.json` is checked into the repo
2. **Drift detection** — `npm run drift-check` compares the vendored spec against the live API
3. **Codegen** — `npm run codegen` regenerates tools from the spec

When the CAPI adds new endpoints, updating coverage is: fetch new spec → codegen → add safety overrides if needed → add summarizers if needed → test. The codegen pipeline means new CAPI endpoints become MCP tools with minimal effort.

## Known CAPI Constraints

These are limitations of the current CAPI that bound what the MCP can offer:

| Constraint | Impact | Workaround |
|-----------|--------|------------|
| No backup listing | Can't audit backup recency | Poll individual backup IDs (requires knowing them) |
| No log access | Can't debug errors or verify deployments | None |
| No plugin/theme inventory | Can't audit what's installed | None |
| No WP-CLI | Can't manage WordPress itself | None |
| No webhooks | Must poll for async completion | Poll `GET /installs/{id}` for status changes |
| No billing/plan info | Can't recommend plan changes with data | Reference limits only |
| Async provisioning | Can't chain operations after create | Prompt templates guide agent through polling |
