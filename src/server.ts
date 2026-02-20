import { randomBytes } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { AuthProvider } from './auth.js';
import { CapiClient } from './capi-client.js';
import { allGeneratedTools, type ToolRegistration } from './tools/generated/index.js';
import { allCompositeTools } from './tools/composite/index.js';
import { getToolSafety } from './safety.js';
import { createAuditLogger } from './audit.js';
import { hasSummarizer, applySummarization } from './summarize.js';
import {
  INSTRUCTIONS,
  getGuideContent,
  getWorkflowContent,
  listWorkflows,
} from './content/index.js';

export interface WpeServerConfig {
  authProvider: AuthProvider;
  serverInfo?: { name: string; version: string };
  auditLogPath?: string;
}

// --- Resource definitions ---

interface ResourceDef {
  uri: string;
  name: string;
  description: string;
}

const GUIDE_TOPICS = ['domain-model', 'safety', 'troubleshooting'];

function buildStaticResources(): ResourceDef[] {
  const resources: ResourceDef[] = [];

  for (const topic of GUIDE_TOPICS) {
    resources.push({
      uri: `wpengine://guide/${topic}`,
      name: `WP Engine Guide: ${topic}`,
      description: `Guide content for ${topic}`,
    });
  }

  for (const workflow of listWorkflows()) {
    resources.push({
      uri: `wpengine://guide/workflows/${workflow}`,
      name: `Workflow: ${workflow}`,
      description: `Step-by-step guide for ${workflow}`,
    });
  }

  return resources;
}

// Resource templates for entity browser (parameterized URIs)
const RESOURCE_TEMPLATES = [
  { uriTemplate: 'wpengine://account/{account_id}', name: 'Account details', description: 'Get details for a specific account' },
  { uriTemplate: 'wpengine://account/{account_id}/sites', name: 'Account sites', description: 'List sites for an account' },
  { uriTemplate: 'wpengine://install/{install_id}', name: 'Install details', description: 'Get details for a specific install' },
];

// --- Prompt definitions ---

interface PromptDef {
  name: string;
  description: string;
  arguments: Array<{ name: string; description: string; required: boolean }>;
  template: (args: Record<string, string>) => string;
}

const PROMPTS: PromptDef[] = [
  {
    name: 'diagnose-site',
    description: 'Diagnose performance and health issues for a WP Engine install',
    arguments: [{ name: 'install_id', description: 'The install ID to diagnose', required: true }],
    template: (args) =>
      `Diagnose the WP Engine install ${args.install_id}. Use the wpe_diagnose_site tool to get a health snapshot, then analyze the results. Check for: traffic anomalies, missing SSL, backup gaps, storage concerns. Read wpengine://guide/troubleshooting for diagnostic patterns.`,
  },
  {
    name: 'account-health',
    description: 'Assess overall health of a WP Engine account',
    arguments: [{ name: 'account_id', description: 'The account ID to assess', required: true }],
    template: (args) =>
      `Assess the health of WP Engine account ${args.account_id}. Use wpe_account_overview for a summary, then check wpe_account_ssl_status for SSL issues. Flag any installs that need attention.`,
  },
  {
    name: 'setup-staging',
    description: 'Guide through creating a staging environment',
    arguments: [
      { name: 'source_install_id', description: 'The production install to copy from', required: true },
      { name: 'site_id', description: 'The site to create staging under', required: true },
      { name: 'account_id', description: 'The account ID', required: true },
    ],
    template: (args) =>
      `Set up a staging environment for install ${args.source_install_id} on site ${args.site_id} (account ${args.account_id}). Read wpengine://guide/workflows/staging-refresh for the workflow. Steps: 1) Create a staging install with wpe_create_install (environment: "staging"), 2) Poll wpe_get_install until the install status is "active" (provisioning is async and may take several minutes), 3) Copy data from the source with wpe_copy_install, 4) Verify with wpe_diagnose_site.`,
  },
  {
    name: 'go-live-checklist',
    description: 'Run a pre-launch verification checklist',
    arguments: [{ name: 'install_id', description: 'The install ID going live', required: true }],
    template: (args) =>
      `Run a go-live checklist for install ${args.install_id}. Use wpe_prepare_go_live to check domains, SSL, and backups. Read wpengine://guide/workflows/go-live for the full workflow. Report each check as pass/fail/warning.`,
  },
  {
    name: 'domain-migration',
    description: 'Guide through migrating to a new domain',
    arguments: [
      { name: 'install_id', description: 'The install ID to migrate', required: true },
      { name: 'new_domain', description: 'The new domain name', required: true },
    ],
    template: (args) =>
      `Migrate install ${args.install_id} to domain ${args.new_domain}. Read wpengine://guide/workflows/domain-migration for the step-by-step process. Check current domains with wpe_get_domains, add the new domain, configure DNS, request SSL, then set as primary.`,
  },
  {
    name: 'security-review',
    description: 'Review SSL certificates and user access for an account',
    arguments: [{ name: 'account_id', description: 'The account ID to review', required: true }],
    template: (args) =>
      `Perform a security review of account ${args.account_id}. Check SSL certificate status across all installs using wpe_account_ssl_status. Review account users with wpe_get_account_users. Flag expiring certificates, missing SSL, and review user access levels. Read wpengine://guide/safety for safety guidelines.`,
  },
];

// --- Server factory ---

export function createWpeServer(config: WpeServerConfig) {
  const { authProvider } = config;
  const serverInfo = config.serverInfo ?? {
    name: '@wpengine/capi-mcp-server',
    version: '0.1.0',
  };

  const client = new CapiClient({ authProvider });
  const auditLogger = createAuditLogger(config.auditLogPath);

  // Pending confirmation tokens: token → { toolName, params, createdAt } (single-use, 5-min TTL)
  const TOKEN_TTL_MS = 5 * 60 * 1000;
  const pendingTokens = new Map<string, { toolName: string; params: Record<string, unknown>; createdAt: number }>();

  const server = new Server(serverInfo, {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
    instructions: INSTRUCTIONS,
  });

  // Build tool lookup map (generated + composite)
  const allTools: ToolRegistration[] = [...allGeneratedTools, ...allCompositeTools];
  const toolMap = new Map<string, ToolRegistration>();
  for (const tool of allTools) {
    toolMap.set(tool.def.name, tool);
  }

  // --- Tool handlers ---

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map((t) => {
      const isSummarizable = hasSummarizer(t.def.name);
      const safety = getToolSafety(t.def.name, t.def.annotations.httpMethod);
      let properties = { ...t.def.inputSchema.properties };

      if (isSummarizable) {
        properties.summary = {
          type: 'boolean',
          description:
            'Return condensed summary (default: true). Set false for full detailed response.',
          default: true,
        };
      }

      if (safety.tier === 3) {
        properties._confirmationToken = {
          type: 'string',
          description:
            'Confirmation token returned by a previous call. On first call, this tool returns a confirmationToken. To confirm, call the tool again with the same arguments plus _confirmationToken set to that value.',
        };
      }

      let description = t.def.description;
      if (isSummarizable) {
        description += ' Returns summarized data by default. Pass summary=false for full detail.';
      }

      return {
        name: t.def.name,
        description,
        inputSchema: {
          type: 'object' as const,
          properties,
          ...(t.def.inputSchema.required ? { required: t.def.inputSchema.required } : {}),
        },
      };
    }),
  }));

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
    const summaryEnabled = args.summary !== false;
    const startTime = Date.now();

    // Tier 3: check for confirmation token
    if (safety.tier === 3) {
      const token = args._confirmationToken as string | undefined;

      if (!token) {
        const confirmationToken = randomBytes(16).toString('hex');
        // Store params (excluding meta-parameters) so we can verify they match on confirmation
        const boundParams = { ...args };
        delete boundParams._confirmationToken;
        delete boundParams.summary;
        pendingTokens.set(confirmationToken, { toolName, params: boundParams, createdAt: Date.now() });

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
              warning: 'This action may not be reversible.',
              howToConfirm: `To proceed, call ${toolName} again with the same arguments plus _confirmationToken set to the value below.`,
              preChecks: safety.preChecks,
              confirmationToken,
            }, null, 2),
          }],
        };
      }

      // Purge expired tokens on each confirmation attempt
      const now = Date.now();
      for (const [k, v] of pendingTokens) {
        if (now - v.createdAt > TOKEN_TTL_MS) pendingTokens.delete(k);
      }

      const pending = pendingTokens.get(token);
      // Validate token exists, not expired, tool matches, and params match
      const submittedParams = { ...args };
      delete submittedParams._confirmationToken;
      delete submittedParams.summary;
      const isExpired = pending !== undefined && now - pending.createdAt > TOKEN_TTL_MS;
      const paramsMatch = pending !== undefined && !isExpired &&
        JSON.stringify(submittedParams, Object.keys(submittedParams).sort()) ===
        JSON.stringify(pending.params, Object.keys(pending.params).sort());

      if (!pending || isExpired || pending.toolName !== toolName || !paramsMatch) {
        const duration_ms = Date.now() - startTime;
        const error = isExpired
          ? 'Confirmation token expired (5-minute TTL). Please request a new confirmation.'
          : !pending || pending.toolName !== toolName
            ? 'Invalid or expired confirmation token'
            : 'Parameters changed since confirmation was requested. Please request a new confirmation with the updated parameters.';
        auditLogger.log({
          timestamp: new Date().toISOString(),
          toolName,
          tier: safety.tier,
          params: args,
          confirmed: false,
          result: 'error',
          error,
          duration_ms,
        });

        return {
          content: [{ type: 'text', text: `${error} Please request a new confirmation.` }],
          isError: true,
        };
      }

      pendingTokens.delete(token);
    }

    const handlerArgs = { ...args };
    delete handlerArgs._confirmationToken;
    delete handlerArgs.summary;

    try {
      const rawResult = await tool.handler(handlerArgs, client);
      const result = applySummarization(toolName, rawResult, summaryEnabled);
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

  // --- Resource handlers ---

  const staticResources = buildStaticResources();

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: staticResources,
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: RESOURCE_TEMPLATES,
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    // Static guide content: wpengine://guide/{topic}
    const guideMatch = uri.match(/^wpengine:\/\/guide\/(?!workflows\/)(.+)$/);
    if (guideMatch) {
      const content = getGuideContent(guideMatch[1]!);
      if (content) {
        return { contents: [{ uri, text: content, mimeType: 'text/markdown' }] };
      }
      return {
        contents: [{
          uri,
          text: `Guide not found: ${guideMatch[1]}. Available guides: ${GUIDE_TOPICS.join(', ')}`,
          mimeType: 'text/plain',
        }],
      };
    }

    // Workflow content: wpengine://guide/workflows/{name}
    const workflowMatch = uri.match(/^wpengine:\/\/guide\/workflows\/(.+)$/);
    if (workflowMatch) {
      const content = getWorkflowContent(workflowMatch[1]!);
      if (content) {
        return { contents: [{ uri, text: content, mimeType: 'text/markdown' }] };
      }
      const available = listWorkflows();
      return {
        contents: [{
          uri,
          text: `Workflow not found: ${workflowMatch[1]}. Available workflows: ${available.join(', ')}`,
          mimeType: 'text/plain',
        }],
      };
    }

    // Entity browser: wpengine://account/{id}
    const accountMatch = uri.match(/^wpengine:\/\/account\/([^/]+)$/);
    if (accountMatch) {
      const resp = await client.get(`/accounts/${accountMatch[1]}`);
      return {
        contents: [{
          uri,
          text: resp.ok ? JSON.stringify(resp.data, null, 2) : JSON.stringify({ error: resp.error }, null, 2),
          mimeType: 'application/json',
        }],
      };
    }

    // Entity browser: wpengine://account/{id}/sites
    const accountSitesMatch = uri.match(/^wpengine:\/\/account\/([^/]+)\/sites$/);
    if (accountSitesMatch) {
      const resp = await client.getAll('/sites', { account_id: accountSitesMatch[1]! });
      return {
        contents: [{
          uri,
          text: resp.ok ? JSON.stringify(resp.data, null, 2) : JSON.stringify({ error: resp.error }, null, 2),
          mimeType: 'application/json',
        }],
      };
    }

    // Entity browser: wpengine://install/{id}
    const installMatch = uri.match(/^wpengine:\/\/install\/([^/]+)$/);
    if (installMatch) {
      const resp = await client.get(`/installs/${installMatch[1]}`);
      return {
        contents: [{
          uri,
          text: resp.ok ? JSON.stringify(resp.data, null, 2) : JSON.stringify({ error: resp.error }, null, 2),
          mimeType: 'application/json',
        }],
      };
    }

    return {
      contents: [{ uri, text: `Unknown resource: ${uri}`, mimeType: 'text/plain' }],
    };
  });

  // --- Prompt handlers ---

  const promptMap = new Map<string, PromptDef>();
  for (const prompt of PROMPTS) {
    promptMap.set(prompt.name, prompt);
  }

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: PROMPTS.map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const promptName = request.params.name;
    const prompt = promptMap.get(promptName);
    if (!prompt) {
      throw new Error(`Unknown prompt: ${promptName}`);
    }

    const args = (request.params.arguments ?? {}) as Record<string, string>;

    // Validate required arguments
    for (const arg of prompt.arguments) {
      if (arg.required && !args[arg.name]) {
        throw new Error(`Missing required argument: ${arg.name}`);
      }
    }

    return {
      description: prompt.description,
      messages: [{
        role: 'user' as const,
        content: { type: 'text' as const, text: prompt.template(args) },
      }],
    };
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
