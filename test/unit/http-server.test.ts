import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as http from 'node:http';
import { createAuthProvider } from '../../src/auth.js';
import { createWpeServer } from '../../src/server.js';
import { startHttpServer, type HttpServerHandle } from '../../src/http-server.js';

function createTestServer() {
  process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
  process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';
  const authProvider = createAuthProvider();
  return createWpeServer({ authProvider });
}

/**
 * Make an HTTP request using Node's http module to avoid MSW interception.
 */
function httpRequest(options: {
  port: number;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: options.port,
        path: options.path,
        method: options.method,
        headers: options.headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf-8'),
          });
        });
      },
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

describe('HTTP server', () => {
  let handle: HttpServerHandle | undefined;
  const tmpDir = path.join(os.tmpdir(), `wpe-mcp-test-${Date.now()}`);

  afterEach(async () => {
    if (handle) {
      await handle.close();
      handle = undefined;
    }
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('starts on an available port within range', async () => {
    const wpeServer = createTestServer();
    handle = await startHttpServer(wpeServer, {
      portRangeStart: 19100,
      portRangeEnd: 19110,
      connectionInfoPath: null,
    });
    expect(handle.port).toBeGreaterThanOrEqual(19100);
    expect(handle.port).toBeLessThanOrEqual(19110);
    expect(handle.token).toBeTruthy();
    expect(handle.endpoint).toBe(`http://127.0.0.1:${handle.port}/mcp`);
  });

  it('rejects requests without auth token', async () => {
    const wpeServer = createTestServer();
    handle = await startHttpServer(wpeServer, {
      portRangeStart: 19111,
      portRangeEnd: 19120,
      connectionInfoPath: null,
    });

    const resp = await httpRequest({
      port: handle.port,
      method: 'POST',
      path: '/mcp',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
    });
    expect(resp.status).toBe(401);
  });

  it('rejects requests with wrong auth token', async () => {
    const wpeServer = createTestServer();
    handle = await startHttpServer(wpeServer, {
      portRangeStart: 19121,
      portRangeEnd: 19130,
      connectionInfoPath: null,
    });

    const resp = await httpRequest({
      port: handle.port,
      method: 'POST',
      path: '/mcp',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer wrong-token',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
    });
    expect(resp.status).toBe(401);
  });

  it('accepts authenticated MCP initialize request', async () => {
    const wpeServer = createTestServer();
    handle = await startHttpServer(wpeServer, {
      portRangeStart: 19131,
      portRangeEnd: 19140,
      connectionInfoPath: null,
    });

    const resp = await httpRequest({
      port: handle.port,
      method: 'POST',
      path: '/mcp',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${handle.token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      }),
    });

    expect(resp.status).toBe(200);
    // Response may be SSE or JSON — extract the JSON-RPC message
    let data: Record<string, unknown>;
    if (resp.body.startsWith('event:')) {
      // SSE format: extract JSON from "data: {...}" line
      const dataLine = resp.body.split('\n').find((l) => l.startsWith('data: '));
      data = JSON.parse(dataLine!.slice(6));
    } else {
      data = JSON.parse(resp.body);
    }
    expect(data.result).toBeDefined();
    const result = data.result as Record<string, unknown>;
    expect(result.serverInfo).toBeDefined();
    expect(result.capabilities).toBeDefined();
  });

  it('returns 404 for non-/mcp paths', async () => {
    const wpeServer = createTestServer();
    handle = await startHttpServer(wpeServer, {
      portRangeStart: 19141,
      portRangeEnd: 19150,
      connectionInfoPath: null,
    });

    const resp = await httpRequest({
      port: handle.port,
      method: 'GET',
      path: '/other',
      headers: { 'Authorization': `Bearer ${handle.token}` },
    });
    expect(resp.status).toBe(404);
  });

  it('writes connection info file', async () => {
    const infoPath = path.join(tmpDir, 'connection-info.json');
    const wpeServer = createTestServer();
    handle = await startHttpServer(wpeServer, {
      portRangeStart: 19151,
      portRangeEnd: 19160,
      connectionInfoPath: infoPath,
    });

    expect(fs.existsSync(infoPath)).toBe(true);
    const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    expect(info.port).toBe(handle.port);
    expect(info.token).toBe(handle.token);
    expect(info.endpoint).toBe(handle.endpoint);
    expect(info.pid).toBe(process.pid);
    expect(info.toolCount).toBeGreaterThan(0);
    expect(info.startedAt).toBeTruthy();
  });

  it('cleans up connection info file on close', async () => {
    const infoPath = path.join(tmpDir, 'connection-info.json');
    const wpeServer = createTestServer();
    handle = await startHttpServer(wpeServer, {
      portRangeStart: 19161,
      portRangeEnd: 19170,
      connectionInfoPath: infoPath,
    });

    expect(fs.existsSync(infoPath)).toBe(true);
    await handle.close();
    handle = undefined;
    expect(fs.existsSync(infoPath)).toBe(false);
  });

  it('handles tools/list through HTTP transport', async () => {
    const wpeServer = createTestServer();
    handle = await startHttpServer(wpeServer, {
      portRangeStart: 19171,
      portRangeEnd: 19180,
      connectionInfoPath: null,
    });

    // Initialize first
    const initResp = await httpRequest({
      port: handle.port,
      method: 'POST',
      path: '/mcp',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${handle.token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      }),
    });

    expect(initResp.status).toBe(200);
    const sessionId = initResp.headers['mcp-session-id'] as string;
    expect(sessionId).toBeTruthy();

    // Send initialized notification + list tools in same request
    const listResp = await httpRequest({
      port: handle.port,
      method: 'POST',
      path: '/mcp',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${handle.token}`,
        'mcp-session-id': sessionId,
      },
      body: JSON.stringify([
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        { jsonrpc: '2.0', method: 'tools/list', id: 2 },
      ]),
    });

    expect(listResp.status).toBe(200);
    // Response may be SSE or JSON depending on transport
    expect(listResp.body).toContain('tools');
    expect(listResp.body).toContain('wpe_get_accounts');
  });

  it('returns 405 for unsupported methods', async () => {
    const wpeServer = createTestServer();
    handle = await startHttpServer(wpeServer, {
      portRangeStart: 19181,
      portRangeEnd: 19190,
      connectionInfoPath: null,
    });

    const resp = await httpRequest({
      port: handle.port,
      method: 'PUT',
      path: '/mcp',
      headers: { 'Authorization': `Bearer ${handle.token}` },
    });
    expect(resp.status).toBe(405);
  });
});
