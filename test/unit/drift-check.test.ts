import { describe, it, expect } from 'vitest';
import { detectDrift, formatReport } from '../../codegen/drift-check.js';

function makeSpec(paths: Record<string, Record<string, unknown>>) {
  return { paths } as Parameters<typeof detectDrift>[0];
}

describe('drift detection', () => {
  it('reports no drift when specs match', () => {
    const spec = makeSpec({
      '/accounts': {
        get: { operationId: 'listAccounts', parameters: [{ name: 'limit', in: 'query', type: 'integer' }] },
      },
      '/accounts/{id}': {
        get: { operationId: 'showAccount', parameters: [{ name: 'id', in: 'path', type: 'string' }] },
      },
    });

    const report = detectDrift(spec, spec);
    expect(report.hasDrift).toBe(false);
    expect(report.addedEndpoints).toHaveLength(0);
    expect(report.removedEndpoints).toHaveLength(0);
    expect(report.changedEndpoints).toHaveLength(0);

    const text = formatReport(report);
    expect(text).toContain('No drift');
  });

  it('reports added endpoints', () => {
    const vendored = makeSpec({
      '/accounts': { get: { operationId: 'listAccounts' } },
    });
    const live = makeSpec({
      '/accounts': { get: { operationId: 'listAccounts' } },
      '/sites': { get: { operationId: 'listSites' } },
    });

    const report = detectDrift(vendored, live);
    expect(report.hasDrift).toBe(true);
    expect(report.addedEndpoints).toContain('GET /sites');
    expect(report.removedEndpoints).toHaveLength(0);

    const text = formatReport(report);
    expect(text).toContain('Added endpoints');
    expect(text).toContain('GET /sites');
  });

  it('reports removed endpoints', () => {
    const vendored = makeSpec({
      '/accounts': { get: { operationId: 'listAccounts' } },
      '/legacy': { delete: { operationId: 'deleteLegacy' } },
    });
    const live = makeSpec({
      '/accounts': { get: { operationId: 'listAccounts' } },
    });

    const report = detectDrift(vendored, live);
    expect(report.hasDrift).toBe(true);
    expect(report.removedEndpoints).toContain('DELETE /legacy');
    expect(report.addedEndpoints).toHaveLength(0);

    const text = formatReport(report);
    expect(text).toContain('Removed endpoints');
    expect(text).toContain('DELETE /legacy');
  });

  it('reports changed parameters', () => {
    const vendored = makeSpec({
      '/accounts': {
        get: {
          operationId: 'listAccounts',
          parameters: [
            { name: 'limit', in: 'query', type: 'integer', required: false },
          ],
        },
      },
    });
    const live = makeSpec({
      '/accounts': {
        get: {
          operationId: 'listAccounts',
          parameters: [
            { name: 'limit', in: 'query', type: 'integer', required: true },
          ],
        },
      },
    });

    const report = detectDrift(vendored, live);
    expect(report.hasDrift).toBe(true);
    expect(report.changedEndpoints).toHaveLength(1);
    expect(report.changedEndpoints[0]!.endpoint).toBe('GET /accounts');
    expect(report.changedEndpoints[0]!.changes.length).toBeGreaterThan(0);

    const text = formatReport(report);
    expect(text).toContain('Changed endpoints');
    expect(text).toContain('GET /accounts');
  });

  it('reports multiple types of drift simultaneously', () => {
    const vendored = makeSpec({
      '/accounts': { get: { operationId: 'listAccounts' } },
      '/old-endpoint': { get: { operationId: 'getOld' } },
    });
    const live = makeSpec({
      '/accounts': {
        get: {
          operationId: 'listAccounts',
          parameters: [{ name: 'filter', in: 'query', type: 'string' }],
        },
      },
      '/new-endpoint': { post: { operationId: 'createNew' } },
    });

    const report = detectDrift(vendored, live);
    expect(report.hasDrift).toBe(true);
    expect(report.addedEndpoints).toContain('POST /new-endpoint');
    expect(report.removedEndpoints).toContain('GET /old-endpoint');
    expect(report.changedEndpoints.length).toBeGreaterThan(0);
  });

  it('ignores non-HTTP methods in paths', () => {
    const vendored = makeSpec({
      '/accounts': { get: { operationId: 'listAccounts' }, parameters: [] },
    });
    const live = makeSpec({
      '/accounts': { get: { operationId: 'listAccounts' }, parameters: [] },
    });

    const report = detectDrift(vendored, live);
    expect(report.hasDrift).toBe(false);
  });
});
