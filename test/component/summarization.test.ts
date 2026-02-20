import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createAuthProvider } from '../../src/auth.js';
import { createWpeServer } from '../../src/server.js';
import { usageFixtures, installFixtures } from '../fixtures/index.js';

const BASE_URL = 'https://api.wpengineapi.com/v1';
const mockServer = setupServer();

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());

async function createConnectedPair() {
  process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
  process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';
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

function parseToolResult(result: Awaited<ReturnType<Client['callTool']>>): unknown {
  const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
  return JSON.parse(text);
}

describe('Summarization middleware', () => {
  describe('ListTools schema injection', () => {
    it('adds summary parameter to summarizable tools', async () => {
      const { client } = await createConnectedPair();
      const { tools } = await client.listTools();

      const usageTool = tools.find((t) => t.name === 'wpe_get_account_usage');
      expect(usageTool).toBeDefined();
      const props = usageTool!.inputSchema.properties as Record<string, Record<string, unknown>>;
      expect(props.summary).toBeDefined();
      expect(props.summary.type).toBe('boolean');
      expect(props.summary.default).toBe(true);
    });

    it('does not add summary parameter to non-summarizable tools', async () => {
      const { client } = await createConnectedPair();
      const { tools } = await client.listTools();

      const accountsTool = tools.find((t) => t.name === 'wpe_get_accounts');
      expect(accountsTool).toBeDefined();
      const props = accountsTool!.inputSchema.properties as Record<string, Record<string, unknown>>;
      expect(props.summary).toBeUndefined();
    });

    it('appends summary hint to description of summarizable tools', async () => {
      const { client } = await createConnectedPair();
      const { tools } = await client.listTools();

      const usageTool = tools.find((t) => t.name === 'wpe_get_account_usage');
      expect(usageTool!.description).toContain('summary');
      expect(usageTool!.description).toContain('summary=false');

      const accountsTool = tools.find((t) => t.name === 'wpe_get_accounts');
      expect(accountsTool!.description).not.toContain('summary=false');
    });
  });

  describe('wpe_get_account_usage summarization', () => {
    it('returns summarized data by default', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/accounts/acc-1/usage`, () =>
          HttpResponse.json(usageFixtures.accountUsage)),
      );

      const { client } = await createConnectedPair();
      const result = await client.callTool({
        name: 'wpe_get_account_usage',
        arguments: { account_id: 'acc-1' },
      });

      const parsed = parseToolResult(result) as Record<string, unknown>;
      expect(parsed.summary).toBe(true);
      expect(parsed.total_environments).toBe(1);
      expect(parsed.environments).toBeDefined();
      // Should NOT have the raw environment_metrics with daily arrays
      expect(parsed.environment_metrics).toBeUndefined();
    });

    it('returns full data when summary=false', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/accounts/acc-1/usage`, () =>
          HttpResponse.json(usageFixtures.accountUsage)),
      );

      const { client } = await createConnectedPair();
      const result = await client.callTool({
        name: 'wpe_get_account_usage',
        arguments: { account_id: 'acc-1', summary: false },
      });

      const parsed = parseToolResult(result) as Record<string, unknown>;
      // Should have the raw environment_metrics with daily arrays
      expect(parsed.environment_metrics).toBeDefined();
      expect(parsed.summary).toBeUndefined();
    });
  });

  describe('wpe_get_installs summarization', () => {
    it('reduces install fields in summary mode', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/installs`, () =>
          HttpResponse.json(installFixtures.list)),
      );

      const { client } = await createConnectedPair();
      const result = await client.callTool({
        name: 'wpe_get_installs',
        arguments: {},
      });

      const parsed = parseToolResult(result) as Record<string, unknown>;
      expect(parsed.summary).toBe(true);
      expect(parsed.total).toBe(2);

      const results = parsed.results as Array<Record<string, unknown>>;
      expect(results[0]!.id).toBe('inst-1');
      expect(results[0]!.name).toBe('mysiteprod');
      expect(results[0]!.environment).toBe('production');
      // Verbose fields should be stripped
      expect(results[0]!.cname).toBeUndefined();
      expect(results[0]!.stable_ips).toBeUndefined();
      expect(results[0]!.created_at).toBeUndefined();
    });
  });

  describe('tools without summarizers', () => {
    it('returns full data regardless of summary param', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/accounts`, () =>
          HttpResponse.json({ results: [{ id: 'acc-1', name: 'Test' }], count: 1 })),
      );

      const { client } = await createConnectedPair();
      const result = await client.callTool({
        name: 'wpe_get_accounts',
        arguments: {},
      });

      const parsed = parseToolResult(result) as Record<string, unknown>;
      // Full response, no summary marker
      expect(parsed.results).toBeDefined();
      expect(parsed.summary).toBeUndefined();
    });
  });
});
