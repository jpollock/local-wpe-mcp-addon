# Workflow: Go Live

## When to Use
- Launching a new site to production
- Switching a staging site to production
- Verifying production readiness

## Prerequisites
- Install ID of the environment going live
- DNS access for domain configuration
- All content and configuration finalized

## Steps

1. **Run pre-launch checklist**
   - Tool: `wpe_prepare_go_live({ install_id })`
   - Check: All items pass or have acceptable warnings

2. **Verify domains are configured**
   - Tool: `wpe_get_domains({ install_id })`
   - Check: Primary domain is set, all expected domains present

3. **Verify SSL certificates**
   - Tool: `wpe_get_ssl_certificates({ install_id })`
   - Check: Valid certificates for all domains, none expiring soon

4. **Create a pre-launch backup**
   - Tool: `wpe_create_backup({ install_id, description: "Pre-launch backup" })`
   - Check: Backup completes successfully

5. **Update DNS records**
   - Point domain DNS to WP Engine (manual step)
   - Tool: `wpe_check_domain_status({ install_id, domain_id })` to verify propagation

6. **Purge all caches**
   - Tool: `wpe_purge_cache({ install_id })`
   - Check: Site loads correctly on production domain

## Common Issues
- DNS propagation delay: May take up to 48 hours, typically under 1 hour
- SSL certificate not ready: Request via `wpe_request_ssl_certificate` and wait
- Mixed content warnings: Check for hardcoded HTTP URLs in content

## Related Tools
- `wpe_diagnose_site` — comprehensive health check
- `wpe_account_ssl_status` — verify SSL across all installs
