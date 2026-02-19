export interface AuthProvider {
  getAuthHeader(): Promise<string | null>;
  getAuthMethod(): string;
}

export interface AuthConfig {
  oauthProvider?: {
    getAccessToken(): Promise<string | undefined>;
  };
}

export function createAuthProvider(config?: AuthConfig): AuthProvider {
  let lastMethod: string = 'none';

  async function tryOAuth(): Promise<string | null> {
    if (!config?.oauthProvider) return null;
    try {
      const token = await config.oauthProvider.getAccessToken();
      if (token) {
        lastMethod = 'oauth';
        return `Bearer ${token}`;
      }
    } catch {
      // OAuth failed — fall through to env var
    }
    return null;
  }

  function tryEnvVar(): string | null {
    const username = process.env['WP_ENGINE_API_USERNAME'];
    const password = process.env['WP_ENGINE_API_PASSWORD'];
    if (username && password) {
      lastMethod = 'basic';
      return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }
    return null;
  }

  return {
    async getAuthHeader(): Promise<string | null> {
      lastMethod = 'none';

      const oauthHeader = await tryOAuth();
      if (oauthHeader) return oauthHeader;

      const basicHeader = tryEnvVar();
      if (basicHeader) return basicHeader;

      return null;
    },

    getAuthMethod(): string {
      return lastMethod;
    },
  };
}
