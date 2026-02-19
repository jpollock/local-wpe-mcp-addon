import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { AuthProvider } from './auth.js';
import { CapiClient } from './capi-client.js';
import { allGeneratedTools, type ToolRegistration } from './tools/generated/index.js';

export interface WpeServerConfig {
  authProvider: AuthProvider;
  serverInfo?: { name: string; version: string };
}

export function createWpeServer(config: WpeServerConfig) {
  const { authProvider } = config;
  const serverInfo = config.serverInfo ?? {
    name: '@wpengine/capi-mcp-server',
    version: '0.1.0',
  };

  const client = new CapiClient({ authProvider });

  const server = new Server(serverInfo, {
    capabilities: { tools: {} },
  });

  // Build tool lookup map
  const toolMap = new Map<string, ToolRegistration>();
  for (const tool of allGeneratedTools) {
    toolMap.set(tool.def.name, tool);
  }

  // tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allGeneratedTools.map((t) => ({
      name: t.def.name,
      description: t.def.description,
      inputSchema: {
        type: 'object' as const,
        properties: t.def.inputSchema.properties,
        ...(t.def.inputSchema.required ? { required: t.def.inputSchema.required } : {}),
      },
    })),
  }));

  // tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = toolMap.get(toolName);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
    }

    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    try {
      const result = await tool.handler(args, client);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Tool error: ${message}` }],
        isError: true,
      };
    }
  });

  return {
    server,
    client,
    toolCount: toolMap.size,
    async connect(transport: Transport): Promise<void> {
      await server.connect(transport);
    },
    async close(): Promise<void> {
      await server.close();
    },
  };
}
