import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../../src/capi-client.js';
import { createAuthProvider } from '../../../src/auth.js';
import { wpeCreateBackupHandler, wpeGetBackupHandler } from '../../../src/tools/generated/backup.js';
import { backupFixtures, errorFixtures } from '../../fixtures/index.js';

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

describe('Backup tools', () => {
  describe('wpe_create_backup', () => {
    it('creates a backup with body params', async () => {
      let capturedBody: unknown;
      mockServer.use(http.post(`${BASE_URL}/installs/inst-1/backups`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(backupFixtures.created, { status: 201 });
      }));
      const result = await wpeCreateBackupHandler({
        install_id: 'inst-1', description: 'Pre-deploy backup',
        notification_emails: ['admin@example.com'],
      }, createClient());
      expect(result).toEqual(backupFixtures.created);
      expect(capturedBody).toEqual({
        description: 'Pre-deploy backup', notification_emails: ['admin@example.com'],
      });
    });
  });

  describe('wpe_get_backup', () => {
    it('returns backup status', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/inst-1/backups/backup-1`, () =>
        HttpResponse.json(backupFixtures.single)));
      const result = await wpeGetBackupHandler({ install_id: 'inst-1', backup_id: 'backup-1' }, createClient());
      expect(result).toEqual(backupFixtures.single);
    });

    it('handles not found', async () => {
      mockServer.use(http.get(`${BASE_URL}/installs/inst-1/backups/bad`, () =>
        HttpResponse.json(errorFixtures.notFound.body, { status: 404 })));
      const result = await wpeGetBackupHandler({ install_id: 'inst-1', backup_id: 'bad' }, createClient()) as { error: unknown };
      expect(result.error).toBeDefined();
    });
  });
});
