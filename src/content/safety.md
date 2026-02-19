# Safety Guide

## Tier Classification

### Tier 1 — Read (no confirmation needed)
All GET operations. Safe to call freely.
- get_accounts, get_account, get_account_limits
- get_sites, get_site
- get_installs, get_install
- get_domains, get_domain, get_domain_status_report
- get_backup, get_ssl_certificates, get_domain_ssl_certificate
- get_account_usage, get_install_usage, get_account_usage_summary, get_account_usage_insights
- get_offload_settings, get_largefs_validation
- get_ssh_keys, get_status, get_swagger, get_current_user
- All composite read tools (account_overview, diagnose_site, etc.)

### Tier 2 — Modify (logged)
- update_site, update_install, update_domain, update_account_user
- purge_cache (affects live site performance temporarily)
- create_backup (consumes backup slot)
- request_ssl_certificate, import_ssl_certificate
- create_domain, create_domains_bulk
- configure/update offload settings
- refresh_account_disk_usage, refresh_install_disk_usage
- create_ssh_key, delete_ssh_key
- check_domain_status

### Tier 3 — Destructive (requires confirmation)
- **delete_site** — DELETES ALL INSTALLS IN THE SITE
- **delete_install** — permanently removes WordPress environment
- **delete_domain** — removes domain routing
- **delete_account_user** — removes user access
- **create_site** — provisions billable infrastructure
- **create_install** — provisions billable infrastructure
- **copy_install** — OVERWRITES target install's files and database
- **create_account_user** — grants access to account
- **setup_staging** — creates install and copies data

## Pre-Check Requirements

### Before delete_site
- Confirm no production installs (or user explicitly acknowledges)
- List all installs that will be deleted
- Verify recent backup exists for each install

### Before delete_install
- Check install.environment — warn loudly if "production"
- Verify recent backup exists
- List domains that will become orphaned

### Before copy_install
- Identify source and target environments
- Warn that target will be OVERWRITTEN (files + database)
- Verify backup of target exists

### Before create_site / create_install
- Check account limits (may incur additional billing)
- Confirm intended account

### Before create_account_user
- Verify the user email is correct
- Confirm the intended access level and role
