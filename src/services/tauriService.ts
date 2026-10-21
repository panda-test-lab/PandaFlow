/**
 * PandaFlow Tauri & Desktop Integration Service
 * 
 * Provides:
 * - Version detection directly from "src-tauri/tauri.conf.json" (Tauri v1 & v2 format)
 * - Dynamic runtime fallback to Tauri Native API (@tauri-apps/api) when running inside Tauri Desktop
 * - Environment detection (Tauri Desktop vs Web Browser / PWA)
 * - Safe Tauri system dialogs & window controls
 */

// Vite glob to inspect if "src-tauri/tauri.conf.json" exists at build/bundle time
const tauriConfGlob = typeof import.meta.glob === 'function'
  ? import.meta.glob('/src-tauri/tauri.conf.json', { eager: true }) as Record<string, any>
  : {};

export interface TauriAppInfo {
  version: string;
  productName: string;
  identifier: string;
  description: string;
  isTauri: boolean;
  hasConfigFile: boolean;
  source: 'tauri-runtime' | 'tauri.conf.json' | 'runtime-fetch' | 'fallback';
  rawConfig?: any;
}

const DEFAULT_FALLBACK_INFO: TauriAppInfo = {
  version: '1.0.0',
  productName: 'PandaFlow',
  identifier: 'com.pandaflow.app',
  description: 'Dein Studium. Zusammen gedacht.',
  isTauri: false,
  hasConfigFile: false,
  source: 'fallback',
};

/**
 * Checks if the current execution context is running inside a Tauri desktop shell.
 */
export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__TAURI__ ||
    (window as any).__TAURI_IPC__ ||
    (window as any).__TAURI_METADATA__ ||
    (window as any).__TAURI_INTERNALS__
  );
}

/**
 * Parses a loaded tauri.conf.json object into a normalized TauriAppInfo.
 */
function parseTauriConfig(configObj: any, source: TauriAppInfo['source']): TauriAppInfo {
  if (!configObj || typeof configObj !== 'object') {
    return DEFAULT_FALLBACK_INFO;
  }

  // Handle Vite JSON import modules with .default
  const data = configObj.default ? configObj.default : configObj;

  // Tauri v1 puts version in `package.version`, v2 often in `version`
  const version = data.package?.version || data.version || '1.0.0';
  const productName = data.package?.productName || data.productName || 'PandaFlow';
  const identifier = data.tauri?.bundle?.identifier || data.bundle?.identifier || 'com.pandaflow.app';
  const description = data.tauri?.bundle?.shortDescription || data.bundle?.shortDescription || 'Dein Studium. Zusammen gedacht.';

  return {
    version: String(version).trim(),
    productName: String(productName).trim(),
    identifier: String(identifier).trim(),
    description: String(description).trim(),
    isTauri: isTauriEnvironment(),
    hasConfigFile: true,
    source,
    rawConfig: data,
  };
}

/**
 * Synchronously retrieves the cached/bundled version from "src-tauri/tauri.conf.json" if available.
 */
export function getTauriConfigSync(): TauriAppInfo {
  try {
    const globKeys = Object.keys(tauriConfGlob);
    if (globKeys.length > 0) {
      const configModule = tauriConfGlob[globKeys[0]];
      return parseTauriConfig(configModule, 'tauri.conf.json');
    }
  } catch (err) {
    console.warn('[PandaFlow Tauri] Error reading bundled src-tauri/tauri.conf.json:', err);
  }

  return {
    ...DEFAULT_FALLBACK_INFO,
    isTauri: isTauriEnvironment(),
  };
}

/**
 * Asynchronously checks Tauri runtime or fetches latest /src-tauri/tauri.conf.json.
 */
export async function getTauriAppInfo(): Promise<TauriAppInfo> {
  // 1. If running inside Tauri native runtime, query Tauri's native app API
  if (isTauriEnvironment()) {
    try {
      const tauriApp = await import('@tauri-apps/api/app').catch(() => null);
      if (tauriApp && typeof tauriApp.getVersion === 'function') {
        const [nativeVersion, nativeName] = await Promise.all([
          tauriApp.getVersion().catch(() => null),
          tauriApp.getName().catch(() => null),
        ]);

        if (nativeVersion) {
          const syncInfo = getTauriConfigSync();
          return {
            version: nativeVersion,
            productName: nativeName || syncInfo.productName || 'PandaFlow',
            identifier: syncInfo.identifier || 'com.pandaflow.app',
            description: syncInfo.description,
            isTauri: true,
            hasConfigFile: syncInfo.hasConfigFile,
            source: 'tauri-runtime',
            rawConfig: syncInfo.rawConfig,
          };
        }
      }
    } catch (e) {
      console.warn('[PandaFlow Tauri] Failed to read version from Tauri runtime API:', e);
    }
  }

  // 2. Check bundled tauri.conf.json
  const syncInfo = getTauriConfigSync();
  if (syncInfo.hasConfigFile) {
    return syncInfo;
  }

  // 3. Try runtime fetch of /src-tauri/tauri.conf.json (e.g., during dev mode or served root)
  try {
    const res = await fetch('/src-tauri/tauri.conf.json');
    if (res.ok) {
      const json = await res.json();
      return parseTauriConfig(json, 'runtime-fetch');
    }
  } catch {
    // Ignore fetch error
  }

  // 4. Try public/tauri.conf.json fallback
  try {
    const res = await fetch('/tauri.conf.json');
    if (res.ok) {
      const json = await res.json();
      return parseTauriConfig(json, 'runtime-fetch');
    }
  } catch {
    // Ignore
  }

  return {
    ...DEFAULT_FALLBACK_INFO,
    isTauri: isTauriEnvironment(),
  };
}

/**
 * Quick helper returning only the version string (e.g. "1.2.0")
 */
export function getAppVersion(): string {
  return getTauriConfigSync().version;
}
