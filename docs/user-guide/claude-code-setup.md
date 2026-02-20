# Claude Code Setup

## Configuration

### Option 1: CLI command

```bash
claude mcp add wpengine -- npx tsx /absolute/path/to/local-wpe-mcp-addon/bin/mcp-stdio.ts
```

### Option 2: Settings file

Add to `.claude/settings.json` (project-level) or `~/.claude/settings.json` (global):

```json
{
  "mcpServers": {
    "wpengine": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/local-wpe-mcp-addon/bin/mcp-stdio.ts"]
    }
  }
}
```

### Environment Variables

Set in your shell profile (`.zshrc`, `.bashrc`, etc.):

```bash
export WP_ENGINE_API_USERNAME="your-api-username"
export WP_ENGINE_API_PASSWORD="your-api-password"
```

Claude Code inherits environment variables from your shell.

## Verification

Start a Claude Code session and ask:

> "Use wpe_get_current_user to verify my WP Engine connection"

## Usage

Claude Code can use all 60 WP Engine tools. Common queries:

```
> Show me all my WP Engine sites
> Diagnose the production install abc123
> What's the SSL status across my account xyz?
> Compare the staging and production installs
```

## Tips

- Claude Code automatically discovers tool schemas, including `summary` and `_confirmationToken` parameters
- For destructive operations (Tier 3), Claude Code will show the confirmation prompt and ask before proceeding
- Portfolio tools (`wpe_portfolio_overview`, `wpe_portfolio_usage`) work across all your accounts

## Troubleshooting

If the MCP server doesn't connect:
1. Verify env vars are set: `echo $WP_ENGINE_API_USERNAME`
2. Test the server directly: `npx tsx /path/to/bin/mcp-stdio.ts`
3. Check Claude Code's MCP status: `/mcp`

See [Troubleshooting](troubleshooting.md) for more.
