# Roadmap

## Current State

**v0.1.0** — Feature-complete initial release.

- 60 tools (50 generated from CAPI swagger + 10 composite)
- 251 tests across unit, component, and integration layers
- 11 summarizers for large-response tools
- 6 MCP prompts for guided workflows
- 8 knowledge resources (guides + workflows)
- Dual transport (stdio + HTTP/SSE)
- 3-tier safety system with confirmation tokens
- Structured audit logging
- Local addon with OAuth + standalone with env var auth
- Drift detection for API changes

## Known Limitations

These are constraints of the current CAPI, not implementation gaps:

- **No backup listing endpoint** — The CAPI supports creating backups and getting status by ID, but has no endpoint to list backups for an install. Backup auditing is not possible until this endpoint exists.
- **No webhook support** — Status changes (provisioning complete, backup done) require polling. The CAPI does not push notifications.
- **No WordPress admin operations** — Plugin/theme management, content editing, and WP-CLI are outside CAPI scope.
- **No billing/plan management** — Account plan changes are not exposed by the CAPI.
- **Async provisioning** — Site and install creation is asynchronous with no completion callback. Agents must poll.

## Potential Future Work

These are ideas under consideration, not commitments.

### Webhook-Driven Notifications

If the CAPI adds webhook support, the server could notify agents when provisioning completes, backups finish, or SSL certificates are issued — eliminating polling.

### WordPress Admin Operations

If WP Engine exposes WP-CLI or WordPress admin capabilities through an API, the server could add tools for plugin management, theme updates, and content operations.

### Multi-User HTTP Transport

The current HTTP transport uses a single set of credentials. Multi-user support would allow the server to authenticate requests per-user, enabling shared deployments.

### Audit Log Browsing

A tool or resource that lets agents query the audit log directly — "what operations were run in the last hour?" — for accountability and debugging.

### Additional CAPI Endpoints

The drift detection system (`npm run drift-check`) monitors for new CAPI endpoints. When new endpoints appear, the codegen pipeline can absorb them with a single `npm run codegen` invocation, making expansion low-effort.

## API Evolution

The server tracks the CAPI swagger spec through:

1. **Vendored spec** — `data/swagger.json` is checked into the repo
2. **Drift detection** — `npm run drift-check` compares the vendored spec against the live API
3. **Codegen** — `npm run codegen` regenerates tools from the spec

When the CAPI adds new endpoints, updating coverage is: fetch new spec → codegen → add safety overrides if needed → add summarizers if needed → test.
