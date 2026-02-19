import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createAuthProvider } from '../../../src/auth.js';
import { createWpeServer } from '../../../src/server.js';

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

describe('knowledge resources', () => {
  it('lists static resources including guides and workflows', async () => {
    const { client } = await createConnectedPair();
    const result = await client.listResources();
    const uris = result.resources.map((r) => r.uri);
    expect(uris).toContain('wpengine://guide/domain-model');
    expect(uris).toContain('wpengine://guide/safety');
    expect(uris).toContain('wpengine://guide/troubleshooting');
    expect(uris).toContain('wpengine://guide/workflows/go-live');
    expect(uris).toContain('wpengine://guide/workflows/staging-refresh');
    expect(uris).toContain('wpengine://guide/workflows/disaster-recovery');
  });

  it('wpengine://guide/domain-model returns content', async () => {
    const { client } = await createConnectedPair();
    const result = await client.readResource({ uri: 'wpengine://guide/domain-model' });
    const text = (result.contents[0] as { text: string }).text;
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('Account');
    expect(text).toContain('Site');
    expect(text).toContain('Install');
  });

  it('wpengine://guide/safety returns content', async () => {
    const { client } = await createConnectedPair();
    const result = await client.readResource({ uri: 'wpengine://guide/safety' });
    const text = (result.contents[0] as { text: string }).text;
    expect(text).toContain('Tier 1');
    expect(text).toContain('Tier 2');
    expect(text).toContain('Tier 3');
  });

  it('wpengine://guide/troubleshooting returns content', async () => {
    const { client } = await createConnectedPair();
    const result = await client.readResource({ uri: 'wpengine://guide/troubleshooting' });
    const text = (result.contents[0] as { text: string }).text;
    expect(text.length).toBeGreaterThan(0);
  });

  it('wpengine://guide/workflows/go-live returns content', async () => {
    const { client } = await createConnectedPair();
    const result = await client.readResource({ uri: 'wpengine://guide/workflows/go-live' });
    const text = (result.contents[0] as { text: string }).text;
    expect(text).toContain('Prerequisites');
    expect(text).toContain('Steps');
  });

  it('wpengine://guide/workflows/unknown returns available options', async () => {
    const { client } = await createConnectedPair();
    const result = await client.readResource({ uri: 'wpengine://guide/workflows/nonexistent' });
    const text = (result.contents[0] as { text: string }).text;
    expect(text).toContain('Workflow not found');
    expect(text).toContain('go-live');
    expect(text).toContain('staging-refresh');
  });

  it('wpengine://guide/unknown returns available options', async () => {
    const { client } = await createConnectedPair();
    const result = await client.readResource({ uri: 'wpengine://guide/nonexistent' });
    const text = (result.contents[0] as { text: string }).text;
    expect(text).toContain('Guide not found');
    expect(text).toContain('domain-model');
  });

  it('all workflow files contain required sections', async () => {
    const { client } = await createConnectedPair();
    const workflows = ['go-live', 'staging-refresh', 'domain-migration', 'disaster-recovery', 'new-environment'];
    for (const name of workflows) {
      const result = await client.readResource({ uri: `wpengine://guide/workflows/${name}` });
      const text = (result.contents[0] as { text: string }).text;
      expect(text).toContain('When to Use');
      expect(text).toContain('Prerequisites');
      expect(text).toContain('Steps');
    }
  });

  it('lists resource templates for entity browser', async () => {
    const { client } = await createConnectedPair();
    const result = await client.listResourceTemplates();
    const templates = result.resourceTemplates.map((t) => t.uriTemplate);
    expect(templates).toContain('wpengine://account/{account_id}');
    expect(templates).toContain('wpengine://account/{account_id}/sites');
    expect(templates).toContain('wpengine://install/{install_id}');
  });
});
