# Troubleshooting

## Authentication Failures

### "No authentication configured"

The server couldn't find credentials.

**Fix:** Set both environment variables:
```bash
export WP_ENGINE_API_USERNAME="your-api-username"
export WP_ENGINE_API_PASSWORD="your-api-password"
```

Verify they're set: `echo $WP_ENGINE_API_USERNAME`

### "Authentication failed (401)"

Credentials are present but invalid or expired.

**Fix:**
- Verify credentials at [WP Engine User Portal > API Access](https://my.wpengine.com/api_access)
- Regenerate credentials if expired
- If using Local addon, re-authenticate via Local's WP Engine connection

### "Access denied (403)"

The authenticated user doesn't have permission for the requested resource.

**Fix:**
- Verify the user has access to the target account/site
- Check user roles in WP Engine User Portal

## Rate Limiting

### "Rate limited (429)"

The server automatically retries with exponential backoff (up to 3 retries). If you still see 429 errors:

**Fix:**
- Wait a few seconds and try again
- Avoid running multiple portfolio/composite tools concurrently
- Use `summary=true` (default) to reduce the number of API calls

## Tool Result Too Large

### Context overflow or truncated results

Large accounts (100+ installs) can produce responses that exceed AI client limits.

**Fix:**
- Use `summary=true` (default) — this strips verbose data and keeps key identifiers
- Use composite tools instead of listing + iterating (e.g., `wpe_portfolio_overview` instead of calling `wpe_get_accounts` + `wpe_get_sites` for each)
- For detailed data on specific installs, use `summary=false` with targeted queries

## Missing Tools

### Tools don't appear in AI client

**Fix:**
1. Restart the AI client (Claude Desktop, Claude Code)
2. Verify the MCP server config path is absolute and correct
3. Test the server directly: `npx tsx bin/mcp-stdio.ts` — should print tool count to stderr
4. Check for JSON syntax errors in the config file
5. Ensure `npx` and `tsx` are in your PATH

### Tool returns "Unknown tool"

The tool name may be misspelled. All tools use the `wpe_` prefix (e.g., `wpe_get_accounts`, not `get_accounts`).

## Confirmation Flow

### "Invalid or expired confirmation token"

Tier 3 (destructive) tools require a two-step confirmation:
1. First call returns a `confirmationToken`
2. Second call includes `_confirmationToken` with that value

Tokens are single-use and scoped to the specific tool. If you get this error:
- The token may have already been used
- The token may have been used with a different tool
- Request a new confirmation by calling the tool again without `_confirmationToken`

## Server Won't Start

### "Cannot find module"

**Fix:**
```bash
npm install    # Install dependencies
npm run build  # Compile TypeScript
```

### Port already in use (HTTP mode)

**Fix:** Kill the existing process or use a different port.

## Getting Help

- Check the [tool reference](../reference/tools.md) for correct tool names and parameters
- Read workflow guides via MCP resources (e.g., `wpengine://guide/workflows/go-live`)
- File issues at the project repository
