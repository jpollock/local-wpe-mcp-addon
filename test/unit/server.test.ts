import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createAuthProvider } from '../../src/auth.js';
import { createWpeServer } from '../../src/server.js';

const BASE_URL = 'https://api.wpengineapi.com/v1';

const mockServer = setupServer();

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());

function setupEnvAuth() {
  process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
  process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';
}

async function createConnectedPair() {
  setupEnvAuth();
  const authProvider = createAuthProvider();
  const wpeServer = createWpeServer({ authProvider });

  const client = new Client({ name: 'test-client', version: '1.0.0' });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    wpeServer.connect(serverTransport),
  ]);

  return { client, wpeServer };
}

describe('WPE MCP Server', () => {
  describe('tool listing', () => {
    it('lists all generated tools', async () => {
      const { client, wpeServer } = await createConnectedPair();
      try {
        const result = await client.listTools();
        expect(result.tools.length).toBe(wpeServer.toolCount);
        expect(result.tools.length).toBeGreaterThan(0);
      } finally {
        await wpeServer.close();
      }
    });

    it('includes wpe_get_accounts tool', async () => {
      const { client, wpeServer } = await createConnectedPair();
      try {
        const result = await client.listTools();
        const accountsTool = result.tools.find((t) => t.name === 'wpe_get_accounts');
        expect(accountsTool).toBeDefined();
        expect(accountsTool!.description).toBeTruthy();
        expect(accountsTool!.inputSchema).toBeDefined();
        expect(accountsTool!.inputSchema.type).toBe('object');
      } finally {
        await wpeServer.close();
      }
    });

    it('all tool names start with wpe_ prefix', async () => {
      const { client, wpeServer } = await createConnectedPair();
      try {
        const result = await client.listTools();
        for (const tool of result.tools) {
          expect(tool.name).toMatch(/^wpe_/);
        }
      } finally {
        await wpeServer.close();
      }
    });

    it('tool input schemas have correct structure', async () => {
      const { client, wpeServer } = await createConnectedPair();
      try {
        const result = await client.listTools();
        const getAccount = result.tools.find((t) => t.name === 'wpe_get_account');
        expect(getAccount).toBeDefined();
        expect(getAccount!.inputSchema.type).toBe('object');
        expect(getAccount!.inputSchema.properties).toBeDefined();
        // account_id should be a required path parameter
        const props = getAccount!.inputSchema.properties as Record<string, unknown>;
        expect(props['account_id']).toBeDefined();
        expect(getAccount!.inputSchema.required).toContain('account_id');
      } finally {
        await wpeServer.close();
      }
    });
  });

  describe('tool calling', () => {
    it('dispatches wpe_get_accounts and returns API data', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/accounts`, () =>
          HttpResponse.json({
            results: [{ id: 'acc-1', name: 'Test Account' }],
            count: 1,
          }),
        ),
      );

      const { client, wpeServer } = await createConnectedPair();
      try {
        const result = await client.callTool({ name: 'wpe_get_accounts', arguments: {} });
        expect(result.isError).toBeFalsy();
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0]!.type).toBe('text');
        const parsed = JSON.parse(content[0]!.text);
        expect(parsed.results).toHaveLength(1);
        expect(parsed.results[0].name).toBe('Test Account');
      } finally {
        await wpeServer.close();
      }
    });

    it('dispatches wpe_get_account with path parameters', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/accounts/acc-123`, () =>
          HttpResponse.json({ id: 'acc-123', name: 'My Account' }),
        ),
      );

      const { client, wpeServer } = await createConnectedPair();
      try {
        const result = await client.callTool({
          name: 'wpe_get_account',
          arguments: { account_id: 'acc-123' },
        });
        expect(result.isError).toBeFalsy();
        const content = result.content as Array<{ type: string; text: string }>;
        const parsed = JSON.parse(content[0]!.text);
        expect(parsed.id).toBe('acc-123');
        expect(parsed.name).toBe('My Account');
      } finally {
        await wpeServer.close();
      }
    });

    it('returns error for unknown tool', async () => {
      const { client, wpeServer } = await createConnectedPair();
      try {
        const result = await client.callTool({ name: 'wpe_nonexistent', arguments: {} });
        expect(result.isError).toBe(true);
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0]!.text).toContain('Unknown tool');
      } finally {
        await wpeServer.close();
      }
    });

    it('returns error when API returns error', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/accounts`, () =>
          HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        ),
      );

      const { client, wpeServer } = await createConnectedPair();
      try {
        const result = await client.callTool({ name: 'wpe_get_accounts', arguments: {} });
        // The handler returns the error object, not isError
        const content = result.content as Array<{ type: string; text: string }>;
        const parsed = JSON.parse(content[0]!.text);
        expect(parsed.error).toBeDefined();
      } finally {
        await wpeServer.close();
      }
    });

    it('dispatches wpe_create_site with body parameters (tier 3 confirmation flow)', async () => {
      let capturedBody: unknown;
      mockServer.use(
        http.post(`${BASE_URL}/sites`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ id: 'site-1', name: 'New Site' }, { status: 201 });
        }),
      );

      const { client, wpeServer } = await createConnectedPair();
      try {
        // First call returns confirmation prompt (tier 3)
        const promptResult = await client.callTool({
          name: 'wpe_create_site',
          arguments: { name: 'New Site', account_id: 'acc-1' },
        });
        const promptContent = promptResult.content as Array<{ type: string; text: string }>;
        const prompt = JSON.parse(promptContent[0].text);
        expect(prompt.requiresConfirmation).toBe(true);
        expect(prompt.confirmationToken).toBeTruthy();

        // Second call with token executes
        const result = await client.callTool({
          name: 'wpe_create_site',
          arguments: { name: 'New Site', account_id: 'acc-1', _confirmationToken: prompt.confirmationToken },
        });
        expect(result.isError).toBeFalsy();
        expect(capturedBody).toEqual({ name: 'New Site', account_id: 'acc-1' });
      } finally {
        await wpeServer.close();
      }
    });
  });

  describe('server metadata', () => {
    it('reports correct tool count', async () => {
      setupEnvAuth();
      const authProvider = createAuthProvider();
      const wpeServer = createWpeServer({ authProvider });
      expect(wpeServer.toolCount).toBeGreaterThan(40);
    });

    it('accepts custom server info', async () => {
      setupEnvAuth();
      const authProvider = createAuthProvider();
      const wpeServer = createWpeServer({
        authProvider,
        serverInfo: { name: 'custom-server', version: '2.0.0' },
      });
      expect(wpeServer.toolCount).toBeGreaterThan(0);
    });
  });
});
