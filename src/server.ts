import { randomBytes } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { AuthProvider } from './auth.js';
import { CapiClient } from './capi-client.js';
import { allGeneratedTools, type ToolRegistration } from './tools/generated/index.js';
import { getToolSafety } from './safety.js';
import { createAuditLogger } from './audit.js';

export interface WpeServerConfig {
  authProvider: AuthProvider;
  serverInfo?: { name: string; version: string };
  auditLogPath?: string;
}

export function createWpeServer(config: WpeServerConfig) {
  const { authProvider } = config;
  const serverInfo = config.serverInfo ?? {
    name: '@wpengine/capi-mcp-server',
    version: '0.1.0',
  };

  const client = new CapiClient({ authProvider });
  const auditLogger = createAuditLogger(config.auditLogPath);

  // Pending confirmation tokens: token → toolName (single-use)
  const pendingTokens = new Map<string, string>();

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
    const safety = getToolSafety(toolName, tool.def.annotations.httpMethod);
    const startTime = Date.now();

    // Tier 3: check for confirmation token
    if (safety.tier === 3) {
      const token = args._confirmationToken as string | undefined;

      if (!token) {
        // Generate confirmation prompt
        const confirmationToken = randomBytes(16).toString('hex');
        pendingTokens.set(confirmationToken, toolName);

        const duration_ms = Date.now() - startTime;
        auditLogger.log({
          timestamp: new Date().toISOString(),
          toolName,
          tier: safety.tier,
          params: args,
          confirmed: null,
          result: 'confirmation_required',
          duration_ms,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              requiresConfirmation: true,
              tier: 3,
              action: safety.confirmationMessage,
              warning: 'This action may not be reversible. Please confirm to proceed.',
              preChecks: safety.preChecks,
              confirmationToken,
            }, null, 2),
          }],
        };
      }

      // Validate token
      const expectedTool = pendingTokens.get(token);
      if (expectedTool !== toolName) {
        const duration_ms = Date.now() - startTime;
        auditLogger.log({
          timestamp: new Date().toISOString(),
          toolName,
          tier: safety.tier,
          params: args,
          confirmed: false,
          result: 'error',
          error: 'Invalid or expired confirmation token',
          duration_ms,
        });

        return {
          content: [{ type: 'text', text: 'Invalid or expired confirmation token. Please request a new confirmation.' }],
          isError: true,
        };
      }

      // Consume the token (single-use)
      pendingTokens.delete(token);
    }

    // Strip internal params before passing to handler
    const handlerArgs = { ...args };
    delete handlerArgs._confirmationToken;

    try {
      const result = await tool.handler(handlerArgs, client);
      const duration_ms = Date.now() - startTime;

      auditLogger.log({
        timestamp: new Date().toISOString(),
        toolName,
        tier: safety.tier,
        params: args,
        confirmed: safety.tier === 3 ? true : null,
        result: 'success',
        duration_ms,
      });

      const text = result === undefined ? 'Operation completed successfully.' : JSON.stringify(result, null, 2);
      return {
        content: [{ type: 'text', text }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const duration_ms = Date.now() - startTime;

      auditLogger.log({
        timestamp: new Date().toISOString(),
        toolName,
        tier: safety.tier,
        params: args,
        confirmed: safety.tier === 3 ? true : null,
        result: 'error',
        error: message,
        duration_ms,
      });

      return {
        content: [{ type: 'text', text: `Tool error: ${message}` }],
        isError: true,
      };
    }
  });

  return {
    server,
    client,
    auditLogger,
    toolCount: toolMap.size,
    async connect(transport: Transport): Promise<void> {
      await server.connect(transport);
    },
    async close(): Promise<void> {
      await auditLogger.flush();
      await server.close();
    },
  };
}
