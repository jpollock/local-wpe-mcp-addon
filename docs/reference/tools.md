# WP Engine CAPI MCP Server — Tool Reference

> Auto-generated from swagger.json and composite tool definitions.

## Summary

- **Generated tools:** 50
- **Composite tools:** 12
- **Total tools:** 62

## Generated Tools (CAPI 1:1)

| Tool | Description | Safety | Category |
|------|-------------|--------|----------|
| `wpe_check_domain_status` | Submit a status report for a domain | Mutating | Domain |
| `wpe_configure_offload_settings` | Configure offload settings for an install | Mutating | Offload Settings |
| `wpe_copy_install` | Copy the full file system and database from one WordPress installation to anothe | Mutating | Install |
| `wpe_create_account_user` | Create a new account user | Mutating | Account User |
| `wpe_create_backup` | Requests a new backup of a WordPress installation | Mutating | Backup |
| `wpe_create_domain` | Add a new domain or redirect to an existing install | Mutating | Domain |
| `wpe_create_domains_bulk` | Add multiple domains and redirects to an existing install | Mutating | Domain |
| `wpe_create_install` | Create a new WordPress installation | Mutating | Install |
| `wpe_create_site` | Create a new site | Mutating | Site |
| `wpe_create_ssh_key` | Add a new SSH key | Mutating | SSH Key |
| `wpe_delete_account_user` | Delete an account user | Destructive | Account User |
| `wpe_delete_domain` | Delete a specific domain for an install | Destructive | Domain |
| `wpe_delete_install` | Delete an install by ID | Destructive | Install |
| `wpe_delete_site` | Delete a site | Destructive | Site |
| `wpe_delete_ssh_key` | Delete an existing SSH key | Destructive | SSH Key |
| `wpe_get_account` | Get an account by ID | Read-only | Account |
| `wpe_get_account_limits` | Fetch account usage limits | Read-only | Account |
| `wpe_get_account_usage` | Get account usage metrics | Read-only | Usage |
| `wpe_get_account_usage_insights` | Get account usage insights | Read-only | Usage |
| `wpe_get_account_usage_summary` | Get account level usage summary | Read-only | Usage |
| `wpe_get_account_user` | Get an account user by ID | Read-only | Account User |
| `wpe_get_account_users` | List your account users | Read-only | Account User |
| `wpe_get_accounts` | List your WP Engine accounts | Read-only | Account |
| `wpe_get_backup` | Retrieves the status of a backup of a WordPress installation | Read-only | Backup |
| `wpe_get_current_user` | Get the current user | Read-only | User |
| `wpe_get_domain` | Get a specific domain for an install | Read-only | Domain |
| `wpe_get_domain_ssl_certificate` | Get SSL certificate information for a domain | Read-only | Certificates |
| `wpe_get_domain_status_report` | Retrieve a status report for a domain | Read-only | Domain |
| `wpe_get_domains` | Get the domains for an install by install id | Read-only | Domain |
| `wpe_get_install` | Get an install by ID | Read-only | Install |
| `wpe_get_install_usage` | Get a list of daily usage metrics | Read-only | Usage |
| `wpe_get_installs` | List your WordPress installations | Read-only | Install |
| `wpe_get_largefs_validation` | Get the validation file needed to configure LargeFS | Read-only | Offload Settings |
| `wpe_get_offload_settings` | Get the offload settings for an install | Read-only | Offload Settings |
| `wpe_get_site` | Get a site by ID | Read-only | Site |
| `wpe_get_sites` | List your sites | Read-only | Site |
| `wpe_get_ssh_keys` | Get your SSH keys | Read-only | SSH Key |
| `wpe_get_ssl_certificates` | List SSL certificates for an install | Read-only | Certificates |
| `wpe_get_status` | The status of the WP Engine Hosting Platform API | Read-only | Status |
| `wpe_get_swagger` | The current swagger specification | Read-only | Swagger |
| `wpe_import_ssl_certificate` | Import third-party SSL certificate for an install | Mutating | Certificates |
| `wpe_purge_cache` | Purge an install's cache | Mutating | Cache |
| `wpe_refresh_account_disk_usage` | Refresh Disk Usage for all installs associated with account | Mutating | Usage |
| `wpe_refresh_install_disk_usage` | Refresh disk usage for the given WordPress site environment | Mutating | Usage |
| `wpe_request_ssl_certificate` | Request a Let's Encrypt Certificate for a legacy domain | Mutating | Certificates |
| `wpe_update_account_user` | Update an account user | Mutating | Account User |
| `wpe_update_domain` | Update an existing domain for an install | Mutating | Domain |
| `wpe_update_install` | Update a WordPress installation | Mutating | Install |
| `wpe_update_offload_settings` | Update specific offload settings for an install | Mutating | Offload Settings |
| `wpe_update_site` | Change a site name | Mutating | Site |

## Composite Tools

| Tool | Description | Safety | Category |
|------|-------------|--------|----------|
| `wpe_account_domains` | List all domains across all installs in an account, grouped by install with SSL  | Read-only | Composite |
| `wpe_account_environments` | Build a topology map of all sites and installs in an account, showing environmen | Read-only | Composite |
| `wpe_account_overview` | Get a comprehensive overview of a WP Engine account: details, limits, usage summ | Read-only | Composite |
| `wpe_account_ssl_status` | Check SSL certificate status across all installs in an account, flagging expirin | Read-only | Composite |
| `wpe_account_usage` | Get account usage metrics with insights and trends. | Read-only | Composite |
| `wpe_diagnose_site` | Run a comprehensive health check on a single install: usage, domains, and SSL. | Read-only | Composite |
| `wpe_environment_diff` | Compare two installs side-by-side: configuration, domains, and usage differences | Read-only | Composite |
| `wpe_fleet_health` | Run a health assessment across all accounts. Checks SSL certificates, capacity h | Read-only | Composite |
| `wpe_portfolio_overview` | Get a consolidated view of all accounts, sites, and installs the user has access | Read-only | Composite |
| `wpe_portfolio_usage` | Get usage metrics across all accounts, ranked by visits. Use for cross-account q | Read-only | Composite |
| `wpe_prepare_go_live` | Run a pre-launch checklist for an install: verify domains and SSL certificates. | Read-only | Composite |
| `wpe_promote_to_production` | Promote staging to production. Creates a backup of production, copies staging fi | Destructive | Composite |

## Detailed Reference

### Account

### `wpe_get_account`

Get an account by ID

- **Method:** `GET`
- **Path:** `/accounts/{account_id}`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | Yes | path | ID of account |

### `wpe_get_account_limits`

Fetch account usage limits

- **Method:** `GET`
- **Path:** `/accounts/{account_id}/limits`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | Yes | path | ID of account |

### `wpe_get_accounts`

List your WP Engine accounts

- **Method:** `GET`
- **Path:** `/accounts`
- **Safety:** Read-only

### Account User

### `wpe_create_account_user`

Create a new account user

- **Method:** `POST`
- **Path:** `/accounts/{account_id}/account_users`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | Yes | path | ID of account |
| `user` | object | Yes | body | The user that will be created |

### `wpe_delete_account_user`

Delete an account user

- **Method:** `DELETE`
- **Path:** `/accounts/{account_id}/account_users/{user_id}`
- **Safety:** Destructive

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | Yes | path | ID of account |
| `user_id` | string | Yes | path | ID of the user |

### `wpe_get_account_user`

Get an account user by ID

- **Method:** `GET`
- **Path:** `/accounts/{account_id}/account_users/{user_id}`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | Yes | path | ID of account |
| `user_id` | string | Yes | path | ID of the user |

### `wpe_get_account_users`

List your account users

- **Method:** `GET`
- **Path:** `/accounts/{account_id}/account_users`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | Yes | path | ID of account |

### `wpe_update_account_user`

Update an account user

- **Method:** `PATCH`
- **Path:** `/accounts/{account_id}/account_users/{user_id}`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | Yes | path | ID of account |
| `user_id` | string | Yes | path | ID of the user |
| `roles` | string | Yes | body | choose from 'owner', 'full,billing', 'full', 'partial,billing', and 'partial' |
| `install_ids` | array | No | body |  |

### Backup

### `wpe_create_backup`

Requests a new backup of a WordPress installation

- **Method:** `POST`
- **Path:** `/installs/{install_id}/backups`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |
| `description` | string | Yes | body | A description of this backup. |
| `notification_emails` | array | Yes | body | The email address(es) that will receive an email once the backup has completed. |

### `wpe_get_backup`

Retrieves the status of a backup of a WordPress installation

- **Method:** `GET`
- **Path:** `/installs/{install_id}/backups/{backup_id}`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |
| `backup_id` | string | Yes | path | ID of backup |

### Cache

### `wpe_purge_cache`

Purge an install's cache

- **Method:** `POST`
- **Path:** `/installs/{install_id}/purge_cache`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |
| `type` | string | Yes | body |  |

### Certificates

### `wpe_get_domain_ssl_certificate`

Get SSL certificate information for a domain

- **Method:** `GET`
- **Path:** `/installs/{install_id}/domains/{domain_id}/ssl_certificate`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |
| `domain_id` | string | Yes | path | ID of domain |

### `wpe_get_ssl_certificates`

List SSL certificates for an install

- **Method:** `GET`
- **Path:** `/installs/{install_id}/ssl_certificates`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |

### `wpe_import_ssl_certificate`

Import third-party SSL certificate for an install

- **Method:** `POST`
- **Path:** `/installs/{install_id}/ssl_certificates/third_party`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |
| `certificate` | string | Yes | body | Base64 encoded PEM certificate chain including the end-entity certificate and all intermediate CA certificates |
| `private_key` | string | Yes | body | The corresponding base64 encoded PEM private key |

### `wpe_request_ssl_certificate`

Request a Let's Encrypt Certificate for a legacy domain

- **Method:** `POST`
- **Path:** `/installs/{install_id}/domains/{domain_id}/ssl_certificate`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |
| `domain_id` | string | Yes | path | ID of domain |

### Domain

### `wpe_check_domain_status`

Submit a status report for a domain

- **Method:** `POST`
- **Path:** `/installs/{install_id}/domains/{domain_id}/check_status`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |
| `domain_id` | string | Yes | path | ID of domain |

### `wpe_create_domain`

Add a new domain or redirect to an existing install

- **Method:** `POST`
- **Path:** `/installs/{install_id}/domains`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |
| `name` | string | Yes | body |  |
| `primary` | boolean | No | body |  |
| `redirect_to` | string | No | body |  |

### `wpe_create_domains_bulk`

Add multiple domains and redirects to an existing install

- **Method:** `POST`
- **Path:** `/installs/{install_id}/domains/bulk`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |
| `domains` | array | Yes | body |  |

### `wpe_delete_domain`

Delete a specific domain for an install

- **Method:** `DELETE`
- **Path:** `/installs/{install_id}/domains/{domain_id}`
- **Safety:** Destructive

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |
| `domain_id` | string | Yes | path | ID of domain |

### `wpe_get_domain`

Get a specific domain for an install

- **Method:** `GET`
- **Path:** `/installs/{install_id}/domains/{domain_id}`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |
| `domain_id` | string | Yes | path | ID of domain |

### `wpe_get_domain_status_report`

Retrieve a status report for a domain

- **Method:** `GET`
- **Path:** `/installs/{install_id}/domains/check_status/{report_id}`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path |  |
| `report_id` | string | Yes | path |  |

### `wpe_get_domains`

Get the domains for an install by install id

- **Method:** `GET`
- **Path:** `/installs/{install_id}/domains`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |

### `wpe_update_domain`

Update an existing domain for an install

- **Method:** `PATCH`
- **Path:** `/installs/{install_id}/domains/{domain_id}`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | The install ID |
| `domain_id` | string | Yes | path | ID of domain |
| `primary` | boolean | No | body |  |
| `redirect_to` | string | No | body |  |
| `secure_all_urls` | boolean | No | body |  |

### Install

### `wpe_copy_install`

Copy the full file system and database from one WordPress installation to another

- **Method:** `POST`
- **Path:** `/install_copy`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `source_environment_id` | string | Yes | body | The ID of the environment to copy from |
| `destination_environment_id` | string | Yes | body | The ID of the environment to copy to |
| `notification_emails` | array | No | body | An array of email addresses to notify when the copy is complete |
| `custom_options` | object | No | body | Optional fields to customize how the install should be copied |

### `wpe_create_install`

Create a new WordPress installation

- **Method:** `POST`
- **Path:** `/installs`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `name` | string | Yes | body | The name of the install |
| `account_id` | string | Yes | body | The ID of the account that the install will belong to |
| `site_id` | string | No | body | The ID of the site that the install will belong to |
| `environment` | string | No | body | The site environment that the install will fill |

### `wpe_delete_install`

Delete an install by ID

- **Method:** `DELETE`
- **Path:** `/installs/{install_id}`
- **Safety:** Destructive

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |

### `wpe_get_install`

Get an install by ID

- **Method:** `GET`
- **Path:** `/installs/{install_id}`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |

### `wpe_get_installs`

List your WordPress installations

- **Method:** `GET`
- **Path:** `/installs`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | No | query | (Optional) The uuid of an account |

### `wpe_update_install`

Update a WordPress installation

- **Method:** `PATCH`
- **Path:** `/installs/{install_id}`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | The install ID |
| `site_id` | string | No | body | The site ID |
| `environment` | string | No | body |  |

### Offload Settings

### `wpe_configure_offload_settings`

Configure offload settings for an install

- **Method:** `POST`
- **Path:** `/installs/{install_id}/offload_settings/files`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |

### `wpe_get_largefs_validation`

Get the validation file needed to configure LargeFS

- **Method:** `GET`
- **Path:** `/installs/{install_id}/offload_settings/largefs_validation_file`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |

### `wpe_get_offload_settings`

Get the offload settings for an install

- **Method:** `GET`
- **Path:** `/installs/{install_id}/offload_settings/files`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |

### `wpe_update_offload_settings`

Update specific offload settings for an install

- **Method:** `PATCH`
- **Path:** `/installs/{install_id}/offload_settings/files`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | ID of install |

### Site

### `wpe_create_site`

Create a new site

- **Method:** `POST`
- **Path:** `/sites`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `name` | string | Yes | body |  |
| `account_id` | string | Yes | body | The account ID |

### `wpe_delete_site`

Delete a site

- **Method:** `DELETE`
- **Path:** `/sites/{site_id}`
- **Safety:** Destructive

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `site_id` | string | Yes | path | The ID of the site to delete *(For accounts with sites enabled)* |

### `wpe_get_site`

Get a site by ID

- **Method:** `GET`
- **Path:** `/sites/{site_id}`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `site_id` | string | Yes | path | The site ID |

### `wpe_get_sites`

List your sites

- **Method:** `GET`
- **Path:** `/sites`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | No | query | (Optional) The uuid of an account |

### `wpe_update_site`

Change a site name

- **Method:** `PATCH`
- **Path:** `/sites/{site_id}`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `site_id` | string | Yes | path | The ID of the site to change the name of *(For accounts with sites enabled)* |
| `name` | string | No | body | The new site name |

### SSH Key

### `wpe_create_ssh_key`

Add a new SSH key

- **Method:** `POST`
- **Path:** `/ssh_keys`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `public_key` | string | Yes | body |  |

### `wpe_delete_ssh_key`

Delete an existing SSH key

- **Method:** `DELETE`
- **Path:** `/ssh_keys/{ssh_key_id}`
- **Safety:** Destructive

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `ssh_key_id` | string | Yes | path | The ID of the SSH key to delete |

### `wpe_get_ssh_keys`

Get your SSH keys

- **Method:** `GET`
- **Path:** `/ssh_keys`
- **Safety:** Read-only

### Status

### `wpe_get_status`

The status of the WP Engine Hosting Platform API

- **Method:** `GET`
- **Path:** `/status`
- **Safety:** Read-only

### Swagger

### `wpe_get_swagger`

The current swagger specification

- **Method:** `GET`
- **Path:** `/swagger`
- **Safety:** Read-only

### Usage

### `wpe_get_account_usage`

Get account usage metrics

- **Method:** `GET`
- **Path:** `/accounts/{account_id}/usage`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | Yes | path | ID of account |
| `first_date` | string | No | query | The start date for the requested metrics range (inclusive).
Format: `YYYY-mm-dd`. Cannot be older than 13 months.
If `first_date` is provided, `last_date` must also be provided. |
| `last_date` | string | No | query | The end date for the requested metrics range (inclusive).
Format: `YYYY-mm-dd`.
If `last_date` is provided, `first_date` must also be provided. |

### `wpe_get_account_usage_insights`

Get account usage insights

- **Method:** `GET`
- **Path:** `/accounts/{account_id}/usage/insights`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | Yes | path | ID of account |
| `first_date` | string | No | query | The start date for the requested metrics range (inclusive).
Format: `YYYY-mm-dd`. Cannot be older than 13 months.
If `first_date` is provided, `last_date` must also be provided. |
| `last_date` | string | No | query | The end date for the requested metrics range (inclusive).
Format: `YYYY-mm-dd`.
If `last_date` is provided, `first_date` must also be provided. |

### `wpe_get_account_usage_summary`

Get account level usage summary

- **Method:** `GET`
- **Path:** `/accounts/{account_id}/usage/summary`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | Yes | path | ID of account |
| `first_date` | string | No | query | The start date for the requested metrics range (inclusive).
Format: `YYYY-mm-dd`. Cannot be older than 13 months.
If `first_date` is provided, `last_date` must also be provided. |
| `last_date` | string | No | query | The end date for the requested metrics range (inclusive).
Format: `YYYY-mm-dd`.
If `last_date` is provided, `first_date` must also be provided. |

### `wpe_get_install_usage`

Get a list of daily usage metrics

- **Method:** `GET`
- **Path:** `/installs/{install_id}/usage`
- **Safety:** Read-only

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | The UUID of the install. |
| `first_date` | string | No | query | The start date for the requested metrics range (inclusive).
Format: `YYYY-mm-dd`. Cannot be older than 13 months.
If `first_date` is provided, `last_date` must also be provided. |
| `last_date` | string | No | query | The end date for the requested metrics range (inclusive).
Format: `YYYY-mm-dd`.
If `last_date` is provided, `first_date` must also be provided. |

### `wpe_refresh_account_disk_usage`

Refresh Disk Usage for all installs associated with account

- **Method:** `POST`
- **Path:** `/accounts/{account_id}/usage/refresh_disk_usage`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `account_id` | string | Yes | path | The unique identifier (UUID) of the account. |

### `wpe_refresh_install_disk_usage`

Refresh disk usage for the given WordPress site environment

- **Method:** `POST`
- **Path:** `/installs/{install_id}/usage/refresh_disk_usage`
- **Safety:** Mutating

**Parameters:**

| Name | Type | Required | Location | Description |
|------|------|----------|----------|-------------|
| `install_id` | string | Yes | path | The UUID of the install. |

### User

### `wpe_get_current_user`

Get the current user

- **Method:** `GET`
- **Path:** `/user`
- **Safety:** Read-only

### Composite Tools

### `wpe_account_domains`

List all domains across all installs in an account, grouped by install with SSL status.

- **Safety:** Read-only
- **Type:** Composite tool

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `account_id` | string | Yes | The account ID |

### `wpe_account_environments`

Build a topology map of all sites and installs in an account, showing environment types and PHP versions.

- **Safety:** Read-only
- **Type:** Composite tool

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `account_id` | string | Yes | The account ID |

### `wpe_account_overview`

Get a comprehensive overview of a WP Engine account: details, limits, usage summary, and site/install counts.

- **Safety:** Read-only
- **Type:** Composite tool

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `account_id` | string | Yes | The account ID |

### `wpe_account_ssl_status`

Check SSL certificate status across all installs in an account, flagging expiring or missing certificates.

- **Safety:** Read-only
- **Type:** Composite tool

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `account_id` | string | Yes | The account ID |

### `wpe_account_usage`

Get account usage metrics with insights and trends.

- **Safety:** Read-only
- **Type:** Composite tool

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `account_id` | string | Yes | The account ID |

### `wpe_diagnose_site`

Run a comprehensive health check on a single install: usage, domains, and SSL.

- **Safety:** Read-only
- **Type:** Composite tool

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `install_id` | string | Yes | The install ID to diagnose |

### `wpe_environment_diff`

Compare two installs side-by-side: configuration, domains, and usage differences.

- **Safety:** Read-only
- **Type:** Composite tool

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `install_id_a` | string | Yes | First install ID |
| `install_id_b` | string | Yes | Second install ID |

### `wpe_fleet_health`

Run a health assessment across all accounts. Checks SSL certificates, capacity headroom, PHP version consistency, and install status. Returns prioritized issues ranked by severity.

- **Safety:** Read-only
- **Type:** Composite tool

### `wpe_portfolio_overview`

Get a consolidated view of all accounts, sites, and installs the user has access to. Use for cross-account questions like "how many sites do I have?" or "what PHP versions am I running?"

- **Safety:** Read-only
- **Type:** Composite tool

### `wpe_portfolio_usage`

Get usage metrics across all accounts, ranked by visits. Use for cross-account questions like "what are my most visited sites?" or "which sites use the most storage?"

- **Safety:** Read-only
- **Type:** Composite tool

### `wpe_prepare_go_live`

Run a pre-launch checklist for an install: verify domains and SSL certificates.

- **Safety:** Read-only
- **Type:** Composite tool

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `install_id` | string | Yes | The install ID to check |

### `wpe_promote_to_production`

Promote staging to production. Creates a backup of production, copies staging files and database to production, purges cache, and verifies health. Use instead of wpe_copy_install for staging-to-production promotions.

- **Safety:** Destructive
- **Type:** Composite tool

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `staging_install_id` | string | Yes | The staging install ID (source) |
| `production_install_id` | string | Yes | The production install ID (destination) |
| `notification_emails` | array | No | Email addresses to notify when the copy completes |
