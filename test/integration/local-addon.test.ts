import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import mainExport from '../../src/local-addon/main/index.js';
import type { AddonMainContext, LocalMainStatic } from '../../src/local-addon/types.js';

const BASE_URL = 'https://api.wpengineapi.com/v1';
const mockCapi = setupServer();

beforeAll(() => mockCapi.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mockCapi.resetHandlers());
afterAll(() => mockCapi.close());

describe('Local addon integration', () => {
  it('exports a default function', () => {
    expect(typeof mainExport).toBe('function');
  });

  it('addon main registers IPC handler and starts', async () => {
    const ipcHandlers = new Map<string, (...args: unknown[]) => unknown>();

    const context: AddonMainContext = {
      ipcMain: {
        handle(channel: string, handler: (...args: unknown[]) => unknown) {
          ipcHandlers.set(channel, handler);
        },
      },
    };

    let oauthCalled = false;
    const LocalMain: LocalMainStatic = {
      getServiceContainer() {
        return {
          cradle: {
            wpeOAuth: {
              async getAccessToken() {
                oauthCalled = true;
                return 'test-oauth-token';
              },
            },
          },
        };
      },
    };

    // Set env vars as fallback
    process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
    process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';

    // Call the addon main function
    mainExport(context, LocalMain);

    // IPC handler should be registered synchronously
    expect(ipcHandlers.has('wpe-capi-mcp:status')).toBe(true);

    // Query initial status (before server starts)
    const statusHandler = ipcHandlers.get('wpe-capi-mcp:status')!;
    const initialStatus = statusHandler() as { running: boolean };
    expect(initialStatus.running).toBe(false);
  });

  it('auth provider uses OAuth when available', async () => {
    // This tests the auth integration path directly
    const { createAuthProvider } = await import('../../src/auth.js');

    let oauthCalled = false;
    const authProvider = createAuthProvider({
      oauthProvider: {
        async getAccessToken() {
          oauthCalled = true;
          return 'oauth-token-123';
        },
      },
    });

    const header = await authProvider.getAuthHeader();
    expect(oauthCalled).toBe(true);
    expect(header).toBe('Bearer oauth-token-123');
    expect(authProvider.getAuthMethod()).toBe('oauth');
  });

  it('auth provider falls back to env vars when OAuth unavailable', async () => {
    const { createAuthProvider } = await import('../../src/auth.js');

    process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
    process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';

    const authProvider = createAuthProvider({
      oauthProvider: {
        async getAccessToken() {
          return undefined; // OAuth not available
        },
      },
    });

    const header = await authProvider.getAuthHeader();
    expect(header).toContain('Basic');
    expect(authProvider.getAuthMethod()).toBe('basic');
  });

  it('auth provider falls back when OAuth throws', async () => {
    const { createAuthProvider } = await import('../../src/auth.js');

    process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
    process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';

    const authProvider = createAuthProvider({
      oauthProvider: {
        async getAccessToken() {
          throw new Error('OAuth service unavailable');
        },
      },
    });

    const header = await authProvider.getAuthHeader();
    expect(header).toContain('Basic');
    expect(authProvider.getAuthMethod()).toBe('basic');
  });
});
