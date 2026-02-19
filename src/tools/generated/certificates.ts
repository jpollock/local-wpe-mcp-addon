// AUTO-GENERATED FROM swagger.json — DO NOT EDIT
// Tag: Certificates

import type { CapiClient } from '../../capi-client.js';

export const wpeGetSslCertificatesDef = {
  name: 'wpe_get_ssl_certificates',
  description: "List SSL certificates for an install",
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
    apiPath: '/installs/{install_id}/ssl_certificates',
    tag: 'Certificates',
  },
};

export async function wpeGetSslCertificatesHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/installs/${params.install_id as string}/ssl_certificates`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeGetDomainSslCertificateDef = {
  name: 'wpe_get_domain_ssl_certificate',
  description: "Get SSL certificate information for a domain",
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
    apiPath: '/installs/{install_id}/domains/{domain_id}/ssl_certificate',
    tag: 'Certificates',
  },
};

export async function wpeGetDomainSslCertificateHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.get(`/installs/${params.install_id as string}/domains/${params.domain_id as string}/ssl_certificate`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeRequestSslCertificateDef = {
  name: 'wpe_request_ssl_certificate',
  description: "Request a Let's Encrypt Certificate for a legacy domain",
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
    apiPath: '/installs/{install_id}/domains/{domain_id}/ssl_certificate',
    tag: 'Certificates',
  },
};

export async function wpeRequestSslCertificateHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const response = await client.post(`/installs/${params.install_id as string}/domains/${params.domain_id as string}/ssl_certificate`);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const wpeImportSslCertificateDef = {
  name: 'wpe_import_ssl_certificate',
  description: "Import third-party SSL certificate for an install",
  inputSchema: {
    type: 'object' as const,
    properties: {
        "install_id": {
            "type": "string",
            "description": "ID of install"
        },
        "certificate": {
            "type": "string",
            "description": "Base64 encoded PEM certificate chain including the end-entity certificate and all intermediate CA certificates"
        },
        "private_key": {
            "type": "string",
            "description": "The corresponding base64 encoded PEM private key"
        }
    },
    required: ["install_id","certificate","private_key"],
  },
  annotations: {
    safetyTier: 2 as const,
    httpMethod: 'POST',
    apiPath: '/installs/{install_id}/ssl_certificates/third_party',
    tag: 'Certificates',
  },
};

export async function wpeImportSslCertificateHandler(
  params: Record<string, unknown>,
  client: CapiClient,
): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (params['certificate'] !== undefined) body['certificate'] = params['certificate'];
  if (params['private_key'] !== undefined) body['private_key'] = params['private_key'];
  const response = await client.post(`/installs/${params.install_id as string}/ssl_certificates/third_party`, body);
  if (!response.ok) {
    return { error: response.error };
  }
  return response.data;
}

export const toolDefs = [
  { def: wpeGetSslCertificatesDef, handler: wpeGetSslCertificatesHandler },
  { def: wpeGetDomainSslCertificateDef, handler: wpeGetDomainSslCertificateHandler },
  { def: wpeRequestSslCertificateDef, handler: wpeRequestSslCertificateHandler },
  { def: wpeImportSslCertificateDef, handler: wpeImportSslCertificateHandler },
];
