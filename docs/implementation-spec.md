# Implementation Spec

Detailed, phase-by-phase build plan. Each phase produces a working, testable artifact.
Tests are written BEFORE implementation (TDD). A phase is done when its gate criteria are met.

See `docs/test-plan.md` for the full test descriptions referenced here.

---

## Phase 1: Foundation

**Goal:** A standalone MCP server that can call the WP Engine Customer API via stdio transport.

**Depends on:** Nothing.

### 1.1 — Project Scaffolding

**Deliverables:**
- `package.json` with dependencies and scripts
- `tsconfig.json` with strict mode
- `vitest.config.ts`
- Directory structure per CLAUDE.md

**Dependencies:**
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "node-fetch": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vitest": "^2.x",
    "msw": "^2.x",
    "@types/node": "^18.x"
  }
}
```

**Notes:**
- Use native `fetch` if Node 18+ (check if MCP SDK requires specific HTTP client)
- ESM modules throughout
- `"type": "module"` in package.json

### 1.2 — Vendor Swagger Spec

**Deliverables:**
- `data/swagger.json` — fetched from `https://api.wpengineapi.com/v1/swagger`
- Script in `package.json`: `"fetch-swagger": "curl -s https://api.wpengineapi.com/v1/swagger > data/swagger.json"`

### 1.3 — Auth Provider

**File:** `src/auth.ts`

```typescript
export interface AuthProvider {
  getAuthHeader(): Promise<string | null>;
  getAuthMethod(): string; // 'oauth' | 'basic' | 'none'
}

export interface AuthConfig {
  // For Local addon integration (Phase 6)
  oauthProvider?: {
    getAccessToken(): Promise<string | undefined>;
  };
}

export function createAuthProvider(config?: AuthConfig): AuthProvider;
```

**Behavior:**
1. If `config.oauthProvider` exists, try `getAccessToken()` → `Bearer {token}`
2. If env vars `WP_ENGINE_API_USERNAME` + `WP_ENGINE_API_PASSWORD` exist → `Basic {base64}`
3. Neither → return `null`

**Phase 1 scope:** Env var path only. OAuth path wired in Phase 6.

### 1.4 — CAPI HTTP Client

**File:** `src/capi-client.ts`

```typescript
export interface CapiClientConfig {
  baseUrl?: string;        // default: https://api.wpengineapi.com/v1
  authProvider: AuthProvider;
  maxConcurrency?: number; // default: 5
  retryOn429?: boolean;    // default: true
}

export interface CapiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: {
    code: number;
    message: string;
    details?: unknown;
  };
}

export class CapiClient {
  constructor(config: CapiClientConfig);

  get<T>(path: string, params?: Record<string, string>): Promise<CapiResponse<T>>;
  post<T>(path: string, body?: unknown): Promise<CapiResponse<T>>;
  patch<T>(path: string, body?: unknown): Promise<CapiResponse<T>>;
  delete<T>(path: string): Promise<CapiResponse<T>>;

  // Auto-paginating list — follows CAPI pagination model
  getAll<T>(path: string, params?: Record<string, string>): Promise<CapiResponse<T[]>>;
}
```

**CAPI Pagination Model** (per https://wpengineapi.com/tutorial#3-handle-pagination):
- Offset-based: `limit` (max 100) and `offset` query parameters
- Response shape: `{ count: number, results: T[], next: string|null, previous: string|null }`
- `next` is a full URL (e.g., `https://api.wpengineapi.com/v1/installs?limit=100&offset=100`)
- `next: null` means last page
- `getAll` fetches with `limit=100`, follows `next` URLs until null

**Behavior:**
- All methods attach auth header from AuthProvider
- `getAll` handles pagination: fetches with limit=100, follows `next` URLs until null
- 429 responses: exponential backoff with jitter, max 3 retries
- Error responses: parse CAPI error body into structured `error` object
- Concurrency: semaphore limits parallel requests

### 1.5 — Codegen Pipeline

**File:** `codegen/generate.ts`

**Input:** `data/swagger.json`
**Output:** Files in `src/tools/generated/`

**Per swagger path + method, generate:**

```typescript
// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Source: GET /accounts
// Tag: Account

import { z } from 'zod';  // or manual validation if avoiding deps

export const wpeGetAccountsToolDef = {
  name: 'wpe_get_accounts',
  description: 'List your WP Engine accounts',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
  annotations: {
    safetyTier: 1,
    httpMethod: 'GET',
    apiPath: '/accounts',
    tag: 'Account',
  },
};

export async function wpeGetAccountsHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get('/accounts');
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}
```

**Codegen rules:**
- Tool name: `wpe_` prefix + derived from HTTP method + path (e.g., `GET /accounts` → `wpe_get_accounts`)
- Path parameters become required tool parameters
- Query parameters become optional tool parameters
- Request body becomes tool parameters (flattened one level)
- Description from swagger `summary` or `description`
- Safety tier: GET → 1, PATCH → 2, POST → 2, DELETE → 3
- Group files by swagger tag

**Tool name derivation — all tools prefixed with `wpe_`:**
| Method | Path | Tool Name |
|--------|------|-----------|
| GET | `/accounts` | `wpe_get_accounts` |
| GET | `/accounts/{account_id}` | `wpe_get_account` |
| GET | `/accounts/{account_id}/limits` | `wpe_get_account_limits` |
| POST | `/sites` | `wpe_create_site` |
| PATCH | `/sites/{site_id}` | `wpe_update_site` |
| DELETE | `/sites/{site_id}` | `wpe_delete_site` |
| POST | `/install_copy` | `wpe_copy_install` |
| POST | `/installs/{install_id}/purge_cache` | `wpe_purge_cache` |
| GET | `/installs/{install_id}/domains` | `wpe_get_domains` |
| POST | `/installs/{install_id}/domains/bulk` | `wpe_create_domains_bulk` |
| POST | `/installs/{install_id}/domains/{domain_id}/check_status` | `wpe_check_domain_status` |
| GET | `/installs/{install_id}/domains/check_status/{report_id}` | `wpe_get_domain_status_report` |

### 1.6 — MCP Server

**File:** `src/server.ts`

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export interface ServerConfig {
  authProvider: AuthProvider;
  transport: 'stdio' | 'http';
  port?: number;             // for HTTP transport
}

export function createServer(config: ServerConfig): McpServer;
```

**Behavior:**
- Creates MCP server instance
- Registers all generated tools (import from `src/tools/generated/`)
- Each tool handler: validate params → call CapiClient → return result
- INSTRUCTIONS string set as server description/instructions
- Server name: `wpengine-capi`

### 1.7 — Standalone Entry Point

**File:** `bin/mcp-stdio.ts`

```typescript
#!/usr/bin/env node
import { createAuthProvider } from '../src/auth.js';
import { createServer } from '../src/server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const auth = createAuthProvider();
const server = createServer({ authProvider: auth, transport: 'stdio' });
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Gate criteria:**
- `npm run build` succeeds
- `npm run test:unit` passes (codegen tests, auth tests)
- Can configure Claude Code to use `bin/mcp-stdio.ts` and call `wpe_get_accounts`

---

## Phase 2: Generated Tool Tests

**Goal:** Comprehensive test coverage for all generated tools and core infrastructure.

**Depends on:** Phase 1.

### 2.1 — CAPI Response Fixtures

**Directory:** `test/fixtures/`

Create response fixtures for each CAPI endpoint, derived from swagger response schemas.
One file per tag:

```
test/fixtures/
├── accounts.json       # { getAccounts: {...}, getAccount: {...}, ... }
├── sites.json
├── installs.json
├── domains.json
├── backups.json
├── cache.json
├── certificates.json
├── usage.json
├── account-users.json
├── offload-settings.json
└── status.json
```

Each fixture includes:
- Success response (200)
- Not found response (404)
- Error response (401, 403)
- Paginated response (for list endpoints)

### 2.2 — MSW Setup

**File:** `test/setup.ts`

Configure MSW to intercept `https://api.wpengineapi.com/v1/*` requests and return fixtures.

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import accountFixtures from './fixtures/accounts.json';
// ... etc

export const mockServer = setupServer(
  http.get('https://api.wpengineapi.com/v1/accounts', () => {
    return HttpResponse.json(accountFixtures.getAccounts);
  }),
  // ... all endpoints
);
```

### 2.3 — Unit Tests for Generated Tools

One test file per generated tool file. See `docs/test-plan.md` Phase 2 section for full test descriptions.

Key areas:
- Each tool returns correct data for happy path
- Each tool handles auth errors (401)
- Each tool handles not found (404)
- Each tool handles rate limiting (429)
- Path parameters are validated
- Pagination works for list endpoints

### 2.4 — Auth Provider Tests

- Env var present → returns Basic Auth header
- Env var missing → returns null
- OAuth provider present → returns Bearer header
- OAuth provider fails → falls back to env var
- Both missing → returns null with helpful error

### 2.5 — CAPI Client Tests

- Correct headers set on requests
- Pagination: fetches all pages
- 429: retries with backoff
- 5xx: returns structured error
- Concurrent request limiting

**Gate criteria:**
- All unit tests pass
- All component tests pass (mocked CAPI)
- Code coverage > 90% for generated tools and core infrastructure

---

## Phase 3: Safety & Audit

**Goal:** Tier classification enforced on all tools. Audit log for all operations.

**Depends on:** Phase 2.

### 3.1 — Safety Classifier

**File:** `src/safety.ts`

```typescript
export type SafetyTier = 1 | 2 | 3;

export interface SafetyConfig {
  tier: SafetyTier;
  confirmationMessage?: string;    // For Tier 3
  preChecks?: string[];            // Things to verify before executing
}

// Default classification from HTTP method
export function getDefaultTier(httpMethod: string): SafetyTier;

// Override map for special cases
export const TIER_OVERRIDES: Record<string, SafetyTier> = {
  'wpe_copy_install': 3,
  'wpe_create_site': 3,
  'wpe_create_install': 3,
  'wpe_create_account_user': 3,
};

// Get effective tier for a tool
export function getToolSafety(toolName: string, httpMethod: string): SafetyConfig;
```

### 3.2 — Confirmation Flow

For Tier 3 tools, the handler wraps execution:

```typescript
// First call without confirmation → returns confirmation prompt
{
  requiresConfirmation: true,
  tier: 3,
  action: "Delete site 'my-site' and ALL its installs",
  warning: "This action cannot be undone.",
  preChecks: [
    "Verify all installs have recent backups",
    "Confirm no production installs will be affected"
  ],
  confirmationToken: "<random-token>"  // Must be passed back to confirm
}

// Second call with confirmationToken → executes
```

### 3.3 — Audit Logger

**File:** `src/audit.ts`

```typescript
export interface AuditEntry {
  timestamp: string;          // ISO 8601
  toolName: string;
  tier: SafetyTier;
  params: Record<string, unknown>;  // Redacted for sensitive fields
  confirmed: boolean | null;  // null for Tier 1 (no confirmation needed)
  result: 'success' | 'error' | 'confirmation_required';
  error?: string;
  duration_ms: number;
}

export interface AuditLogger {
  log(entry: AuditEntry): void;
  getEntries(): AuditEntry[];
  flush(): Promise<void>;     // Write to file
}

export function createAuditLogger(logPath?: string): AuditLogger;
```

**Behavior:**
- In-memory during session, flush to file on shutdown or periodically
- Log file location: configurable, default `~/.wpengine-mcp/audit.log`
- JSON lines format (one JSON object per line)
- Redact sensitive params: any field containing 'password', 'token', 'secret', 'key'

### 3.4 — Integration with Tool Handlers

Modify the MCP server tool registration to wrap each handler:

```typescript
// Pseudocode for tool registration
for (const tool of allTools) {
  server.registerTool(tool.def, async (params) => {
    const safety = getToolSafety(tool.def.name, tool.annotations.httpMethod);
    const startTime = Date.now();

    // Tier 3: check for confirmation
    if (safety.tier === 3 && !params._confirmationToken) {
      auditLogger.log({ ..., result: 'confirmation_required' });
      return buildConfirmationPrompt(tool, safety, params);
    }

    // Execute
    const result = await tool.handler(params, capiClient);
    auditLogger.log({ ..., result: result.error ? 'error' : 'success' });
    return result;
  });
}
```

**Gate criteria:**
- Tier 1 tools execute without confirmation
- Tier 2 tools execute with logging
- Tier 3 tools return confirmation prompt on first call
- Tier 3 tools execute on second call with valid token
- Tier overrides are applied (copy_install is Tier 3 despite being POST)
- Audit log entries written for all operations
- Sensitive params redacted in logs

---

## Phase 4: Composite Tools

**Goal:** Higher-level tools that aggregate data across multiple API calls.

**Depends on:** Phase 3.

### 4.1 — Fan-Out Infrastructure

**File:** `src/fan-out.ts`

```typescript
export interface FanOutConfig {
  maxConcurrency: number;    // default: 5
  onProgress?: (completed: number, total: number) => void;
}

// Execute a function for each item in a list, with bounded concurrency
export async function fanOut<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  config?: FanOutConfig,
): Promise<Array<{ item: T; result: R | null; error?: string }>>;
```

### 4.2 — Composite Tool Implementations

Each composite tool follows this pattern:

```typescript
export const wpeAccountOverviewToolDef = {
  name: 'wpe_account_overview',
  description: 'Get a comprehensive overview of a WP Engine account: details, limits, usage summary, and environment counts.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      account_id: { type: 'string', description: 'The account ID' },
    },
    required: ['account_id'],
  },
  annotations: {
    safetyTier: 1,
    composite: true,
  },
};

export async function accountOverviewHandler(
  params: { account_id: string },
  client: CapiClient,
): Promise<unknown> {
  // Parallel fetch: account details + limits + usage summary + sites
  const [account, limits, usage, sites] = await Promise.all([
    client.get(`/accounts/${params.account_id}`),
    client.get(`/accounts/${params.account_id}/limits`),
    client.get(`/accounts/${params.account_id}/usage/summary`),
    client.getAll(`/sites`, { account_id: params.account_id }),
  ]);

  // ... aggregate and format
}
```

**Composite tools to implement:**

1. **`wpe_account_overview`** — parallel fetch of account + limits + usage + sites/installs count
2. **`wpe_account_usage`** — account usage + insights, formatted with trends
3. **`wpe_account_domains`** — list installs → fan out domains per install → group by site/env, include SSL
4. **`wpe_account_backups`** — list installs → fan out latest backup per install → flag gaps
5. **`wpe_account_ssl_status`** — list installs → fan out SSL certs → flag expiring/missing
6. **`wpe_account_environments`** — list sites → list installs → build topology map
7. **`wpe_diagnose_site`** — for one install: usage + domains + SSL + backups in parallel
8. **`wpe_setup_staging`** — sequential: create install → copy from source → list resulting domains
9. **`wpe_prepare_go_live`** — for one install: check domains + SSL + backup status → produce checklist
10. **`wpe_environment_diff`** — parallel fetch two installs + their domains + usage → diff

### 4.3 — Composite Tool Tests

Each composite tool tested with mocked CAPI:
- Happy path with small account (3 installs)
- Large account (100+ installs, verifies concurrency limit)
- Partial failure (some installs return 403)
- Empty account (no sites/installs)
- Fan-out tools: pagination of install list
- Anomaly detection (missing backup, expiring SSL, etc.)

**Gate criteria:**
- All composite tool tests pass
- Fan-out respects concurrency limits
- Partial failures handled gracefully (results for successful installs, errors for failed)
- Anomaly flags present in output

---

## Phase 5: Knowledge Layer

**Goal:** INSTRUCTIONS, MCP resources, MCP Prompts, and content authored.

**Depends on:** Phase 4.

### 5.1 — INSTRUCTIONS String

**File:** `src/server.ts` (embedded in server config)

Write the INSTRUCTIONS string following the pattern in `docs/knowledge-architecture.md`.
Cover:
- First use: check auth, read domain model
- Navigation: Account → Site → Install hierarchy
- Workflow routing: when to read which guide
- Safety rules: when to confirm, when to check first
- Composite tool guidance: when to use aggregate vs. individual tools

### 5.2 — Knowledge Resources

**File:** `src/resources/knowledge.ts`

Register MCP resources for static content:

```typescript
// wpengine://guide/{topic}
server.resource('wpengine://guide/domain-model', ...);
server.resource('wpengine://guide/safety', ...);
server.resource('wpengine://guide/troubleshooting', ...);

// wpengine://guide/workflows/{name}
server.resource('wpengine://guide/workflows/new-environment', ...);
server.resource('wpengine://guide/workflows/go-live', ...);
// etc.

// wpengine://api/{tag} — auto-generated from swagger
server.resource('wpengine://api/account', ...);
server.resource('wpengine://api/site', ...);
// etc.
```

### 5.3 — Entity Browser Resources

**File:** `src/resources/entity-browser.ts`

Register MCP resources that call CAPI for live data:

```typescript
// wpengine://accounts
server.resource('wpengine://accounts', async () => {
  const result = await capiClient.getAll('/accounts');
  return JSON.stringify(result.data, null, 2);
});

// wpengine://account/{id}
// wpengine://account/{id}/sites
// wpengine://site/{id}
// wpengine://site/{id}/installs
// wpengine://install/{id}
```

### 5.4 — MCP Prompts

**File:** `src/prompts/index.ts`

MCP Prompts are pre-built prompt templates that AI agents can invoke:

```typescript
server.prompt('diagnose-site', {
  description: 'Diagnose performance and health issues for a WP Engine install',
  arguments: [
    { name: 'install_id', description: 'The install ID to diagnose', required: true },
  ],
}, async ({ install_id }) => {
  return {
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Diagnose the WP Engine install ${install_id}. Use the diagnose_site tool to get a health snapshot, then analyze the results. Check for: traffic anomalies, missing SSL, backup gaps, storage concerns. Read wpengine://guide/troubleshooting for diagnostic patterns.`,
      },
    }],
  };
});
```

**Prompts to implement:**
- `diagnose-site` — health check for one install
- `account-health` — overall account health assessment
- `setup-staging` — guided staging environment creation
- `go-live-checklist` — pre-launch verification
- `domain-migration` — guided domain migration
- `security-review` — SSL + user access review

### 5.5 — Content Authoring

Write the markdown content files in `src/content/`:

- `domain-model.md` — WP Engine entity hierarchy (draft in `docs/knowledge-architecture.md`)
- `safety.md` — tier classifications and pre-checks (draft in `docs/knowledge-architecture.md`)
- `troubleshooting.md` — diagnostic patterns
- `workflows/new-environment.md`
- `workflows/go-live.md`
- `workflows/staging-refresh.md`
- `workflows/domain-migration.md`
- `workflows/disaster-recovery.md`

**Gate criteria:**
- All knowledge resources resolve to content
- INSTRUCTIONS string routes correctly (manual verification)
- MCP Prompts listed and invocable
- All content files authored and readable
- Entity browser resources return live data (with valid auth)

---

## Phase 6: Local Addon Integration

**Goal:** Wrap the core MCP server as a Local addon with OAuth auth.

**Depends on:** Phase 5.

### 6.1 — Addon Package Configuration

Update `package.json`:
```json
{
  "local": {
    "minVersion": "9.0.0"
  },
  "permissions": {
    "services": ["wpeOAuth"],
    "network": ["api.wpengineapi.com"]
  }
}
```

### 6.2 — Main Process Entry Point

**File:** `src/local-addon/main/index.ts`

```typescript
import { createAuthProvider } from '../../auth.js';
import { createServer } from '../../server.js';

export default function (context: LocalMain.AddonMainContext): void {
  const services = LocalMain.getServiceContainer().cradle;

  const auth = createAuthProvider({
    oauthProvider: services.wpeOAuth,
  });

  const server = createServer({
    authProvider: auth,
    transport: 'http',
    port: findAvailablePort(10890, 10990),
  });

  // Also start stdio transport
  // Write connection info for AI clients
  // Register IPC handlers for status queries
}
```

### 6.3 — HTTP/SSE Transport

Add HTTP/SSE transport alongside stdio:
- Localhost only (IP whitelist)
- Session token auth (random token per server start)
- Write connection info to `~/Library/Application Support/Local/wpe-capi-mcp-connection-info.json`

### 6.4 — Renderer (Minimal)

**File:** `src/local-addon/renderer/index.tsx`

Minimal status indicator in Local UI:
- Show MCP server status (running/stopped)
- Show auth status (authenticated/not authenticated)
- Show tool count
- Link to guide for configuring AI tools

### 6.5 — OAuth Auth Path

Wire `wpeOAuth.getAccessToken()` into the AuthProvider:
- Try OAuth first
- Fall back to env vars
- Surface clear error if neither available

**Gate criteria:**
- Addon loads in Local without errors
- OAuth authentication works
- MCP server accessible via both stdio and HTTP/SSE
- Connection info file written correctly
- Status indicator shows in Local UI
- Fallback to env vars works when OAuth unavailable

---

## Phase 7: Polish

**Goal:** Documentation, drift detection, release packaging.

**Depends on:** Phase 6.

### 7.1 — Drift Detection Script

**File:** `codegen/drift-check.ts`

```bash
npm run drift-check
# Fetches live swagger, diffs against data/swagger.json
# Reports: added endpoints, removed endpoints, changed parameters
# Exit code 0: no drift. Exit code 1: drift detected.
```

### 7.2 — User Documentation

Write user-facing docs:
- `docs/user-guide/getting-started.md`
- `docs/user-guide/claude-desktop-setup.md`
- `docs/user-guide/claude-code-setup.md`
- `docs/user-guide/standalone-setup.md`
- `docs/user-guide/troubleshooting.md`

### 7.3 — Tool Reference (Auto-Generated)

Add to codegen pipeline: generate `docs/reference/tools.md` from swagger + composite tool defs.

### 7.4 — Release Packaging

- Build script: compile + package as `.tgz`
- CHANGELOG.md initial entry
- Version 0.1.0

### 7.5 — End-to-End Verification

Manual walkthrough:
1. Install addon in Local
2. Authenticate via OAuth
3. Configure Claude Code with stdio transport
4. Run: "List my WP Engine accounts" → verify response
5. Run: "Give me an overview of account X" → verify composite tool
6. Run: "Show me the domain model" → verify knowledge resource
7. Run: "Delete site X" → verify Tier 3 confirmation flow
8. Check audit log → verify entries

**Gate criteria:**
- Drift detection script works
- User documentation complete
- Tool reference generated
- Addon packaged as .tgz
- End-to-end walkthrough passes all 8 steps
