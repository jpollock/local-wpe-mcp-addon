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

### If staging install already exists (refresh)

1. **Verify source install**
   - Tool: `wpe_get_install({ install_id: source_id })`
   - Check: Confirm this is the correct production install

2. **Backup the destination**
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

### If creating a new staging install

1. **Verify source install**
   - Tool: `wpe_get_install({ install_id: source_id })`
   - Check: Confirm this is the correct production install

2. **Create the staging install**
   - Tool: `wpe_create_install({ name, account_id, site_id, environment: "staging" })`
   - Check: Note the returned `install_id`

3. **Wait for provisioning**
   - Tool: `wpe_get_install({ install_id: new_install_id })`
   - Check: Poll until install status is "active" — provisioning is async and may take several minutes
   - **Important:** Do NOT proceed until the install is active

4. **Copy production to staging**
   - Tool: `wpe_copy_install({ source_install_id, destination_install_id: new_install_id })`
   - Check: Copy operation starts

5. **Verify the copy and domains**
   - Tool: `wpe_get_install({ install_id: new_install_id })`
   - Tool: `wpe_get_domains({ install_id: new_install_id })`
   - Check: Install is accessible, domains are configured

## Common Issues
- Copy takes too long: Large sites may take 30+ minutes
- Staging URLs broken: Update WordPress URLs if domain differs from production
- Search-replace needed: Database may contain production URLs

## Related Tools
- `wpe_create_install` — create a new staging install
- `wpe_copy_install` — copy data between installs
- `wpe_environment_diff` — compare production vs staging
