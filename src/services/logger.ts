import { mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { appLogDir, BaseDirectory } from '@tauri-apps/api/path';
import { isTauriEnvironment } from './tauriService';

let desktopLogQueue: Promise<void> = Promise.resolve();

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

export function logError(context: string, error: unknown): void {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    context,
    error: formatError(error),
  });

  console.error(`[PandaFlow] ${context}`, error);
  if (!isTauriEnvironment()) return;

  desktopLogQueue = desktopLogQueue
    .then(() => writeDesktopLog(entry))
    .catch((logError) => {
      console.error('[PandaFlow] Fehler beim Schreiben der Desktop-Logdatei', logError);
    });
}
