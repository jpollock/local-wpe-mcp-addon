// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: Domain

import type { CapiClient } from '../../capi-client.js';

export const wpeGetDomainsDef = {
  name: 'wpe_get_domains',
  description: "Get the domains for an install by install id",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "ID of install"
        }
    },
    required: ["install_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/installs/{install_id}/domains',
    tag: 'Domain',
  },
};

export async function wpeGetDomainsHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/installs/${params.install_id as string}/domains`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeCreateDomainDef = {
  name: 'wpe_create_domain',
  description: "Add a new domain or redirect to an existing install",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "ID of install"
        },
        "name": {
            "type": "string"
        },
        "primary": {
            "type": "boolean"
        },
        "redirect_to": {
            "type": "string"
        }
    },
    required: ["install_id","name"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/installs/{install_id}/domains',
    tag: 'Domain',
  },
};

export async function wpeCreateDomainHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['name'] !== undefined) body['name'] = params['name'];
  if (params['primary'] !== undefined) body['primary'] = params['primary'];
  if (params['redirect_to'] !== undefined) body['redirect_to'] = params['redirect_to'];
  const response = await client.post(`/installs/${params.install_id as string}/domains`, body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeCreateDomainsBulkDef = {
  name: 'wpe_create_domains_bulk',
  description: "Add multiple domains and redirects to an existing install",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "ID of install"
        },
        "domains": {
            "type": "array"
        }
    },
    required: ["install_id","domains"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/installs/{install_id}/domains/bulk',
    tag: 'Domain',
  },
};

export async function wpeCreateDomainsBulkHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['domains'] !== undefined) body['domains'] = params['domains'];
  const response = await client.post(`/installs/${params.install_id as string}/domains/bulk`, body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetDomainDef = {
  name: 'wpe_get_domain',
  description: "Get a specific domain for an install",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "ID of install"
        },
        "domain_id": {
            "type": "string",
            "description": "ID of domain"
        }
    },
    required: ["install_id","domain_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/installs/{install_id}/domains/{domain_id}',
    tag: 'Domain',
  },
};

export async function wpeGetDomainHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/installs/${params.install_id as string}/domains/${params.domain_id as string}`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeUpdateDomainDef = {
  name: 'wpe_update_domain',
  description: "Update an existing domain for an install",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "The install ID"
        },
        "domain_id": {
            "type": "string",
            "description": "ID of domain"
        },
        "primary": {
            "type": "boolean"
        },
        "redirect_to": {
            "type": "string"
        },
        "secure_all_urls": {
            "type": "boolean"
        }
    },
    required: ["install_id","domain_id"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'PATCH',
    apiPath: '/installs/{install_id}/domains/{domain_id}',
    tag: 'Domain',
  },
};

export async function wpeUpdateDomainHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['primary'] !== undefined) body['primary'] = params['primary'];
  if (params['redirect_to'] !== undefined) body['redirect_to'] = params['redirect_to'];
  if (params['secure_all_urls'] !== undefined) body['secure_all_urls'] = params['secure_all_urls'];
  const response = await client.patch(`/installs/${params.install_id as string}/domains/${params.domain_id as string}`, body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeDeleteDomainDef = {
  name: 'wpe_delete_domain',
  description: "Delete a specific domain for an install",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "ID of install"
        },
        "domain_id": {
            "type": "string",
            "description": "ID of domain"
        }
    },
    required: ["install_id","domain_id"],
  },
  annotations: {
    safetyTier: 3 as const,
    httpMethod: 'DELETE',
    apiPath: '/installs/{install_id}/domains/{domain_id}',
    tag: 'Domain',
  },
};

export async function wpeDeleteDomainHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.delete(`/installs/${params.install_id as string}/domains/${params.domain_id as string}`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeCheckDomainStatusDef = {
  name: 'wpe_check_domain_status',
  description: "Submit a status report for a domain",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "ID of install"
        },
        "domain_id": {
            "type": "string",
            "description": "ID of domain"
        }
    },
    required: ["install_id","domain_id"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/installs/{install_id}/domains/{domain_id}/check_status',
    tag: 'Domain',
  },
};

export async function wpeCheckDomainStatusHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.post(`/installs/${params.install_id as string}/domains/${params.domain_id as string}/check_status`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetDomainStatusReportDef = {
  name: 'wpe_get_domain_status_report',
  description: "Retrieve a status report for a domain",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string"
        },
        "report_id": {
            "type": "string"
        }
    },
    required: ["install_id","report_id"],
  },
  annotations: {
    safetyTier: 1 as const,
    httpMethod: 'GET',
    apiPath: '/installs/{install_id}/domains/check_status/{report_id}',
    tag: 'Domain',
  },
};

export async function wpeGetDomainStatusReportHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/installs/${params.install_id as string}/domains/check_status/${params.report_id as string}`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeGetDomainsDef, handler: wpeGetDomainsHandler },
  { def: wpeCreateDomainDef, handler: wpeCreateDomainHandler },
  { def: wpeCreateDomainsBulkDef, handler: wpeCreateDomainsBulkHandler },
  { def: wpeGetDomainDef, handler: wpeGetDomainHandler },
  { def: wpeUpdateDomainDef, handler: wpeUpdateDomainHandler },
  { def: wpeDeleteDomainDef, handler: wpeDeleteDomainHandler },
  { def: wpeCheckDomainStatusDef, handler: wpeCheckDomainStatusHandler },
  { def: wpeGetDomainStatusReportDef, handler: wpeGetDomainStatusReportHandler },
];
