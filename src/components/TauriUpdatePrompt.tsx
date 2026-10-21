import React, { useEffect, useState } from 'react';
import { Download, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { isTauriEnvironment } from '../services/tauriService';
import { check } from '@tauri-apps/plugin-updater';

interface AvailableUpdate {
  version: string;
  body: string;
  // Wir speichern das v2-Update-Objekt direkt ab, um es später zu installieren
  manifest?: any; 
}

export const TauriUpdatePrompt: React.FC = () => {
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (!isTauriEnvironment() || import.meta.env.DEV) return;

    let mounted = true;
    const checkUpdateAction = async () => {
      setIsChecking(true);
      setError(null);
      try {
        // Tauri v2: check() sucht automatisch nach Updates basierend auf deiner tauri.conf.json
        const update = await check();
        
        if (update && update.available) {
          if (mounted) {
            setAvailableUpdate({
              version: update.version,
              body: update.body ?? 'Keine Beschreibung verfügbar.',
              manifest: update // Das Objekt behalten wir für die Installation
            });
          }
        }
      } catch (checkError) {
        if (mounted) {
          setError(checkError instanceof Error ? checkError.message : String(checkError));
        }
      } finally {
        if (mounted) setIsChecking(false);
      }
    };

    checkUpdateAction();
    return () => {
      mounted = false;
    };
  }, []);

  const install = async () => {
    if (!availableUpdate?.manifest) return;
    setIsInstalling(true);
    setError(null);
    try {
      // Tauri v2: Lädt das Update herunter und installiert es (App startet danach neu)
      await availableUpdate.manifest.downloadAndInstall();
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : String(installError));
      setIsInstalling(false);
    }
  };

  // Falls kein Update da ist, rendern wir nichts (dein bestehendes UI-Handling bleibt gleich)
  if (!availableUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-secondary text-secondary-foreground rounded-lg shadow-lg max-w-sm z-50 border">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          Update verfügbar (v{availableUpdate.version})
        </h3>
        <button onClick={() => setAvailableUpdate(null)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4 max-h-24 overflow-y-auto">{availableUpdate.body}</p>
      {error && <p className="text-xs text-destructive mb-2">{error}</p>}
      <button
        onClick={install}
        disabled={isInstalling}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {isInstalling ? (
          <>
            <LoaderCircle className="h-3 w-3 animate-spin" />
            Installiere...
          </>
        ) : (
          <>
            <Download className="h-3 w-3" />
            Jetzt aktualisieren
          </>
        )}
      </button>
    </div>
  );
};