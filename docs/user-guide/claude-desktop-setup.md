# Claude Desktop Setup

## Configuration

1. Open the Claude Desktop configuration file:

   **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the WP Engine MCP server:

```json
{
  "mcpServers": {
    "wpengine": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/local-wpe-mcp-addon/bin/mcp-stdio.ts"],
      "env": {
        "WP_ENGINE_API_USERNAME": "your-api-username",
        "WP_ENGINE_API_PASSWORD": "your-api-password"
      }
    }
  }
}
```

Replace `/absolute/path/to/local-wpe-mcp-addon` with the actual path to your clone of this repository.

3. **Restart Claude Desktop** — The MCP server is loaded on startup.

## Verification

After restarting, you should see the WP Engine tools in Claude Desktop's tool list (hammer icon). Ask:

> "Use wpe_get_current_user to check my WP Engine connection"

## Using Prompts

Claude Desktop supports MCP prompts. Access them from the prompt picker:

- **diagnose-site** — Health check for one install
- **account-health** — Overall account health assessment
- **setup-staging** — Guided staging environment creation
- **go-live-checklist** — Pre-launch verification
- **domain-migration** — Guided domain migration
- **security-review** — SSL + user access review

## Tips

- Start with `wpe_portfolio_overview` to see all your accounts at once
- Use composite tools (e.g., `wpe_diagnose_site`) instead of making multiple individual calls
- The server returns summarized data by default. Ask for `summary=false` if you need full detail
- Read workflow guides via resources: "Read the go-live workflow guide"

## Troubleshooting

If tools don't appear:
1. Check the config file for JSON syntax errors
2. Verify the path to `bin/mcp-stdio.ts` is absolute and correct
3. Ensure `npx` and `tsx` are available in your PATH
4. Check Claude Desktop logs for connection errors

See [Troubleshooting](troubleshooting.md) for more.
