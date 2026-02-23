# Example Prompts

This cookbook shows what to ask your AI assistant and what happens behind the scenes. Each example notes which tools or resources the agent uses.

## Getting Oriented

### See all your accounts

> "Show me all my WP Engine accounts"

The agent calls `wpe_get_accounts` and lists your accounts with their IDs and names.

### Portfolio overview

> "How many sites and installs do I have across all accounts?"

The agent calls `wpe_portfolio_overview`, which fans out across all your accounts and returns totals plus per-account breakdowns (sites, installs, environments, PHP versions).

### Explore a specific account

> "Show me everything about account abc123"

The agent calls `wpe_account_overview` to get a summary including site count, install count, account limits, and user count.

### Find an install by name

> "Which install is running mysite.com?"

The agent calls `wpe_get_installs` (or `wpe_portfolio_overview` for multi-account) and matches the domain to an install.

---

## Site Health

### Diagnose an install

> "Diagnose install abc123 — is anything wrong?"

The agent calls `wpe_diagnose_site`, which checks the install details, usage metrics, domains, and SSL status in a single call. It flags issues like missing SSL, traffic anomalies, or storage concerns.

### Run a go-live checklist

> "Run a go-live checklist for install abc123"

The agent calls `wpe_prepare_go_live`, which verifies domains are configured, SSL certificates are active, and the install is in a healthy state. Each check is reported as pass/fail/warning.

### Compare two environments

> "Compare the staging and production installs for my site"

The agent calls `wpe_environment_diff` with both install IDs. It shows differences in PHP version, WordPress version, domains, and environment settings.

---

## Domain Management

### List domains on an install

> "What domains are on install abc123?"

The agent calls `wpe_get_domains` with the install ID.

### Add a domain

> "Add example.com to install abc123"

The agent calls `wpe_create_domain` with the install ID and domain name. This is a Tier 2 (modify) operation.

### Check domains across an account

> "Show me all domains across all installs in account abc123"

The agent calls `wpe_account_domains`, which fans out to every install and collects domain lists.

### Migrate to a new domain

> "Migrate install abc123 from old.com to new.com"

This is a multi-step workflow. The agent reads the `wpengine://guide/workflows/domain-migration` resource, then:
1. Checks current domains with `wpe_get_domains`
2. Adds the new domain with `wpe_create_domain`
3. Requests an SSL certificate with `wpe_create_certificate`
4. Sets the new domain as primary with `wpe_update_domain`

---

## Staging

### Set up a staging environment

> "Set up a staging environment for install abc123 on site xyz"

The agent reads `wpengine://guide/workflows/staging-refresh` and follows these steps:
1. Creates a staging install with `wpe_create_install` (Tier 3 — requires confirmation)
2. Polls `wpe_get_install` until the new install status is "active" (provisioning is async)
3. Copies data from production with `wpe_copy_install` (Tier 3 — requires confirmation)
4. Verifies with `wpe_diagnose_site`

### Refresh staging from production

> "Refresh the staging install from production"

The agent calls `wpe_copy_install` with the production install as source and staging as destination. This is a Tier 3 operation that requires confirmation because it overwrites the destination.

### Fleet health check

> "What needs attention across all my accounts?"

The agent calls `wpe_fleet_health`, which checks SSL certificates, capacity headroom, PHP version consistency, and install status across every account. It returns a scored, prioritized list of issues grouped by severity (critical, warning, info).

### Promote staging to production

> "Promote staging to production for my site"

The agent calls `wpe_promote_to_production` with the staging and production install IDs. This is a Tier 3 operation that requires confirmation. Once confirmed, it runs the full sequence server-side:
1. Fetches both installs and diffs their configuration
2. Creates a backup of production
3. Copies staging files and database to production
4. Purges the production cache
5. Verifies the production install post-copy

If the backup fails, the copy is not attempted. If the copy fails, the backup ID is returned so you can restore.

---

## Security Review

### Check SSL status across an account

> "Check SSL certificates across all installs in account abc123"

The agent calls `wpe_account_ssl_status`, which checks every install for certificate presence, expiration dates, and issues.

### Review user access

> "Who has access to account abc123?"

The agent calls `wpe_get_account_users` to list all users, their roles, MFA status, and install access.

### Full security review

> "Run a security review for account abc123"

The agent uses the `security-review` MCP prompt, which checks SSL certificates across all installs and reviews user access levels.

---

## User Management

### Audit all users across accounts

> "Who has access across all my accounts?"

The agent calls `wpe_user_audit`, which fans out across all accounts, collects users, deduplicates by email, and flags security concerns (no MFA, pending invites). Each user entry shows which accounts they appear on and their role per account.

### Add a user to multiple accounts

> "Add alice@example.com to accounts acc-1, acc-2, and acc-3 as a full user"

The agent calls `wpe_add_user_to_accounts` with the email, name, role, and account IDs. This is a Tier 3 operation that requires confirmation. Accounts where the user already exists are skipped (not treated as errors).

### Remove a user from all accounts

> "Remove bob@example.com from all accounts"

The agent calls `wpe_remove_user_from_accounts` with just the email. This is a Tier 3 operation that requires confirmation. The tool discovers all accounts, finds the user by email on each, and removes them. If the user is the last owner of an account, that account is skipped with a warning.

### Change a user's role

> "Change alice@example.com's role to partial on account acc-1"

The agent calls `wpe_update_user_role` with the email, account ID, and new role. This is a Tier 3 operation. If Alice is the last owner and you're demoting her, the tool refuses with an error explaining that ownership must be transferred first.

---

## Cross-Account / Portfolio

### Traffic ranking

> "Which installs have the most traffic across all my accounts?"

The agent calls `wpe_portfolio_usage`, which collects usage data from every account and ranks installs by visit count.

### Storage usage

> "Show storage usage across all accounts"

The agent calls `wpe_portfolio_usage`, which includes storage metrics alongside traffic data.

### Account usage details

> "Show bandwidth and storage for account abc123"

The agent calls `wpe_account_usage`, which retrieves usage metrics for all installs in the account and highlights the highest consumers.

---

## MCP Prompts

The server includes 6 pre-built prompt templates that guide the AI through common workflows. These are available in AI clients that support MCP prompts (e.g., Claude Desktop).

### diagnose-site

**Arguments:** `install_id` (required)

Runs a health check on a specific install. The agent uses `wpe_diagnose_site` and reads `wpengine://guide/troubleshooting` for diagnostic patterns.

> Invoke: select the "diagnose-site" prompt and enter the install ID

### account-health

**Arguments:** `account_id` (required)

Assesses overall health of an account. The agent uses `wpe_account_overview` and `wpe_account_ssl_status` to flag installs that need attention.

> Invoke: select the "account-health" prompt and enter the account ID

### setup-staging

**Arguments:** `source_install_id` (required), `site_id` (required), `account_id` (required)

Guides through creating a staging environment: create install, wait for provisioning, copy data from source, verify.

> Invoke: select the "setup-staging" prompt and provide all three IDs

### go-live-checklist

**Arguments:** `install_id` (required)

Runs a pre-launch verification checklist covering domains, SSL, and install health. Reports each check as pass/fail/warning.

> Invoke: select the "go-live-checklist" prompt and enter the install ID

### domain-migration

**Arguments:** `install_id` (required), `new_domain` (required)

Walks through migrating an install to a new domain: check current domains, add new domain, configure DNS, request SSL, set primary.

> Invoke: select the "domain-migration" prompt and provide the install ID and new domain

### security-review

**Arguments:** `account_id` (required)

Reviews SSL certificates and user access across all installs in an account. Flags expiring certificates, missing SSL, and reviews access levels.

> Invoke: select the "security-review" prompt and enter the account ID

---

## Tips

- **Summarization is on by default.** Most tools return condensed responses. If you need full detail for a specific install, ask the agent to use `summary=false`.
- **Tier 3 operations require confirmation.** Destructive actions (deletes, copies, site/install creation) will prompt for confirmation before executing.
- **Use composite tools for broad queries.** Instead of asking for data install-by-install, use portfolio or account-level composite tools.
- **Provisioning is async.** After creating installs or sites, the agent needs to poll until the status is "active" before performing further operations.
