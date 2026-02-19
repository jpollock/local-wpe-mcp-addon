#!/usr/bin/env node
import { createAuthProvider } from '../src/auth.js';
import { createWpeServer } from '../src/server.js';
import { startHttpServer } from '../src/http-server.js';

const authProvider = createAuthProvider();
const wpeServer = createWpeServer({ authProvider });

const handle = await startHttpServer(wpeServer);

process.stderr.write(
  `WPE MCP HTTP Server started (${wpeServer.toolCount} tools, auth: ${authProvider.getAuthMethod()})\n` +
  `  Endpoint: ${handle.endpoint}\n` +
  `  Token: ${handle.token}\n`,
);

// Graceful shutdown
function shutdown() {
  handle.close().then(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
