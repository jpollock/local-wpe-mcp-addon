# Workflow: Promote to Production

## When to Use
- Pushing tested staging changes to production
- Deploying after staging QA is complete
- Refreshing production with staging content

## Prerequisites
- Staging install ID (source)
- Production install ID (destination)
- Changes tested and verified on staging

## Steps

1. **Compare environments**
   - Tool: `wpe_environment_diff({ install_id_1: staging_id, install_id_2: production_id })`
   - Check: Review the differences — PHP version, domains, status
   - Present the diff to the user and confirm they want to proceed

2. **Backup production**
   - Tool: `wpe_create_backup({ install_id: production_id, description: "Pre-promotion backup" })`
   - Check: Note the returned backup ID
   - **Important:** Do NOT proceed until the backup is confirmed complete

3. **Verify backup completed**
   - Tool: `wpe_get_backup({ install_id: production_id, backup_id })`
   - Check: Poll until status is "complete" (backups may take several minutes)
   - If status is "failed", STOP and report the failure

4. **Copy staging to production**
   - Tool: `wpe_copy_install({ source_environment_id: staging_id, destination_environment_id: production_id })`
   - **Warning:** This OVERWRITES production's files and database with staging content
   - This is a Tier 3 operation — the user will be asked to confirm
   - The copy is async and may take 10-30 minutes for large sites

5. **Purge caches**
   - Tool: `wpe_purge_cache({ install_id: production_id })`
   - Check: Cache purge completes

6. **Verify production health**
   - Tool: `wpe_diagnose_site({ install_id: production_id })`
   - Check: Install is active, domains resolve, SSL valid
   - Report final status to the user

## Common Issues
- Copy takes too long: Large sites (>5GB) may take 30+ minutes
- Production URLs broken after copy: Database may contain staging URLs — search-replace is needed (requires WP-CLI, not available via CAPI)
- SSL issues after copy: SSL certificates are per-install, not copied. Verify with wpe_get_ssl_certificates
- Want to rollback: Use wpe_create_backup to restore from the pre-promotion backup (backup ID from step 2)

## Related Tools
- `wpe_environment_diff` — compare two installs side by side
- `wpe_copy_install` — copy files and database between installs
- `wpe_create_backup` — create a backup before destructive operations
- `wpe_get_backup` — check backup status
- `wpe_diagnose_site` — post-promotion health check
- `wpe_purge_cache` — clear caches after content changes
