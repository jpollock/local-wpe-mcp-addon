import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSwaggerOperations, type SwaggerOperation } from './generate.js';

interface CompositeToolDef {
  name: string;
  description: string;
  inputSchema: {
    properties: Record<string, { type?: string; description?: string }>;
    required?: string[];
  };
  annotations: { safetyTier: number; tag: string };
}

function tierLabel(tier: number): string {
  switch (tier) {
    case 1: return 'Read-only';
    case 2: return 'Mutating';
    case 3: return 'Destructive';
    default: return `Tier ${tier}`;
  }
}

function generateToolTable(tools: Array<{ name: string; description: string; tier: number; tag: string }>): string {
  const lines: string[] = [];
  lines.push('| Tool | Description | Safety | Category |');
  lines.push('|------|-------------|--------|----------|');
  for (const tool of tools.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`| \`${tool.name}\` | ${tool.description} | ${tierLabel(tool.tier)} | ${tool.tag} |`);
  }
  return lines.join('\n');
}

function generateToolDetails(op: SwaggerOperation): string {
  const lines: string[] = [];
  lines.push(`### \`${op.toolName}\``);
  lines.push('');
  lines.push(op.description);
  lines.push('');
  lines.push(`- **Method:** \`${op.httpMethod}\``);
  lines.push(`- **Path:** \`${op.apiPath}\``);
  lines.push(`- **Safety:** ${tierLabel(op.defaultTier)}`);

  if (op.parameters.length > 0) {
    lines.push('');
    lines.push('**Parameters:**');
    lines.push('');
    lines.push('| Name | Type | Required | Location | Description |');
    lines.push('|------|------|----------|----------|-------------|');
    for (const param of op.parameters) {
      lines.push(`| \`${param.name}\` | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.in} | ${param.description ?? ''} |`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function generateCompositeDetails(def: CompositeToolDef): string {
  const lines: string[] = [];
  lines.push(`### \`${def.name}\``);
  lines.push('');
  lines.push(def.description);
  lines.push('');
  lines.push(`- **Safety:** ${tierLabel(def.annotations.safetyTier)}`);
  lines.push(`- **Type:** Composite tool`);

  const params = Object.entries(def.inputSchema.properties);
  if (params.length > 0) {
    const required = new Set(def.inputSchema.required ?? []);
    lines.push('');
    lines.push('**Parameters:**');
    lines.push('');
    lines.push('| Name | Type | Required | Description |');
    lines.push('|------|------|----------|-------------|');
    for (const [name, prop] of params) {
      lines.push(`| \`${name}\` | ${prop.type ?? 'string'} | ${required.has(name) ? 'Yes' : 'No'} | ${prop.description ?? ''} |`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

export function generateReference(swaggerPath: string, compositeToolDefs: CompositeToolDef[]): string {
  const swaggerContent = fs.readFileSync(swaggerPath, 'utf-8');
  const swagger = JSON.parse(swaggerContent);
  const operations = parseSwaggerOperations(swagger);

  const lines: string[] = [];
  lines.push('# WP Engine CAPI MCP Server — Tool Reference');
  lines.push('');
  lines.push('> Auto-generated from swagger.json and composite tool definitions.');
  lines.push('');

  // Summary
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`- **Generated tools:** ${operations.length}`);
  lines.push(`- **Composite tools:** ${compositeToolDefs.length}`);
  lines.push(`- **Total tools:** ${operations.length + compositeToolDefs.length}`);
  lines.push('');

  // Quick reference table — generated tools
  lines.push('## Generated Tools (CAPI 1:1)');
  lines.push('');
  const generatedRows = operations.map((op) => ({
    name: op.toolName,
    description: op.description.slice(0, 80),
    tier: op.defaultTier,
    tag: op.tag,
  }));
  lines.push(generateToolTable(generatedRows));
  lines.push('');

  // Quick reference table — composite tools
  lines.push('## Composite Tools');
  lines.push('');
  const compositeRows = compositeToolDefs.map((def) => ({
    name: def.name,
    description: def.description.slice(0, 80),
    tier: def.annotations.safetyTier,
    tag: def.annotations.tag,
  }));
  lines.push(generateToolTable(compositeRows));
  lines.push('');

  // Detailed reference — by tag
  const byTag = new Map<string, SwaggerOperation[]>();
  for (const op of operations) {
    const existing = byTag.get(op.tag) ?? [];
    existing.push(op);
    byTag.set(op.tag, existing);
  }

  lines.push('## Detailed Reference');
  lines.push('');

  for (const [tag, ops] of [...byTag].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`### ${tag}`);
    lines.push('');
    for (const op of ops.sort((a, b) => a.toolName.localeCompare(b.toolName))) {
      lines.push(generateToolDetails(op));
    }
  }

  // Composite tool details
  lines.push('### Composite Tools');
  lines.push('');
  for (const def of compositeToolDefs.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(generateCompositeDetails(def));
  }

  return lines.join('\n');
}

// CLI entry point
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename;

if (isMain) {
  const rootDir = path.resolve(path.dirname(__filename), '..');
  const swaggerPath = path.join(rootDir, 'data', 'swagger.json');

  // Dynamically import composite tool defs
  const compositeModule = await import(path.join(rootDir, 'src', 'tools', 'composite', 'index.js'));
  const compositeToolDefs = compositeModule.allCompositeTools.map((t: { def: CompositeToolDef }) => t.def);

  const reference = generateReference(swaggerPath, compositeToolDefs);

  const outputDir = path.join(rootDir, 'docs', 'reference');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'tools.md'), reference);

  console.log(`Generated tool reference: docs/reference/tools.md`);
}
