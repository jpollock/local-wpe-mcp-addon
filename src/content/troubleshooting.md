# Troubleshooting Guide

## Diagnostic Approach

When diagnosing issues with a WP Engine install:

1. **Identify the install** — Use `wpe_get_installs` to find the correct install ID
2. **Run diagnostics** — Use `wpe_diagnose_site` for a comprehensive health check
3. **Analyze results** — Check each dimension below

## Common Issues

### High Bandwidth Usage
- Check `wpe_get_install_usage` for bandwidth metrics
- Compare against account limits via `wpe_get_account_limits`
- Look for traffic spikes indicating bot traffic or DDoS
- Consider enabling CDN if not already active

### SSL Certificate Issues
- Use `wpe_get_ssl_certificates` to check certificate status
- Certificates expiring within 30 days need renewal
- Missing certificates: use `wpe_request_ssl_certificate` for Let's Encrypt
- For custom certificates: use `wpe_import_ssl_certificate`

### Missing Backups
- Check `wpe_get_backup` for recent backup status
- If no recent backup: create one with `wpe_create_backup`
- Backups are async — poll for completion

### Domain Configuration Issues
- Use `wpe_get_domains` to list configured domains
- Check for missing primary domain
- Use `wpe_check_domain_status` to verify DNS propagation
- Use `wpe_get_domain_status_report` to retrieve check results

### Cache Issues
- Purge all cache layers with `wpe_purge_cache`
- Specify `type` parameter to target specific layers
- CDN purge may take up to 60 seconds to propagate

### Storage Issues
- Refresh disk usage with `wpe_refresh_install_disk_usage`
- Check storage against account limits
- Consider offload settings for large media files

## Cross-Account Diagnostics

For account-wide health checks:
- `wpe_account_overview` — quick summary of account status
- `wpe_account_ssl_status` — find expiring/missing SSL across all installs
- `wpe_prepare_go_live` — pre-launch checklist for specific installs
