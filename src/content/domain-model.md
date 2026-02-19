# WP Engine Domain Model

## Entity Hierarchy

```
Account
 └── Site (logical grouping)
      └── Install (WordPress environment)
           ├── Domains
           ├── Backups
           ├── SSL Certificates
           └── Offload Settings
```

## Key Concepts

### Account
- Billing unit. Has plan limits (sites, storage, bandwidth).
- One user can belong to multiple accounts.
- Account users have roles and permissions.
- Use `wpe_get_accounts` to list, `wpe_get_account` for details, `wpe_get_account_limits` for plan limits.

### Site
- Logical container for related WordPress environments.
- Typically has production + staging + development installs.
- **Deleting a site deletes ALL its installs.** This is irreversible.
- Use `wpe_get_sites` to list, filter by `account_id`.

### Install
- A single WordPress environment (production, staging, or development).
- Has its own domains, PHP version, cache settings.
- `environment` field: "production", "staging", or "development".
- `install_copy` overwrites the TARGET install's files and database.
- Use `wpe_get_installs` to list, filter by `account_id`.

### Domains
- Each install can have multiple domains.
- One domain is "primary" — used for WordPress site URL.
- Domains can be redirects (301/302 to primary).
- SSL certificates are per-domain or per-install.
- Use `wpe_get_domains` to list domains for an install.

### Backups
- Point-in-time snapshots of an install's files and database.
- Created on-demand via `wpe_create_backup` or by WP Engine's automated schedule.
- Creating a backup is async — poll `wpe_get_backup` for completion status.

### Cache
- Three layers: object cache, page cache, CDN cache.
- Cache purge via `wpe_purge_cache` can target specific layers or all.
- CDN purge propagates to all edge nodes (may take up to 60 seconds).

### SSL Certificates
- Let's Encrypt certificates are auto-provisioned for most domains.
- Third-party certificates can be imported via `wpe_import_ssl_certificate`.
- Check expiration dates — certificates expiring within 30 days need attention.

### Usage
- Bandwidth, visits, and storage metrics available at account and install level.
- Use `wpe_get_account_usage` or `wpe_get_install_usage` for metrics.
- Disk usage can be refreshed via `wpe_refresh_account_disk_usage`.
