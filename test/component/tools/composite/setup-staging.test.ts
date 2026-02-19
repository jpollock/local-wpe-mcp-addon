import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeSetupStagingHandler } from '../../../../src/tools/composite/setup-staging.js';

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

describe('wpe_setup_staging', () => {
  it('creates install, copies, and returns domains', async () => {
    mockServer.use(
      http.post(`${BASE_URL}/installs`, () =>
        HttpResponse.json({ id: 'new-inst', name: 'my-staging' }, { status: 201 })),
      http.post(`${BASE_URL}/install_copy`, () =>
        HttpResponse.json({ id: 'copy-1', status: 'pending' }, { status: 201 })),
      http.get(`${BASE_URL}/installs/new-inst/domains`, () =>
        HttpResponse.json({ results: [{ id: 'd1', name: 'staging.example.com' }] })),
    );

    const result = await wpeSetupStagingHandler({
      name: 'my-staging', site_id: 's1', account_id: 'acc-1', source_install_id: 'src-inst',
    }, createClient()) as Record<string, unknown>;

    expect((result.install as { id: string }).id).toBe('new-inst');
    expect(result.copy).toBeDefined();
    expect(result.domains).toBeDefined();
  });

  it('returns partial success if copy fails', async () => {
    mockServer.use(
      http.post(`${BASE_URL}/installs`, () =>
        HttpResponse.json({ id: 'new-inst', name: 'my-staging' }, { status: 201 })),
      http.post(`${BASE_URL}/install_copy`, () =>
        HttpResponse.json({ error: 'Copy failed' }, { status: 500 })),
    );

    const result = await wpeSetupStagingHandler({
      name: 'my-staging', site_id: 's1', account_id: 'acc-1', source_install_id: 'src-inst',
    }, createClient()) as Record<string, unknown>;

    expect(result.partial_success).toBe(true);
    expect(result.install_created).toBeDefined();
    expect(result.copy_error).toBeDefined();
  });

  it('returns error if create fails', async () => {
    mockServer.use(
      http.post(`${BASE_URL}/installs`, () =>
        HttpResponse.json({ error: 'Forbidden' }, { status: 403 })),
    );

    const result = await wpeSetupStagingHandler({
      name: 'my-staging', site_id: 's1', account_id: 'acc-1', source_install_id: 'src-inst',
    }, createClient()) as Record<string, unknown>;

    expect(result.error).toBeDefined();
    expect(result.step).toBe('create_install');
  });
});
