import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createAuthProvider } from '../../src/auth.js';
import { createWpeServer } from '../../src/server.js';

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

describe('MCP prompts', () => {
  it('lists all available prompts', async () => {
    const { client } = await createConnectedPair();
    const result = await client.listPrompts();
    const names = result.prompts.map((p) => p.name);
    expect(names).toContain('diagnose-site');
    expect(names).toContain('account-health');
    expect(names).toContain('setup-staging');
    expect(names).toContain('go-live-checklist');
    expect(names).toContain('domain-migration');
    expect(names).toContain('security-review');
    expect(names).toHaveLength(6);
  });

  it('prompts include required arguments', async () => {
    const { client } = await createConnectedPair();
    const result = await client.listPrompts();
    for (const prompt of result.prompts) {
      expect(prompt.arguments).toBeDefined();
      expect(prompt.arguments!.length).toBeGreaterThan(0);
      const requiredArgs = prompt.arguments!.filter((a) => a.required);
      expect(requiredArgs.length).toBeGreaterThan(0);
    }
  });

  it('diagnose-site prompt returns valid message', async () => {
    const { client } = await createConnectedPair();
    const result = await client.getPrompt({
      name: 'diagnose-site',
      arguments: { install_id: 'inst-1' },
    });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain('inst-1');
    expect(text).toContain('diagnose');
  });

  it('setup-staging prompt includes all arguments', async () => {
    const { client } = await createConnectedPair();
    const result = await client.getPrompt({
      name: 'setup-staging',
      arguments: {
        source_install_id: 'inst-prod',
        site_id: 'site-1',
        account_id: 'acc-1',
      },
    });
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain('inst-prod');
    expect(text).toContain('site-1');
    expect(text).toContain('acc-1');
  });

  it('prompt with missing required arg returns error', async () => {
    const { client } = await createConnectedPair();
    await expect(
      client.getPrompt({ name: 'diagnose-site', arguments: {} }),
    ).rejects.toThrow();
  });

  it('unknown prompt returns error', async () => {
    const { client } = await createConnectedPair();
    await expect(
      client.getPrompt({ name: 'nonexistent', arguments: {} }),
    ).rejects.toThrow();
  });
});
