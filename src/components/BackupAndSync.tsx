import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  Cloud, 
  Check, 
  AlertCircle, 
  HardDrive, 
  RotateCcw, 
  FolderSync,
  ShieldCheck,
  ShieldAlert,
  FileJson,
  Trash2,
  Lock,
  Unlock,
  Key,
  FolderOpen,
  Server,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  FileCode,
  Copy,
  Laptop,
  Terminal,
  Code2,
  Heart
} from 'lucide-react';
import { KofiWidget } from './KofiWidget';
import { AppDatabase } from '../types';
import { 
  exportDatabaseAsEncryptedSqlite, 
  exportDatabaseAsPlainSqlite, 
  exportDatabaseAsSqlDump,
  exportDatabaseAsJson, 
  importDatabaseFromAnyFile,
  resolveTargetAppDirectoryPath,
  isAppDirectoryStorageActive,
  saveEncryptedDatabaseToAppDirectory
} from '../services/storage';
import { 
  StorageTargetConfig, 
  StoragePresetType,
  loadStorageTargets, 
  saveStorageTargets, 
  pickCustomDirectory, 
  saveFileToPickedDirectory,
  syncToWebDav,
  testWebDavConnection
} from '../services/cloudStorageService';

interface BackupAndSyncProps {
  data: AppDatabase;
  onRestoreData: (restored: AppDatabase) => void;
  onResetData?: () => void;
  onClearAllData?: () => void;
}

export const BackupAndSync: React.FC<BackupAndSyncProps> = ({
  data,
  onRestoreData,
}) => {
  // Passphrase state
  const [passphrase, setPassphrase] = useState<string>(() => {
    return sessionStorage.getItem('pandaflow_session_passphrase') || 'Studium2026!Sicher';
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberInSession, setRememberInSession] = useState<boolean>(true);

  // Storage targets & presets
  const [targets, setTargets] = useState<StorageTargetConfig[]>(loadStorageTargets);
  const [activePresetType, setActivePresetType] = useState<StoragePresetType>('local_folder');

  // Operation states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isTestingDav, setIsTestingDav] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [davTestResult, setDavTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [targetAppDirPath, setTargetAppDirPath] = useState<string>('');

  useEffect(() => {
    resolveTargetAppDirectoryPath().then(setTargetAppDirPath);
  }, []);

  // Import decryption modal
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importPassphrase, setImportPassphrase] = useState<string>('');
  const [importError, setImportError] = useState<string>('');
  const [isDecryptingImport, setIsDecryptingImport] = useState<boolean>(false);

  // Save targets when changed
  useEffect(() => {
    saveStorageTargets(targets);
  }, [targets]);

  // Keep passphrase in session if enabled
  useEffect(() => {
    if (rememberInSession && passphrase) {
      sessionStorage.setItem('pharmstudy_session_passphrase', passphrase);
    } else {
      sessionStorage.removeItem('pharmstudy_session_passphrase');
    }
  }, [passphrase, rememberInSession]);

  const activeTarget = targets.find((t) => t.type === activePresetType) || targets[0];

  const updateActiveTarget = (partial: Partial<StorageTargetConfig>) => {
    setTargets((prev) =>
      prev.map((t) => (t.id === activeTarget.id ? { ...t, ...partial } : t))
    );
  };

  const setTargetAsDefault = (id: string) => {
    setTargets((prev) =>
      prev.map((t) => ({ ...t, isDefault: t.id === id }))
    );
    setSuccessMsg('Neuer Standard-Speicherort festgelegt.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Generate secure password
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%&*+-=';
    let res = '';
    const array = new Uint32Array(16);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < 16; i++) {
      res += chars[array[i] % chars.length];
    }
    setPassphrase(res);
    setShowPassword(true);
    setSuccessMsg('Neuer kryptografisch starker Verschlüsselungsschlüssel generiert.');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd || pwd.length < 4) return { score: 0, label: 'Zu kurz (mind. 4 Zeichen)', color: 'text-red-400 bg-red-500/20 border-red-500/30' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: 'Mittel', color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' };
    if (score <= 3) return { score: 2, label: 'Stark (AES-256 PBKDF2)', color: 'text-teal-400 bg-teal-500/20 border-teal-500/30' };
    return { score: 3, label: 'Sehr stark (AES-256-GCM)', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' };
  };

  const pwdStrength = getPasswordStrength(passphrase);

  // 1. Export as Encrypted SQLite Database
  const handleExportEncryptedSqlite = async () => {
    if (!passphrase || passphrase.length < 4) {
      setErrorMsg('Bitte gib ein Passwort mit mindestens 4 Zeichen für die SQLite-Verschlüsselung ein.');
      return;
    }
    setIsExporting(true);
    setErrorMsg('');
    try {
      const res = await exportDatabaseAsEncryptedSqlite(data, passphrase);
      setSuccessMsg(`Verschlüsselte SQLite-Datenbank erfolgreich gespeichert (${(res.sizeBytes / 1024).toFixed(1)} KB als ${res.filename})!`);
      // Update sync status on active target
      updateActiveTarget({
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'success',
        lastSyncMessage: `Verschlüsselt gespeichert (${(res.sizeBytes / 1024).toFixed(1)} KB)`,
        fileSizeBytes: res.sizeBytes,
      });
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(`Fehler beim Erstellen der verschlüsselten SQLite-Datenbank: ${err?.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Export as Plain SQLite 3
  const handleExportPlainSqlite = async () => {
    setIsExporting(true);
    setErrorMsg('');
    try {
      const res = await exportDatabaseAsPlainSqlite(data);
      setSuccessMsg(`Unverschlüsselte SQLite 3 Datenbank heruntergeladen (${(res.sizeBytes / 1024).toFixed(1)} KB). Kann mit DB Browser for SQLite geöffnet werden.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(`Fehler beim SQLite-Export: ${err?.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Export as SQL Script Dump
  const handleExportSqlDump = () => {
    try {
      exportDatabaseAsSqlDump(data);
      setSuccessMsg('SQL DDL & Insert-Dump erfolgreich als .sql-Datei heruntergeladen.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(`Fehler: ${err?.message || err}`);
    }
  };

  // 4. Export JSON
  const handleExportJson = () => {
    exportDatabaseAsJson(data);
    setSuccessMsg('JSON-Backup heruntergeladen.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 5. Select Local Directory via File System Access API
  const handlePickLocalDirectory = async () => {
    try {
      const picked = await pickCustomDirectory();
      if (picked) {
        updateActiveTarget({ localPathDisplay: picked });
        setSuccessMsg(`Speicherort festgelegt: ${picked}`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        // User canceled or directory picker not supported
        setSuccessMsg('Tipp: Du kannst den Speicherort auch manuell in das Textfeld eintragen.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      console.warn('Directory Picker Fehler:', err);
    }
  };

  // 6. Direct Save to picked directory / File System
  const handleDirectSaveToLocalFolder = async () => {
    if (!passphrase || passphrase.length < 4) {
      setErrorMsg('Bitte gib ein Passwort für die Verschlüsselung ein.');
      return;
    }
    setIsSyncing(true);
    setErrorMsg('');
    try {
      const { bytes, filename, sizeBytes } = await exportDatabaseAsEncryptedSqlite(data, passphrase);
      const savedDirectly = await saveFileToPickedDirectory(bytes, filename);
      if (savedDirectly) {
        setSuccessMsg(`Verschlüsselte SQLite-Datenbank direkt im lokalen Dateisystem-Ziel gespeichert! (${filename})`);
      } else {
        setSuccessMsg(`Verschlüsselte SQLite-Datenbank (${filename}) heruntergeladen für den Zielordner: ${activeTarget.localPathDisplay || 'Download'}`);
      }
      updateActiveTarget({
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'success',
        lastSyncMessage: `Erfolgreich gespeichert (${(sizeBytes / 1024).toFixed(1)} KB)`,
        fileSizeBytes: sizeBytes,
      });
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(`Speicherfehler: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 7. Test WebDAV connection
  const handleTestWebDav = async () => {
    setIsTestingDav(true);
    setDavTestResult(null);
    try {
      const res = await testWebDavConnection(activeTarget);
      setDavTestResult(res);
    } catch (err: any) {
      setDavTestResult({ success: false, message: err?.message || 'Fehler beim Verbindungsversuch' });
    } finally {
      setIsTestingDav(false);
    }
  };

  // 8. Sync to WebDAV / Cloud Server
  const handleSyncToWebDav = async () => {
    if (!passphrase || passphrase.length < 4) {
      setErrorMsg('Bitte gib ein Passwort für die SQLite-Verschlüsselung ein.');
      return;
    }
    setIsSyncing(true);
    setErrorMsg('');
    try {
      const { bytes } = await exportDatabaseAsEncryptedSqlite(data, passphrase);
      const res = await syncToWebDav(activeTarget, bytes);
      if (res.success) {
        setSuccessMsg(res.message);
        updateActiveTarget({
          lastSyncAt: new Date().toISOString(),
          lastSyncStatus: 'success',
          lastSyncMessage: res.message,
          fileSizeBytes: bytes.length,
        });
      } else {
        setErrorMsg(res.message);
        updateActiveTarget({
          lastSyncAt: new Date().toISOString(),
          lastSyncStatus: 'error',
          lastSyncMessage: res.message,
        });
      }
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg(`Synchronisationsfehler: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 9. File Import handler (Universal: SQLite encrypted, raw SQLite, or JSON)
  const handleFileSelectedForImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // First try with existing passphrase if already set
      const result = await importDatabaseFromAnyFile(file, passphrase);

      if (result.needsPassphrase) {
        // Needs passphrase modal
        setPendingImportFile(file);
        setImportPassphrase('');
        setImportError('');
        return;
      }

      // Restored successfully
      onRestoreData(result.data);
      const formatLabel = result.format === 'encrypted_sqlite' 
        ? 'verschlüsselte SQLite-Datenbank' 
        : result.format === 'plain_sqlite' 
        ? 'SQLite 3 Datenbank' 
        : 'JSON-Backup';
      setSuccessMsg(`Backup erfolgreich wiederhergestellt (${formatLabel}: ${result.data.modules?.length || 0} Module, ${result.data.events?.length || 0} Termine, ${result.data.topics?.length || 0} Lerninhalte)!`);
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      if (err.message && err.message.includes('Falsches Passwort')) {
        // Open modal to enter correct password
        setPendingImportFile(file);
        setImportPassphrase('');
        setImportError('Das gespeicherte Sitzungspasswort passt nicht zu dieser verschlüsselten SQLite-Datei. Bitte das korrekte Passwort eingeben.');
      } else {
        setErrorMsg(`Fehler beim Einlesen: ${err?.message || 'Ungültiges Dateiformat'}`);
      }
    } finally {
      // Clear input so same file can be chosen again
      e.target.value = '';
    }
  };

  // 10. Execute Decryption from Import Modal
  const handleExecuteImportDecryption = async () => {
    if (!pendingImportFile) return;
    if (!importPassphrase) {
      setImportError('Bitte gib das Passwort für die Entschlüsselung ein.');
      return;
    }

    setIsDecryptingImport(true);
    setImportError('');
    try {
      const result = await importDatabaseFromAnyFile(pendingImportFile, importPassphrase);
      onRestoreData(result.data);
      // If user checked remember in session, update active passphrase
      if (rememberInSession) {
        setPassphrase(importPassphrase);
      }
      setSuccessMsg(`Verschlüsselte SQLite-Datenbank erfolgreich entschlüsselt & eingelesen (${result.data.modules?.length || 0} Module, ${result.data.events?.length || 0} Termine, ${result.data.notes?.length || 0} Mitschriften)!`);
      setPendingImportFile(null);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setImportError(err?.message || 'Entschlüsselung fehlgeschlagen. Passwort überprüfen.');
    } finally {
      setIsDecryptingImport(false);
    }
  };

  const lastSavedDate = new Date(data.lastUpdated).toLocaleString('de-DE');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400 shadow-inner">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                Verschlüsselter SQLite-Speicher & Cloud-Synchronisation
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                AES-256-GCM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Statt Klartext-Dateien verwendet PandaFlow eine vollwertige, verschlüsselte SQLite-Datenbank (.sqlite) mit freier Speicherort-Wahl.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-stretch lg:self-auto">
          <label className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
            <Upload className="w-3.5 h-3.5 text-teal-400" />
            <span>SQLite-Datenbank öffnen</span>
            <input
              type="file"
              accept=".sqlite,.db,.enc,.json"
              onChange={handleFileSelectedForImport}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportEncryptedSqlite}
            disabled={isExporting}
            className="flex-1 sm:flex-initial px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-500/20"
          >
            {isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Verschlüsselt exportieren (.sqlite)</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-3.5 bg-teal-950/60 border border-teal-800/80 rounded-xl text-xs text-teal-200 flex items-center gap-2.5 shadow-sm">
          <Check className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Security & Passphrase Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Kryptografischer Schlüssel & SQLite-Verschlüsselung
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${pwdStrength.color}`}>
              {pwdStrength.label}
            </span>
            <button
              onClick={generateSecurePassword}
              type="button"
              className="text-xs text-teal-400 hover:text-teal-300 font-medium px-2 py-1 rounded bg-teal-500/10 hover:bg-teal-500/20 transition-colors flex items-center gap-1"
            >
              <Key className="w-3 h-3" />
              <span>Sicheren Schlüssel generieren</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>Passwort / Master-Passphrase für die SQLite-Datenbank:</span>
              <span className="text-[11px] text-slate-500">PBKDF2-SHA256 (100.000 Iterationen) + AES-GCM</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Mindestens 4 Zeichen eingeben..."
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono pr-20 outline-none transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors"
                  title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(passphrase);
                    setSuccessMsg('Passwort in die Zwischenablage kopiert!');
                    setTimeout(() => setSuccessMsg(''), 2500);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors"
                  title="In Zwischenablage kopieren"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberInSession}
                  onChange={(e) => setRememberInSession(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Schlüssel für die aktuelle Browser-Sitzung merken</span>
              </label>
              <span className="text-slate-500">
                Länge: {passphrase.length} Zeichen
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2 text-[11px] text-slate-400">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-teal-400" />
              Sicherheitsgarantie:
            </div>
            <p className="leading-relaxed">
              Deine SQLite-Datenbank wird vor dem Speichern oder Hochladen vollständig auf deinem Gerät verschlüsselt. Ohne diesen Schlüssel können weder Nextcloud, Dropbox noch Server-Administratoren deine Vorlesungsmitschriften, Klausuren oder Lernkarten lesen.
            </p>
          </div>
        </div>
      </div>

      {/* Storage Targets & Cloud Presets */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <FolderSync className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Speicherorte & Cloud-Presets
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Wähle den Speicherort für deine verschlüsselte SQLite-Datei: Lokal im Dateisystem oder über vorkonfigurierte Presets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Aktiver Standard:</span>
            <span className="text-xs font-semibold text-teal-300 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20">
              {targets.find((t) => t.isDefault)?.name || 'Lokaler Ordner'}
            </span>
          </div>
        </div>

        {/* Preset Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {targets.map((target) => {
            const isSelected = activePresetType === target.type;
            const isDef = target.isDefault;
            return (
              <button
                key={target.id}
                onClick={() => setActivePresetType(target.type)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                  isSelected
                    ? 'bg-teal-950/40 border-teal-500/60 shadow-md shadow-teal-950/50'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  {target.type === 'local_folder' && <HardDrive className={`w-4 h-4 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />}
                  {target.type === 'nextcloud' && <Cloud className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />}
                  {target.type === 'dropbox' && <Cloud className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />}
                  {target.type === 'google_drive' && <Cloud className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />}
                  {target.type === 'custom_dav' && <Server className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />}

                  {isDef && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/20 px-1.5 py-0.5 rounded">
                      Standard
                    </span>
                  )}
                </div>

                <div>
                  <div className={`text-xs font-semibold ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                    {target.name.split(' (')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {target.type === 'local_folder' && 'Dateisystem frei wählen'}
                    {target.type === 'nextcloud' && 'WebDAV Cloud'}
                    {target.type === 'dropbox' && 'Desktop / API Sync'}
                    {target.type === 'google_drive' && 'Drive Ablage'}
                    {target.type === 'custom_dav' && 'Eigener Server / NAS'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Preset Details & Configuration */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Konfiguration: {activeTarget.name}
              </span>
              {!activeTarget.isDefault && (
                <button
                  type="button"
                  onClick={() => setTargetAsDefault(activeTarget.id)}
                  className="text-[11px] text-teal-400 hover:text-teal-300 underline font-medium"
                >
                  Als Standard setzen
                </button>
              )}
            </div>

            {activeTarget.lastSyncAt && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>Zuletzt gespeichert:</span>
                <span className="font-mono text-slate-200 font-medium">
                  {new Date(activeTarget.lastSyncAt).toLocaleString('de-DE')}
                </span>
                {activeTarget.lastSyncStatus === 'success' && (
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                )}
              </span>
            )}
          </div>

          {/* Form Fields based on Type */}
          {activeTarget.type === 'local_folder' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Frei gewählter Speicherpfad auf der Festplatte:
                  </label>
                  <input
                    type="text"
                    value={activeTarget.localPathDisplay || ''}
                    onChange={(e) => updateActiveTarget({ localPathDisplay: e.target.value })}
                    placeholder="~/Dokumente/Studium/PandaFlow_Encrypted.sqlite"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-teal-500"
                  />
                </div>

                <button
                  onClick={handlePickLocalDirectory}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Ordner im Dateisystem wählen</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-slate-400">
                  Über die Dateisystem-Schnittstelle wird die verschlüsselte SQLite-Datei direkt in deinem gewählten Ordner abgelegt (z. B. auch in deinen Nextcloud- oder Dropbox-Syncordner).
                </p>

                <button
                  onClick={handleDirectSaveToLocalFolder}
                  disabled={isSyncing}
                  className="w-full sm:w-auto px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shrink-0 shadow-md shadow-teal-500/20"
                >
                  {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
                  <span>In gewähltem Ordner speichern</span>
                </button>
              </div>
            </div>
          )}

          {activeTarget.type === 'nextcloud' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Nextcloud WebDAV URL:
                  </label>
                  <input
                    type="text"
                    value={activeTarget.serverUrl || ''}
                    onChange={(e) => updateActiveTarget({ serverUrl: e.target.value })}
                    placeholder="https://cloud.hochschule.de/remote.php/dav/files/nutzername/"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Zielpfad auf Nextcloud:
                  </label>
                  <input
                    type="text"
                    value={activeTarget.remoteFilePath || ''}
                    onChange={(e) => updateActiveTarget({ remoteFilePath: e.target.value })}
                    placeholder="/Studium/PandaFlow_Encrypted.sqlite"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Benutzername:
                  </label>
                  <input
                    type="text"
                    value={activeTarget.username || ''}
                    onChange={(e) => updateActiveTarget({ username: e.target.value })}
                    placeholder="max.mustermann"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    App-Token oder Passwort (in Nextcloud unter Einstellungen &gt; Sicherheit):
                  </label>
                  <input
                    type="password"
                    value={activeTarget.passwordOrToken || ''}
                    onChange={(e) => updateActiveTarget({ passwordOrToken: e.target.value })}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Local sync folder tip */}
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
                <div className="text-slate-300 font-medium flex items-center gap-1.5">
                  <FolderSync className="w-3.5 h-3.5 text-blue-400" />
                  Nextcloud Desktop-Client Sync-Tipp:
                </div>
                <p>
                  Wenn du den Nextcloud Desktop-Client installiert hast, kannst du die verschlüsselte SQLite-Datei direkt in <span className="font-mono text-teal-300">~/Nextcloud/Studium/</span> speichern. Sie wird dann vollautomatisch im Hintergrund mit deiner Hochschul-Cloud abgeglichen.
                </p>
              </div>

              {davTestResult && (
                <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${davTestResult.success ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800' : 'bg-amber-950/50 text-amber-300 border border-amber-800'}`}>
                  {davTestResult.success ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                  <span>{davTestResult.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestWebDav}
                  disabled={isTestingDav}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {isTestingDav ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3 text-slate-400" />}
                  <span>Verbindung testen</span>
                </button>

                <button
                  onClick={handleSyncToWebDav}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm shadow-teal-500/20"
                >
                  {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                  <span>Verschlüsselt auf Nextcloud hochladen</span>
                </button>
              </div>
            </div>
          )}

          {activeTarget.type === 'dropbox' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">
                  Lokaler Dropbox-Synchronisationspfad:
                </label>
                <input
                  type="text"
                  value={activeTarget.localPathDisplay || ''}
                  onChange={(e) => updateActiveTarget({ localPathDisplay: e.target.value })}
                  placeholder="~/Dropbox/Studium/PandaFlow_Encrypted.sqlite"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1.5">
                <div className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                  Dropbox Preset-Verhalten:
                </div>
                <p>
                  Exportiere die verschlüsselte SQLite-Datei direkt in deinen lokalen Dropbox-Ordner. Die Datei bleibt 100% verschlüsselt (Zero-Knowledge) und wird sofort über alle deine angemeldeten Laptops und Tablets synchronisiert.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleExportEncryptedSqlite}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Verschlüsselt für Dropbox herunterladen</span>
                </button>
              </div>
            </div>
          )}

          {activeTarget.type === 'google_drive' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">
                  Google Drive Ordner-Pfad (für Google Drive Desktop-App):
                </label>
                <input
                  type="text"
                  value={activeTarget.localPathDisplay || ''}
                  onChange={(e) => updateActiveTarget({ localPathDisplay: e.target.value })}
                  placeholder="~/Google Drive/Meine Ablage/Studium/PandaFlow_Encrypted.sqlite"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1.5">
                <div className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-amber-400" />
                  Google Drive Integration:
                </div>
                <p>
                  Durch die clientseitige AES-256-GCM Verschlüsselung kann Google die Inhalte deiner Vorlesungsnotizen und Altklausuren nicht analysieren. Du kannst die Datei im Google Drive Desktop-Ordner ablegen oder direkt im Web-Drive hochladen.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleExportEncryptedSqlite}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Verschlüsselt für Google Drive herunterladen</span>
                </button>
              </div>
            </div>
          )}

          {activeTarget.type === 'custom_dav' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    WebDAV Server-Adresse (z. B. Synology NAS, QNAP, Apache WebDAV):
                  </label>
                  <input
                    type="text"
                    value={activeTarget.serverUrl || ''}
                    onChange={(e) => updateActiveTarget({ serverUrl: e.target.value })}
                    placeholder="https://nas.home.local/dav/studium/"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Remote-Pfad:
                  </label>
                  <input
                    type="text"
                    value={activeTarget.remoteFilePath || ''}
                    onChange={(e) => updateActiveTarget({ remoteFilePath: e.target.value })}
                    placeholder="/studium/pandaflow_encrypted.sqlite"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Benutzername:
                  </label>
                  <input
                    type="text"
                    value={activeTarget.username || ''}
                    onChange={(e) => updateActiveTarget({ username: e.target.value })}
                    placeholder="admin"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Passwort / Token:
                  </label>
                  <input
                    type="password"
                    value={activeTarget.passwordOrToken || ''}
                    onChange={(e) => updateActiveTarget({ passwordOrToken: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {davTestResult && (
                <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${davTestResult.success ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800' : 'bg-amber-950/50 text-amber-300 border border-amber-800'}`}>
                  {davTestResult.success ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                  <span>{davTestResult.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestWebDav}
                  disabled={isTestingDav}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {isTestingDav ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3 text-slate-400" />}
                  <span>Verbindung testen</span>
                </button>

                <button
                  onClick={handleSyncToWebDav}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm shadow-teal-500/20"
                >
                  {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                  <span>Auf privatem Server sichern (WebDAV)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* App Directory SQLite Storage Architecture Box */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <FolderOpen className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="font-semibold text-slate-200">Zielspeicherort: Verschlüsselte SQLite-Datenbank im Anwendungsverzeichnis</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
              {isAppDirectoryStorageActive() ? 'Natives Verzeichnis aktiv' : 'Vorbereitet (Sandbox-Modus)'}
            </span>
          </div>
          <p className="text-slate-400 font-mono text-[11px] truncate max-w-xl">
            {targetAppDirPath || '%APPDATA%\\PandaFlow\\pandaflow_encrypted.sqlite'}
          </p>
        </div>

        <button
          type="button"
          onClick={async () => {
            const res = await saveEncryptedDatabaseToAppDirectory(data, passphrase);
            if (res.success) {
              setSuccessMsg(`SQLite-Datenbank im Anwendungsverzeichnis synchronisiert: ${res.path} (${(res.bytesWritten / 1024).toFixed(1)} KB)`);
            } else {
              setErrorMsg(res.message);
            }
          }}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-teal-400" />
          <span>Sync im Anwendungsverzeichnis testen</span>
        </button>
      </div>

      {/* Database Schema & Content Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Local Storage & SQLite Metrics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-teal-400" />
              SQLite Tabellen-Status
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Aktiv & Offline
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">Letzte Speicherung:</span>
            <div className="text-sm font-semibold font-mono text-slate-200">
              {lastSavedDate}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1.5">
            <div className="flex justify-between items-center py-0.5">
              <span className="font-mono text-slate-400">modules:</span>
              <span className="font-mono text-slate-200 font-semibold">{data.modules.length} Einträge</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="font-mono text-slate-400">events (Stundenplan):</span>
              <span className="font-mono text-slate-200 font-semibold">{data.events.length} Einträge</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="font-mono text-slate-400">notes (Mitschriften):</span>
              <span className="font-mono text-slate-200 font-semibold">{data.notes.length} Einträge</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="font-mono text-slate-400">topics (Lerninhalte & Formeln):</span>
              <span className="font-mono text-slate-200 font-semibold">{data.topics.length} Einträge</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="font-mono text-slate-400">exams (Klausuren & Testate):</span>
              <span className="font-mono text-slate-200 font-semibold">{data.exams.length} Einträge</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="font-mono text-slate-400">anki_inbox:</span>
              <span className="font-mono text-teal-400 font-semibold">{data.ankiInbox.length} Karten</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="font-mono text-slate-400">deadlines:</span>
              <span className="font-mono text-slate-200 font-semibold">{data.deadlines.length} Fristen</span>
            </div>
          </div>
        </div>

        {/* Primary Export: Encrypted SQLite */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-lg">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-teal-400" />
              Verschlüsseltes Backup (.sqlite)
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Erstellt eine mit deinem Schlüssel geschützte SQLite-Datei. Nur mit dem korrekten Passwort kann diese Datei wiederhergestellt werden.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <button
              onClick={handleExportEncryptedSqlite}
              disabled={isExporting}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-teal-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Verschlüsselte SQLite herunterladen</span>
            </button>

            <label className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span>SQLite einlesen (.sqlite / .db)</span>
              <input
                type="file"
                accept=".sqlite,.db,.enc,.json"
                onChange={handleFileSelectedForImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Alternative SQLite & SQL Formats */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-lg">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-cyan-400" />
              Entwickler- & Offene Formate
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Für die Öffnung mit Desktop-Tools wie <span className="text-slate-300 font-mono">DB Browser for SQLite</span>, <span className="text-slate-300 font-mono">DBeaver</span> oder Python.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <button
              onClick={handleExportPlainSqlite}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>Unverschlüsselte SQLite exportieren (.sqlite)</span>
            </button>

            <button
              onClick={handleExportSqlDump}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>SQL-Dump herunterladen (.sql)</span>
            </button>

            <button
              onClick={handleExportJson}
              className="w-full py-1.5 text-slate-400 hover:text-slate-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileJson className="w-3 h-3 text-slate-500" />
              <span>Legacy JSON-Format exportieren (.json)</span>
            </button>
          </div>
        </div>
      </div>



      {/* Modal: Decryption Prompt for Imported File */}
      {pendingImportFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Verschlüsselte SQLite-Datenbank öffnen
                </h3>
                <p className="text-xs text-slate-400">
                  {pendingImportFile.name} ({(pendingImportFile.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Diese Datei ist mit AES-256-GCM verschlüsselt. Bitte gib das Passwort ein, das beim Exportieren verwendet wurde.
            </p>

            {importError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">
                Passwort / Entschlüsselungsschlüssel:
              </label>
              <input
                type="password"
                value={importPassphrase}
                onChange={(e) => setImportPassphrase(e.target.value)}
                placeholder="Passwort eingeben..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecuteImportDecryption();
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPendingImportFile(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Abbrechen
              </button>

              <button
                type="button"
                onClick={handleExecuteImportDecryption}
                disabled={isDecryptingImport || !importPassphrase}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {isDecryptingImport ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Unlock className="w-3.5 h-3.5" />
                )}
                <span>Entschlüsseln & Wiederherstellen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
