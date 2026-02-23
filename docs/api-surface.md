# WP Engine Customer API Surface

Source: `https://api.wpengineapi.com/v1/swagger` (version 1.10.0)

This document catalogs every CAPI endpoint that will be mapped to an MCP tool.
All tool names use the `wpe_` prefix for namespacing.

---

## Status & Documentation

| Method | Path | MCP Tool Name | Safety Tier |
|---|---|---|---|
| GET | `/status` | `wpe_get_status` | 1 |
| GET | `/swagger` | `wpe_get_swagger` | 1 |

## Account Management

| Method | Path | MCP Tool Name | Safety Tier |
|---|---|---|---|
| GET | `/accounts` | `wpe_get_accounts` | 1 |
| GET | `/accounts/{account_id}` | `wpe_get_account` | 1 |
| GET | `/accounts/{account_id}/limits` | `wpe_get_account_limits` | 1 |

## Account Users

| Method | Path | MCP Tool Name | Safety Tier |
|---|---|---|---|
| GET | `/accounts/{account_id}/account_users` | `wpe_get_account_users` | 1 |
| POST | `/accounts/{account_id}/account_users` | `wpe_create_account_user` | 3 |
| GET | `/accounts/{account_id}/account_users/{user_id}` | `wpe_get_account_user` | 1 |
| PATCH | `/accounts/{account_id}/account_users/{user_id}` | `wpe_update_account_user` | 2 |
| DELETE | `/accounts/{account_id}/account_users/{user_id}` | `wpe_delete_account_user` | 3 |

## Usage

| Method | Path | MCP Tool Name | Safety Tier |
|---|---|---|---|
| GET | `/accounts/{account_id}/usage` | `wpe_get_account_usage` | 1 |
| POST | `/accounts/{account_id}/usage/refresh_disk_usage` | `wpe_refresh_account_disk_usage` | 2 |
| GET | `/accounts/{account_id}/usage/summary` | `wpe_get_account_usage_summary` | 1 |
| GET | `/accounts/{account_id}/usage/insights` | `wpe_get_account_usage_insights` | 1 |
| GET | `/installs/{install_id}/usage` | `wpe_get_install_usage` | 1 |
| POST | `/installs/{install_id}/usage/refresh_disk_usage` | `wpe_refresh_install_disk_usage` | 2 |

## Sites

| Method | Path | MCP Tool Name | Safety Tier |
|---|---|---|---|
| GET | `/sites` | `wpe_get_sites` | 1 |
| POST | `/sites` | `wpe_create_site` | 3 |
| GET | `/sites/{site_id}` | `wpe_get_site` | 1 |
| PATCH | `/sites/{site_id}` | `wpe_update_site` | 2 |
| DELETE | `/sites/{site_id}` | `wpe_delete_site` | 3 |

## Installs

| Method | Path | MCP Tool Name | Safety Tier |
|---|---|---|---|
| GET | `/installs` | `wpe_get_installs` | 1 |
| POST | `/installs` | `wpe_create_install` | 3 |
| GET | `/installs/{install_id}` | `wpe_get_install` | 1 |
| PATCH | `/installs/{install_id}` | `wpe_update_install` | 2 |
| DELETE | `/installs/{install_id}` | `wpe_delete_install` | 3 |
| POST | `/install_copy` | `wpe_copy_install` | 3 |

## Domains

| Method | Path | MCP Tool Name | Safety Tier |
|---|---|---|---|
| GET | `/installs/{install_id}/domains` | `wpe_get_domains` | 1 |
| POST | `/installs/{install_id}/domains` | `wpe_create_domain` | 2 |
| POST | `/installs/{install_id}/domains/bulk` | `wpe_create_domains_bulk` | 2 |
| GET | `/installs/{install_id}/domains/{domain_id}` | `wpe_get_domain` | 1 |
| PATCH | `/installs/{install_id}/domains/{domain_id}` | `wpe_update_domain` | 2 |
| DELETE | `/installs/{install_id}/domains/{domain_id}` | `wpe_delete_domain` | 3 |
| POST | `/installs/{install_id}/domains/{domain_id}/check_status` | `wpe_check_domain_status` | 1 |
| GET | `/installs/{install_id}/domains/check_status/{report_id}` | `wpe_get_domain_status_report` | 1 |

## SSL Certificates

| Method | Path | MCP Tool Name | Safety Tier |
|---|---|---|---|
| GET | `/installs/{install_id}/ssl_certificates` | `wpe_get_ssl_certificates` | 1 |
| GET | `/installs/{install_id}/domains/{domain_id}/ssl_certificate` | `wpe_get_domain_ssl_certificate` | 1 |
| POST | `/installs/{install_id}/domains/{domain_id}/ssl_certificate` | `wpe_request_ssl_certificate` | 2 |
| POST | `/installs/{install_id}/ssl_certificates/third_party` | `wpe_import_ssl_certificate` | 2 |

## Backups

| Method | Path | MCP Tool Name | Safety Tier |
|---|---|---|---|
| POST | `/installs/{install_id}/backups` | `wpe_create_backup` | 2 |
| GET | `/installs/{install_id}/backups/{backup_id}` | `wpe_get_backup` | 1 |

## Cache

| Method | Path | MCP Tool Name | Safety Tier |
|---|---|---|---|
| POST | `/installs/{install_id}/purge_cache` | `wpe_purge_cache` | 2 |

## Offload Settings

| Method | Path | MCP Tool Name | Safety Tier |
|---|---|---|---|
| GET | `/installs/{install_id}/offload_settings/largefs_validation_file` | `wpe_get_largefs_validation` | 1 |
| GET | `/installs/{install_id}/offload_settings/files` | `wpe_get_offload_settings` | 1 |
| POST | `/installs/{install_id}/offload_settings/files` | `wpe_configure_offload_settings` | 2 |
| PATCH | `/installs/{install_id}/offload_settings/files` | `wpe_update_offload_settings` | 2 |

---

## Composite Tools

Hand-written tools that chain multiple API calls. Also `wpe_` prefixed.

| Tool | Description | Inputs | Fan-Out |
|---|---|---|---|
| `wpe_account_overview` | Account details + plan limits + usage summary + site/install counts | `account_id` | No |
| `wpe_account_usage` | Bandwidth, visits, storage with insights and top consumers | `account_id`, `date_range?` | No |
| `wpe_account_domains` | All domains across all installs, grouped by environment, SSL status | `account_id` | Yes — per install |
| `wpe_account_backups` | Backup recency per environment, flag gaps | `account_id` | Yes — per install |
| `wpe_account_ssl_status` | Cert status per domain, flag expiring/missing | `account_id` | Yes — per install |
| `wpe_account_environments` | Full environment topology map | `account_id` | Minimal |
| `wpe_diagnose_site` | Health snapshot: usage + domains + SSL + cache + backups | `install_id` | Multiple per-install calls |
| `wpe_setup_staging` | Create staging from production | `site_id`, `source_install_id` | Sequential mutations |
| `wpe_prepare_go_live` | Pre-launch checklist verification | `install_id` | Multiple per-install calls |
| `wpe_environment_diff` | Side-by-side comparison of two environments | `install_id_a`, `install_id_b` | Parallel — two installs |
| `wpe_user_audit` | Cross-account user audit with deduplication and warnings | _(none)_ | Yes — per account |
| `wpe_add_user_to_accounts` | Add user to multiple accounts | `email`, `first_name`, `last_name`, `roles`, `account_ids`, `install_ids?` | Sequential — per account |
| `wpe_remove_user_from_accounts` | Remove user from accounts (last-owner protected) | `email`, `account_ids?` | Sequential — per account |
| `wpe_update_user_role` | Change user role on an account (last-owner protected) | `email`, `account_id`, `roles`, `install_ids?` | No |

---

## Summary

- **1:1 tools:** 50 (auto-generated from swagger)
- **Composite tools:** 16 (hand-written)
- **Total MCP tools:** 66
- **Tier 1 (read):** 24+
- **Tier 2 (modify):** 12+
- **Tier 3 (destructive):** 10+
- **Composite (mixed):** 16
