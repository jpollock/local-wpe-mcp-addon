/**
 * Minimal type declarations for the Local (by Flywheel) addon SDK.
 * Only the interfaces needed by this addon are declared here to avoid
 * a hard dependency on @getflywheel/local.
 */

export interface WpeOAuthService {
  getAccessToken(): Promise<string | undefined>;
}

export interface ServiceCradle {
  wpeOAuth: WpeOAuthService;
}

export interface ServiceContainer {
  cradle: ServiceCradle;
}

export interface AddonMainContext {
  /** Electron IPC main handle for registering handlers */
  ipcMain: {
    handle(channel: string, handler: (...args: unknown[]) => unknown): void;
  };
}

export interface LocalMainStatic {
  getServiceContainer(): ServiceContainer;
}
