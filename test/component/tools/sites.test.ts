import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../src/capi-client.js';
import { createAuthProvider } from '../../../src/auth.js';
import {
  wpeGetSitesHandler, wpeCreateSiteHandler, wpeGetSiteHandler,
  wpeUpdateSiteHandler, wpeDeleteSiteHandler,
} from '../../../src/tools/generated/site.js';
import { siteFixtures, errorFixtures } from '../../fixtures/index.js';

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

describe('Site tools', () => {
  describe('wpe_get_sites', () => {
    it('returns list of sites', async () => {
      mockServer.use(http.get(`${BASE_URL}/sites`, () => HttpResponse.json(siteFixtures.list)));
      const result = await wpeGetSitesHandler({}, createClient());
      const data = result as typeof siteFixtures.list;
      expect(data.results).toHaveLength(2);
    });

    it('passes query parameters', async () => {
      let capturedUrl: string | undefined;
      mockServer.use(http.get(`${BASE_URL}/sites`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(siteFixtures.list);
      }));
      await wpeGetSitesHandler({ account_id: 'acc-1' }, createClient());
      expect(capturedUrl).toContain('account_id=acc-1');
    });
  });

  describe('wpe_create_site', () => {
    it('creates a site with body params', async () => {
      let capturedBody: unknown;
      mockServer.use(http.post(`${BASE_URL}/sites`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(siteFixtures.created, { status: 201 });
      }));
      const result = await wpeCreateSiteHandler({ name: 'new-site', account_id: 'acc-1' }, createClient());
      expect(result).toEqual(siteFixtures.created);
      expect(capturedBody).toEqual({ name: 'new-site', account_id: 'acc-1' });
    });
  });

  describe('wpe_get_site', () => {
    it('returns site by ID', async () => {
      mockServer.use(http.get(`${BASE_URL}/sites/site-1`, () => HttpResponse.json(siteFixtures.single)));
      const result = await wpeGetSiteHandler({ site_id: 'site-1' }, createClient());
      expect(result).toEqual(siteFixtures.single);
    });

    it('handles not found', async () => {
      mockServer.use(http.get(`${BASE_URL}/sites/bad`, () =>
        HttpResponse.json(errorFixtures.notFound.body, { status: 404 })));
      const result = await wpeGetSiteHandler({ site_id: 'bad' }, createClient()) as { error: unknown };
      expect(result.error).toBeDefined();
    });
  });

  describe('wpe_update_site', () => {
    it('updates a site', async () => {
      let capturedBody: unknown;
      mockServer.use(http.patch(`${BASE_URL}/sites/site-1`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ...siteFixtures.single, name: 'renamed' });
      }));
      await wpeUpdateSiteHandler({ site_id: 'site-1', name: 'renamed' }, createClient());
      expect(capturedBody).toEqual({ name: 'renamed' });
    });
  });

  describe('wpe_delete_site', () => {
    it('deletes a site', async () => {
      mockServer.use(http.delete(`${BASE_URL}/sites/site-1`, () =>
        new HttpResponse(null, { status: 204 })));
      const result = await wpeDeleteSiteHandler({ site_id: 'site-1' }, createClient());
      expect(result).toBeUndefined();
    });

    it('handles auth error on delete', async () => {
      mockServer.use(http.delete(`${BASE_URL}/sites/site-1`, () =>
        HttpResponse.json(errorFixtures.forbidden.body, { status: 403 })));
      const result = await wpeDeleteSiteHandler({ site_id: 'site-1' }, createClient()) as { error: unknown };
      expect(result.error).toBeDefined();
    });
  });
});
