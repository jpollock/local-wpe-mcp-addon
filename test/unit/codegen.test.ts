import { describe, it, expect } from 'vitest';
import { deriveToolName, deriveDefaultTier, parseSwaggerOperations, type SwaggerOperation } from '../../codegen/generate.js';

describe('codegen', () => {
  describe('tool name derivation', () => {
    it('derives wpe_get_accounts from GET /accounts', () => {
      expect(deriveToolName('GET', '/accounts', 'listAccounts')).toBe('wpe_get_accounts');
    });

    it('derives wpe_get_account from GET /accounts/{account_id}', () => {
      expect(deriveToolName('GET', '/accounts/{account_id}', 'getAccount')).toBe('wpe_get_account');
    });

    it('derives wpe_create_site from POST /sites', () => {
      expect(deriveToolName('POST', '/sites', 'createSite')).toBe('wpe_create_site');
    });

    it('derives wpe_update_site from PATCH /sites/{site_id}', () => {
      expect(deriveToolName('PATCH', '/sites/{site_id}', 'updateSite')).toBe('wpe_update_site');
    });

    it('derives wpe_delete_site from DELETE /sites/{site_id}', () => {
      expect(deriveToolName('DELETE', '/sites/{site_id}', 'deleteSite')).toBe('wpe_delete_site');
    });

    it('derives wpe_copy_install from POST /install_copy', () => {
      expect(deriveToolName('POST', '/install_copy', 'copyInstall')).toBe('wpe_copy_install');
    });

    it('derives wpe_purge_cache from POST /installs/{install_id}/purge_cache', () => {
      expect(deriveToolName('POST', '/installs/{install_id}/purge_cache', 'purgeCache')).toBe('wpe_purge_cache');
    });

    it('derives wpe_get_domains from GET /installs/{install_id}/domains', () => {
      expect(deriveToolName('GET', '/installs/{install_id}/domains', 'listDomains')).toBe('wpe_get_domains');
    });

    it('derives wpe_create_domains_bulk from POST /installs/{install_id}/domains/bulk', () => {
      expect(deriveToolName('POST', '/installs/{install_id}/domains/bulk', 'createBulkDomains')).toBe('wpe_create_domains_bulk');
    });

    it('derives wpe_check_domain_status from POST /installs/{install_id}/domains/{domain_id}/check_status', () => {
      expect(deriveToolName('POST', '/installs/{install_id}/domains/{domain_id}/check_status', 'checkStatus')).toBe('wpe_check_domain_status');
    });

    it('derives wpe_get_current_user from GET /user', () => {
      expect(deriveToolName('GET', '/user', 'getCurrentUser')).toBe('wpe_get_current_user');
    });

    it('derives wpe_get_ssh_keys from GET /ssh_keys', () => {
      expect(deriveToolName('GET', '/ssh_keys', 'listSshKeys')).toBe('wpe_get_ssh_keys');
    });
  });

  describe('safety tier assignment', () => {
    it('assigns tier 1 to GET operations', () => {
      expect(deriveDefaultTier('GET')).toBe(1);
    });

    it('assigns tier 2 to PATCH operations', () => {
      expect(deriveDefaultTier('PATCH')).toBe(2);
    });

    it('assigns tier 2 to POST operations by default', () => {
      expect(deriveDefaultTier('POST')).toBe(2);
    });

    it('assigns tier 3 to DELETE operations', () => {
      expect(deriveDefaultTier('DELETE')).toBe(3);
    });
  });

  describe('parseSwaggerOperations', () => {
    it('parses operations from swagger spec', () => {
      const swagger = {
        paths: {
          '/accounts': {
            get: {
              operationId: 'listAccounts',
              tags: ['Account'],
              summary: 'List your WP Engine accounts',
              parameters: [
                { $ref: '#/parameters/authorization' },
                { $ref: '#/parameters/limitParam' },
                { $ref: '#/parameters/offsetParam' },
              ],
            },
          },
          '/accounts/{account_id}': {
            get: {
              operationId: 'getAccount',
              tags: ['Account'],
              summary: 'Get an account by ID',
              parameters: [
                { $ref: '#/parameters/authorization' },
                { name: 'account_id', in: 'path', required: true, type: 'string' },
              ],
            },
          },
        },
        parameters: {
          authorization: { name: 'Authorization', in: 'header', type: 'string', required: false },
          limitParam: { name: 'limit', in: 'query', type: 'integer', required: false },
          offsetParam: { name: 'offset', in: 'query', type: 'integer', required: false },
        },
      };

      const ops = parseSwaggerOperations(swagger);
      expect(ops.length).toBe(2);

      const listAccounts = ops.find(o => o.toolName === 'wpe_get_accounts');
      expect(listAccounts).toBeDefined();
      expect(listAccounts!.description).toBe('List your WP Engine accounts');
      expect(listAccounts!.tag).toBe('Account');
      expect(listAccounts!.httpMethod).toBe('GET');
      expect(listAccounts!.apiPath).toBe('/accounts');
      // Should not include authorization header or pagination params for list endpoints
      // Pagination is handled automatically by the client

      const getAccount = ops.find(o => o.toolName === 'wpe_get_account');
      expect(getAccount).toBeDefined();
      const pathParams = getAccount!.parameters.filter(p => p.in === 'path');
      expect(pathParams.length).toBe(1);
      expect(pathParams[0]!.name).toBe('account_id');
      expect(pathParams[0]!.required).toBe(true);
    });

    it('extracts body parameters from POST operations', () => {
      const swagger = {
        paths: {
          '/sites': {
            post: {
              operationId: 'createSite',
              tags: ['Site'],
              summary: 'Create a new site',
              parameters: [
                { $ref: '#/parameters/authorization' },
                {
                  in: 'body',
                  name: 'body',
                  required: true,
                  schema: {
                    type: 'object',
                    required: ['name', 'account_id'],
                    properties: {
                      name: { type: 'string' },
                      account_id: { type: 'string' },
                    },
                  },
                },
              ],
            },
          },
        },
        parameters: {
          authorization: { name: 'Authorization', in: 'header', type: 'string' },
        },
      };

      const ops = parseSwaggerOperations(swagger);
      expect(ops.length).toBe(1);
      const createSite = ops[0]!;
      expect(createSite.toolName).toBe('wpe_create_site');
      const bodyParams = createSite.parameters.filter(p => p.in === 'body');
      expect(bodyParams.length).toBe(2);
      expect(bodyParams.find(p => p.name === 'name')?.required).toBe(true);
      expect(bodyParams.find(p => p.name === 'account_id')?.required).toBe(true);
    });

    it('skips authorization header parameters', () => {
      const swagger = {
        paths: {
          '/status': {
            get: {
              operationId: 'status',
              tags: ['Status'],
              summary: 'Get status',
              parameters: [{ $ref: '#/parameters/authorization' }],
            },
          },
        },
        parameters: {
          authorization: { name: 'Authorization', in: 'header', type: 'string' },
        },
      };

      const ops = parseSwaggerOperations(swagger);
      expect(ops[0]!.parameters.length).toBe(0);
    });
  });
});
