import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as net from 'node:net';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export interface HttpServerOptions {
  /** Port range start (default: 10890) */
  portRangeStart?: number;
  /** Port range end (default: 10990) */
  portRangeEnd?: number;
  /** Host to bind to (default: '127.0.0.1') */
  host?: string;
  /** Path to write connection info JSON. Set to null to skip. */
  connectionInfoPath?: string | null;
}

export interface ConnectionInfo {
  port: number;
  token: string;
  endpoint: string;
  pid: number;
  toolCount: number;
  startedAt: string;
}

export interface HttpServerHandle {
  port: number;
  token: string;
  endpoint: string;
  connectionInfo: ConnectionInfo;
  close(): Promise<void>;
}

interface WpeServerLike {
  toolCount: number;
  server: {
    connect(transport: StreamableHTTPServerTransport): Promise<void>;
  };
}

const DEFAULT_PORT_START = 10890;
const DEFAULT_PORT_END = 10990;
const DEFAULT_HOST = '127.0.0.1';

function getDefaultConnectionInfoPath(): string {
  const platform = os.platform();
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Local', 'wpe-capi-mcp-connection-info.json');
  }
  if (platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', 'Local', 'wpe-capi-mcp-connection-info.json');
  }
  // Linux
  return path.join(os.homedir(), '.config', 'Local', 'wpe-capi-mcp-connection-info.json');
}

async function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findAvailablePort(start: number, end: number, host: string): Promise<number> {
  for (let port = start; port <= end; port++) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
  }
  throw new Error(`No available port found in range ${start}-${end}`);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

export async function startHttpServer(
  wpeServer: WpeServerLike,
  options?: HttpServerOptions,
): Promise<HttpServerHandle> {
  const host = options?.host ?? DEFAULT_HOST;
  const portStart = options?.portRangeStart ?? DEFAULT_PORT_START;
  const portEnd = options?.portRangeEnd ?? DEFAULT_PORT_END;
  const connectionInfoPath = options?.connectionInfoPath === undefined
    ? getDefaultConnectionInfoPath()
    : options.connectionInfoPath;

  const port = await findAvailablePort(portStart, portEnd, host);
  const token = randomBytes(32).toString('hex');

  // Track transports by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://${host}:${port}`);

    if (url.pathname !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    // Validate auth token
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${token}`) {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('Unauthorized');
      return;
    }

    const method = req.method?.toUpperCase();

    if (method === 'POST') {
      const body = await readBody(req);
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid JSON');
        return;
      }

      // Check for existing session
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport = sessionId ? transports.get(sessionId) : undefined;

      if (!transport) {
        // New session — create transport and connect server
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id: string) => {
            transports.set(id, transport!);
          },
        });

        transport.onclose = () => {
          if (transport!.sessionId) {
            transports.delete(transport!.sessionId);
          }
        };

        await wpeServer.server.connect(transport);
      }

      await transport.handleRequest(req, res, parsedBody);
    } else if (method === 'GET') {
      // SSE stream — requires existing session
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      const transport = sessionId ? transports.get(sessionId) : undefined;

      if (!transport) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('No active session. Send an initialization POST first.');
        return;
      }

      await transport.handleRequest(req, res);
    } else if (method === 'DELETE') {
      // Session termination
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      const transport = sessionId ? transports.get(sessionId) : undefined;

      if (transport) {
        await transport.close();
        transports.delete(sessionId!);
      }

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Session closed');
    } else {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method not allowed');
    }
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, host, () => resolve());
  });

  const endpoint = `http://${host}:${port}/mcp`;
  const connectionInfo: ConnectionInfo = {
    port,
    token,
    endpoint,
    pid: process.pid,
    toolCount: wpeServer.toolCount,
    startedAt: new Date().toISOString(),
  };

  // Write connection info file
  if (connectionInfoPath) {
    const dir = path.dirname(connectionInfoPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(connectionInfoPath, JSON.stringify(connectionInfo, null, 2));
  }

  return {
    port,
    token,
    endpoint,
    connectionInfo,
    async close() {
      // Close all active transports
      for (const transport of transports.values()) {
        await transport.close();
      }
      transports.clear();

      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });

      // Clean up connection info file
      if (connectionInfoPath && fs.existsSync(connectionInfoPath)) {
        fs.unlinkSync(connectionInfoPath);
      }
    },
  };
}
