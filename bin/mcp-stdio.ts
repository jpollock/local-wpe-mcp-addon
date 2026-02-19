#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAuthProvider } from '../src/auth.js';
import { createWpeServer } from '../src/server.js';

const authProvider = createAuthProvider();
const wpeServer = createWpeServer({ authProvider });

const transport = new StdioServerTransport();
await wpeServer.connect(transport);

process.stderr.write(
  `WPE MCP Server started (${wpeServer.toolCount} tools, auth: ${authProvider.getAuthMethod()})\n`,
);
