# WP Engine CAPI MCP Server

## What This Project Is

An MCP server that exposes the WP Engine Customer API (CAPI) to AI agents.
Distributed as a Local (by Flywheel) addon for OAuth2 auth, but also runs
standalone with env var auth for testing and CI.

## Session Startup Checklist

1. Read this file
2. Read `docs/implementation-spec.md` for current phase details
3. Run `npm test` (or check test output) to see what's passing/failing
4. Check the phase status table below to know where to pick up

## Current Phase Status

| Phase | Status | Gate |
|-------|--------|------|
| 1. Foundation | DONE | `npm run test:unit` passes, `wpe_get_accounts` works via stdio |
| 2. Generated Tool Tests | DONE | Full unit + component test suite green |
| 3. Safety & Audit | DONE | Tier enforcement + audit log tests green |
| 4. Composite Tools | DONE | Composite tool tests green with mocked CAPI |
| 5. Knowledge Layer | DONE | Resources resolve, prompts available, content authored |
| 6. Local Addon Integration | DONE | Addon loads in Local, OAuth works, both transports |
| 7. Polish | DONE | User docs, tool reference, drift detection, packaging |

**Current state:** 62 tools (50 generated + 12 composite), 268 tests, 13 summarizers, 6 prompts.
See `docs/deviations.md` for differences between original spec and implementation.

## Key Decisions (Summary)

Full ADRs in `docs/decisions.md`. Quick reference:

- **Namespace:** All tool names prefixed with `wpe_` (e.g., `wpe_get_accounts`). (`ADR-010`)
- **Architecture:** Standalone-first. Core MCP server has ZERO dependency on Local/Electron.
  Local addon wraps the core. (`ADR-011`)
- **Auth:** OAuth primary (via Local), env var fallback (`WP_ENGINE_API_USERNAME` / `WP_ENGINE_API_PASSWORD`)
- **API coverage:** 1:1 from swagger (codegen) + hand-written composite tools
- **Swagger sync:** Vendored spec at `data/swagger.json`, build-time codegen, drift detection
- **Transport:** stdio + HTTP/SSE
- **Safety:** 3-tier classification. Tier 3 requires confirmation + logging.
- **Knowledge:** INSTRUCTIONS string + MCP resources + MCP Prompts
- **Language:** TypeScript, strict mode. Do NOT reuse code from `wpengine-mcp-ts`.
- **Testing:** TDD. Tests written before implementation. Tests are the executable spec.

## Project Structure

```
├── CLAUDE.md                          # THIS FILE — session bootstrap
├── README.md                          # Project README
├── CHANGELOG.md                       # Release changelog
├── data/
│   └── swagger.json                   # Vendored CAPI swagger spec
├── docs/                              # Project documentation
│   ├── requirements.md                # Functional + non-functional requirements
│   ├── decisions.md                   # Architecture Decision Records (ADR-001 to ADR-017)
│   ├── deviations.md                  # Deviations from original spec with rationale
│   ├── api-surface.md                 # Complete endpoint catalog + tool mappings
│   ├── knowledge-architecture.md      # Knowledge layer design
│   ├── engineering-plan.md            # Testing, security, performance, etc.
│   ├── implementation-spec.md         # Detailed phase specs (THE BUILD PLAN)
│   ├── test-plan.md                   # TDD test descriptions by phase
│   ├── reference/
│   │   └── tools.md                   # Auto-generated tool reference
│   └── user-guide/                    # End-user documentation
│       ├── getting-started.md
│       ├── claude-desktop-setup.md
│       ├── claude-code-setup.md
│       ├── standalone-setup.md
│       └── troubleshooting.md
├── src/
│   ├── server.ts                      # MCP server setup + INSTRUCTIONS
│   ├── capi-client.ts                 # HTTP client for WP Engine API
│   ├── auth.ts                        # Auth provider (OAuth + env var)
│   ├── safety.ts                      # Tier classification + confirmation
│   ├── audit.ts                       # Structured audit logging
│   ├── summarize.ts                   # Summarization middleware (11 summarizers)
│   ├── pagination.ts                  # Auto-pagination helper
│   ├── tools/
│   │   ├── generated/                 # AUTO-GENERATED — DO NOT EDIT
│   │   │   ├── accounts.ts
│   │   │   ├── sites.ts
│   │   │   ├── installs.ts
│   │   │   ├── domains.ts
│   │   │   ├── backups.ts
│   │   │   ├── cache.ts
│   │   │   ├── certificates.ts
│   │   │   ├── usage.ts
│   │   │   ├── account-users.ts
│   │   │   ├── offload-settings.ts
│   │   │   └── status.ts
│   │   └── composite/                 # Hand-written composite tools
│   │       ├── account-overview.ts
│   │       ├── account-domains.ts
│   │       ├── account-ssl-status.ts
│   │       ├── account-environments.ts
│   │       ├── account-usage.ts
│   │       ├── diagnose-site.ts
│   │       ├── prepare-go-live.ts
│   │       ├── environment-diff.ts
│   │       ├── portfolio-overview.ts
│   │       └── portfolio-usage.ts
│   ├── resources/
│   │   ├── entity-browser.ts          # Live data resources
│   │   └── knowledge.ts              # Static content resources
│   ├── prompts/                       # MCP Prompt templates
│   │   └── index.ts
│   └── content/                       # Knowledge layer markdown
│       ├── domain-model.md
│       ├── safety.md
│       ├── troubleshooting.md
│       └── workflows/
│           ├── new-environment.md
│           ├── go-live.md
│           ├── staging-refresh.md
│           ├── domain-migration.md
│           └── disaster-recovery.md
├── src/local-addon/                   # Local addon wrapper (Phase 6)
│   ├── main/
│   │   └── index.ts                   # Addon entry point
│   └── renderer/
│       └── index.tsx                  # Status UI (minimal)
├── codegen/
│   ├── generate.ts                    # Swagger → MCP tool codegen
│   ├── generate-reference.ts         # Tool reference doc generator
│   ├── drift-check.ts                # Compare vendored vs. live swagger
│   └── templates/
│       └── tool-template.ts.ejs       # Code generation template
├── bin/
│   ├── mcp-stdio.ts                   # Standalone stdio entry point
│   └── mcp-http.ts                    # Standalone HTTP/SSE entry point
├── test/
│   ├── unit/
│   ├── component/
│   ├── integration/
│   └── fixtures/                      # Mock CAPI responses
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Commands

```bash
npm run build          # Compile TypeScript
npm run codegen        # Regenerate tools from swagger.json
npm run drift-check    # Compare vendored swagger vs. live API
npm test               # Run all tests
npm run test:unit      # Unit tests only
npm run test:component # Component tests only (mocked CAPI)
npm run test:integration # Integration tests (MCP protocol)
npm run test:e2e       # E2E tests (requires CAPI credentials)
npm run start:stdio    # Start standalone server (stdio transport)
npm run start:http     # Start standalone server (HTTP/SSE transport)
```

## Testing Philosophy

- **TDD:** Write tests first, implement until green.
- **Tests are the spec.** When starting a new session, run tests to see what's failing.
- **Mock at the HTTP level** using MSW. Don't mock internal interfaces.
- **Fixtures from swagger.** Response fixtures derived from swagger response schemas.
- **No E2E in CI.** E2E requires live CAPI credentials; run manually.

## Important Constraints

- Generated tools in `src/tools/generated/` are AUTO-GENERATED. Never edit by hand.
- The core MCP server (`src/`) has NO dependency on Local/Electron.
- `src/local-addon/` is the ONLY code that imports Local SDK.
- Env vars for auth: `WP_ENGINE_API_USERNAME`, `WP_ENGINE_API_PASSWORD`
- CAPI base URL: `https://api.wpengineapi.com/v1`
- Safety tier overrides are defined in `src/safety.ts`, not in generated code.
