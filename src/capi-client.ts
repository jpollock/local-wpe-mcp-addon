import type { AuthProvider } from './auth.js';

export interface CapiClientConfig {
  baseUrl?: string;
  authProvider: AuthProvider;
  maxConcurrency?: number;
  retryOn429?: boolean;
  maxRetries?: number;
}

export interface CapiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: {
    code: number;
    message: string;
    details?: unknown;
  };
}

interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

const DEFAULT_BASE_URL = 'https://api.wpengineapi.com/v1';
const DEFAULT_MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;

export class CapiClient {
  private readonly baseUrl: string;
  private readonly authProvider: AuthProvider;
  private readonly retryOn429: boolean;
  private readonly maxRetries: number;

  constructor(config: CapiClientConfig) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.authProvider = config.authProvider;
    this.retryOn429 = config.retryOn429 ?? true;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async get<T = unknown>(path: string, params?: Record<string, string>): Promise<CapiResponse<T>> {
    return this.request<T>('GET', path, undefined, params);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<CapiResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<CapiResponse<T>> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T = unknown>(path: string): Promise<CapiResponse<T>> {
    return this.request<T>('DELETE', path);
  }

  async getAll<T = unknown>(
    path: string,
    params?: Record<string, string>,
  ): Promise<CapiResponse<T[]>> {
    const allResults: T[] = [];
    const mergedParams = { ...params, limit: '100', offset: '0' };

    const firstResponse = await this.request<PaginatedResponse<T>>('GET', path, undefined, mergedParams);
    if (!firstResponse.ok || !firstResponse.data) {
      return {
        ok: firstResponse.ok,
        status: firstResponse.status,
        data: [],
        error: firstResponse.error,
      };
    }

    allResults.push(...firstResponse.data.results);

    let nextUrl = firstResponse.data.next;
    while (nextUrl) {
      const nextResponse = await this.requestUrl<PaginatedResponse<T>>('GET', nextUrl);
      if (!nextResponse.ok || !nextResponse.data) break;
      allResults.push(...nextResponse.data.results);
      nextUrl = nextResponse.data.next;
    }

    return {
      ok: true,
      status: 200,
      data: allResults,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<CapiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return this.requestUrl<T>(method, url.toString(), body);
  }

  private async requestUrl<T>(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<CapiResponse<T>> {
    const authHeader = await this.authProvider.getAuthHeader();
    if (!authHeader) {
      return {
        ok: false,
        status: 0,
        error: {
          code: 0,
          message: 'No authentication configured. Set WP_ENGINE_API_USERNAME and WP_ENGINE_API_PASSWORD environment variables, or configure OAuth via Local.',
        },
      };
    }

    const headers: Record<string, string> = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined && (method === 'POST' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body);
    }

    return this.executeWithRetry<T>(url, fetchOptions);
  }

  private async executeWithRetry<T>(
    url: string,
    options: RequestInit,
    attempt = 0,
  ): Promise<CapiResponse<T>> {
    const response = await fetch(url, options);

    if (response.status === 429 && this.retryOn429 && attempt < this.maxRetries - 1) {
      const baseDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
      const delay = baseDelay / 2 + Math.random() * (baseDelay / 2);
      await sleep(delay);
      return this.executeWithRetry<T>(url, options, attempt + 1);
    }

    if (response.status === 204) {
      return { ok: true, status: 204 };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = undefined;
    }

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        data: data as T,
      };
    }

    return {
      ok: false,
      status: response.status,
      error: {
        code: response.status,
        message: formatErrorMessage(response.status, data),
        details: data,
      },
    };
  }
}

function formatErrorMessage(status: number, data: unknown): string {
  const body = data as Record<string, unknown> | undefined;
  const detail = body?.error ?? body?.message ?? '';

  switch (status) {
    case 401:
      return `Authentication failed (401). ${detail} — Check your credentials or re-authenticate via Local.`;
    case 403:
      return `Access denied (403). ${detail} — You may not have permission for this resource.`;
    case 404:
      return `Not found (404). ${detail} — The requested resource does not exist.`;
    case 429:
      return `Rate limited (429). Too many requests — try again shortly.`;
    default:
      if (status >= 500) {
        return `Server error (${status}). ${detail} — WP Engine API may be experiencing issues.`;
      }
      return `Request failed (${status}). ${detail}`;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
