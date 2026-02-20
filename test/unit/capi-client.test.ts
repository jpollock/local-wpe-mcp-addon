import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CapiClient } from '../../src/capi-client.js';
import { createAuthProvider } from '../../src/auth.js';

const BASE_URL = 'https://api.wpengineapi.com/v1';

const mockServer = setupServer();

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());

function createClient(overrides?: { retryOn429?: boolean }) {
  process.env['WP_ENGINE_API_USERNAME'] = 'testuser';
  process.env['WP_ENGINE_API_PASSWORD'] = 'testpass';
  const auth = createAuthProvider();
  return new CapiClient({
    baseUrl: BASE_URL,
    authProvider: auth,
    retryOn429: overrides?.retryOn429 ?? true,
  });
}

describe('CapiClient', () => {
  describe('request basics', () => {
    it('sends GET request with auth header', async () => {
      let capturedHeaders: Record<string, string> = {};
      mockServer.use(
        http.get(`${BASE_URL}/accounts`, ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ results: [], count: 0 });
        }),
      );
      const client = createClient();
      await client.get('/accounts');
      expect(capturedHeaders['authorization']).toMatch(/^Basic /);
    });

    it('sends POST request with body', async () => {
      let capturedBody: unknown;
      mockServer.use(
        http.post(`${BASE_URL}/sites`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ id: 'site-1', name: 'test' }, { status: 201 });
        }),
      );
      const client = createClient();
      await client.post('/sites', { name: 'test' });
      expect(capturedBody).toEqual({ name: 'test' });
    });

    it('sends PATCH request with body', async () => {
      let capturedBody: unknown;
      let capturedMethod: string | undefined;
      mockServer.use(
        http.patch(`${BASE_URL}/sites/abc`, async ({ request }) => {
          capturedBody = await request.json();
          capturedMethod = request.method;
          return HttpResponse.json({ id: 'abc', name: 'updated' });
        }),
      );
      const client = createClient();
      await client.patch('/sites/abc', { name: 'updated' });
      expect(capturedMethod).toBe('PATCH');
      expect(capturedBody).toEqual({ name: 'updated' });
    });

    it('sends DELETE request', async () => {
      let capturedMethod: string | undefined;
      mockServer.use(
        http.delete(`${BASE_URL}/sites/abc`, ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const client = createClient();
      const response = await client.delete('/sites/abc');
      expect(capturedMethod).toBe('DELETE');
      expect(response.ok).toBe(true);
    });
  });

  describe('response handling', () => {
    it('returns structured success response', async () => {
      const mockData = { results: [{ id: 'acc-1', name: 'Test' }], count: 1 };
      mockServer.use(
        http.get(`${BASE_URL}/accounts`, () => HttpResponse.json(mockData)),
      );
      const client = createClient();
      const response = await client.get('/accounts');
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockData);
    });

    it('returns structured error for 401', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/accounts`, () =>
          HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 }),
        ),
      );
      const client = createClient();
      const response = await client.get('/accounts');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(response.error).toBeDefined();
      expect(response.error!.message).toBeTruthy();
    });

    it('returns structured error for 404', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/accounts/bad-id`, () =>
          HttpResponse.json({ error: 'Not found' }, { status: 404 }),
        ),
      );
      const client = createClient();
      const response = await client.get('/accounts/bad-id');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(response.error).toBeDefined();
    });

    it('returns structured error for 500', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/accounts`, () =>
          HttpResponse.json({ error: 'Internal error' }, { status: 500 }),
        ),
      );
      const client = createClient();
      const response = await client.get('/accounts');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(response.error).toBeDefined();
    });
  });

  describe('rate limiting', () => {
    it('retries on 429 with backoff', async () => {
      let callCount = 0;
      mockServer.use(
        http.get(`${BASE_URL}/accounts`, () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json({ error: 'Rate limited' }, { status: 429 });
          }
          return HttpResponse.json({ results: [], count: 0 });
        }),
      );
      const client = createClient();
      const response = await client.get('/accounts');
      expect(callCount).toBe(2);
      expect(response.ok).toBe(true);
    });

    it('gives up after max retries on 429', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/accounts`, () =>
          HttpResponse.json({ error: 'Rate limited' }, { status: 429 }),
        ),
      );
      const client = createClient();
      const response = await client.get('/accounts');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
    });
  });

  describe('pagination', () => {
    it('fetches all pages with getAll', async () => {
      const page1Items = Array.from({ length: 3 }, (_, i) => ({ id: `item-${i}` }));
      const page2Items = Array.from({ length: 2 }, (_, i) => ({ id: `item-${i + 3}` }));

      mockServer.use(
        http.get(`${BASE_URL}/installs`, ({ request }) => {
          const url = new URL(request.url);
          const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
          if (offset === 0) {
            return HttpResponse.json({
              results: page1Items,
              count: 5,
              next: `${BASE_URL}/installs?limit=100&offset=3`,
              previous: null,
            });
          }
          return HttpResponse.json({
            results: page2Items,
            count: 5,
            next: null,
            previous: `${BASE_URL}/installs?limit=100&offset=0`,
          });
        }),
      );
      const client = createClient();
      const response = await client.getAll('/installs');
      expect(response.ok).toBe(true);
      expect(response.data).toHaveLength(5);
    });

    it('handles single page response', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/installs`, () =>
          HttpResponse.json({
            results: [{ id: 'a' }, { id: 'b' }],
            count: 2,
            next: null,
            previous: null,
          }),
        ),
      );
      const client = createClient();
      const response = await client.getAll('/installs');
      expect(response.ok).toBe(true);
      expect(response.data).toHaveLength(2);
    });

    it('handles empty response', async () => {
      mockServer.use(
        http.get(`${BASE_URL}/installs`, () =>
          HttpResponse.json({
            results: [],
            count: 0,
            next: null,
            previous: null,
          }),
        ),
      );
      const client = createClient();
      const response = await client.getAll('/installs');
      expect(response.ok).toBe(true);
      expect(response.data).toHaveLength(0);
    });
  });

  describe('auth failure', () => {
    it('returns clear error when no auth configured', async () => {
      delete process.env['WP_ENGINE_API_USERNAME'];
      delete process.env['WP_ENGINE_API_PASSWORD'];
      const auth = createAuthProvider();
      const client = new CapiClient({
        baseUrl: BASE_URL,
        authProvider: auth,
      });
      const response = await client.get('/accounts');
      expect(response.ok).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error!.message).toMatch(/auth/i);
    });
  });
});
