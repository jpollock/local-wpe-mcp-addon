import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../src/capi-client.js';
import { createAuthProvider } from '../../../src/auth.js';
import {
  wpeGetSslCertificatesHandler, wpeGetDomainSslCertificateHandler,
  wpeRequestSslCertificateHandler, wpeImportSslCertificateHandler,
} from '../../../src/tools/generated/certificates.js';
import { certificateFixtures } from '../../fixtures/index.js';

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

describe('Certificate tools', () => {
  describe('wpe_get_ssl_certificates', () => {
    it('returns SSL certificates for an install', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/inst-1/ssl_certificates`, () =>
        HttpResponse.json(certificateFixtures.list)));
      const result = await wpeGetSslCertificatesHandler({ install_id: 'inst-1' }, createClient());
      const data = result as typeof certificateFixtures.list;
      expect(data.certificates).toHaveLength(1);
    });
  });

  describe('wpe_get_domain_ssl_certificate', () => {
    it('returns SSL certificate for a domain', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/inst-1/domains/dom-1/ssl_certificate`, () =>
        HttpResponse.json(certificateFixtures.domainCert)));
      const result = await wpeGetDomainSslCertificateHandler({
        install_id: 'inst-1', domain_id: 'dom-1',
      }, createClient());
      expect(result).toEqual(certificateFixtures.domainCert);
    });
  });

  describe('wpe_request_ssl_certificate', () => {
    it('requests an SSL certificate', async () => {
      mockServer.use(http.post(`${BASE_URL}/installs/inst-1/domains/dom-1/ssl_certificate`, () =>
        HttpResponse.json(certificateFixtures.order, { status: 201 })));
      const result = await wpeRequestSslCertificateHandler({
        install_id: 'inst-1', domain_id: 'dom-1',
      }, createClient());
      expect(result).toEqual(certificateFixtures.order);
    });
  });

  describe('wpe_import_ssl_certificate', () => {
    it('imports a third-party SSL certificate', async () => {
      let capturedBody: unknown;
      mockServer.use(http.post(`${BASE_URL}/installs/inst-1/ssl_certificates/third_party`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(certificateFixtures.imported, { status: 201 });
      }));
      await wpeImportSslCertificateHandler({
        install_id: 'inst-1', certificate: 'cert-data', private_key: 'key-data',
      }, createClient());
      expect(capturedBody).toEqual({ certificate: 'cert-data', private_key: 'key-data' });
    });
  });
});
