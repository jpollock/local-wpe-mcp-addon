# Workflow: Staging Refresh

## When to Use
- Refreshing staging with latest production data
- Testing changes against current production content
- Setting up a new staging environment from production

## Prerequisites
- Source install ID (typically production)
- Destination install ID (staging), or create a new one
- Recent backup of the destination install

## Steps

1. **Verify source install**
   - Tool: `wpe_get_install({ install_id: source_id })`
   - Check: Confirm this is the correct production install

2. **Backup the destination** (if it exists)
   - Tool: `wpe_create_backup({ install_id: destination_id, description: "Pre-refresh backup" })`
   - Check: Backup completes before proceeding

3. **Copy production to staging**
   - Tool: `wpe_copy_install({ source_install_id, destination_install_id })`
   - Check: Copy operation starts (this is async)
   - **Warning:** This OVERWRITES the destination's files and database

4. **Verify the copy**
   - Tool: `wpe_get_install({ install_id: destination_id })`
   - Check: Install is accessible and data matches production

5. **Verify domains**
   - Tool: `wpe_get_domains({ install_id: destination_id })`
   - Check: Staging domains are correctly configured

## Common Issues
- Copy takes too long: Large sites may take 30+ minutes
- Staging URLs broken: Update WordPress URLs if domain differs from production
- Search-replace needed: Database may contain production URLs

## Related Tools
- `wpe_setup_staging` — automated staging creation + copy
- `wpe_environment_diff` — compare production vs staging
