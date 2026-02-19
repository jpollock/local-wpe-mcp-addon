import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAuthProvider, type AuthConfig } from '../../src/auth.js';

describe('createAuthProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env['WP_ENGINE_API_USERNAME'];
    delete process.env['WP_ENGINE_API_PASSWORD'];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('env var auth', () => {
    it('returns Basic Auth header when both env vars set', async () => {
      process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
      process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';
      const provider = createAuthProvider();
      const header = await provider.getAuthHeader();
      const expected = 'Basic ' + Buffer.from('testuser:testpass').toString('base64');
      expect(header).toBe(expected);
      expect(provider.getAuthMethod()).toBe('basic');
    });

    it('returns null when env vars missing', async () => {
      const provider = createAuthProvider();
      const header = await provider.getAuthHeader();
      expect(header).toBeNull();
      expect(provider.getAuthMethod()).toBe('none');
    });

    it('returns null when only username set', async () => {
      process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
      const provider = createAuthProvider();
      const header = await provider.getAuthHeader();
      expect(header).toBeNull();
    });

    it('returns null when only password set', async () => {
      process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';
      const provider = createAuthProvider();
      const header = await provider.getAuthHeader();
      expect(header).toBeNull();
    });
  });

  describe('oauth auth', () => {
    it('returns Bearer token when oauth provider returns token', async () => {
      const config: AuthConfig = {
        oauthProvider: {
          getAccessToken: async () => 'oauth-token-123',
        },
      };
      const provider = createAuthProvider(config);
      const header = await provider.getAuthHeader();
      expect(header).toBe('Bearer oauth-token-123');
      expect(provider.getAuthMethod()).toBe('oauth');
    });

    it('returns null when oauth provider returns undefined and no env vars', async () => {
      const config: AuthConfig = {
        oauthProvider: {
          getAccessToken: async () => undefined,
        },
      };
      const provider = createAuthProvider(config);
      const header = await provider.getAuthHeader();
      expect(header).toBeNull();
      expect(provider.getAuthMethod()).toBe('none');
    });

    it('falls back to env var when oauth provider returns undefined', async () => {
      process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
      process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';
      const config: AuthConfig = {
        oauthProvider: {
          getAccessToken: async () => undefined,
        },
      };
      const provider = createAuthProvider(config);
      const header = await provider.getAuthHeader();
      const expected = 'Basic ' + Buffer.from('testuser:testpass').toString('base64');
      expect(header).toBe(expected);
      expect(provider.getAuthMethod()).toBe('basic');
    });

    it('prefers oauth over env var when both available', async () => {
      process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
      process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';
      const config: AuthConfig = {
        oauthProvider: {
          getAccessToken: async () => 'oauth-token',
        },
      };
      const provider = createAuthProvider(config);
      const header = await provider.getAuthHeader();
      expect(header).toBe('Bearer oauth-token');
      expect(provider.getAuthMethod()).toBe('oauth');
    });

    it('falls back to env var when oauth provider throws', async () => {
      process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
      process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';
      const config: AuthConfig = {
        oauthProvider: {
          getAccessToken: async () => {
            throw new Error('OAuth failed');
          },
        },
      };
      const provider = createAuthProvider(config);
      const header = await provider.getAuthHeader();
      const expected = 'Basic ' + Buffer.from('testuser:testpass').toString('base64');
      expect(header).toBe(expected);
      expect(provider.getAuthMethod()).toBe('basic');
    });
  });
});
