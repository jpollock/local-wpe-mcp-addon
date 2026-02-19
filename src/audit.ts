import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SafetyTier } from './safety.js';

export interface AuditEntry {
  timestamp: string;
  toolName: string;
  tier: SafetyTier;
  params: Record<string, unknown>;
  confirmed: boolean | null;
  result: 'success' | 'error' | 'confirmation_required';
  error?: string;
  duration_ms: number;
}

export interface AuditLogger {
  log(entry: AuditEntry): void;
  getEntries(): AuditEntry[];
  flush(): Promise<void>;
}

const SENSITIVE_PATTERNS = ['password', 'token', 'secret', 'key'];

function redactParams(params: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    const lower = k.toLowerCase();
    if (SENSITIVE_PATTERNS.some((p) => lower.includes(p))) {
      redacted[k] = '[REDACTED]';
    } else {
      redacted[k] = v;
    }
  }
  return redacted;
}

export function createAuditLogger(logPath?: string): AuditLogger {
  const entries: AuditEntry[] = [];

  return {
    log(entry: AuditEntry): void {
      const redacted: AuditEntry = {
        ...entry,
        params: redactParams(entry.params),
      };
      entries.push(redacted);
    },

    getEntries(): AuditEntry[] {
      return [...entries];
    },

    async flush(): Promise<void> {
      if (!logPath) return;
      const dir = path.dirname(logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const lines = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
      fs.writeFileSync(logPath, lines, 'utf-8');
    },
  };
}
