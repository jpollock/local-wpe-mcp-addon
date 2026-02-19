import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createAuthProvider } from '../../../src/auth.js';
import { createWpeServer } from '../../../src/server.js';

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

describe('entity browser resources', () => {
  it('wpengine://account/{id} returns account details', async () => {
    mockServer.use(http.get(`${BASE_URL}/accounts/acc-1`, () =>
      HttpResponse.json({ id: 'acc-1', name: 'Test Account' })));
    const { client } = await createConnectedPair();
    const result = await client.readResource({ uri: 'wpengine://account/acc-1' });
    const text = (result.contents[0] as { text: string }).text;
    const parsed = JSON.parse(text);
    expect(parsed.id).toBe('acc-1');
    expect(parsed.name).toBe('Test Account');
  });

  it('wpengine://account/{id}/sites returns site list', async () => {
    mockServer.use(http.get(`${BASE_URL}/sites`, ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get('account_id') === 'acc-1') {
        return HttpResponse.json({
          results: [{ id: 'site-1', name: 'My Site' }],
          next: null,
          previous: null,
          count: 1,
        });
      }
      return HttpResponse.json({ results: [] });
    }));
    const { client } = await createConnectedPair();
    const result = await client.readResource({ uri: 'wpengine://account/acc-1/sites' });
    const text = (result.contents[0] as { text: string }).text;
    const parsed = JSON.parse(text);
    expect(parsed).toBeInstanceOf(Array);
    expect(parsed[0].id).toBe('site-1');
  });

  it('wpengine://install/{id} returns install details', async () => {
    mockServer.use(http.get(`${BASE_URL}/installs/inst-1`, () =>
      HttpResponse.json({ id: 'inst-1', name: 'myinstall', environment: 'production' })));
    const { client } = await createConnectedPair();
    const result = await client.readResource({ uri: 'wpengine://install/inst-1' });
    const text = (result.contents[0] as { text: string }).text;
    const parsed = JSON.parse(text);
    expect(parsed.id).toBe('inst-1');
    expect(parsed.environment).toBe('production');
  });

  it('entity resource with API error returns error info', async () => {
    mockServer.use(http.get(`${BASE_URL}/accounts/bad`, () =>
      HttpResponse.json({ message: 'Not found' }, { status: 404 })));
    const { client } = await createConnectedPair();
    const result = await client.readResource({ uri: 'wpengine://account/bad' });
    const text = (result.contents[0] as { text: string }).text;
    const parsed = JSON.parse(text);
    expect(parsed.error).toBeDefined();
  });

  it('unknown resource URI returns helpful message', async () => {
    const { client } = await createConnectedPair();
    const result = await client.readResource({ uri: 'wpengine://unknown/something' });
    const text = (result.contents[0] as { text: string }).text;
    expect(text).toContain('Unknown resource');
  });
});
