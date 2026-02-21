# Contributing

## Development Setup

### Prerequisites

- Node.js 18+
- npm

### Install and build

```bash
npm install
npm run build
```

### Run tests

```bash
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:component # Component tests (mocked CAPI)
```

### Start the server locally

```bash
# stdio transport (for Claude Desktop / Claude Code)
npm run start:stdio

# HTTP/SSE transport
npm run start:http
```

Set `WP_ENGINE_API_USERNAME` and `WP_ENGINE_API_PASSWORD` environment variables for standalone auth.

## Project Structure

The core MCP server (`src/`) is a standalone Node.js process with zero dependency on Local/Electron. The Local addon wrapper lives in `src/local-addon/` and is the only code that imports the Local SDK.

- `src/tools/generated/` — Auto-generated from `data/swagger.json`. **Do not edit by hand.**
- `src/tools/composite/` — Hand-written multi-step tools
- `src/content/` — Markdown content served as MCP resources
- `codegen/` — Code generation scripts
- `test/` — Tests organized by layer (unit, component, integration)
- `docs/` — Project documentation

See `CLAUDE.md` for the full directory layout.

## Code Standards

- **TypeScript strict mode** — No `any` types except in summarizer internals (documented)
- **ESM modules** — All imports use `.js` extensions
- **`wpe_` prefix** — All tool names are prefixed with `wpe_` (ADR-010)
- **No Local/Electron imports in `src/`** — Only `src/local-addon/` may import `@getflywheel/local`

## Making Changes

### Adding a new generated tool

Generated tools come from the swagger spec. To add new ones:

1. Update `data/swagger.json` (or run `npm run fetch-swagger` to pull the latest)
2. Run `npm run codegen` to regenerate `src/tools/generated/`
3. Run `npm run generate-reference` to update `docs/reference/tools.md`
4. Add safety tier overrides in `src/safety.ts` if the tool's HTTP method doesn't reflect its risk level
5. Add a summarizer in `src/summarize.ts` if the tool returns large responses
6. Write tests

### Adding a new composite tool

1. Create a new file in `src/tools/composite/`
2. Export a `ToolRegistration` and add it to `src/tools/composite/index.ts`
3. Register a summarizer in `src/summarize.ts` if needed
4. Update the `INSTRUCTIONS` string in `src/content/index.ts` to reference the new tool
5. Write tests in `test/component/`

### Adding a new MCP resource

1. Add markdown content to `src/content/` (guide) or `src/content/workflows/` (workflow)
2. Update `GUIDE_TOPICS` or the workflow directory in `src/content/index.ts`
3. Reference the new resource URI in relevant workflow docs or INSTRUCTIONS

### Adding a new MCP prompt

1. Add a `PromptDef` entry to the `PROMPTS` array in `src/server.ts`
2. Write tests in `test/component/`

## Testing

### Philosophy

- **TDD** — Write tests first, implement until green
- **Mock at the HTTP level** using [MSW](https://mswjs.io/). Do not mock internal interfaces.
- **Fixtures from swagger** — Response fixtures are derived from swagger response schemas (see `test/fixtures/`)
- **No E2E in CI** — E2E tests require live CAPI credentials; run manually with `npm run test:e2e`

### Test layers

| Layer | Directory | What it tests | Dependencies |
|-------|-----------|---------------|--------------|
| Unit | `test/unit/` | Individual functions (safety, audit, summarize, auth) | None |
| Component | `test/component/` | Tool handlers with mocked CAPI | MSW |
| Integration | `test/integration/` | MCP protocol round-trips | MSW + MCP SDK |
| E2E | `test/` (manual) | Full server against live CAPI | Live credentials |

### Running tests

```bash
npm test                # All tests
npm run test:unit       # Unit only
npm run test:component  # Component only
npm run test:integration # Integration only
npm run test:watch      # Watch mode
```

All tests must pass before merging.

## Drift Detection

The server uses a vendored swagger spec (`data/swagger.json`). To check if the live CAPI has changed:

```bash
npm run drift-check
```

This compares the vendored spec against `https://api.wpengineapi.com/v1/swagger` and reports added, removed, or changed endpoints. If drift is detected, update the vendored spec and re-run codegen.

## Architecture Decision Records

Significant architectural decisions are documented in `docs/decisions.md` as ADRs.

**When to write an ADR:**
- Choosing between multiple viable approaches
- Deviating from an established pattern
- Adding a new architectural component (transport, middleware, etc.)

**Format:** Follow the existing ADR template in `docs/decisions.md` — Status, Context, Decision, Rationale, Consequences.

## Pull Request Process

1. Create a feature branch from `main`
2. Make changes following the code standards above
3. Ensure all tests pass: `npm test`
4. Ensure TypeScript compiles cleanly: `npx tsc --noEmit`
5. Update documentation if your change affects:
   - Tool names or parameters → re-run `npm run generate-reference`
   - INSTRUCTIONS or knowledge content → update `src/content/`
   - Architecture → consider an ADR in `docs/decisions.md`
6. Open a PR with a clear description of what changed and why
