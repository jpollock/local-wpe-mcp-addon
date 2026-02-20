# Workflow: New Environment Setup

## When to Use
- Setting up a new WordPress site from scratch
- Adding a staging or development environment to an existing site

## Prerequisites
- Account ID with available site/install capacity
- Desired site name and environment type

## Steps

1. **Create the site** (if new)
   - Tool: `wpe_create_site({ name, account_id })`
   - Check: Note the returned `site_id`

2. **Create the install**
   - Tool: `wpe_create_install({ name, account_id, site_id, environment })`
   - Check: Note the returned `install_id`

3. **Wait for provisioning**
   - Tool: `wpe_get_install({ install_id })`
   - Check: Poll until install status is "active" — provisioning is async and may take several minutes
   - **Important:** Do NOT proceed until the install is active

4. **Configure domains**
   - Tool: `wpe_create_domain({ install_id, name, primary: true })`
   - Check: Domain appears in `wpe_get_domains`

5. **Request SSL certificate**
   - Tool: `wpe_request_ssl_certificate({ install_id, domain_id })`
   - Check: Certificate status via `wpe_get_ssl_certificates`

6. **Verify the setup**
   - Tool: `wpe_diagnose_site({ install_id })`
   - Check: All health checks pass

## Common Issues
- "Account limit reached": Check `wpe_get_account_limits` and upgrade if needed
- SSL provisioning delay: Let's Encrypt certificates may take a few minutes

## Related Tools
- `wpe_account_overview` — check account capacity before creating
- `wpe_prepare_go_live` — run checklist before going live
