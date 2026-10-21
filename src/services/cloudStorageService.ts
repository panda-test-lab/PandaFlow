export type StoragePresetType = 'local_folder' | 'nextcloud' | 'dropbox' | 'google_drive' | 'custom_dav';

export interface StorageTargetConfig {
  id: string;
  type: StoragePresetType;
  name: string;
  enabled: boolean;
  isDefault: boolean;
  // Local File System Access API
  localPathDisplay?: string;
  fileName?: string;
  // WebDAV / Cloud Server
  serverUrl?: string; // e.g. https://cloud.uni-freiburg.de/remote.php/dav/files/
  username?: string;
  passwordOrToken?: string;
  remoteFilePath?: string; // e.g. /Studium/PandaFlow_Encrypted.sqlite
  // Dropbox specific
  dropboxToken?: string;
  // Google Drive specific
  driveFolderId?: string;
  // Auto-sync
  autoSyncOnChange?: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: 'idle' | 'success' | 'error' | 'syncing';
  lastSyncMessage?: string;
  fileSizeBytes?: number;
}

const STORAGE_CONFIG_KEY = 'pandaflow_storage_targets_v1';

export const DEFAULT_STORAGE_TARGETS: StorageTargetConfig[] = [
  {
    id: 'target-local',
    type: 'local_folder',
    name: 'Lokaler Ordner (Dateisystem frei wählen)',
    enabled: true,
    isDefault: true,
    localPathDisplay: '~/Dokumente/Studium/PandaFlow_Encrypted.sqlite',
    fileName: 'PandaFlow_Encrypted.sqlite',
    autoSyncOnChange: true,
    lastSyncStatus: 'idle',
  },
  {
    id: 'target-nextcloud',
    type: 'nextcloud',
    name: 'Nextcloud (WebDAV)',
    enabled: false,
    isDefault: false,
    serverUrl: 'https://cloud.hochschule.de/remote.php/dav/files/nutzername/',
    username: 'student',
    passwordOrToken: '',
    remoteFilePath: '/Studium/PandaFlow_Encrypted.sqlite',
    localPathDisplay: '~/Nextcloud/Studium/PandaFlow_Encrypted.sqlite',
    fileName: 'PandaFlow_Encrypted.sqlite',
    autoSyncOnChange: false,
    lastSyncStatus: 'idle',
  },
  {
    id: 'target-dropbox',
    type: 'dropbox',
    name: 'Dropbox',
    enabled: false,
    isDefault: false,
    localPathDisplay: '~/Dropbox/Studium/PandaFlow_Encrypted.sqlite',
    remoteFilePath: '/Studium/PandaFlow_Encrypted.sqlite',
    fileName: 'PandaFlow_Encrypted.sqlite',
    autoSyncOnChange: false,
    lastSyncStatus: 'idle',
  },
  {
    id: 'target-gdrive',
    type: 'google_drive',
    name: 'Google Drive',
    enabled: false,
    isDefault: false,
    localPathDisplay: '~/Google Drive/Meine Ablage/Studium/PandaFlow_Encrypted.sqlite',
    remoteFilePath: 'Meine Ablage/Studium/PandaFlow_Encrypted.sqlite',
    fileName: 'PandaFlow_Encrypted.sqlite',
    autoSyncOnChange: false,
    lastSyncStatus: 'idle',
  },
  {
    id: 'target-privatedav',
    type: 'custom_dav',
    name: 'Privater Server / Eigener WebDAV (NAS / HomeServer)',
    enabled: false,
    isDefault: false,
    serverUrl: 'https://nas.home.local/dav/studium/',
    username: 'admin',
    passwordOrToken: '',
    remoteFilePath: '/studium/pandaflow_encrypted.sqlite',
    localPathDisplay: '/mnt/storage/studium/pandaflow_encrypted.sqlite',
    fileName: 'PandaFlow_Encrypted.sqlite',
    autoSyncOnChange: false,
    lastSyncStatus: 'idle',
  },
];

export function loadStorageTargets(): StorageTargetConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (!raw) return DEFAULT_STORAGE_TARGETS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge with default list in case new presets were added
      return DEFAULT_STORAGE_TARGETS.map((def) => {
        const found = parsed.find((p: StorageTargetConfig) => p.id === def.id || p.type === def.type);
        return found ? { ...def, ...found } : def;
      });
    }
    return DEFAULT_STORAGE_TARGETS;
  } catch (e) {
    console.error('Fehler beim Laden der Storage Targets:', e);
    return DEFAULT_STORAGE_TARGETS;
  }
}

export function saveStorageTargets(targets: StorageTargetConfig[]): void {
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(targets));
  } catch (e) {
    console.error('Fehler beim Speichern der Storage Targets:', e);
  }
}

// Memory handle storage for File System Access API
let pickedDirectoryHandle: any = null;
let pickedFileHandle: any = null;

export async function pickCustomDirectory(): Promise<string | null> {
  if (typeof (window as any).showDirectoryPicker === 'function') {
    try {
      pickedDirectoryHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      return pickedDirectoryHandle?.name ? `Lokales Verzeichnis: /${pickedDirectoryHandle.name}/` : null;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('showDirectoryPicker abgebrochen oder Fehler:', err);
      }
      return null;
    }
  }
  return null;
}

export async function saveFileToPickedDirectory(data: Uint8Array, fileName: string): Promise<boolean> {
  if (pickedDirectoryHandle) {
    try {
      const fileHandle = await pickedDirectoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      return true;
    } catch (err) {
      console.warn('Konnte Datei nicht direkt im Verzeichnis-Handle speichern:', err);
    }
  }

  // Fallback to showSaveFilePicker
  if (typeof (window as any).showSaveFilePicker === 'function') {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'Verschlüsselte SQLite-Datenbank',
            accept: { 'application/x-sqlite3': ['.sqlite', '.db', '.enc'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
      pickedFileHandle = handle;
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('showSaveFilePicker Fehler:', err);
      }
    }
  }

  return false;
}

// WebDAV Sync Helper (supports Nextcloud and custom DAV)
export async function syncToWebDav(
  target: StorageTargetConfig,
  data: Uint8Array
): Promise<{ success: boolean; message: string }> {
  if (!target.serverUrl || !target.serverUrl.startsWith('http')) {
    return {
      success: false,
      message: 'Ungültige Server-URL. Bitte vollständige URL (https://...) angeben.',
    };
  }

  const cleanBase = target.serverUrl.endsWith('/') ? target.serverUrl.slice(0, -1) : target.serverUrl;
  const relPath = target.remoteFilePath || '/PandaFlow_Encrypted.sqlite';
  const cleanPath = relPath.startsWith('/') ? relPath : `/${relPath}`;
  const fullUrl = `${cleanBase}${cleanPath}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-sqlite3',
  };

  if (target.username && target.passwordOrToken) {
    const creds = btoa(`${target.username}:${target.passwordOrToken}`);
    headers['Authorization'] = `Basic ${creds}`;
  }

  try {
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers,
      body: new Blob([data as unknown as BlobPart]),
    });

    if (response.ok || response.status === 201 || response.status === 204) {
      return {
        success: true,
        message: `Erfolgreich via WebDAV synchronisiert (${(data.length / 1024).toFixed(1)} KB auf ${fullUrl})`,
      };
    } else {
      return {
        success: false,
        message: `Server meldet HTTP ${response.status} (${response.statusText}). Überprüfe Berechtigungen oder Ordnerstruktur.`,
      };
    }
  } catch (err: any) {
    // If CORS is blocked or server unreachable
    return {
      success: false,
      message: `Netzwerk/CORS-Einschränkung: Direkter Browser-WebDAV-Upload zu "${cleanBase}" blockiert. Bitte Nextcloud Desktop-Client mit lokalem Synchronisationspfad nutzen (${target.localPathDisplay || 'lokaler Ordner'}).`,
    };
  }
}

// Test WebDAV connection (PROPFIND or HEAD)
export async function testWebDavConnection(
  target: StorageTargetConfig
): Promise<{ success: boolean; message: string }> {
  if (!target.serverUrl || !target.serverUrl.startsWith('http')) {
    return { success: false, message: 'Keine gültige Server-URL angegeben.' };
  }

  const headers: Record<string, string> = {};
  if (target.username && target.passwordOrToken) {
    const creds = btoa(`${target.username}:${target.passwordOrToken}`);
    headers['Authorization'] = `Basic ${creds}`;
  }

  try {
    const response = await fetch(target.serverUrl, {
      method: 'PROPFIND',
      headers: { ...headers, Depth: '0' },
    }).catch(async () => {
      // Fallback to GET or OPTIONS
      return await fetch(target.serverUrl!, { method: 'OPTIONS', headers });
    });

    if (response.ok || response.status === 207 || response.status === 200 || response.status === 401) {
      if (response.status === 401) {
        return { success: false, message: 'HTTP 401: Benutzername oder Passwort/App-Token ist falsch.' };
      }
      return { success: true, message: `Verbindung zum WebDAV-Server erfolgreich hergestellt! (Status: ${response.status})` };
    }
    return { success: false, message: `Server antwortete mit Status: ${response.status} (${response.statusText})` };
  } catch (err: any) {
    return {
      success: false,
      message: `Verbindung nicht möglich: ${err?.message || 'Server nicht erreichbar oder CORS-Header fehlen.'}`,
    };
  }
}
