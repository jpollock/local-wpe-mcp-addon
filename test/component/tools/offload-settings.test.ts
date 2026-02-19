import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../src/capi-client.js';
import { createAuthProvider } from '../../../src/auth.js';
import {
  wpeGetLargefsValidationHandler, wpeGetOffloadSettingsHandler,
  wpeConfigureOffloadSettingsHandler, wpeUpdateOffloadSettingsHandler,
} from '../../../src/tools/generated/offload-settings.js';
import { offloadFixtures } from '../../fixtures/index.js';

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

describe('Offload Settings tools', () => {
  describe('wpe_get_largefs_validation', () => {
    it('returns largefs validation file', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/inst-1/offload_settings/largefs_validation_file`, () =>
        HttpResponse.json(offloadFixtures.largefsValidation)));
      const result = await wpeGetLargefsValidationHandler({ install_id: 'inst-1' }, createClient());
      expect(result).toEqual(offloadFixtures.largefsValidation);
    });
  });

  describe('wpe_get_offload_settings', () => {
    it('returns offload settings', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/inst-1/offload_settings/files`, () =>
        HttpResponse.json(offloadFixtures.settings)));
      const result = await wpeGetOffloadSettingsHandler({ install_id: 'inst-1' }, createClient());
      expect(result).toEqual(offloadFixtures.settings);
    });
  });

  describe('wpe_configure_offload_settings', () => {
    it('configures offload settings (POST)', async () => {
      mockServer.use(http.post(`${BASE_URL}/installs/inst-1/offload_settings/files`, () =>
        HttpResponse.json(offloadFixtures.configured)));
      const result = await wpeConfigureOffloadSettingsHandler({
        install_id: 'inst-1',
      }, createClient());
      expect(result).toEqual(offloadFixtures.configured);
    });
  });

  describe('wpe_update_offload_settings', () => {
    it('updates offload settings (PATCH)', async () => {
      mockServer.use(http.patch(`${BASE_URL}/installs/inst-1/offload_settings/files`, () =>
        HttpResponse.json(offloadFixtures.configured)));
      const result = await wpeUpdateOffloadSettingsHandler({
        install_id: 'inst-1',
      }, createClient());
      expect(result).toEqual(offloadFixtures.configured);
    });
  });
});
