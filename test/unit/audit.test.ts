import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAuditLogger, type AuditEntry } from '../../src/audit.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('audit logger', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('logs tier 1 calls with null confirmed field', () => {
    const logger = createAuditLogger();
    logger.log({
      timestamp: new Date().toISOString(),
      toolName: 'wpe_get_accounts',
      tier: 1,
      params: {},
      confirmed: null,
      result: 'success',
      duration_ms: 50,
    });
    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].confirmed).toBeNull();
  });

  it('logs tier 3 confirmation_required', () => {
    const logger = createAuditLogger();
    logger.log({
      timestamp: new Date().toISOString(),
      toolName: 'wpe_delete_site',
      tier: 3,
      params: { site_id: 'site-1' },
      confirmed: null,
      result: 'confirmation_required',
      duration_ms: 5,
    });
    const entries = logger.getEntries();
    expect(entries[0].result).toBe('confirmation_required');
  });

  it('logs tier 3 success after confirmation', () => {
    const logger = createAuditLogger();
    logger.log({
      timestamp: new Date().toISOString(),
      toolName: 'wpe_delete_site',
      tier: 3,
      params: { site_id: 'site-1' },
      confirmed: true,
      result: 'success',
      duration_ms: 200,
    });
    const entries = logger.getEntries();
    expect(entries[0].confirmed).toBe(true);
    expect(entries[0].result).toBe('success');
  });

  it('logs errors', () => {
    const logger = createAuditLogger();
    logger.log({
      timestamp: new Date().toISOString(),
      toolName: 'wpe_get_accounts',
      tier: 1,
      params: {},
      confirmed: null,
      result: 'error',
      error: 'Authentication failed',
      duration_ms: 30,
    });
    const entries = logger.getEntries();
    expect(entries[0].result).toBe('error');
    expect(entries[0].error).toBe('Authentication failed');
  });

  it('redacts sensitive parameters', () => {
    const logger = createAuditLogger();
    logger.log({
      timestamp: new Date().toISOString(),
      toolName: 'wpe_create_ssh_key',
      tier: 2,
      params: { public_key: 'ssh-rsa AAAA...', private_key: 'secret-data', name: 'my-key' },
      confirmed: null,
      result: 'success',
      duration_ms: 100,
    });
    const entries = logger.getEntries();
    expect(entries[0].params.private_key).toBe('[REDACTED]');
    expect(entries[0].params.public_key).toBe('[REDACTED]');
    expect(entries[0].params.name).toBe('my-key');
  });

  it('redacts password and token fields', () => {
    const logger = createAuditLogger();
    logger.log({
      timestamp: new Date().toISOString(),
      toolName: 'wpe_test',
      tier: 2,
      params: { password: 'secret', api_token: 'tok-123', secret_value: 'hidden', visible: 'ok' },
      confirmed: null,
      result: 'success',
      duration_ms: 10,
    });
    const entries = logger.getEntries();
    expect(entries[0].params.password).toBe('[REDACTED]');
    expect(entries[0].params.api_token).toBe('[REDACTED]');
    expect(entries[0].params.secret_value).toBe('[REDACTED]');
    expect(entries[0].params.visible).toBe('ok');
  });

  it('redacts nested sensitive fields recursively', () => {
    const logger = createAuditLogger();
    logger.log({
      timestamp: new Date().toISOString(),
      toolName: 'wpe_test',
      tier: 2,
      params: { user: { password: 'secret', name: 'alice' }, items: [{ api_key: 'k1' }] },
      confirmed: null,
      result: 'success',
      duration_ms: 10,
    });
    const entries = logger.getEntries();
    const nested = entries[0].params.user as Record<string, unknown>;
    expect(nested.password).toBe('[REDACTED]');
    expect(nested.name).toBe('alice');
    const arr = entries[0].params.items as Array<Record<string, unknown>>;
    expect(arr[0].api_key).toBe('[REDACTED]');
  });

  it('includes duration_ms', () => {
    const logger = createAuditLogger();
    logger.log({
      timestamp: new Date().toISOString(),
      toolName: 'wpe_get_accounts',
      tier: 1,
      params: {},
      confirmed: null,
      result: 'success',
      duration_ms: 42,
    });
    const entries = logger.getEntries();
    expect(entries[0].duration_ms).toBe(42);
  });

  it('flushes to file in JSON lines format', async () => {
    const logPath = path.join(tmpDir, 'audit.log');
    const logger = createAuditLogger(logPath);
    logger.log({
      timestamp: '2024-01-01T00:00:00.000Z',
      toolName: 'wpe_get_accounts',
      tier: 1,
      params: {},
      confirmed: null,
      result: 'success',
      duration_ms: 50,
    });
    logger.log({
      timestamp: '2024-01-01T00:00:01.000Z',
      toolName: 'wpe_delete_site',
      tier: 3,
      params: { site_id: 'site-1' },
      confirmed: true,
      result: 'success',
      duration_ms: 200,
    });
    await logger.flush();
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
    const entry1 = JSON.parse(lines[0]) as AuditEntry;
    const entry2 = JSON.parse(lines[1]) as AuditEntry;
    expect(entry1.toolName).toBe('wpe_get_accounts');
    expect(entry2.toolName).toBe('wpe_delete_site');
  });

  it('clears in-memory entries after flush', async () => {
    const logPath = path.join(tmpDir, 'audit.log');
    const logger = createAuditLogger(logPath);
    logger.log({
      timestamp: new Date().toISOString(),
      toolName: 'wpe_get_accounts',
      tier: 1,
      params: {},
      confirmed: null,
      result: 'success',
      duration_ms: 50,
    });
    expect(logger.getEntries()).toHaveLength(1);
    await logger.flush();
    expect(logger.getEntries()).toHaveLength(0);
  });

  it('appends to existing log file on subsequent flushes', async () => {
    const logPath = path.join(tmpDir, 'audit.log');
    const logger = createAuditLogger(logPath);
    logger.log({
      timestamp: '2024-01-01T00:00:00.000Z',
      toolName: 'wpe_get_accounts',
      tier: 1,
      params: {},
      confirmed: null,
      result: 'success',
      duration_ms: 50,
    });
    await logger.flush();
    logger.log({
      timestamp: '2024-01-01T00:00:01.000Z',
      toolName: 'wpe_delete_site',
      tier: 3,
      params: { site_id: 'site-1' },
      confirmed: true,
      result: 'success',
      duration_ms: 200,
    });
    await logger.flush();
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
  });

  it('getEntries returns all logged entries', () => {
    const logger = createAuditLogger();
    for (let i = 0; i < 3; i++) {
      logger.log({
        timestamp: new Date().toISOString(),
        toolName: `wpe_tool_${i}`,
        tier: 1,
        params: {},
        confirmed: null,
        result: 'success',
        duration_ms: 10,
      });
    }
    expect(logger.getEntries()).toHaveLength(3);
  });
});
