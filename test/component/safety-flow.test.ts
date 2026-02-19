import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createAuthProvider } from '../../src/auth.js';
import { createWpeServer } from '../../src/server.js';

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

describe('confirmation flow', () => {
  it('tier 1 tool executes immediately', async () => {
    mockServer.use(http.get(`${BASE_URL}/accounts`, () =>
      HttpResponse.json({ results: [{ id: 'acc-1', name: 'Test' }] })));
    const { client } = await createConnectedPair();
    const result = await client.callTool({ name: 'wpe_get_accounts', arguments: {} });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.results).toBeDefined();
    expect(result.isError).toBeFalsy();
  });

  it('tier 3 tool returns confirmation prompt on first call without token', async () => {
    const { client } = await createConnectedPair();
    const result = await client.callTool({
      name: 'wpe_delete_site',
      arguments: { site_id: 'site-1' },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.requiresConfirmation).toBe(true);
    expect(parsed.tier).toBe(3);
    expect(parsed.action).toBeTruthy();
    expect(parsed.warning).toBeTruthy();
    expect(parsed.confirmationToken).toBeTruthy();
  });

  it('tier 3 tool executes with valid confirmation token', async () => {
    mockServer.use(http.delete(`${BASE_URL}/sites/site-1`, () =>
      new HttpResponse(null, { status: 204 })));
    const { client } = await createConnectedPair();

    // First call: get confirmation token
    const promptResult = await client.callTool({
      name: 'wpe_delete_site',
      arguments: { site_id: 'site-1' },
    });
    const promptText = (promptResult.content as Array<{ type: string; text: string }>)[0].text;
    const { confirmationToken } = JSON.parse(promptText);

    // Second call: execute with token
    const execResult = await client.callTool({
      name: 'wpe_delete_site',
      arguments: { site_id: 'site-1', _confirmationToken: confirmationToken },
    });
    expect(execResult.isError).toBeFalsy();
  });

  it('tier 3 tool rejects invalid confirmation token', async () => {
    const { client } = await createConnectedPair();

    const result = await client.callTool({
      name: 'wpe_delete_site',
      arguments: { site_id: 'site-1', _confirmationToken: 'bad-token' },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(result.isError).toBe(true);
    expect(text).toContain('Invalid');
  });

  it('confirmation tokens are single-use', async () => {
    mockServer.use(http.delete(`${BASE_URL}/sites/site-1`, () =>
      new HttpResponse(null, { status: 204 })));
    const { client } = await createConnectedPair();

    // Get token
    const promptResult = await client.callTool({
      name: 'wpe_delete_site',
      arguments: { site_id: 'site-1' },
    });
    const promptText = (promptResult.content as Array<{ type: string; text: string }>)[0].text;
    const { confirmationToken } = JSON.parse(promptText);

    // First use: should succeed
    const firstUse = await client.callTool({
      name: 'wpe_delete_site',
      arguments: { site_id: 'site-1', _confirmationToken: confirmationToken },
    });
    expect(firstUse.isError).toBeFalsy();

    // Second use: should fail
    const secondUse = await client.callTool({
      name: 'wpe_delete_site',
      arguments: { site_id: 'site-1', _confirmationToken: confirmationToken },
    });
    expect(secondUse.isError).toBe(true);
  });

  it('tier 2 tool executes without confirmation', async () => {
    mockServer.use(http.post(`${BASE_URL}/installs/inst-1/purge_cache`, () =>
      HttpResponse.json({ success: true })));
    const { client } = await createConnectedPair();
    const result = await client.callTool({
      name: 'wpe_purge_cache',
      arguments: { install_id: 'inst-1' },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.requiresConfirmation).toBeUndefined();
    expect(result.isError).toBeFalsy();
  });

  it('tier 3 overridden POST tool requires confirmation', async () => {
    const { client } = await createConnectedPair();
    const result = await client.callTool({
      name: 'wpe_create_site',
      arguments: { name: 'test-site', account_id: 'acc-1' },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.requiresConfirmation).toBe(true);
    expect(parsed.tier).toBe(3);
  });
});
