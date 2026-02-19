# Test Plan (TDD)

Tests are written BEFORE implementation. They serve as the executable spec.
Organized by phase. Each test description includes what to assert.

Framework: Vitest + MSW (Mock Service Worker).

---

## Phase 1: Foundation Tests

### 1.1 — Auth Provider

**File:** `test/unit/auth.test.ts`

```
describe('createAuthProvider')

  describe('env var auth')
    it('returns Basic Auth header when both env vars set')
      - Set WP_ENGINE_API_USERNAME=testuser, WP_ENGINE_API_PASSWORD=testpass
      - Call getAuthHeader()
      - Assert returns 'Basic dGVzdHVzZXI6dGVzdHBhc3M=' (base64 of testuser:testpass)
      - Assert getAuthMethod() returns 'basic'

    it('returns null when env vars missing')
      - Unset both env vars
      - Call getAuthHeader()
      - Assert returns null
      - Assert getAuthMethod() returns 'none'

    it('returns null when only username set')
      - Set WP_ENGINE_API_USERNAME=testuser, unset PASSWORD
      - Call getAuthHeader()
      - Assert returns null

    it('returns null when only password set')
      - Unset USERNAME, set WP_ENGINE_API_PASSWORD=testpass
      - Call getAuthHeader()
      - Assert returns null

  describe('oauth auth')
    it('returns Bearer token when oauth provider returns token')
      - Create provider with oauthProvider.getAccessToken() → 'oauth-token-123'
      - Call getAuthHeader()
      - Assert returns 'Bearer oauth-token-123'
      - Assert getAuthMethod() returns 'oauth'

    it('returns null when oauth provider returns undefined')
      - Create provider with oauthProvider.getAccessToken() → undefined
      - No env vars set
      - Call getAuthHeader()
      - Assert returns null

    it('falls back to env var when oauth provider returns undefined')
      - Create provider with oauthProvider.getAccessToken() → undefined
      - Set both env vars
      - Call getAuthHeader()
      - Assert returns Basic Auth header
      - Assert getAuthMethod() returns 'basic'

    it('prefers oauth over env var when both available')
      - Create provider with oauthProvider.getAccessToken() → 'oauth-token'
      - Set both env vars
      - Call getAuthHeader()
      - Assert returns 'Bearer oauth-token'

    it('falls back to env var when oauth provider throws')
      - Create provider with oauthProvider.getAccessToken() → throw Error
      - Set both env vars
      - Call getAuthHeader()
      - Assert returns Basic Auth header
```

### 1.2 — CAPI Client

**File:** `test/unit/capi-client.test.ts`

```
describe('CapiClient')

  describe('request basics')
    it('sends GET request with auth header')
      - Mock GET /accounts → 200
      - Call client.get('/accounts')
      - Assert request had Authorization header
      - Assert request had Content-Type: application/json

    it('sends POST request with body')
      - Mock POST /sites → 201
      - Call client.post('/sites', { name: 'test' })
      - Assert request body contains { name: 'test' }

    it('sends PATCH request with body')
      - Mock PATCH /sites/abc → 200
      - Call client.patch('/sites/abc', { name: 'updated' })
      - Assert correct method and body

    it('sends DELETE request')
      - Mock DELETE /sites/abc → 204
      - Call client.delete('/sites/abc')
      - Assert correct method

  describe('response handling')
    it('returns structured success response')
      - Mock GET /accounts → 200 with body
      - Call client.get('/accounts')
      - Assert response.ok === true
      - Assert response.status === 200
      - Assert response.data matches mock body

    it('returns structured error for 401')
      - Mock GET /accounts → 401 with error body
      - Call client.get('/accounts')
      - Assert response.ok === false
      - Assert response.status === 401
      - Assert response.error.message is helpful

    it('returns structured error for 404')
      - Mock GET /accounts/bad-id → 404
      - Assert response.ok === false
      - Assert response.error.message mentions 'not found'

    it('returns structured error for 500')
      - Mock GET /accounts → 500
      - Assert response.ok === false
      - Assert response.error.message mentions 'server error'

  describe('rate limiting')
    it('retries on 429 with backoff')
      - Mock GET /accounts → 429 (first call), 200 (second call)
      - Call client.get('/accounts')
      - Assert two requests made
      - Assert response.ok === true

    it('gives up after max retries on 429')
      - Mock GET /accounts → 429 (always)
      - Call client.get('/accounts')
      - Assert response.ok === false
      - Assert response.status === 429

  describe('pagination')
    it('fetches all pages with getAll')
      - Mock GET /installs?limit=100&offset=0 → { results: [...50 items], next: '...' }
      - Mock GET /installs?limit=100&offset=100 → { results: [...30 items], next: null }
      - Call client.getAll('/installs')
      - Assert response.data has 80 items

    it('handles single page response')
      - Mock GET /installs → { results: [...5 items], next: null }
      - Call client.getAll('/installs')
      - Assert response.data has 5 items

    it('handles empty response')
      - Mock GET /installs → { results: [], next: null }
      - Call client.getAll('/installs')
      - Assert response.data is empty array

  describe('concurrency')
    it('limits concurrent requests')
      - Set maxConcurrency to 2
      - Fire 10 requests simultaneously
      - Assert max 2 in-flight at any time (use request timing/counting)

  describe('auth failure')
    it('returns clear error when no auth configured')
      - Create client with auth that returns null
      - Call client.get('/accounts')
      - Assert response.ok === false
      - Assert response.error.message mentions authentication
```

### 1.3 — Codegen

**File:** `test/unit/codegen.test.ts`

```
describe('codegen')

  describe('tool name derivation')
    it('derives wpe_get_accounts from GET /accounts')
    it('derives wpe_get_account from GET /accounts/{account_id}')
    it('derives wpe_create_site from POST /sites')
    it('derives wpe_update_site from PATCH /sites/{site_id}')
    it('derives wpe_delete_site from DELETE /sites/{site_id}')
    it('derives wpe_copy_install from POST /install_copy')
    it('derives wpe_purge_cache from POST /installs/{install_id}/purge_cache')
    it('derives wpe_get_domains from GET /installs/{install_id}/domains')
    it('derives wpe_create_domains_bulk from POST /installs/{install_id}/domains/bulk')
    it('derives wpe_check_domain_status from POST /installs/{install_id}/domains/{domain_id}/check_status')

  describe('parameter extraction')
    it('extracts path parameters as required')
      - Swagger: GET /accounts/{account_id}
      - Assert generated inputSchema has account_id as required string

    it('extracts query parameters as optional')
      - Swagger: GET /installs?limit=...&offset=...
      - Assert generated inputSchema has limit and offset as optional

    it('extracts request body properties')
      - Swagger: POST /sites with body { name: string }
      - Assert generated inputSchema has name property

  describe('safety tier assignment')
    it('assigns tier 1 to GET operations')
    it('assigns tier 2 to PATCH operations')
    it('assigns tier 2 to POST operations by default')
    it('assigns tier 3 to DELETE operations')

  describe('output structure')
    it('generates valid TypeScript for each tool')
      - Run codegen on swagger fixture
      - Assert output files exist for each tag
      - Assert each file has toolDef export and handler export
      - Assert no TypeScript compilation errors

    it('includes AUTO-GENERATED header in output')
      - Assert first line of each generated file contains DO NOT EDIT

    it('groups tools by swagger tag')
      - Assert accounts.ts contains account-related tools
      - Assert sites.ts contains site-related tools
```

---

## Phase 2: Generated Tool Tests

### 2.1 — Tool Handler Tests (per tag)

**Files:** `test/component/tools/[tag].test.ts`

For EACH generated tool, test with MSW mocking the CAPI endpoint:

```
describe('Account tools')

  describe('get_accounts')
    it('returns list of accounts')
      - Mock GET /accounts → fixture
      - Call handler
      - Assert returns array of accounts

    it('handles empty account list')
      - Mock GET /accounts → { results: [] }
      - Assert returns empty array

    it('handles auth error')
      - Mock GET /accounts → 401
      - Assert returns error with auth guidance

  describe('get_account')
    it('returns account details')
      - Mock GET /accounts/acc-123 → fixture
      - Call handler with { account_id: 'acc-123' }
      - Assert returns account object

    it('handles not found')
      - Mock GET /accounts/bad → 404
      - Assert returns error with not found message

  // ... similar for every generated tool
```

**Repeat this pattern for all tags:**
- `test/component/tools/accounts.test.ts`
- `test/component/tools/sites.test.ts`
- `test/component/tools/installs.test.ts`
- `test/component/tools/domains.test.ts`
- `test/component/tools/backups.test.ts`
- `test/component/tools/cache.test.ts`
- `test/component/tools/certificates.test.ts`
- `test/component/tools/usage.test.ts`
- `test/component/tools/account-users.test.ts`
- `test/component/tools/offload-settings.test.ts`
- `test/component/tools/status.test.ts`

---

## Phase 3: Safety & Audit Tests

### 3.1 — Safety Classifier

**File:** `test/unit/safety.test.ts`

```
describe('safety classifier')

  describe('getDefaultTier')
    it('returns 1 for GET')
    it('returns 2 for PATCH')
    it('returns 2 for POST')
    it('returns 3 for DELETE')

  describe('tier overrides')
    it('wpe_copy_install is tier 3 despite being POST')
    it('wpe_create_site is tier 3 despite being POST')
    it('wpe_create_install is tier 3 despite being POST')
    it('wpe_create_account_user is tier 3 despite being POST')

  describe('getToolSafety')
    it('returns tier with confirmation message for tier 3 tools')
      - Call getToolSafety('wpe_delete_site', 'DELETE')
      - Assert tier === 3
      - Assert confirmationMessage is non-empty
      - Assert preChecks is non-empty array

    it('returns tier without confirmation for tier 1 tools')
      - Call getToolSafety('wpe_get_accounts', 'GET')
      - Assert tier === 1
      - Assert confirmationMessage is undefined

    it('applies override over default')
      - Call getToolSafety('wpe_copy_install', 'POST')
      - Assert tier === 3 (not 2)
```

### 3.2 — Confirmation Flow

**File:** `test/component/safety-flow.test.ts`

```
describe('confirmation flow')

  it('tier 1 tool executes immediately')
    - Call wpe_get_accounts tool via MCP
    - Assert returns data (no confirmation prompt)

  it('tier 3 tool returns confirmation prompt on first call')
    - Call wpe_delete_site tool via MCP without confirmationToken
    - Assert response contains requiresConfirmation: true
    - Assert response contains action description
    - Assert response contains warning
    - Assert response contains confirmationToken

  it('tier 3 tool executes with valid confirmation token')
    - Call wpe_delete_site with confirmationToken from first call
    - Assert CAPI DELETE request was made
    - Assert response contains result

  it('tier 3 tool rejects invalid confirmation token')
    - Call wpe_delete_site with wrong confirmationToken
    - Assert CAPI DELETE was NOT called
    - Assert error response

  it('confirmation tokens are single-use')
    - Get token from first call
    - Use token successfully
    - Try to use same token again
    - Assert rejected
```

### 3.3 — Audit Logger

**File:** `test/unit/audit.test.ts`

```
describe('audit logger')

  it('logs tier 1 calls with no confirmation field')
    - Log a tier 1 call
    - Assert entry has confirmed: null

  it('logs tier 3 confirmation_required')
    - Log a tier 3 confirmation prompt
    - Assert entry has result: 'confirmation_required'

  it('logs tier 3 success after confirmation')
    - Log a tier 3 confirmed call
    - Assert entry has confirmed: true, result: 'success'

  it('logs errors')
    - Log a failed call
    - Assert entry has result: 'error'
    - Assert entry has error message

  it('redacts sensitive parameters')
    - Log a call with params { password: 'secret', name: 'visible' }
    - Assert entry params has password: '[REDACTED]'
    - Assert entry params has name: 'visible'

  it('includes duration_ms')
    - Log a call
    - Assert duration_ms is a positive number

  it('flushes to file')
    - Log multiple entries
    - Call flush()
    - Read file
    - Assert JSON lines format with all entries

  it('getEntries returns all logged entries')
    - Log 3 entries
    - Assert getEntries() returns array of 3
```

---

## Phase 4: Composite Tool Tests

### 4.1 — Fan-Out Infrastructure

**File:** `test/unit/fan-out.test.ts`

```
describe('fanOut')

  it('executes function for each item')
    - fanOut([1,2,3], async (n) => n * 2)
    - Assert results: [2, 4, 6]

  it('respects maxConcurrency')
    - Track concurrent executions
    - fanOut(20 items, slow function, { maxConcurrency: 3 })
    - Assert max concurrent never exceeded 3

  it('handles partial failures')
    - fanOut([1,2,3], async (n) => { if (n===2) throw Error; return n; })
    - Assert item 1: result=1, error=undefined
    - Assert item 2: result=null, error='Error'
    - Assert item 3: result=3, error=undefined

  it('reports progress')
    - Track progress calls
    - fanOut(5 items, fn, { onProgress: tracker })
    - Assert tracker called with (1,5), (2,5), (3,5), (4,5), (5,5)

  it('handles empty input')
    - fanOut([], fn)
    - Assert returns empty array
```

### 4.2 — Composite Tool Tests

**File:** `test/component/tools/composite/account-overview.test.ts`

```
describe('wpe_account_overview')

  it('returns aggregated account data')
    - Mock: account details + limits + usage summary + sites list
    - Call wpe_account_overview({ account_id: 'acc-1' })
    - Assert response includes account name
    - Assert response includes limit info
    - Assert response includes usage summary
    - Assert response includes site/install counts

  it('handles account not found')
    - Mock: GET /accounts/bad → 404
    - Assert returns helpful error
```

**File:** `test/component/tools/composite/account-domains.test.ts`

```
describe('wpe_account_domains')

  it('aggregates domains across all installs')
    - Mock: 3 installs, each with 2 domains
    - Call wpe_account_domains({ account_id: 'acc-1' })
    - Assert response has 6 domains
    - Assert grouped by install/environment

  it('includes SSL status per domain')
    - Mock: domains with and without SSL
    - Assert response flags domains without SSL

  it('handles large account with pagination')
    - Mock: 150 installs (paginated), 2 domains each
    - Assert response has 300 domains
    - Assert fan-out respected concurrency limit

  it('handles partial failures gracefully')
    - Mock: 3 installs, one returns 403
    - Assert response has domains for 2 installs
    - Assert response notes 1 install with error

  it('handles account with no installs')
    - Mock: empty install list
    - Assert response indicates no domains found
```

**Repeat similar pattern for:**
- `test/component/tools/composite/account-backups.test.ts`
  - Flags installs without recent backup
  - Groups by environment
- `test/component/tools/composite/account-ssl-status.test.ts`
  - Flags expiring certs (within 30 days)
  - Flags domains without SSL
- `test/component/tools/composite/account-environments.test.ts`
  - Produces topology map
  - Shows which sites have staging
  - Shows PHP version distribution
- `test/component/tools/composite/account-usage.test.ts`
  - Includes insights
  - Formats bandwidth human-readable
- `test/component/tools/composite/diagnose-site.test.ts`
  - Returns all health dimensions
  - Flags anomalies
- `test/component/tools/composite/setup-staging.test.ts`
  - Calls create_install then copy_install
  - Returns new install details
  - Is classified as Tier 3
- `test/component/tools/composite/prepare-go-live.test.ts`
  - Produces checklist with pass/fail per item
  - Checks: domains configured, SSL valid, backup exists
- `test/component/tools/composite/environment-diff.test.ts`
  - Compares two installs side-by-side
  - Shows differences in domains, PHP version, environment type

---

## Phase 5: Knowledge Layer Tests

### 5.1 — Knowledge Resources

**File:** `test/component/resources/knowledge.test.ts`

```
describe('knowledge resources')

  it('wpengine://guide/domain-model returns content')
    - Read resource
    - Assert non-empty string
    - Assert contains 'Account' and 'Site' and 'Install'

  it('wpengine://guide/safety returns content')
    - Read resource
    - Assert contains 'Tier 1' and 'Tier 2' and 'Tier 3'

  it('wpengine://guide/troubleshooting returns content')
    - Read resource
    - Assert non-empty

  it('wpengine://guide/workflows/go-live returns content')
    - Read resource
    - Assert contains 'Prerequisites' and 'Steps'

  it('wpengine://guide/workflows/unknown returns available options')
    - Read resource with unknown workflow name
    - Assert response lists available workflow names

  it('wpengine://api/account returns auto-generated reference')
    - Read resource
    - Assert contains endpoint descriptions for account APIs

  it('all workflow files exist and follow template')
    - For each expected workflow name
    - Read wpengine://guide/workflows/{name}
    - Assert contains: 'When to Use', 'Prerequisites', 'Steps'
```

### 5.2 — Entity Browser Resources

**File:** `test/component/resources/entity-browser.test.ts`

```
describe('entity browser resources')

  it('wpengine://accounts returns account list')
    - Mock GET /accounts → fixture
    - Read resource
    - Assert returns formatted account data

  it('wpengine://account/{id} returns account details')
    - Mock GET /accounts/acc-1 → fixture
    - Read wpengine://account/acc-1
    - Assert returns account details

  it('wpengine://account/{id}/sites returns sites')
    - Mock GET /sites?account_id=acc-1 → fixture
    - Read wpengine://account/acc-1/sites
    - Assert returns site list

  it('wpengine://install/{id} returns install details')
    - Mock GET /installs/inst-1 → fixture
    - Read wpengine://install/inst-1
    - Assert returns install details

  it('entity resource with invalid ID returns error')
    - Mock GET /accounts/bad → 404
    - Read wpengine://account/bad
    - Assert returns helpful error
```

### 5.3 — MCP Prompts

**File:** `test/component/prompts.test.ts`

```
describe('MCP prompts')

  it('lists all available prompts')
    - Call prompts/list
    - Assert includes: diagnose-site, account-health, setup-staging,
      go-live-checklist, domain-migration, security-review

  it('diagnose-site prompt returns valid message')
    - Call prompts/get with name=diagnose-site, args={install_id: 'inst-1'}
    - Assert returns messages array with user message
    - Assert message mentions diagnose_site tool
    - Assert message mentions install_id

  it('prompts include required arguments')
    - For each prompt
    - Assert arguments are defined
    - Assert required arguments are marked required

  it('prompt with missing required arg returns error')
    - Call diagnose-site without install_id
    - Assert error response
```

---

## Phase 6: Local Addon Integration Tests

### 6.1 — Addon Lifecycle

**File:** `test/integration/local-addon.test.ts`

Note: These tests may need to run in an Electron context or be manually verified.

```
describe('Local addon integration')

  it('addon exports default function')
    - Import src/local-addon/main/index.ts
    - Assert default export is a function

  it('auth provider uses wpeOAuth when available')
    - Mock LocalMain.getServiceContainer() with wpeOAuth service
    - Initialize addon
    - Assert auth uses OAuth method

  it('auth provider falls back to env vars when wpeOAuth unavailable')
    - Mock LocalMain.getServiceContainer() without wpeOAuth
    - Set env vars
    - Assert auth uses basic method
```

### 6.2 — Transport Tests

**File:** `test/integration/transport.test.ts`

```
describe('stdio transport')

  it('responds to MCP initialize')
    - Spawn server process with stdio
    - Send initialize message
    - Assert receives capabilities response

  it('lists all tools')
    - Send tools/list
    - Assert response contains all generated + composite tools

  it('lists all resources')
    - Send resources/list
    - Assert response contains knowledge + entity resources

  it('executes tool call')
    - Mock CAPI endpoint
    - Send tools/call for wpe_get_accounts
    - Assert receives account data

describe('HTTP/SSE transport')

  it('rejects unauthenticated requests')
    - POST /mcp without Authorization header
    - Assert 401 response

  it('accepts authenticated requests')
    - POST /mcp with valid Bearer token
    - Assert 200 response

  it('rejects non-localhost requests')
    - If testable: request from non-localhost IP
    - Assert rejected

  it('responds to MCP protocol messages')
    - POST /mcp with initialize message
    - Assert valid MCP response
```

---

## Phase 7: Polish Tests

### 7.1 — Drift Detection

**File:** `test/unit/drift-check.test.ts`

```
describe('drift detection')

  it('reports no drift when specs match')
    - Use identical vendored and "live" specs
    - Assert exit code 0
    - Assert report says 'no changes'

  it('reports added endpoints')
    - Add a new path to "live" spec
    - Assert report lists the new path

  it('reports removed endpoints')
    - Remove a path from "live" spec
    - Assert report lists the removed path

  it('reports changed parameters')
    - Change a parameter in "live" spec
    - Assert report lists the changed endpoint
```

---

## Test Fixture Guidelines

### Response Fixture Format

Each fixture file exports typed mock responses:

```typescript
// test/fixtures/accounts.ts
export const accountFixtures = {
  getAccounts: {
    success: {
      status: 200,
      body: {
        results: [
          { id: 'acc-1', name: 'Test Account', ... },
          { id: 'acc-2', name: 'Another Account', ... },
        ],
        next: null,
        previous: null,
        count: 2,
      },
    },
    empty: {
      status: 200,
      body: { results: [], next: null, previous: null, count: 0 },
    },
    unauthorized: {
      status: 401,
      body: { error: 'Invalid credentials' },
    },
    paginated: {
      page1: {
        status: 200,
        body: {
          results: [/* 100 items */],
          next: 'https://api.wpengineapi.com/v1/accounts?offset=100',
          count: 150,
        },
      },
      page2: {
        status: 200,
        body: {
          results: [/* 50 items */],
          next: null,
          count: 150,
        },
      },
    },
  },
  getAccount: {
    success: {
      status: 200,
      body: { id: 'acc-1', name: 'Test Account', ... },
    },
    notFound: {
      status: 404,
      body: { error: 'Account not found' },
    },
  },
  // ... etc
};
```

### Fixture Derivation

Fixtures should be derived from the swagger response schemas:
1. Read swagger.json response schema for each endpoint
2. Generate realistic sample data matching the schema
3. Include edge cases: empty arrays, null fields, pagination

### MSW Handler Pattern

```typescript
// test/setup.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { accountFixtures } from './fixtures/accounts';

export const mockCapiServer = setupServer(
  // Default: return success fixtures
  http.get('https://api.wpengineapi.com/v1/accounts', () => {
    return HttpResponse.json(accountFixtures.getAccounts.success.body);
  }),
  // ... all endpoints
);

// In tests, override for specific scenarios:
// mockCapiServer.use(
//   http.get('https://api.wpengineapi.com/v1/accounts', () => {
//     return HttpResponse.json(accountFixtures.getAccounts.unauthorized.body,
//       { status: 401 });
//   }),
// );
```
