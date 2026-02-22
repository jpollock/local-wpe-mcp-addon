import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../../src/capi-client.js';
import { createAuthProvider } from '../../../../src/auth.js';
import { wpePromoteToProductionHandler } from '../../../../src/tools/composite/promote-to-production.js';

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

const STAGING_INSTALL = {
  id: 'staging-1',
  name: 'my-site-staging',
  environment: 'staging',
  php_version: '8.2',
  status: 'active',
  primary_domain: 'staging.example.com',
  wp_version: '6.4',
};

const PRODUCTION_INSTALL = {
  id: 'prod-1',
  name: 'my-site-prod',
  environment: 'production',
  php_version: '8.2',
  status: 'active',
  primary_domain: 'example.com',
  wp_version: '6.3',
};

describe('wpe_promote_to_production', () => {
  it('runs full promotion sequence successfully', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs/staging-1`, () =>
        HttpResponse.json(STAGING_INSTALL)),
      http.get(`${BASE_URL}/installs/prod-1`, ({ request }) => {
        // First call returns pre-copy state, second call returns post-copy state
        return HttpResponse.json(PRODUCTION_INSTALL);
      }),
      http.post(`${BASE_URL}/installs/prod-1/backups`, () =>
        HttpResponse.json({ id: 'backup-123', status: 'in_progress' })),
      http.post(`${BASE_URL}/install_copy`, () =>
        HttpResponse.json({ id: 'copy-456', status: 'pending' })),
      http.post(`${BASE_URL}/installs/prod-1/purge_cache`, () =>
        HttpResponse.json({ success: true })),
    );

    const result = await wpePromoteToProductionHandler({
      staging_install_id: 'staging-1',
      production_install_id: 'prod-1',
      notification_emails: ['admin@example.com'],
    }, createClient()) as Record<string, unknown>;

    // Staging summary
    expect(result.staging).toEqual({
      id: 'staging-1',
      name: 'my-site-staging',
      environment: 'staging',
      php_version: '8.2',
      status: 'active',
      primary_domain: 'staging.example.com',
    });

    // Production summary
    expect(result.production).toEqual({
      id: 'prod-1',
      name: 'my-site-prod',
      environment: 'production',
      php_version: '8.2',
      status: 'active',
      primary_domain: 'example.com',
    });

    // Diff should show wp_version and primary_domain differences
    const diff = result.diff as Array<{ field: string }>;
    expect(diff.find((d) => d.field === 'wp_version')).toBeDefined();
    expect(diff.find((d) => d.field === 'primary_domain')).toBeDefined();
    // environment always differs (staging vs production)
    expect(diff.find((d) => d.field === 'environment')).toBeDefined();

    // Backup created
    const backup = result.backup as Record<string, unknown>;
    expect(backup.id).toBe('backup-123');
    expect(backup.status).toBe('in_progress');

    // Copy succeeded
    expect(result.copy).toEqual({ success: true });

    // Cache purge succeeded
    expect(result.cache_purge).toEqual({ success: true });

    // Post-copy status present
    const postCopy = result.post_copy_status as Record<string, unknown>;
    expect(postCopy.id).toBe('prod-1');
    expect(postCopy.status).toBe('active');

    // No warnings (destination is production)
    expect(result.warnings).toEqual([]);
  });

  it('returns error when staging install not found', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs/bad-staging`, () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 })),
      http.get(`${BASE_URL}/installs/prod-1`, () =>
        HttpResponse.json(PRODUCTION_INSTALL)),
    );

    const result = await wpePromoteToProductionHandler({
      staging_install_id: 'bad-staging',
      production_install_id: 'prod-1',
    }, createClient()) as Record<string, unknown>;

    expect(result.error).toBeDefined();
    expect(result.detail).toContain('Staging install');
    // No backup or copy should be attempted
    expect(result.backup).toBeUndefined();
    expect(result.copy).toBeUndefined();
  });

  it('stops if backup creation fails — copy NOT attempted', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs/staging-1`, () =>
        HttpResponse.json(STAGING_INSTALL)),
      http.get(`${BASE_URL}/installs/prod-1`, () =>
        HttpResponse.json(PRODUCTION_INSTALL)),
      http.post(`${BASE_URL}/installs/prod-1/backups`, () =>
        HttpResponse.json({ error: 'Backup quota exceeded' }, { status: 429 })),
    );

    const client = new CapiClient({
      authProvider: createAuthProvider(),
      retryOn429: false,
    });

    const result = await wpePromoteToProductionHandler({
      staging_install_id: 'staging-1',
      production_install_id: 'prod-1',
    }, client) as Record<string, unknown>;

    // Backup failed
    const backup = result.backup as Record<string, unknown>;
    expect(backup.error).toBeDefined();

    // Copy was not attempted
    const copy = result.copy as Record<string, unknown>;
    expect(copy.skipped).toBe(true);
    expect(copy.reason).toContain('Backup failed');
  });

  it('returns backup_id when copy fails after successful backup', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs/staging-1`, () =>
        HttpResponse.json(STAGING_INSTALL)),
      http.get(`${BASE_URL}/installs/prod-1`, () =>
        HttpResponse.json(PRODUCTION_INSTALL)),
      http.post(`${BASE_URL}/installs/prod-1/backups`, () =>
        HttpResponse.json({ id: 'backup-789', status: 'in_progress' })),
      http.post(`${BASE_URL}/install_copy`, () =>
        HttpResponse.json({ error: 'Copy failed' }, { status: 500 })),
    );

    const result = await wpePromoteToProductionHandler({
      staging_install_id: 'staging-1',
      production_install_id: 'prod-1',
    }, createClient()) as Record<string, unknown>;

    // Backup succeeded — ID available for rollback
    const backup = result.backup as Record<string, unknown>;
    expect(backup.id).toBe('backup-789');

    // Copy failed
    const copy = result.copy as Record<string, unknown>;
    expect(copy.error).toBeDefined();

    // Cache purge skipped
    const purge = result.cache_purge as Record<string, unknown>;
    expect(purge.skipped).toBe(true);
  });

  it('continues when cache purge fails (non-fatal)', async () => {
    mockServer.use(
      http.get(`${BASE_URL}/installs/staging-1`, () =>
        HttpResponse.json(STAGING_INSTALL)),
      http.get(`${BASE_URL}/installs/prod-1`, () =>
        HttpResponse.json(PRODUCTION_INSTALL)),
      http.post(`${BASE_URL}/installs/prod-1/backups`, () =>
        HttpResponse.json({ id: 'backup-abc', status: 'in_progress' })),
      http.post(`${BASE_URL}/install_copy`, () =>
        HttpResponse.json({ id: 'copy-def', status: 'pending' })),
      http.post(`${BASE_URL}/installs/prod-1/purge_cache`, () =>
        HttpResponse.json({ error: 'Cache service unavailable' }, { status: 503 })),
    );

    const result = await wpePromoteToProductionHandler({
      staging_install_id: 'staging-1',
      production_install_id: 'prod-1',
    }, createClient()) as Record<string, unknown>;

    // Copy succeeded
    expect(result.copy).toEqual({ success: true });

    // Cache purge failed but non-fatal
    const purge = result.cache_purge as Record<string, unknown>;
    expect(purge.error).toBeDefined();

    // Post-copy status still present
    expect(result.post_copy_status).toBeDefined();
  });
});
