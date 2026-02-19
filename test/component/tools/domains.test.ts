import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../src/capi-client.js';
import { createAuthProvider } from '../../../src/auth.js';
import {
  wpeGetDomainsHandler, wpeCreateDomainHandler, wpeCreateDomainsBulkHandler,
  wpeGetDomainHandler, wpeUpdateDomainHandler, wpeDeleteDomainHandler,
  wpeCheckDomainStatusHandler, wpeGetDomainStatusReportHandler,
} from '../../../src/tools/generated/domain.js';
import { domainFixtures, errorFixtures } from '../../fixtures/index.js';

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

describe('Domain tools', () => {
  describe('wpe_get_domains', () => {
    it('returns domains for an install', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/inst-1/domains`, () =>
        HttpResponse.json(domainFixtures.list)));
      const result = await wpeGetDomainsHandler({ install_id: 'inst-1' }, createClient());
      const data = result as typeof domainFixtures.list;
      expect(data.results).toHaveLength(2);
    });
  });

  describe('wpe_create_domain', () => {
    it('creates a domain with body and path params', async () => {
      let capturedBody: unknown;
      mockServer.use(http.post(`${BASE_URL}/installs/inst-1/domains`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(domainFixtures.created, { status: 201 });
      }));
      const result = await wpeCreateDomainHandler({
        install_id: 'inst-1', name: 'new.example.com', primary: false,
      }, createClient());
      expect(result).toEqual(domainFixtures.created);
      expect(capturedBody).toEqual({ name: 'new.example.com', primary: false });
    });
  });

  describe('wpe_create_domains_bulk', () => {
    it('creates domains in bulk', async () => {
      let capturedBody: unknown;
      mockServer.use(http.post(`${BASE_URL}/installs/inst-1/domains/bulk`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(domainFixtures.bulkCreated, { status: 201 });
      }));
      const domains = [{ name: 'bulk1.example.com' }, { name: 'bulk2.example.com' }];
      await wpeCreateDomainsBulkHandler({ install_id: 'inst-1', domains }, createClient());
      expect(capturedBody).toEqual({ domains });
    });
  });

  describe('wpe_get_domain', () => {
    it('returns domain by ID', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/inst-1/domains/dom-1`, () =>
        HttpResponse.json(domainFixtures.single)));
      const result = await wpeGetDomainHandler({ install_id: 'inst-1', domain_id: 'dom-1' }, createClient());
      expect(result).toEqual(domainFixtures.single);
    });

    it('handles not found', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/inst-1/domains/bad`, () =>
        HttpResponse.json(errorFixtures.notFound.body, { status: 404 })));
      const result = await wpeGetDomainHandler({ install_id: 'inst-1', domain_id: 'bad' }, createClient()) as { error: unknown };
      expect(result.error).toBeDefined();
    });
  });

  describe('wpe_update_domain', () => {
    it('updates a domain', async () => {
      let capturedBody: unknown;
      mockServer.use(http.patch(`${BASE_URL}/installs/inst-1/domains/dom-1`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ...domainFixtures.single, primary: true });
      }));
      await wpeUpdateDomainHandler({
        install_id: 'inst-1', domain_id: 'dom-1', primary: true,
      }, createClient());
      expect(capturedBody).toEqual({ primary: true });
    });
  });

  describe('wpe_delete_domain', () => {
    it('deletes a domain', async () => {
      mockServer.use(http.delete(`${BASE_URL}/installs/inst-1/domains/dom-1`, () =>
        new HttpResponse(null, { status: 204 })));
      const result = await wpeDeleteDomainHandler({ install_id: 'inst-1', domain_id: 'dom-1' }, createClient());
      expect(result).toBeUndefined();
    });
  });

  describe('wpe_check_domain_status', () => {
    it('submits a domain status check', async () => {
      mockServer.use(http.post(`${BASE_URL}/installs/inst-1/domains/dom-1/check_status`, () =>
        HttpResponse.json(domainFixtures.checkStatus)));
      const result = await wpeCheckDomainStatusHandler({
        install_id: 'inst-1', domain_id: 'dom-1',
      }, createClient());
      expect(result).toEqual(domainFixtures.checkStatus);
    });
  });

  describe('wpe_get_domain_status_report', () => {
    it('retrieves a domain status report', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/inst-1/domains/check_status/report-1`, () =>
        HttpResponse.json(domainFixtures.statusReport)));
      const result = await wpeGetDomainStatusReportHandler({
        install_id: 'inst-1', report_id: 'report-1',
      }, createClient());
      expect(result).toEqual(domainFixtures.statusReport);
    });
  });
});
