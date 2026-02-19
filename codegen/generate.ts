import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Types
export interface SwaggerOperation {
  toolName: string;
  description: string;
  tag: string;
  httpMethod: string;
  apiPath: string;
  operationId: string;
  defaultTier: 1 | 2 | 3;
  parameters: SwaggerParam[];
}

export interface SwaggerParam {
  name: string;
  in: 'path' | 'query' | 'body';
  required: boolean;
  type: string;
  description?: string;
}

interface SwaggerSpec {
  paths: Record<string, Record<string, SwaggerPathMethod>>;
  parameters?: Record<string, SwaggerParamDef>;
}

interface SwaggerPathMethod {
  operationId?: string;
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: Array<SwaggerParamDef | { $ref: string }>;
}

interface SwaggerParamDef {
  name?: string;
  in?: string;
  required?: boolean;
  type?: string;
  description?: string;
  schema?: {
    type?: string;
    required?: string[];
    properties?: Record<string, { type?: string; description?: string; format?: string }>;
  };
}

// Tool name derivation
export function deriveToolName(method: string, apiPath: string, operationId: string): string {
  // Strategy: use operationId when available, transform to wpe_snake_case
  // Special handling for specific patterns
  const opId = operationId || '';

  // Map operationId to our naming convention
  const name = camelToSnake(opId);

  // Apply prefix transformations
  let toolName = name
    // list* → get_* (plural)
    .replace(/^list_/, 'get_')
    // show* → get_*
    .replace(/^show_/, 'get_')
    // Special cases
    .replace(/^get_accounts_limits$/, 'get_account_limits')
    .replace(/^create_bulk_domains$/, 'create_domains_bulk')
    .replace(/^check_status$/, 'check_domain_status')
    .replace(/^get_domain_report_status$/, 'get_domain_status_report')
    .replace(/^get_domain_certificate$/, 'get_domain_ssl_certificate')
    .replace(/^create_domain_certificate_order$/, 'request_ssl_certificate')
    .replace(/^get_install_certificates$/, 'get_ssl_certificates')
    .replace(/^import_third_party_s_s_l_certificate$/, 'import_ssl_certificate')
    .replace(/^import_third_party_ssl_certificate$/, 'import_ssl_certificate')
    .replace(/^get_large_f_s_validation_file$/, 'get_largefs_validation')
    .replace(/^get_large_fs_validation_file$/, 'get_largefs_validation')
    .replace(/^get_offload_settings$/, 'get_offload_settings')
    .replace(/^update_offload_settings$/, 'configure_offload_settings')
    .replace(/^patch_offload_settings$/, 'update_offload_settings')
    .replace(/^get_account_usage_metrics$/, 'get_account_usage')
    .replace(/^get_install_usage_metrics$/, 'get_install_usage')
    .replace(/^get_account_usage_summary$/, 'get_account_usage_summary')
    .replace(/^get_account_usage_insights$/, 'get_account_usage_insights')
    .replace(/^refresh_environment_disk_usage$/, 'refresh_install_disk_usage')
    .replace(/^get_ssh_keys$/, 'get_ssh_keys')
    .replace(/^list_ssh_keys$/, 'get_ssh_keys')
    .replace(/^get_current_user$/, 'get_current_user')
    .replace(/^status$/, 'get_status')
    .replace(/^swagger$/, 'get_swagger');

  // Handle missing operationId — derive from path + method
  if (!opId) {
    toolName = deriveFromPath(method, apiPath);
  }

  return `wpe_${toolName}`;
}

function deriveFromPath(method: string, apiPath: string): string {
  const prefix = method === 'GET' ? 'get' :
    method === 'POST' ? 'create' :
    method === 'PATCH' ? 'update' :
    method === 'DELETE' ? 'delete' : method.toLowerCase();

  const segments = apiPath
    .split('/')
    .filter(s => s && !s.startsWith('{'))
    .map(s => s.replace(/-/g, '_'));

  const lastSegment = segments[segments.length - 1] ?? 'unknown';

  // Special patterns
  if (apiPath.includes('refresh_disk_usage') && apiPath.includes('accounts')) {
    return 'refresh_account_disk_usage';
  }
  if (apiPath.includes('refresh_disk_usage') && apiPath.includes('installs')) {
    return 'refresh_install_disk_usage';
  }

  return `${prefix}_${lastSegment}`;
}

function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/__+/g, '_');
}

// Safety tier derivation
export function deriveDefaultTier(method: string): 1 | 2 | 3 {
  switch (method.toUpperCase()) {
    case 'GET': return 1;
    case 'DELETE': return 3;
    default: return 2;
  }
}

// Resolve $ref parameters
function resolveParam(
  param: SwaggerParamDef | { $ref: string },
  globalParams: Record<string, SwaggerParamDef>,
): SwaggerParamDef | null {
  if ('$ref' in param && param.$ref) {
    const refName = param.$ref.replace('#/parameters/', '');
    return globalParams[refName] ?? null;
  }
  return param as SwaggerParamDef;
}

// Parse all operations from swagger spec
export function parseSwaggerOperations(swagger: SwaggerSpec): SwaggerOperation[] {
  const operations: SwaggerOperation[] = [];
  const globalParams = swagger.parameters ?? {};

  for (const [apiPath, methods] of Object.entries(swagger.paths)) {
    for (const [method, details] of Object.entries(methods)) {
      if (!['get', 'post', 'patch', 'put', 'delete'].includes(method)) continue;

      const httpMethod = method.toUpperCase();
      const operationId = details.operationId ?? '';
      const tag = details.tags?.[0] ?? 'Other';
      const description = details.summary ?? details.description ?? '';
      const toolName = deriveToolName(httpMethod, apiPath, operationId);
      const defaultTier = deriveDefaultTier(httpMethod);

      // Parse parameters
      const parameters: SwaggerParam[] = [];
      for (const rawParam of details.parameters ?? []) {
        const resolved = resolveParam(rawParam, globalParams);
        if (!resolved) continue;

        // Skip authorization header
        if (resolved.in === 'header' && resolved.name?.toLowerCase() === 'authorization') continue;

        // Skip pagination params for list endpoints (handled automatically)
        if (resolved.in === 'query' && (resolved.name === 'limit' || resolved.name === 'offset')) continue;

        if (resolved.in === 'body' && resolved.schema?.properties) {
          // Flatten body schema into individual parameters
          const requiredFields = resolved.schema.required ?? [];
          for (const [propName, propDef] of Object.entries(resolved.schema.properties)) {
            parameters.push({
              name: propName,
              in: 'body',
              required: requiredFields.includes(propName),
              type: propDef.type ?? 'string',
              description: propDef.description,
            });
          }
        } else if (resolved.in === 'path' || resolved.in === 'query') {
          parameters.push({
            name: resolved.name ?? '',
            in: resolved.in as 'path' | 'query',
            required: resolved.required ?? false,
            type: resolved.type ?? 'string',
            description: resolved.description,
          });
        }
      }

      operations.push({
        toolName,
        description,
        tag,
        httpMethod,
        apiPath,
        operationId,
        defaultTier,
        parameters,
      });
    }
  }

  return operations;
}

// Tag name to filename
function tagToFilename(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, '-');
}

// Generate TypeScript code for a group of operations
function generateToolFile(tag: string, operations: SwaggerOperation[]): string {
  const lines: string[] = [
    '// AUTO-GENERATED FROM swagger.json — DO NOT EDIT',
    `// Tag: ${tag}`,
    '',
    "import type { CapiClient } from '../../capi-client.js';",
    '',
  ];

  for (const op of operations) {
    // Build input schema
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const param of op.parameters) {
      const prop: Record<string, unknown> = {
        type: mapSwaggerType(param.type),
      };
      if (param.description) {
        prop['description'] = param.description;
      }
      properties[param.name] = prop;
      if (param.required) {
        required.push(param.name);
      }
    }

    const varName = toolNameToVarName(op.toolName);

    lines.push(`export const ${varName}Def = {`);
    lines.push(`  name: '${op.toolName}',`);
    lines.push(`  description: ${JSON.stringify(op.description)},`);
    lines.push(`  inputSchema: {`);
    lines.push(`    type: 'object' as const,`);
    lines.push(`    properties: ${JSON.stringify(properties, null, 4).replace(/\n/g, '\n    ')},`);
    if (required.length > 0) {
      lines.push(`    required: ${JSON.stringify(required)},`);
    }
    lines.push(`  },`);
    lines.push(`  annotations: {`);
    lines.push(`    safetyTier: ${op.defaultTier} as const,`);
    lines.push(`    httpMethod: '${op.httpMethod}',`);
    lines.push(`    apiPath: '${op.apiPath}',`);
    lines.push(`    tag: '${op.tag}',`);
    lines.push(`  },`);
    lines.push(`};`);
    lines.push('');

    // Generate handler function
    const hasParams = op.parameters.length > 0;
    const paramsArg = hasParams ? 'params' : '_params';
    lines.push(`export async function ${varName}Handler(`);
    lines.push(`  ${paramsArg}: Record<string, unknown>,`);
    lines.push(`  client: CapiClient,`);
    lines.push(`): Promise<unknown> {`);

    // Build path with parameter substitution
    let pathExpr = `'${op.apiPath}'`;
    const pathParams = op.parameters.filter(p => p.in === 'path');
    if (pathParams.length > 0) {
      pathExpr = '`' + op.apiPath.replace(/\{(\w+)\}/g, '${params.$1 as string}') + '`';
    }

    const queryParams = op.parameters.filter(p => p.in === 'query');
    const bodyParams = op.parameters.filter(p => p.in === 'body');

    if (op.httpMethod === 'GET') {
      if (queryParams.length > 0) {
        lines.push(`  const queryParams: Record<string, string> = {};`);
        for (const qp of queryParams) {
          lines.push(`  if (params['${qp.name}'] !== undefined) queryParams['${qp.name}'] = String(params['${qp.name}']);`);
        }
        lines.push(`  const response = await client.get(${pathExpr}, queryParams);`);
      } else {
        lines.push(`  const response = await client.get(${pathExpr});`);
      }
    } else if (op.httpMethod === 'POST') {
      if (bodyParams.length > 0) {
        lines.push(`  const body: Record<string, unknown> = {};`);
        for (const bp of bodyParams) {
          lines.push(`  if (params['${bp.name}'] !== undefined) body['${bp.name}'] = params['${bp.name}'];`);
        }
        lines.push(`  const response = await client.post(${pathExpr}, body);`);
      } else {
        lines.push(`  const response = await client.post(${pathExpr});`);
      }
    } else if (op.httpMethod === 'PATCH') {
      if (bodyParams.length > 0) {
        lines.push(`  const body: Record<string, unknown> = {};`);
        for (const bp of bodyParams) {
          lines.push(`  if (params['${bp.name}'] !== undefined) body['${bp.name}'] = params['${bp.name}'];`);
        }
        lines.push(`  const response = await client.patch(${pathExpr}, body);`);
      } else {
        lines.push(`  const response = await client.patch(${pathExpr});`);
      }
    } else if (op.httpMethod === 'DELETE') {
      lines.push(`  const response = await client.delete(${pathExpr});`);
    }

    lines.push(`  if (!response.ok) {`);
    lines.push(`    return { error: response.error };`);
    lines.push(`  }`);
    lines.push(`  return response.data;`);
    lines.push(`}`);
    lines.push('');
  }

  // Export all tool definitions as array
  lines.push('export const toolDefs = [');
  for (const op of operations) {
    const varName = toolNameToVarName(op.toolName);
    lines.push(`  { def: ${varName}Def, handler: ${varName}Handler },`);
  }
  lines.push('];');
  lines.push('');

  return lines.join('\n');
}

function toolNameToVarName(toolName: string): string {
  // wpe_get_accounts → wpeGetAccounts
  return toolName.replace(/_([a-z])/g, (_, c) => (c as string).toUpperCase());
}

function mapSwaggerType(type: string): string {
  switch (type) {
    case 'integer': return 'number';
    case 'boolean': return 'boolean';
    case 'array': return 'array';
    default: return 'string';
  }
}

// Generate index file that re-exports all tool groups
function generateIndexFile(tags: string[]): string {
  const lines: string[] = [
    '// AUTO-GENERATED FROM swagger.json — DO NOT EDIT',
    '',
  ];

  for (const tag of tags) {
    const filename = tagToFilename(tag);
    const varName = tag.replace(/\s+/g, '');
    lines.push(`export { toolDefs as ${varName.charAt(0).toLowerCase() + varName.slice(1)}Tools } from './${filename}.js';`);
  }

  lines.push('');
  lines.push("import type { CapiClient } from '../../capi-client.js';");
  lines.push('');

  // Import all tool arrays
  for (const tag of tags) {
    const filename = tagToFilename(tag);
    const varName = tag.replace(/\s+/g, '');
    lines.push(`import { toolDefs as _${varName.charAt(0).toLowerCase() + varName.slice(1)} } from './${filename}.js';`);
  }

  lines.push('');
  lines.push('export interface ToolRegistration {');
  lines.push('  def: {');
  lines.push('    name: string;');
  lines.push('    description: string;');
  lines.push('    inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] };');
  lines.push('    annotations: { safetyTier: 1 | 2 | 3; httpMethod: string; apiPath: string; tag: string };');
  lines.push('  };');
  lines.push('  handler: (params: Record<string, unknown>, client: CapiClient) => Promise<unknown>;');
  lines.push('}');
  lines.push('');
  lines.push('export const allGeneratedTools: ToolRegistration[] = [');
  for (const tag of tags) {
    const varName = tag.replace(/\s+/g, '');
    lines.push(`  ..._${varName.charAt(0).toLowerCase() + varName.slice(1)},`);
  }
  lines.push('];');
  lines.push('');

  return lines.join('\n');
}

// Main codegen function
export function runCodegen(swaggerPath: string, outputDir: string): void {
  const swaggerContent = fs.readFileSync(swaggerPath, 'utf-8');
  const swagger = JSON.parse(swaggerContent) as SwaggerSpec;

  const operations = parseSwaggerOperations(swagger);

  // Group by tag
  const byTag = new Map<string, SwaggerOperation[]>();
  for (const op of operations) {
    const existing = byTag.get(op.tag) ?? [];
    existing.push(op);
    byTag.set(op.tag, existing);
  }

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Generate per-tag files
  const tags: string[] = [];
  for (const [tag, ops] of byTag) {
    tags.push(tag);
    const filename = tagToFilename(tag) + '.ts';
    const content = generateToolFile(tag, ops);
    fs.writeFileSync(path.join(outputDir, filename), content);
  }

  // Generate index file
  const indexContent = generateIndexFile(tags.sort());
  fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent);

  console.log(`Generated ${operations.length} tools across ${tags.length} files in ${outputDir}`);
}

// CLI entry point
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename;

if (isMain) {
  const rootDir = path.resolve(path.dirname(__filename), '..');
  const swaggerPath = path.join(rootDir, 'data', 'swagger.json');
  const outputDir = path.join(rootDir, 'src', 'tools', 'generated');
  runCodegen(swaggerPath, outputDir);
}
