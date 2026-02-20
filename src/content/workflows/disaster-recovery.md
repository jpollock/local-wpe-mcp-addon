# Workflow: Disaster Recovery

## When to Use
- Site is down or showing errors
- Data loss suspected
- Need to restore from backup
- Verifying backup readiness

## Prerequisites
- Install ID of the affected environment
- Access to WP Engine account

## Steps

1. **Assess the situation**
   - Tool: `wpe_diagnose_site({ install_id })`
   - Check: Identify what's broken (domains, SSL, data)

2. **Check backup availability**
   - Tool: `wpe_get_backup({ install_id, backup_id })` or check via `wpe_diagnose_site`
   - Check: Identify the most recent clean backup

3. **Create a snapshot of current state** (if possible)
   - Tool: `wpe_create_backup({ install_id, description: "Pre-recovery snapshot" })`
   - This preserves the current broken state for investigation

4. **Restore from backup**
   - Backup restoration is done through the WP Engine User Portal
   - Use the backup ID identified in step 2

5. **Verify recovery**
   - Tool: `wpe_diagnose_site({ install_id })`
   - Check: All health dimensions pass
   - Tool: `wpe_get_domains({ install_id })` — verify domains are working
   - Tool: `wpe_get_ssl_certificates({ install_id })` — verify SSL is valid

6. **Purge caches**
   - Tool: `wpe_purge_cache({ install_id })`
   - Check: Site loads correctly

## Common Issues
- No recent backup: Create regular backups as preventive measure
- Partial recovery needed: Consider copying to staging first to extract data
- DNS issues after recovery: Check domain configuration hasn't changed

## Related Tools
- `wpe_create_backup` — create a backup of an install
- `wpe_get_backup` — check backup status
- `wpe_create_install` — create a staging install to test recovery before applying to production
