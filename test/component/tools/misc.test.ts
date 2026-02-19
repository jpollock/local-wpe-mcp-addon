import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../src/capi-client.js';
import { createAuthProvider } from '../../../src/auth.js';
import { wpeGetStatusHandler } from '../../../src/tools/generated/status.js';
import { wpeGetSwaggerHandler } from '../../../src/tools/generated/swagger.js';
import { wpeGetCurrentUserHandler } from '../../../src/tools/generated/user.js';
import { statusFixtures, userFixtures } from '../../fixtures/index.js';

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

describe('Status tools', () => {
  describe('wpe_get_status', () => {
    it('returns API status', async () => {
      mockServer.use(http.get(`${BASE_URL}/status`, () => HttpResponse.json(statusFixtures.status)));
      const result = await wpeGetStatusHandler({}, createClient());
      expect(result).toEqual(statusFixtures.status);
    });
  });
});

describe('Swagger tools', () => {
  describe('wpe_get_swagger', () => {
    it('returns swagger spec', async () => {
      const swaggerData = { swagger: '2.0', info: { title: 'CAPI', version: '1.10.0' } };
      mockServer.use(http.get(`${BASE_URL}/swagger`, () => HttpResponse.json(swaggerData)));
      const result = await wpeGetSwaggerHandler({}, createClient());
      expect(result).toEqual(swaggerData);
    });
  });
});

describe('User tools', () => {
  describe('wpe_get_current_user', () => {
    it('returns current user', async () => {
      mockServer.use(http.get(`${BASE_URL}/user`, () => HttpResponse.json(userFixtures.currentUser)));
      const result = await wpeGetCurrentUserHandler({}, createClient());
      expect(result).toEqual(userFixtures.currentUser);
    });
  });
});
