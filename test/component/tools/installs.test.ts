import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../src/capi-client.js';
import { createAuthProvider } from '../../../src/auth.js';
import {
  wpeGetInstallsHandler, wpeCreateInstallHandler, wpeGetInstallHandler,
  wpeDeleteInstallHandler, wpeUpdateInstallHandler, wpeCopyInstallHandler,
} from '../../../src/tools/generated/install.js';
import { installFixtures, errorFixtures } from '../../fixtures/index.js';

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

describe('Install tools', () => {
  describe('wpe_get_installs', () => {
    it('returns list of installs', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs`, () => HttpResponse.json(installFixtures.list)));
      const result = await wpeGetInstallsHandler({}, createClient());
      const data = result as typeof installFixtures.list;
      expect(data.results).toHaveLength(2);
    });

    it('passes account_id query parameter', async () => {
      let capturedUrl: string | undefined;
      mockServer.use(http.get(`${BASE_URL}/installs`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(installFixtures.list);
      }));
      await wpeGetInstallsHandler({ account_id: 'acc-1' }, createClient());
      expect(capturedUrl).toContain('account_id=acc-1');
    });
  });

  describe('wpe_create_install', () => {
    it('creates an install with body params', async () => {
      let capturedBody: unknown;
      mockServer.use(http.post(`${BASE_URL}/installs`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(installFixtures.created, { status: 201 });
      }));
      const result = await wpeCreateInstallHandler({
        name: 'newinstall', account_id: 'acc-1', environment: 'development',
      }, createClient());
      expect(result).toEqual(installFixtures.created);
      expect(capturedBody).toEqual({ name: 'newinstall', account_id: 'acc-1', environment: 'development' });
    });
  });

  describe('wpe_get_install', () => {
    it('returns install by ID', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/inst-1`, () => HttpResponse.json(installFixtures.single)));
      const result = await wpeGetInstallHandler({ install_id: 'inst-1' }, createClient());
      expect(result).toEqual(installFixtures.single);
    });

    it('handles not found', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/bad`, () =>
        HttpResponse.json(errorFixtures.notFound.body, { status: 404 })));
      const result = await wpeGetInstallHandler({ install_id: 'bad' }, createClient()) as { error: unknown };
      expect(result.error).toBeDefined();
    });
  });

  describe('wpe_delete_install', () => {
    it('deletes an install', async () => {
      mockServer.use(http.delete(`${BASE_URL}/installs/inst-1`, () =>
        new HttpResponse(null, { status: 204 })));
      const result = await wpeDeleteInstallHandler({ install_id: 'inst-1' }, createClient());
      expect(result).toBeUndefined();
    });
  });

  describe('wpe_update_install', () => {
    it('updates an install', async () => {
      let capturedBody: unknown;
      mockServer.use(http.patch(`${BASE_URL}/installs/inst-1`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ...installFixtures.single, environment: 'staging' });
      }));
      await wpeUpdateInstallHandler({ install_id: 'inst-1', environment: 'staging' }, createClient());
      expect(capturedBody).toEqual({ environment: 'staging' });
    });
  });

  describe('wpe_copy_install', () => {
    it('copies an install with body params', async () => {
      let capturedBody: unknown;
      mockServer.use(http.post(`${BASE_URL}/install_copy`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(installFixtures.copyResult, { status: 201 });
      }));
      const result = await wpeCopyInstallHandler({
        source_environment_id: 'inst-1', destination_environment_id: 'inst-2',
      }, createClient());
      expect(result).toEqual(installFixtures.copyResult);
      expect(capturedBody).toEqual({
        source_environment_id: 'inst-1', destination_environment_id: 'inst-2',
      });
    });
  });
});
