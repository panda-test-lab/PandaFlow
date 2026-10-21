/**
 * PandaFlow - App Directory SQLite Storage Engine
 * 
 * Bereitet die persistente Speicherung der verschlüsselten SQLite-Datenbank
 * direkt im lokalen Anwendungsverzeichnis (AppData / Application Support / .local/share) vor.
 * 
 * Die native Ablage ist nur im Tauri-Desktop aktiv. Im Browser bleibt localStorage
 * die persistente Ablage und wird nicht als Dateisystemzugriff ausgegeben.
 */

import { AppDatabase } from '../types';
import { 
  createSqliteBinaryFromAppDatabase, 
  parseSqliteBinaryToAppDatabase,
  encryptSqliteData,
  decryptSqliteData
} from './sqliteService';
import { isTauriEnvironment } from './tauriService';

// TAURI V2 IMPORTS: Funktionsnamen angepasst auf v2-Standard
import { exists, mkdir, writeFile, readFile } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';

export interface AppDirectoryStorageConfig {
  /**
   * Auf true setzen, um die verschlüsselte SQLite-Datenbank im Anwendungsverzeichnis zu aktivieren.
   * Standard: Aktiv in Tauri Desktop, im Webmodus nicht verfügbar.
   */
  enabled: boolean;
  databaseFilename: string;
  defaultPassphrase: string;
}

export const APP_DIR_CONFIG: AppDirectoryStorageConfig = {
  // Native App-Dir-Speicherung ist im Desktop-Setup aktiv, damit die Datenbank
  // wirklich im OS-App-Verzeichnis geschrieben werden kann.
  enabled: true,
  databaseFilename: 'pandaflow_encrypted.sqlite',
  defaultPassphrase: 'PandaFlow!SecureAppStorage2026',
};

export async function getAppDatabasePath(): Promise<string> {
  if (!isTauriEnvironment()) return '';
  try {
    // Ermittelt automatisch das AppData-Verzeichnis deines Systems (z.B. AppData/Roaming/com.pandaflow.app/)
    const baseDir = await appDataDir();
    return `${baseDir}${APP_DIR_CONFIG.databaseFilename}`;
  } catch (e) {
    console.error("Fehler beim Ermitteln des Pfads:", e);
    return '';
  }
}

/**
 * Ermittelt den standardmäßigen Zielpfad im Anwendungsverzeichnis des jeweiligen Betriebssystems.
 */
export async function resolveTargetAppDirectoryPath(): Promise<string> {
  const filename = APP_DIR_CONFIG.databaseFilename;

  // 1. Falls Tauri Native Runtime aktiv ist
  if (isTauriEnvironment()) {
    try {
      const appDir = await appDataDir();
      return `${String(appDir).replace(/[\\/]$/, '')}/${filename}`;
    } catch {
      // Fallback zu generischem Pfad
    }
  }

  // 2. Standard-Pfade je nach Betriebssystem (Vorschau / Info für den Nutzer)
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) {
      return `%APPDATA%\\PandaFlow\\${filename}`;
    } else if (ua.includes('mac')) {
      return `~/Library/Application Support/PandaFlow/${filename}`;
    }
  }
  return `~/.local/share/pandaflow/${filename}`;
}

/**
 * Prüft, ob das native Anwendungsverzeichnis aktuell angesprochen werden kann.
 */
export function isAppDirectoryStorageActive(): boolean {
  return APP_DIR_CONFIG.enabled && isTauriEnvironment();
}

/**
 * Ermöglicht den Umschalter mit nur einer Code-Zeile (z. B. in den App-Einstellungen).
 */
export function setAppDirectoryStorageActive(active: boolean): void {
  APP_DIR_CONFIG.enabled = active;
  console.info(`[PandaFlow Storage] App-Verzeichnis-Speicherung auf: ${active ? 'AKTIV' : 'SANDBOX-MODUS'}`);
}

/**
 * Hilfsfunktionen zur Ordner- und Pfad-Ermittlung
 */
function getParentDirectory(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const lastSeparator = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
  return lastSeparator > 0 ? normalized.slice(0, lastSeparator) : normalized;
}

async function ensureNativeDirectoryExists(targetPath: string): Promise<void> {
  const parentDir = getParentDirectory(targetPath);
  try {
    const dirExists = await exists(parentDir);
    if (!dirExists) {
      await mkdir(parentDir, { recursive: true });
    }
  } catch (e) {
    console.error("Fehler beim automatischen Erstellen des Verzeichnisbaums:", e);
  }
}

/**
 * Speichert die gesamte Anwendungsdatenbank als verschlüsselte SQLite-Datei im Anwendungsverzeichnis.
 */
export async function saveEncryptedDatabaseToAppDirectory(
  data: AppDatabase,
  passphrase: string = APP_DIR_CONFIG.defaultPassphrase
): Promise<{ success: boolean; path: string; bytesWritten: number; message: string }> {
  const targetPath = await resolveTargetAppDirectoryPath();

  try {
    if (!isTauriEnvironment()) {
      throw new Error('Ein natives Anwendungsverzeichnis ist nur in der Tauri-Desktop-App verfügbar.');
    }

    // 1. Binäre SQLite 3 Datenbank aus aktuellem State erzeugen
    const sqliteBytes = await createSqliteBinaryFromAppDatabase(data);

    // 2. Mit AES-256-GCM + PBKDF2 verschlüsseln
    const encryptedBytes = await encryptSqliteData(sqliteBytes, passphrase);

    // 3. Verzeichnisstruktur prüfen und binär wegschreiben
    await ensureNativeDirectoryExists(targetPath);
    await writeFile(targetPath, encryptedBytes);    
    return {
      success: true,
      path: targetPath,
      bytesWritten: encryptedBytes.length,
      message: `Erfolgreich in ${targetPath} gespeichert.`,
    };
  } catch (err: any) {
    console.error('[PandaFlow Storage] Fehler beim Speichern der verschlüsselten SQLite-Datenbank:', err);
    return {
      success: false,
      path: targetPath,
      bytesWritten: 0,
      message: err?.message || 'Unbekannter Fehler beim Speichern im Anwendungsverzeichnis',
    };
  }
}

/**
 * Lädt die verschlüsselte SQLite-Datenbank aus dem Anwendungsverzeichnis.
 */
export async function loadEncryptedDatabaseFromAppDirectory(
  passphrase: string = APP_DIR_CONFIG.defaultPassphrase
): Promise<{ success: boolean; data?: AppDatabase; message: string }> {
  const targetPath = await resolveTargetAppDirectoryPath();

  if (isTauriEnvironment()) {
    try {
      const fileExists = await exists(targetPath);
      if (fileExists) {
        const rawEncryptedBytes = await readFile(targetPath);        
        const decryptedSqlite = await decryptSqliteData(new Uint8Array(rawEncryptedBytes), passphrase);
        const parsedDb = await parseSqliteBinaryToAppDatabase(decryptedSqlite);
        
        return {
          success: true,
          data: parsedDb,
          message: `Datenbank erfolgreich aus ${targetPath} geladen.`,
        };
      }
    } catch (err: any) {
      console.warn('[PandaFlow Storage] Fehler beim Laden aus nativem Pfad:', err);
      return {
        success: false,
        message: `Konnte nicht aus ${targetPath} lesen: ${err?.message}`,
      };
    }
  }

  return {
    success: false,
    message: `Sandbox-Modus: Kein physisches Anwendungsverzeichnis verfügbar (${targetPath}).`,
  };
}