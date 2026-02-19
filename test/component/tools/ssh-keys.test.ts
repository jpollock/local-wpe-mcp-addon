import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../src/capi-client.js';
import { createAuthProvider } from '../../../src/auth.js';
import {
  wpeGetSshKeysHandler, wpeCreateSshKeyHandler, wpeDeleteSshKeyHandler,
} from '../../../src/tools/generated/ssh-key.js';
import { sshKeyFixtures } from '../../fixtures/index.js';

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

describe('SSH Key tools', () => {
  describe('wpe_get_ssh_keys', () => {
    it('returns list of SSH keys', async () => {
      mockServer.use(http.get(`${BASE_URL}/ssh_keys`, () => HttpResponse.json(sshKeyFixtures.list)));
      const result = await wpeGetSshKeysHandler({}, createClient());
      const data = result as typeof sshKeyFixtures.list;
      expect(data.results).toHaveLength(2);
    });
  });

  describe('wpe_create_ssh_key', () => {
    it('creates an SSH key', async () => {
      let capturedBody: unknown;
      mockServer.use(http.post(`${BASE_URL}/ssh_keys`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(sshKeyFixtures.created, { status: 201 });
      }));
      await wpeCreateSshKeyHandler({ public_key: 'ssh-rsa AAAA...' }, createClient());
      expect(capturedBody).toEqual({ public_key: 'ssh-rsa AAAA...' });
    });
  });

  describe('wpe_delete_ssh_key', () => {
    it('deletes an SSH key', async () => {
      mockServer.use(http.delete(`${BASE_URL}/ssh_keys/key-1`, () =>
        new HttpResponse(null, { status: 204 })));
      const result = await wpeDeleteSshKeyHandler({ ssh_key_id: 'key-1' }, createClient());
      expect(result).toBeUndefined();
    });
  });
});
