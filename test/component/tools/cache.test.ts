import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../src/capi-client.js';
import { createAuthProvider } from '../../../src/auth.js';
import { wpePurgeCacheHandler } from '../../../src/tools/generated/cache.js';
import { cacheFixtures } from '../../fixtures/index.js';

const BASE_URL = 'https://api.wpengineapi.com/v1';
const mockServer = setupServer();

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());

function createClient() {
  process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
  process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';
  return new CapiClient({ authProvider: createAuthProvider() });
}

describe('Cache tools', () => {
  describe('wpe_purge_cache', () => {
    it('purges cache for an install', async () => {
      let capturedBody: unknown;
      mockServer.use(http.post(`${BASE_URL}/installs/inst-1/purge_cache`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(cacheFixtures.purged);
      }));
      const result = await wpePurgeCacheHandler({
        install_id: 'inst-1', type: 'object',
      }, createClient());
      expect(result).toEqual(cacheFixtures.purged);
      expect(capturedBody).toBeDefined();
    });
  });
});
