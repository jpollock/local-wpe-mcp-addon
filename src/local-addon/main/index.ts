import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAuthProvider } from '../../auth.js';
import { createWpeServer } from '../../server.js';
import { startHttpServer, type HttpServerHandle } from '../../http-server.js';
import type { AddonMainContext, LocalMainStatic } from '../types.js';

interface AddonStatus {
  running: boolean;
  authMethod: string;
  toolCount: number;
  endpoint: string | null;
}

export default function main(
  context: AddonMainContext,
  LocalMain: LocalMainStatic,
): void {
  let httpHandle: HttpServerHandle | undefined;
  let status: AddonStatus = {
    running: false,
    authMethod: 'none',
    toolCount: 0,
    endpoint: null,
  };

  async function start() {
    // Get OAuth service from Local's service container
    const services = LocalMain.getServiceContainer().cradle;

    const authProvider = createAuthProvider({
      oauthProvider: services.wpeOAuth,
    });

    const wpeServer = createWpeServer({ authProvider });

    // Start HTTP transport
    httpHandle = await startHttpServer(wpeServer);

    // Start stdio transport (for direct MCP client connections)
    const stdioTransport = new StdioServerTransport();
    await wpeServer.connect(stdioTransport);

    status = {
      running: true,
      authMethod: authProvider.getAuthMethod(),
      toolCount: wpeServer.toolCount,
      endpoint: httpHandle.endpoint,
    };

    process.stderr.write(
      `WPE CAPI MCP Server started (${wpeServer.toolCount} tools)\n` +
      `  HTTP: ${httpHandle.endpoint}\n` +
      `  Auth: ${authProvider.getAuthMethod()}\n`,
    );
  }

  // Register IPC handler for status queries from renderer
  context.ipcMain.handle('wpe-capi-mcp:status', () => status);

  // Start the server
  start().catch((err) => {
    process.stderr.write(`WPE CAPI MCP Server failed to start: ${err}\n`);
  });
}
