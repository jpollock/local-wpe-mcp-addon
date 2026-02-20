# Changelog

## 0.1.0

Initial release of the WP Engine CAPI MCP Server.

### Features

- **60 tools** — 50 generated 1:1 mappings from the WP Engine Customer API (accounts, sites, installs, domains, backups, SSL certificates, SSH keys, cache, usage metrics, offload settings) + 10 composite tools
- **10 composite tools** — account overview, account usage, account domains, SSL status, account environments, diagnose site, prepare go-live, environment diff, portfolio overview, portfolio usage
- **3-tier safety system** — Read-only (Tier 1), mutating (Tier 2), destructive (Tier 3) with confirmation tokens for Tier 3 operations
- **Summarization layer** — 11 summarizers that condense large responses by default, preventing context overflow in AI clients. Opt out with `summary=false`.
- **Portfolio tools** — Cross-account aggregation via `wpe_portfolio_overview` and `wpe_portfolio_usage` for users with multiple WP Engine accounts
- **Audit logging** — All tool calls logged with timing, parameters (sensitive values redacted), and results
- **Knowledge layer** — MCP resources for domain model, safety, troubleshooting guides, and 5 workflow guides (go-live, staging refresh, domain migration, disaster recovery, new environment)
- **Entity browser** — MCP resource templates for browsing accounts, sites, and installs
- **6 MCP prompts** — Pre-built prompts for diagnose-site, account-health, setup-staging, go-live-checklist, domain-migration, security-review
- **Dual transport** — stdio and HTTP/SSE with session token authentication
- **Local addon integration** — OAuth via Local's wpeOAuth service with env var fallback
- **Drift detection** — Script to detect API changes between vendored and live swagger specs
- **Auto-generated tool reference** — Complete markdown reference from swagger + composite definitions

### Deviations from Original Spec

- **Removed `wpe_account_backups`** — CAPI has no list-backups endpoint
- **Removed `wpe_setup_staging`** — Install provisioning is async; composite can't wait. The `setup-staging` prompt guides through individual steps instead.
- **Added `wpe_portfolio_overview` and `wpe_portfolio_usage`** — Multi-account aggregation was originally out of scope but proved essential
- **Added summarization layer** — Not in original spec; discovered necessary when raw responses exceeded 1MB

See `docs/deviations.md` for the complete deviation record.
