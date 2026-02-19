# Changelog

## 0.1.0

Initial release of the WP Engine CAPI MCP Server.

### Features

- **50 generated tools** — 1:1 mappings from the WP Engine Customer API (accounts, sites, installs, domains, backups, SSL certificates, SSH keys, cache, usage metrics, offload settings)
- **10 composite tools** — Higher-level operations: account overview, account usage, account domains, account backups, SSL status, account environments, diagnose site, setup staging, prepare go-live, environment diff
- **3-tier safety system** — Read-only (Tier 1), mutating (Tier 2), destructive (Tier 3) with confirmation tokens for Tier 3 operations
- **Audit logging** — All tool calls logged with timing, parameters (sensitive values redacted), and results
- **Knowledge layer** — MCP resources for domain model, safety, troubleshooting guides, and 5 workflow guides (go-live, staging refresh, domain migration, disaster recovery, new environment)
- **Entity browser** — MCP resource templates for browsing accounts, sites, and installs
- **6 MCP prompts** — Pre-built prompts for diagnose-site, account-health, setup-staging, go-live-checklist, domain-migration, security-review
- **Dual transport** — stdio and HTTP/SSE with session token authentication
- **Local addon integration** — OAuth via Local's wpeOAuth service with env var fallback
- **Drift detection** — Script to detect API changes between vendored and live swagger specs
- **Auto-generated tool reference** — 975-line markdown reference from swagger + composite definitions
