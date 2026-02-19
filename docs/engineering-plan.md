# Engineering Plan: Cross-Cutting Concerns

---

## 1. Testing

### Strategy

Four test layers, mirroring the architecture:

```
┌─────────────────────────────────────────┐
│  E2E: AI agent → MCP server → CAPI     │  Few, slow, high confidence
├─────────────────────────────────────────┤
│  Integration: MCP protocol conformance  │  Medium count
├─────────────────────────────────────────┤
│  Component: Composite tools, auth, etc. │  Many, mocked CAPI
├─────────────────────────────────────────┤
│  Unit: Codegen, formatters, classifiers │  Many, fast, no I/O
└─────────────────────────────────────────┘
```

### Unit Tests

**Codegen pipeline:**
- Given a swagger spec fragment, does the codegen produce correct MCP tool definitions?
- Are parameters correctly typed (string, number, boolean, enum)?
- Are required vs. optional parameters handled?
- Are tool names derived correctly from operationId / path?
- Are safety tiers assigned correctly by HTTP method?
- Are manual tier overrides applied (e.g., `install_copy` → Tier 3)?

**Safety classifier:**
- Given a tool name and tier, does the classifier return the right behavior?
- Do tier overrides take precedence over defaults?

**Response formatters:**
- Do CAPI responses get transformed correctly for MCP tool results?
- Are error responses mapped to helpful messages?

**Knowledge resources:**
- Do resource URI patterns resolve to the right files?
- Do unknown URIs return available options (graceful degradation)?

### Component Tests (Mocked CAPI)

**Auth service:**
- OAuth path: mock `wpeOAuth.getAccessToken()` → verify Bearer header
- Env var path: set env vars → verify Basic Auth header
- No auth: neither available → verify clear error message
- Token refresh: expired token → verify refresh attempt → verify retry
- Fallback sequence: OAuth fails → env var attempted → both fail → error

**Composite tools (mocked HTTP responses):**
- `wpe_account_domains`: mock install list + domain responses → verify aggregation
- `wpe_account_backups`: mock installs with/without backups → verify gap detection
- `wpe_account_ssl_status`: mock certs with varying expiry → verify flagging
- Fan-out pagination: mock paginated install list → verify all pages fetched
- Rate limiting: mock 429 response → verify backoff and retry
- Partial failure: some installs return errors → verify graceful degradation
- Large account: mock 100+ installs → verify concurrency limits respected

**Audit logger:**
- Tier 1 call → logged with no confirmation
- Tier 3 call → logged with confirmation status
- Log entries contain required fields (timestamp, tool, tier, params, result)

**Confirmation flow:**
- Tier 3 tool without confirmation → returns confirmation prompt
- Tier 3 tool with confirmation → executes and logs

### Integration Tests

**MCP protocol conformance:**
- Server responds to `initialize` with capabilities
- Server lists all tools via `tools/list`
- Server lists all resources via `resources/list`
- Tool calls return valid MCP response format
- Resource reads return valid content
- Error responses follow MCP error format
- Both stdio and HTTP/SSE transports work

**Transport tests:**
- stdio: spawn server process → send MCP messages via stdin → verify stdout
- HTTP/SSE: start server → HTTP POST to /mcp → verify response
- Auth on HTTP: request without token → 401; request with valid token → 200

### E2E Tests

**Against live CAPI (requires test account credentials):**
- Authenticate → get_accounts → get_sites → get_installs → verify chain
- Create backup → poll status → verify completion
- Full composite tool: `wpe_account_overview` returns coherent data

**Against Local (requires Local running):**
- Addon loads in Local
- OAuth flow completes
- MCP server starts and responds
- stdio transport works from Claude Desktop config

### Test Infrastructure

- **Framework:** Vitest (TypeScript-native, fast, good mocking)
- **CAPI mocking:** MSW (Mock Service Worker) for HTTP-level mocks
- **MCP protocol testing:** Direct MCP client library or raw JSON-RPC calls
- **Fixtures:** Vendored CAPI response samples (anonymized)
- **CI:** Run unit + component + integration on every PR; E2E on manual trigger
- **Test account:** Dedicated WP Engine test account for E2E (credentials in CI secrets)

---

## 2. Security

### Threat Model

**Assets:**
- WP Engine account credentials (OAuth tokens, API keys)
- Customer infrastructure (sites, installs, domains)
- Audit logs (contain operation history)

**Threat actors:**
- Malicious MCP client (rogue AI tool connecting to the server)
- Credential leakage (tokens in logs, responses, or error messages)
- Prompt injection (AI agent tricked into destructive operations)

### Controls

**Credential handling:**
- OAuth tokens: held in memory only, never logged, never included in MCP responses
- Env var credentials: read once at startup, never echoed back
- No credentials in error messages — mask to `***` if accidentally included
- Auth headers constructed at the HTTP client layer, not passed through tool code

**Transport security:**
- HTTP/SSE: localhost only (IP whitelist: 127.0.0.1, ::1, ::ffff:127.0.0.1)
- HTTP/SSE: token-based auth required (random token generated per session)
- stdio: inherently local (process-to-process)
- No TLS needed for localhost; rely on OS-level process isolation

**Input validation:**
- All tool parameters validated before forwarding to CAPI
- Path parameters: validate format (UUIDs, alphanumeric IDs)
- String parameters: length limits, no injection characters
- Enum parameters: validate against allowed values from swagger spec
- Reject unexpected parameters

**Output sanitization:**
- CAPI responses may contain sensitive data (SFTP credentials, SSH keys)
- Strip or redact sensitive fields before returning to MCP client
- Define a redaction list: `sftp_password`, `ssh_private_key`, etc.

**Audit logging:**
- All Tier 2 and Tier 3 operations logged
- Log file permissions: 0o600 (owner read/write only)
- Logs do NOT contain credentials, tokens, or full request/response bodies
- Logs contain: timestamp, tool name, tier, parameter names (not values for sensitive params), result status

**Rate limiting:**
- Respect CAPI rate limits (429 responses)
- Implement client-side rate limiting for fan-out operations
- Cap concurrent CAPI requests (e.g., max 5 parallel requests)
- Prevent amplification: one MCP tool call should not trigger unbounded API calls

**Dependency security:**
- Minimal dependencies — prefer Node.js built-ins
- `npm audit` in CI pipeline
- Lock file committed and reviewed
- No runtime code evaluation

### Security Testing

- Credential leak scan: grep tool responses and logs for token patterns
- Input fuzzing: malformed parameters to all tools
- Auth bypass: call tools without auth configured → verify clean error
- Transport auth: HTTP requests without bearer token → verify rejection

---

## 3. Performance

### Key Scenarios

**Single tool call (1:1 API):**
- Target: < 2s including CAPI round-trip
- Bottleneck: network latency to CAPI
- Optimization: minimal processing overhead; pass-through with formatting

**Composite tool — small account (5-10 installs):**
- Target: < 5s
- Pattern: parallel fan-out with concurrency limit
- Example: `wpe_account_domains` with 10 installs → 10 domain requests → aggregate

**Composite tool — large account (100+ installs):**
- Target: < 30s with progress reporting
- Pattern: parallel fan-out with concurrency limit of 5-10
- Pagination: auto-paginate install list, then fan out per install
- Progress: report intermediate results to MCP client

**Server startup:**
- Target: < 1s (no network calls at startup)
- Pre-compiled codegen output (no runtime swagger parsing)
- Lazy initialization of CAPI client (connect on first call)

### Concurrency Model

```
Composite tool call
    │
    ├── Fetch install list (paginated, sequential pages)
    │   Page 1 → Page 2 → ... → Page N
    │
    └── Fan out per install (parallel, bounded)
        ┌──────────────────────────────────┐
        │  Semaphore: max 5 concurrent     │
        │  Install 1 → fetch domains       │
        │  Install 2 → fetch domains       │
        │  Install 3 → fetch domains       │
        │  Install 4 → fetch domains       │
        │  Install 5 → fetch domains       │
        │  ... (queued until slot opens)    │
        └──────────────────────────────────┘
        │
        └── Aggregate results
```

### Caching

**What to cache:**
- Account details: rarely change, cache for session duration
- Site/install lists: cache for 60s (may change during session but not frequently)
- Usage data: cache per date range for session duration
- Knowledge resources: loaded once from disk, held in memory

**What NOT to cache:**
- Domain status: may change during DNS propagation
- Backup status: changes as backup completes
- SSL certificate status: changes during provisioning
- Any mutation result

**Cache invalidation:**
- After any mutation tool call, invalidate related cached entities
- Example: `wpe_create_install` → invalidate site's install list cache
- Session end → all caches cleared

### Response Size Management

- CAPI responses can be large for accounts with many installs
- Composite tools should summarize, not dump raw data
- Provide counts and highlights; offer detail on request
- Example: `wpe_account_domains` returns summary (50 domains across 12 installs, 3 without SSL) with full list available via follow-up

---

## 4. Maintainability

### Code Organization

```
src/
├── main/
│   ├── index.ts                    # Addon entry point (Local lifecycle)
│   ├── mcp/
│   │   ├── server.ts               # MCP server setup (transport, auth)
│   │   ├── tools/
│   │   │   ├── generated/          # Auto-generated 1:1 tools (DO NOT EDIT)
│   │   │   │   ├── accounts.ts
│   │   │   │   ├── sites.ts
│   │   │   │   ├── installs.ts
│   │   │   │   ├── domains.ts
│   │   │   │   └── ...
│   │   │   └── composite/          # Hand-written composite tools
│   │   │       ├── account-overview.ts
│   │   │       ├── account-domains.ts
│   │   │       ├── diagnose-site.ts
│   │   │       └── ...
│   │   ├── resources/
│   │   │   ├── entity-browser.ts   # Live data resources (wpengine://accounts, etc.)
│   │   │   └── knowledge.ts        # Static content resources (wpengine://guide/*)
│   │   ├── auth.ts                 # OAuth + env var auth
│   │   ├── safety.ts               # Tier classification + confirmation logic
│   │   ├── audit.ts                # Structured audit logging
│   │   └── capi-client.ts          # HTTP client for WP Engine API
│   └── ipc/                        # Local addon IPC handlers (if needed)
│
├── common/
│   ├── types.ts                    # Shared type definitions
│   └── constants.ts                # Config values, tier mappings
│
├── renderer/                       # Minimal — MCP server is headless
│   └── index.tsx                   # Status indicator in Local UI (optional)
│
├── content/                        # Knowledge layer content
│   ├── domain-model.md
│   ├── safety.md
│   ├── troubleshooting.md
│   └── workflows/
│       ├── new-environment.md
│       ├── go-live.md
│       ├── staging-refresh.md
│       ├── domain-migration.md
│       └── disaster-recovery.md
│
└── codegen/                        # Build-time code generation
    ├── generate.ts                 # Swagger → MCP tool definitions
    ├── drift-check.ts              # Compare vendored vs. live swagger
    └── templates/                  # Code templates for generation
        └── tool-template.ts.ejs
```

### Generated vs. Hand-Written Boundary

Clear separation is critical for maintainability:

- `src/main/mcp/tools/generated/` — **never edited by hand.** Regenerated from swagger.
  - Each file has a header: `// AUTO-GENERATED FROM swagger.json — DO NOT EDIT`
  - Git diff on these files shows exactly what changed in the API
- `src/main/mcp/tools/composite/` — **always edited by hand.** Contains workflow logic.
- `src/codegen/` — the generation pipeline itself. Rarely changes.

### Swagger Drift Detection

**CI job (weekly or on-demand):**
```
1. Fetch https://api.wpengineapi.com/v1/swagger
2. Diff against data/swagger.json
3. If different:
   a. Commit updated swagger.json
   b. Run codegen
   c. Commit generated tool changes
   d. Open PR with diff summary
   e. PR description lists: added endpoints, removed endpoints, changed parameters
```

**Human review required for:**
- Removed endpoints (may break composite tools that depend on them)
- Changed parameters (may need composite tool updates)
- New endpoints (may need safety tier overrides)

### Documentation as Code

- ADRs (decisions.md) updated when architectural decisions change
- Requirements (requirements.md) updated when scope changes
- Knowledge content (src/content/*.md) versioned alongside code
- API surface (api-surface.md) auto-updated by codegen pipeline

### Dependency Management

- Minimal external dependencies
- MCP SDK: `@modelcontextprotocol/sdk` (core dependency)
- Local SDK: `@getflywheel/local` (addon integration)
- Dev dependencies: Vitest, MSW, TypeScript, codegen tooling
- No utility libraries (lodash, etc.) — use native TypeScript
- Dependabot or Renovate for automated updates

---

## 5. Deployment

### Distribution Model

**Primary: Local Addon**
- Packaged as `.tgz` via `npm pack`
- Installed via Local's addon manager
- Local manages lifecycle (start/stop with Local app)

**Secondary: Standalone (future consideration)**
- Run outside Local using env var auth
- `npx @wpengine/capi-mcp-server` or similar
- stdio transport only (no Local IPC needed)
- Enables CI/pipeline usage

### Local Addon Packaging

```
package.json:
  name: "@local-labs/local-addon-wpe-capi-mcp"
  local:
    minVersion: "9.0.0"    # Minimum Local version (needs wpeOAuth)
  permissions:
    services: ["wpeOAuth"]
    network: ["api.wpengineapi.com"]
```

### Version Compatibility

| Concern | Approach |
|---|---|
| Local version | Declare `minVersion` in package.json. Require version that ships `wpeOAuth`. |
| CAPI version | Vendored swagger pins the API version. Drift detection catches changes. |
| MCP protocol | Pin MCP SDK version. Follow MCP spec versioning. |
| Node.js | Target Node 18+ (matches Local's Electron runtime). |

### Release Process

```
1. Run codegen (if swagger updated)
2. Run full test suite (unit + component + integration)
3. Run security audit (npm audit, credential leak scan)
4. Bump version (semver: major for breaking, minor for new tools, patch for fixes)
5. Build addon package (TypeScript compile + npm pack)
6. Test in Local (manual: install addon, verify MCP server starts, run sample tools)
7. Tag release in git
8. Publish to Local addon distribution channel
```

### Versioning Strategy

- **Major:** Breaking changes to MCP tool interface (renamed tools, removed parameters)
- **Minor:** New tools (from swagger updates), new composite tools, new knowledge content
- **Patch:** Bug fixes, knowledge content updates, dependency updates

### Configuration

```json
// MCP connection info (written by addon, read by AI clients)
// Location: ~/Library/Application Support/Local/wpe-capi-mcp-connection-info.json
{
  "url": "http://127.0.0.1:{port}/mcp",
  "authToken": "Bearer {random-token}",
  "stdio": {
    "command": "node",
    "args": ["/path/to/addon/bin/mcp-stdio.js"]
  }
}
```

### Monitoring & Observability

- Addon logs visible in Local's addon log viewer
- MCP server health check: `get_status` tool doubles as server health indicator
- Audit log: persistent file for operation history
- Error reporting: surface CAPI errors clearly in tool responses

---

## 6. User Documentation

### Audience

Two user types:

1. **End users** — people who install the addon in Local and connect their AI tool
2. **AI agents** — the actual consumers of the MCP tools (documentation embedded in the server via knowledge layer)

Human-facing documentation covers setup and configuration. AI-facing documentation is the knowledge layer (INSTRUCTIONS, resources, tool descriptions).

### Documentation Structure

```
docs/
├── user-guide/
│   ├── getting-started.md      # Install addon → authenticate → configure AI tool
│   ├── claude-desktop-setup.md # Claude Desktop configuration
│   ├── claude-code-setup.md    # Claude Code configuration
│   ├── standalone-setup.md     # Using without Local (env var auth)
│   └── troubleshooting.md      # Common issues and fixes
│
├── reference/
│   ├── tools.md                # All available tools with descriptions
│   ├── resources.md            # All available resources with URI patterns
│   ├── safety-tiers.md         # What each tier means for users
│   └── composite-tools.md      # Higher-level tools with examples
│
├── internal/                   # Project documentation (already created)
│   ├── requirements.md
│   ├── decisions.md
│   ├── api-surface.md
│   ├── knowledge-architecture.md
│   └── engineering-plan.md
│
└── contributing/
    ├── codegen.md              # How to update swagger and regenerate tools
    ├── adding-composite-tools.md   # How to write a new composite tool
    └── adding-knowledge.md     # How to write workflow guides and knowledge content
```

### Getting Started Guide (outline)

```markdown
# Getting Started

## Prerequisites
- Local (by Flywheel) 9.0+ installed
- WP Engine account with API access
- An AI tool that supports MCP (Claude Desktop, Claude Code, etc.)

## Step 1: Install the Addon
[Install via Local addon manager or manual .tgz install]

## Step 2: Authenticate
Option A (recommended): Click "Connect to WP Engine" in Local
  → Browser-based OAuth flow
  → Returns to Local authenticated

Option B (advanced): Set environment variables
  export WP_ENGINE_API_USERNAME=your-username
  export WP_ENGINE_API_PASSWORD=your-password

## Step 3: Configure Your AI Tool

### Claude Desktop
Add to claude_desktop_config.json:
{
  "mcpServers": {
    "wpengine": {
      "command": "node",
      "args": ["/path/to/addon/bin/mcp-stdio.js"]
    }
  }
}

### Claude Code
[Configuration instructions]

## Step 4: Verify
Ask your AI tool: "List my WP Engine accounts"
→ Should return your account information

## Troubleshooting
- "Authentication failed" → Re-authenticate in Local or check env vars
- "Server not found" → Ensure Local is running and addon is enabled
- "Rate limited" → Wait and retry; composite tools auto-retry
```

### Tool Reference (auto-generated)

The tool reference doc should be auto-generated from the same swagger + codegen pipeline:

```markdown
# Tool Reference

## Account Management

### get_accounts
List all WP Engine accounts you have access to.
- **Safety tier:** 1 (read)
- **Parameters:** none
- **Returns:** Array of accounts with id, name, plan details

### get_account
Get details for a specific account.
- **Safety tier:** 1 (read)
- **Parameters:**
  - `account_id` (required, string) — The account ID
- **Returns:** Account details including limits and plan info

...
```

### Changelog

Maintain a CHANGELOG.md following Keep a Changelog format:
- New tools (from swagger updates or new composites)
- Knowledge content additions
- Bug fixes
- Breaking changes

---

## Open Items

| Item | Status | Notes |
|---|---|---|
| Test account for E2E | Needed | Dedicated WP Engine account with test data |
| CAPI rate limits | Unknown | Need to determine actual limits (requests/minute) |
| Local addon marketplace | Unknown | Distribution channel for addon |
| Standalone packaging | Deferred | Future: run without Local |
| Renderer UI | Undecided | Minimal status indicator in Local, or fully headless? |
| MCP Prompts | Undecided | Pre-built prompt templates (e.g., "diagnose my site") as MCP prompt objects vs. workflow guides |
