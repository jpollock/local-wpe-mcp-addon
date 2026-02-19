import { describe, it, expect, afterEach } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import * as path from 'node:path';

const BIN_DIR = path.join(import.meta.dirname, '..', '..', 'bin');

/** Send a JSON-RPC message over newline-delimited JSON (MCP stdio format). */
function sendJsonRpc(proc: ChildProcess, message: Record<string, unknown>): void {
  proc.stdin!.write(JSON.stringify(message) + '\n');
}

/** Read a JSON-RPC response from newline-delimited JSON. */
function readJsonRpc(proc: ChildProcess, timeout = 5000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for response')), timeout);
    let buffer = '';

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i]!.trim();
        if (!line) continue;
        try {
          const parsed = JSON.parse(line);
          // Only resolve on responses (have an id), skip notifications
          if ('id' in parsed) {
            clearTimeout(timer);
            proc.stdout!.off('data', onData);
            resolve(parsed);
            return;
          }
        } catch {
          // Not valid JSON, skip
        }
      }
      // Keep the last incomplete line
      buffer = lines[lines.length - 1] ?? '';
    };

    proc.stdout!.on('data', onData);
  });
}

describe('stdio transport', () => {
  let proc: ChildProcess | undefined;

  afterEach(() => {
    if (proc) {
      proc.kill();
      proc = undefined;
    }
  });

  it('responds to MCP initialize', async () => {
    proc = spawn('npx', ['tsx', path.join(BIN_DIR, 'mcp-stdio.ts')], {
      env: {
        ...process.env,
        WP_ENGINE_API_USERNAME: 'testuser',
        WP_ENGINE_API_PASSWORD: 'testpass',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Wait for process to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    sendJsonRpc(proc, {
      jsonrpc: '2.0',
      method: 'initialize',
      id: 1,
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' },
      },
    });

    const response = await readJsonRpc(proc);
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(1);
    const result = response.result as Record<string, unknown>;
    expect(result).toBeDefined();
    expect(result.serverInfo).toBeDefined();
    expect(result.capabilities).toBeDefined();
  });

  it('lists all tools via stdio', async () => {
    proc = spawn('npx', ['tsx', path.join(BIN_DIR, 'mcp-stdio.ts')], {
      env: {
        ...process.env,
        WP_ENGINE_API_USERNAME: 'testuser',
        WP_ENGINE_API_PASSWORD: 'testpass',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Initialize
    sendJsonRpc(proc, {
      jsonrpc: '2.0',
      method: 'initialize',
      id: 1,
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' },
      },
    });
    await readJsonRpc(proc);

    // Send initialized notification
    sendJsonRpc(proc, {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // List tools
    sendJsonRpc(proc, {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 2,
    });

    const response = await readJsonRpc(proc);
    const result = response.result as { tools: Array<{ name: string }> };
    expect(result.tools).toBeDefined();
    expect(result.tools.length).toBeGreaterThan(0);

    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain('wpe_get_accounts');
    expect(toolNames).toContain('wpe_account_overview');
  });

  it('lists all resources via stdio', async () => {
    proc = spawn('npx', ['tsx', path.join(BIN_DIR, 'mcp-stdio.ts')], {
      env: {
        ...process.env,
        WP_ENGINE_API_USERNAME: 'testuser',
        WP_ENGINE_API_PASSWORD: 'testpass',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Initialize
    sendJsonRpc(proc, {
      jsonrpc: '2.0',
      method: 'initialize',
      id: 1,
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' },
      },
    });
    await readJsonRpc(proc);

    sendJsonRpc(proc, {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // List resources
    sendJsonRpc(proc, {
      jsonrpc: '2.0',
      method: 'resources/list',
      id: 3,
    });

    const response = await readJsonRpc(proc);
    const result = response.result as { resources: Array<{ uri: string }> };
    expect(result.resources).toBeDefined();
    expect(result.resources.length).toBeGreaterThan(0);

    const uris = result.resources.map((r) => r.uri);
    expect(uris).toContain('wpengine://guide/domain-model');
    expect(uris).toContain('wpengine://guide/safety');
  });
});
