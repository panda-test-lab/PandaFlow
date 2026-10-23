import { mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { appLogDir, BaseDirectory } from '@tauri-apps/api/path';
import { isTauriEnvironment } from './tauriService';

let desktopLogQueue: Promise<void> = Promise.resolve();

export interface AppErrorNotice {
  id: number;
  context: string;
  details: string;
}

const appErrorListeners = new Set<(notice: AppErrorNotice) => void>();
let latestAppError: AppErrorNotice | null = null;
let nextAppErrorId = 0;

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

async function writeDesktopLog(entry: string): Promise<void> {
  await mkdir(await appLogDir(), { recursive: true });
  await writeTextFile('pandaflow.log', `${entry}\n`, {
    append: true,
    baseDir: BaseDirectory.AppLog,
  });
}

export function subscribeToAppErrors(listener: (notice: AppErrorNotice) => void): () => void {
  appErrorListeners.add(listener);
  if (latestAppError) listener(latestAppError);
  return () => appErrorListeners.delete(listener);
}

export function dismissAppError(id: number): void {
  if (latestAppError?.id === id) latestAppError = null;
}

export function logError(context: string, error: unknown): void {
  const formattedError = formatError(error);
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    context,
    error: formattedError,
  });

  console.error(`[PandaFlow] ${context}`, error);
  latestAppError = {
    id: ++nextAppErrorId,
    context,
    details: formattedError.length > 240 ? `${formattedError.slice(0, 237)}...` : formattedError,
  };
  for (const listener of appErrorListeners) listener(latestAppError);

  if (!isTauriEnvironment()) return;

  desktopLogQueue = desktopLogQueue
    .then(() => writeDesktopLog(entry))
    .catch((logError) => {
      console.error('[PandaFlow] Fehler beim Schreiben der Desktop-Logdatei', logError);
    });
}
