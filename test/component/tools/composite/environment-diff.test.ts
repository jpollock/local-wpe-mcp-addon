import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpeEnvironmentDiffHandler } from '../../../../src/tools/composite/environment-diff.js';

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

describe('wpe_environment_diff', () => {
  it('compares two installs and reports differences', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs/i1`, () =>
        HttpResponse.json({ id: 'i1', name: 'prod', environment: 'production', php_version: '8.2' })),
      http.get(`${BASE_URL}/installs/i2`, () =>
        HttpResponse.json({ id: 'i2', name: 'stg', environment: 'staging', php_version: '8.1' })),
      http.get(`${BASE_URL}/installs/i1/domains`, () =>
        HttpResponse.json({ results: [{ id: 'd1', name: 'example.com' }] })),
      http.get(`${BASE_URL}/installs/i2/domains`, () =>
        HttpResponse.json({ results: [{ id: 'd2', name: 'staging.example.com' }] })),
      http.get(`${BASE_URL}/installs/i1/usage`, () =>
        HttpResponse.json({ bandwidth: 1000 })),
      http.get(`${BASE_URL}/installs/i2/usage`, () =>
        HttpResponse.json({ bandwidth: 100 })),
    );

    const result = await wpeEnvironmentDiffHandler({
      install_id_a: 'i1', install_id_b: 'i2',
    }, createClient()) as Record<string, unknown>;

    expect(result.install_a).toBeDefined();
    expect(result.install_b).toBeDefined();
    const diffs = result.differences as Array<{ field: string; install_a: unknown; install_b: unknown }>;
    expect(diffs.length).toBeGreaterThanOrEqual(2);
    expect(diffs.find((d) => d.field === 'environment')).toBeDefined();
    expect(diffs.find((d) => d.field === 'php_version')).toBeDefined();
  });

  it('handles install not found', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs/bad`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
      http.get(`${BASE_URL}/installs/i2`, () =>
        HttpResponse.json({ id: 'i2', name: 'stg' })),
      http.get(`${BASE_URL}/installs/bad/domains`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
      http.get(`${BASE_URL}/installs/i2/domains`, () =>
        HttpResponse.json({ results: [] })),
      http.get(`${BASE_URL}/installs/bad/usage`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
      http.get(`${BASE_URL}/installs/i2/usage`, () =>
        HttpResponse.json({ bandwidth: 100 })),
    );

    const result = await wpeEnvironmentDiffHandler({
      install_id_a: 'bad', install_id_b: 'i2',
    }, createClient()) as Record<string, unknown>;
    expect(result.error).toBeDefined();
  });

  it('reports no differences for identical configs', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs/i1`, () =>
        HttpResponse.json({ id: 'i1', name: 'a', environment: 'production', php_version: '8.2' })),
      http.get(`${BASE_URL}/installs/i2`, () =>
        HttpResponse.json({ id: 'i2', name: 'b', environment: 'production', php_version: '8.2' })),
      http.get(`${BASE_URL}/installs/i1/domains`, () =>
        HttpResponse.json({ results: [] })),
      http.get(`${BASE_URL}/installs/i2/domains`, () =>
        HttpResponse.json({ results: [] })),
      http.get(`${BASE_URL}/installs/i1/usage`, () =>
        HttpResponse.json({ bandwidth: 100 })),
      http.get(`${BASE_URL}/installs/i2/usage`, () =>
        HttpResponse.json({ bandwidth: 100 })),
    );

    const result = await wpeEnvironmentDiffHandler({
      install_id_a: 'i1', install_id_b: 'i2',
    }, createClient()) as Record<string, unknown>;
    const diffs = result.differences as unknown[];
    expect(diffs).toHaveLength(0);
  });
});
