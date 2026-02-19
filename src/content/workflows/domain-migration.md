# Workflow: Domain Migration

## When to Use
- Moving a site to a new domain name
- Adding a new primary domain and retiring the old one
- Consolidating multiple domains

## Prerequisites
- Install ID of the target environment
- New domain name with DNS access
- Current domain list for the install

## Steps

1. **Check current domains**
   - Tool: `wpe_get_domains({ install_id })`
   - Check: Note current primary domain and all configured domains

2. **Add the new domain**
   - Tool: `wpe_create_domain({ install_id, name: "newdomain.com" })`
   - Check: Domain appears in domain list

3. **Configure DNS for new domain**
   - Point new domain DNS to WP Engine (manual step)
   - Tool: `wpe_check_domain_status({ install_id, domain_id })` to verify
   - Tool: `wpe_get_domain_status_report({ install_id, report_id })` for results

4. **Request SSL for new domain**
   - Tool: `wpe_request_ssl_certificate({ install_id, domain_id })`
   - Check: Certificate provisions successfully

5. **Set new domain as primary**
   - Tool: `wpe_update_domain({ install_id, domain_id, primary: true })`
   - Check: New domain shows as primary

6. **Configure old domain as redirect** (optional)
   - Tool: `wpe_update_domain({ install_id, domain_id: old_domain_id, redirect_to: new_domain_id })`
   - Or remove the old domain entirely

7. **Remove old domain** (if not redirecting)
   - Tool: `wpe_delete_domain({ install_id, domain_id: old_domain_id })`

## Common Issues
- DNS not propagated: Wait and re-check with `wpe_check_domain_status`
- SSL not provisioning: Ensure DNS points to WP Engine before requesting
- WordPress URLs need updating: Update site URL in WordPress settings

## Related Tools
- `wpe_account_domains` — view all domains across the account
- `wpe_account_ssl_status` — verify SSL status after migration
