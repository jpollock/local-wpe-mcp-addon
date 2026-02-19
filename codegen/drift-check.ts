import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

interface SwaggerSpec {
  paths: Record<string, Record<string, SwaggerPathMethod>>;
}

interface SwaggerPathMethod {
  operationId?: string;
  parameters?: Array<{ name?: string; in?: string; required?: boolean; type?: string }>;
}

export interface DriftReport {
  addedEndpoints: string[];
  removedEndpoints: string[];
  changedEndpoints: ChangedEndpoint[];
  hasDrift: boolean;
}

export interface ChangedEndpoint {
  endpoint: string;
  changes: string[];
}

function getEndpointKey(method: string, apiPath: string): string {
  return `${method.toUpperCase()} ${apiPath}`;
}

function getEndpoints(spec: SwaggerSpec): Map<string, SwaggerPathMethod> {
  const endpoints = new Map<string, SwaggerPathMethod>();
  for (const [apiPath, methods] of Object.entries(spec.paths)) {
    for (const [method, details] of Object.entries(methods)) {
      if (!['get', 'post', 'patch', 'put', 'delete'].includes(method)) continue;
      endpoints.set(getEndpointKey(method, apiPath), details);
    }
  }
  return endpoints;
}

export function detectDrift(vendored: SwaggerSpec, live: SwaggerSpec): DriftReport {
  const vendoredEndpoints = getEndpoints(vendored);
  const liveEndpoints = getEndpoints(live);

  const addedEndpoints: string[] = [];
  const removedEndpoints: string[] = [];
  const changedEndpoints: ChangedEndpoint[] = [];

  // Find added endpoints (in live but not in vendored)
  for (const key of liveEndpoints.keys()) {
    if (!vendoredEndpoints.has(key)) {
      addedEndpoints.push(key);
    }
  }

  // Find removed endpoints (in vendored but not in live)
  for (const key of vendoredEndpoints.keys()) {
    if (!liveEndpoints.has(key)) {
      removedEndpoints.push(key);
    }
  }

  // Find changed endpoints
  for (const [key, vendoredDetails] of vendoredEndpoints) {
    const liveDetails = liveEndpoints.get(key);
    if (!liveDetails) continue; // Already counted as removed

    const changes: string[] = [];

    // Compare parameters
    const vendoredParams = (vendoredDetails.parameters ?? [])
      .map((p) => `${p.in}:${p.name}:${p.type ?? 'unknown'}:${p.required ?? false}`)
      .sort();
    const liveParams = (liveDetails.parameters ?? [])
      .map((p) => `${p.in}:${p.name}:${p.type ?? 'unknown'}:${p.required ?? false}`)
      .sort();

    const vendoredParamSet = new Set(vendoredParams);
    const liveParamSet = new Set(liveParams);

    for (const param of liveParams) {
      if (!vendoredParamSet.has(param)) {
        const name = param.split(':')[1];
        changes.push(`parameter added: ${name}`);
      }
    }

    for (const param of vendoredParams) {
      if (!liveParamSet.has(param)) {
        const name = param.split(':')[1];
        changes.push(`parameter changed or removed: ${name}`);
      }
    }

    if (changes.length > 0) {
      changedEndpoints.push({ endpoint: key, changes });
    }
  }

  const hasDrift = addedEndpoints.length > 0 ||
    removedEndpoints.length > 0 ||
    changedEndpoints.length > 0;

  return { addedEndpoints, removedEndpoints, changedEndpoints, hasDrift };
}

export function formatReport(report: DriftReport): string {
  if (!report.hasDrift) {
    return 'No drift detected. Vendored spec matches live spec.';
  }

  const lines: string[] = ['API Drift Detected:', ''];

  if (report.addedEndpoints.length > 0) {
    lines.push(`Added endpoints (${report.addedEndpoints.length}):`);
    for (const ep of report.addedEndpoints.sort()) {
      lines.push(`  + ${ep}`);
    }
    lines.push('');
  }

  if (report.removedEndpoints.length > 0) {
    lines.push(`Removed endpoints (${report.removedEndpoints.length}):`);
    for (const ep of report.removedEndpoints.sort()) {
      lines.push(`  - ${ep}`);
    }
    lines.push('');
  }

  if (report.changedEndpoints.length > 0) {
    lines.push(`Changed endpoints (${report.changedEndpoints.length}):`);
    for (const change of report.changedEndpoints.sort((a, b) => a.endpoint.localeCompare(b.endpoint))) {
      lines.push(`  ~ ${change.endpoint}`);
      for (const c of change.changes) {
        lines.push(`      ${c}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// CLI entry point
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename;

if (isMain) {
  const rootDir = path.resolve(path.dirname(__filename), '..');
  const vendoredPath = path.join(rootDir, 'data', 'swagger.json');
  const liveUrl = 'https://api.wpengineapi.com/v1/swagger';

  console.log('Fetching live swagger spec...');
  const liveResponse = await fetch(liveUrl);
  if (!liveResponse.ok) {
    console.error(`Failed to fetch live spec: ${liveResponse.status}`);
    process.exit(2);
  }
  const liveSpec = await liveResponse.json() as SwaggerSpec;

  const vendoredContent = fs.readFileSync(vendoredPath, 'utf-8');
  const vendoredSpec = JSON.parse(vendoredContent) as SwaggerSpec;

  const report = detectDrift(vendoredSpec, liveSpec);
  console.log(formatReport(report));

  process.exit(report.hasDrift ? 1 : 0);
}
