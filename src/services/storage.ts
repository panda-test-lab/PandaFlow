import { AppDatabase, EventCourse, AnkiCard, EventType } from '../types';
import {
  createSqliteBinaryFromAppDatabase,
  parseSqliteBinaryToAppDatabase,
  encryptSqliteData,
  decryptSqliteData,
  isEncryptedSqlite,
  isRawSqlite,
  generateSqlDump,
} from './sqliteService';
import {
  isAppDirectoryStorageActive,
  saveEncryptedDatabaseToAppDirectory,
  loadEncryptedDatabaseFromAppDirectory,
  resolveTargetAppDirectoryPath,
  setAppDirectoryStorageActive,
  APP_DIR_CONFIG,
} from './appDirectoryStorage';
import { logError } from './logger';

export {
  isAppDirectoryStorageActive,
  saveEncryptedDatabaseToAppDirectory,
  loadEncryptedDatabaseFromAppDirectory,
  resolveTargetAppDirectoryPath,
  setAppDirectoryStorageActive,
  APP_DIR_CONFIG,
};

const PRIMARY_STORAGE_KEY = 'pandaflow_database_v1';
const LEGACY_STORAGE_KEY = 'pharmstudy_database_v1';

export const emptyDatabase: AppDatabase = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  settings: {
    studentName: 'Student/in',
    university: 'Universität',
    currentSemesterId: 'sem-1',
    autoSaveEnabled: true,
    darkMode: true,
  },
  studyStages: [
    {
      id: 'stage-grund',
      name: 'Grundstudium',
      type: 'grundstudium',
      targetDegree: '1. Staatsexamen',
      order: 1,
    },
  ],
  semesters: [
    {
      id: 'sem-1',
      number: 1,
      name: '1. Semester (WS 2026/2027)',
      termName: 'WS 2026/2027',
      stageId: 'stage-grund',
      status: 'aktiv',
      startDate: '2026-10-01',
      endDate: '2027-03-31',
    },
  ],
  modules: [],
  events: [],
  notes: [],
  topics: [],
  exams: [],
  materials: [],
  ankiInbox: [],
  deadlines: [],
  moduleHandbook: undefined,
  studyRegulations: undefined,
  moduleOverview: undefined,
};

interface LocalDatabaseLoad {
  data: AppDatabase;
  found: boolean;
  error?: unknown;
}

function normalizeDatabase(parsed: any): AppDatabase {
  return {
    version: parsed.version || 1,
    lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    settings: { ...emptyDatabase.settings, ...(parsed.settings || {}) },
    studyStages: Array.isArray(parsed.studyStages) && parsed.studyStages.length > 0
      ? parsed.studyStages
      : (emptyDatabase.studyStages || []),
    semesters: Array.isArray(parsed.semesters) && parsed.semesters.length > 0
      ? parsed.semesters.map((s: any, idx: number) => {
          const semNum = Number(s.number || s.studySemester) || (idx + 1);
          const autoTerm = semNum % 2 === 1
            ? `WS ${2026 + Math.floor((semNum - 1) / 2)}/${2027 + Math.floor((semNum - 1) / 2)}`
            : `SoSe ${2027 + Math.floor((semNum - 1) / 2)}`;
          const termName = s.termName || autoTerm;
          return {
            ...s,
            number: semNum,
            name: s.name || `${semNum}. Semester (${termName})`,
            termName,
            stageId: s.stageId || (emptyDatabase.studyStages?.[0]?.id || 'stage-grund'),
            status: s.status || (idx === 0 ? 'aktiv' : 'geplant'),
          };
        })
      : emptyDatabase.semesters,
    modules: Array.isArray(parsed.modules) ? parsed.modules : emptyDatabase.modules,
    events: Array.isArray(parsed.events) ? parsed.events : emptyDatabase.events,
    notes: Array.isArray(parsed.notes) ? parsed.notes : emptyDatabase.notes,
    topics: Array.isArray(parsed.topics) ? parsed.topics : emptyDatabase.topics,
    exams: Array.isArray(parsed.exams) ? parsed.exams : emptyDatabase.exams,
    materials: Array.isArray(parsed.materials) ? parsed.materials : emptyDatabase.materials,
    ankiInbox: Array.isArray(parsed.ankiInbox) ? parsed.ankiInbox : emptyDatabase.ankiInbox,
    predefinedTags: parsed.predefinedTags || emptyDatabase.predefinedTags || [],
    deadlines: Array.isArray(parsed.deadlines) ? parsed.deadlines : emptyDatabase.deadlines,
    moduleHandbook: parsed.moduleHandbook || undefined,
    studyRegulations: parsed.studyRegulations || undefined,
    moduleOverview: parsed.moduleOverview || undefined,
  };
}

function readLocalDatabase(): LocalDatabaseLoad {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PRIMARY_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return { data: emptyDatabase, found: false };
    }
    return { data: normalizeDatabase(JSON.parse(raw)), found: true };
  } catch (err) {
    logError('Fehler beim Laden der Datenbank aus localStorage', err);
    return { data: emptyDatabase, found: raw !== null, error: err };
  }
}

export function loadDatabase(): AppDatabase {
  return readLocalDatabase().data;
}

export async function loadDatabaseWithRecovery(): Promise<{ data: AppDatabase; warning?: string }> {
  const local = readLocalDatabase();
  if (!isAppDirectoryStorageActive()) {
    return {
      data: local.data,
      warning: local.error ? 'Lokale Daten konnten nicht vollständig gelesen werden.' : undefined,
    };
  }

  const native = await loadEncryptedDatabaseFromAppDirectory();
  if (native.success && native.data) {
    const localTimestamp = Date.parse(local.data.lastUpdated);
    const nativeTimestamp = Date.parse(native.data.lastUpdated);
    if (!local.found || local.error || !Number.isFinite(localTimestamp) ||
      (Number.isFinite(nativeTimestamp) && nativeTimestamp > localTimestamp)) {
      return { data: native.data };
    }
    return {
      data: local.data,
      warning: local.error ? 'Lokale Daten waren beschädigt; die ältere lokale Kopie wird verwendet.' : undefined,
    };
  }

  const noNativeDatabase = native.message === 'Keine native Datenbank gefunden.';
  return {
    data: local.data,
    warning: local.error
      ? `Lokale Daten konnten nicht gelesen werden${noNativeDatabase ? '' : `; Wiederherstellung fehlgeschlagen: ${native.message}`}.`
      : (!noNativeDatabase ? `Native Datenbank konnte nicht geladen werden: ${native.message}` : undefined),
  };
}

export function clearDatabase(): void {
  try {
    localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(emptyDatabase));
  } catch (err) {
    logError('Fehler beim Leeren der Datenbank', err);
    throw err;
  }
}

let pendingNativeSave: AppDatabase | null = null;
let nativeSaveWorker: Promise<void> | null = null;

async function drainNativeSaveQueue(): Promise<void> {
  while (pendingNativeSave) {
    const snapshot = pendingNativeSave;
    pendingNativeSave = null;
    try {
      const result = await saveEncryptedDatabaseToAppDirectory(snapshot);
      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error) {
      if (!pendingNativeSave) throw error;
    }
  }
}

function queueNativeSave(data: AppDatabase): Promise<void> {
  pendingNativeSave = data;
  if (!nativeSaveWorker) {
    const worker = drainNativeSaveQueue();
    nativeSaveWorker = worker;
    void worker.finally(() => {
      if (nativeSaveWorker === worker) {
        nativeSaveWorker = null;
      }
      if (pendingNativeSave) {
        void queueNativeSave(pendingNativeSave).catch((error) => {
          logError('Fehler beim Schreiben des zuletzt angeforderten Datenstands', error);
        });
      }
    }).catch(() => undefined);
  }
  return nativeSaveWorker;
}

export async function saveDatabase(data: AppDatabase): Promise<void> {
  const toSave: AppDatabase = {
    ...data,
    lastUpdated: new Date().toISOString(),
  };

  let localStorageError: unknown;
  try {
    localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    logError('Fehler beim Speichern der Datenbank in localStorage', err);
    localStorageError = err;
  }

  let nativeStorageError: unknown;
  if (isAppDirectoryStorageActive()) {
    try {
      await queueNativeSave(toSave);
    } catch (err) {
      nativeStorageError = err;
    }
  }

  if (localStorageError && nativeStorageError) {
    throw new Error(
      `Lokaler Speicher: ${String(localStorageError)}; App-Verzeichnis: ${String(nativeStorageError)}`
    );
  }
  if (nativeStorageError) throw nativeStorageError;
  if (localStorageError) throw localStorageError;
}

export function exportDatabaseAsJson(data: AppDatabase): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `PharmStudy_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importDatabaseFromJson(file: File): Promise<AppDatabase> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.modules || !parsed.semesters) {
          throw new Error('Ungültige Backup-Datei: Fehlende Modul- oder Semesterdaten');
        }
        resolve(parsed as AppDatabase);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
    reader.readAsText(file);
  });
}

// Export database as Encrypted SQLite Database (.sqlite)
export async function exportDatabaseAsEncryptedSqlite(
  data: AppDatabase,
  passphrase: string,
  fileNamePrefix: string = 'PandaFlow'
): Promise<{ filename: string; sizeBytes: number; bytes: Uint8Array }> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Das Verschlüsselungspasswort muss mindestens 4 Zeichen lang sein.');
  }

  // 1. Generate real SQLite 3 database binary
  const sqliteRaw = await createSqliteBinaryFromAppDatabase(data);
  // 2. Encrypt with AES-256-GCM + PBKDF2
  const encryptedBytes = await encryptSqliteData(sqliteRaw, passphrase);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${fileNamePrefix}_Encrypted_${dateStr}.sqlite`;

  // Trigger file download
  const blob = new Blob([encryptedBytes as unknown as BlobPart], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { filename, sizeBytes: encryptedBytes.length, bytes: encryptedBytes };
}

// Export database as Plain SQLite 3 file (.sqlite / .db)
export async function exportDatabaseAsPlainSqlite(
  data: AppDatabase,
  fileNamePrefix: string = 'PandaFlow'
): Promise<{ filename: string; sizeBytes: number; bytes: Uint8Array }> {
  const sqliteRaw = await createSqliteBinaryFromAppDatabase(data);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${fileNamePrefix}_Plain_${dateStr}.sqlite`;

  const blob = new Blob([sqliteRaw as unknown as BlobPart], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { filename, sizeBytes: sqliteRaw.length, bytes: sqliteRaw };
}

// Export database as SQL script (.sql)
export function exportDatabaseAsSqlDump(data: AppDatabase): void {
  const sql = generateSqlDump(data);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `PandaFlow_Schema_Dump_${dateStr}.sql`;

  const blob = new Blob([sql], { type: 'application/sql' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Universal Import: handles Encrypted SQLite, Plain SQLite, and JSON
export async function importDatabaseFromAnyFile(
  file: File,
  passphrase?: string
): Promise<{ data: AppDatabase; format: 'encrypted_sqlite' | 'plain_sqlite' | 'json'; needsPassphrase?: boolean }> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Check if encrypted SQLite
  if (isEncryptedSqlite(bytes)) {
    if (!passphrase) {
      return {
        data: emptyDatabase,
        format: 'encrypted_sqlite',
        needsPassphrase: true,
      };
    }
    const decryptedBytes = await decryptSqliteData(bytes, passphrase);
    const parsedData = await parseSqliteBinaryToAppDatabase(decryptedBytes);
    return { data: parsedData, format: 'encrypted_sqlite' };
  }

  // Check if plain SQLite
  if (isRawSqlite(bytes)) {
    const parsedData = await parseSqliteBinaryToAppDatabase(bytes);
    return { data: parsedData, format: 'plain_sqlite' };
  }

  // Check if JSON
  try {
    const text = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(text);
    if (parsed.modules || parsed.semesters) {
      return { data: parsed as AppDatabase, format: 'json' };
    }
  } catch (e) {
    // Not valid JSON
  }

  throw new Error('Unbekanntes Dateiformat. Bitte eine verschlüsselte .sqlite-Datei, unverschlüsselte .sqlite/.db-Datei oder .json-Datei auswählen.');
}

// Anki TSV Exporter
export function exportAnkiCardsAsTsv(cards: AnkiCard[]): void {
  // Format for Anki TSV: Front [TAB] Back [TAB] Tags
  const lines = cards.map((c) => {
    const cleanFront = c.front.replace(/\t/g, '    ').replace(/\r?\n/g, '<br>');
    const cleanBack = c.back.replace(/\t/g, '    ').replace(/\r?\n/g, '<br>');
    const tagsStr = (c.tags || []).map((t) => t.replace(/\s+/g, '_')).join(' ');
    return `${cleanFront}\t${cleanBack}\t${tagsStr}`;
  });

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `Anki_Export_Studium_${dateStr}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Copy Anki cards directly to clipboard
export async function copyAnkiCardsToClipboard(cards: AnkiCard[]): Promise<boolean> {
  try {
    const lines = cards.map((c) => {
      const cleanFront = c.front.replace(/\t/g, '    ').replace(/\r?\n/g, '<br>');
      const cleanBack = c.back.replace(/\t/g, '    ').replace(/\r?\n/g, '<br>');
      const tagsStr = (c.tags || []).map((t) => t.replace(/\s+/g, '_')).join(' ');
      return `${cleanFront}\t${cleanBack}\t${tagsStr}`;
    });
    const content = lines.join('\n');
    await navigator.clipboard.writeText(content);
    return true;
  } catch (err) {
    console.error('Clipboard error:', err);
    return false;
  }
}

// iCalendar (.ics) Parser
export function parseIcsCalendar(icsContent: string, defaultModuleId: string): Partial<EventCourse>[] {
  const events: Partial<EventCourse>[] = [];
  // Unfold multi-line iCal properties according to RFC 5545
  const unfoldedContent = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfoldedContent.split(/\r\n|\n|\r/);

  let inEvent = false;
  let summary = '';
  let dtstart = '';
  let dtend = '';
  let rrule = '';
  let location = '';
  let description = '';

  const dayCodeMap: Record<string, number> = {
    MO: 1, MON: 1,
    TU: 2, TUE: 2, DI: 2,
    WE: 3, WED: 3, MI: 3,
    TH: 4, THU: 4, DO: 4,
    FR: 5, FRI: 5,
    SA: 6, SAT: 6,
    SU: 7, SUN: 7, SO: 7,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      summary = '';
      dtstart = '';
      dtend = '';
      rrule = '';
      location = '';
      description = '';
    } else if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      if (summary) {
        // Calculate dayOfWeek, dates and times
        // Formats: 20261012T081500Z or TZID=...:20261012T081500 or 20261012
        const startMatch = dtstart.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
        const endMatch = dtend.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);

        let startDayOfWeek = 1;
        let startTime = '08:00';
        let endTime = '10:00';
        let startDate: string | undefined = undefined;
        let endDate: string | undefined = undefined;
        let singleDate: string | undefined = undefined;
        let isRecurring = true;
        let startDateObj: Date | null = null;
        let endDateObj: Date | null = null;

        if (startMatch) {
          const year = parseInt(startMatch[1]);
          const monthStr = startMatch[2];
          const dayStr = startMatch[3];
          const month = parseInt(monthStr) - 1;
          const day = parseInt(dayStr);
          startDateObj = new Date(year, month, day);
          startDayOfWeek = startDateObj.getDay() === 0 ? 7 : startDateObj.getDay(); // 1=Mo .. 7=So
          startDate = `${year}-${monthStr}-${dayStr}`;

          if (startMatch[4] && startMatch[5]) {
            startTime = `${startMatch[4]}:${startMatch[5]}`;
          }
        }

        if (endMatch) {
          const endYear = parseInt(endMatch[1]);
          const endMonthStr = endMatch[2];
          const endDayStr = endMatch[3];
          const endMonth = parseInt(endMonthStr) - 1;
          const endDay = parseInt(endDayStr);
          endDateObj = new Date(endYear, endMonth, endDay);
          endDate = `${endYear}-${endMonthStr}-${endDayStr}`;

          if (endMatch[4] && endMatch[5]) {
            endTime = `${endMatch[4]}:${endMatch[5]}`;
          }
        }

        // Determine all target days of week for this event
        const targetDays: number[] = [];
        let isBlockEvent = false;

        // 1. Check RRULE for BYDAY (e.g. BYDAY=MO,WE,FR or BYDAY=DI,DO)
        if (rrule) {
          isRecurring = true;
          const untilMatch = rrule.match(/UNTIL=(\d{4})(\d{2})(\d{2})/);
          if (untilMatch) {
            endDate = `${untilMatch[1]}-${untilMatch[2]}-${untilMatch[3]}`;
          }

          const bydayMatch = rrule.match(/BYDAY=([A-Za-z0-9,]+)/i);
          if (bydayMatch) {
            const rawTokens = bydayMatch[1].split(',');
            for (const rawTok of rawTokens) {
              const code = rawTok.replace(/[^A-Za-z]/g, '').toUpperCase();
              const dNum = dayCodeMap[code];
              if (dNum && !targetDays.includes(dNum)) {
                targetDays.push(dNum);
              }
            }
          } else if (rrule.includes('FREQ=DAILY')) {
            // Daily block recurrence: Monday to Friday
            isBlockEvent = true;
            targetDays.push(1, 2, 3, 4, 5);
          }
        }

        // 2. Check for multi-day Blockveranstaltungen without RRULE or spanning several days
        if (targetDays.length === 0 && startDateObj && endDateObj) {
          const diffDays = Math.round((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
          const hasBlockKeyword = summary.toLowerCase().includes('block') || 
                                  description.toLowerCase().includes('block') || 
                                  summary.toLowerCase().includes('kompakt');

          if (diffDays >= 1 && (diffDays <= 31 || hasBlockKeyword)) {
            // This is a block course (e.g. Blockpraktikum Qualitative Analyse Mo-Fr)
            isBlockEvent = true;
            isRecurring = true;
            const daysToScan = endMatch && endMatch[4] ? diffDays + 1 : Math.max(1, diffDays);
            for (let d = 0; d < daysToScan; d++) {
              const cur = new Date(startDateObj.getTime() + d * 86400000);
              const curDay = cur.getDay() === 0 ? 7 : cur.getDay();
              if (!targetDays.includes(curDay)) {
                targetDays.push(curDay);
              }
            }
          }
        }

        // 3. Fallback: single day of week
        if (targetDays.length === 0) {
          targetDays.push(startDayOfWeek);
          if (!rrule) {
            if (startDate && (!endDate || startDate === endDate)) {
              singleDate = startDate;
              isRecurring = false;
            }
          }
        }

        // Determine event type
        let type: EventType = 'vorlesung';
        const lowerSum = summary.toLowerCase();
        if (lowerSum.includes('praktik') || lowerSum.includes('labor') || isBlockEvent) {
          type = 'praktikum';
        } else if (lowerSum.includes('seminar')) {
          type = 'seminar';
        } else if (lowerSum.includes('übung') || lowerSum.includes('uebung')) {
          type = 'uebung';
        } else if (lowerSum.includes('tutor')) {
          type = 'tutorium';
        }

        // Sort days Monday to Sunday (1 to 7)
        targetDays.sort((a, b) => a - b);

        let finalNotes = description;
        if (isBlockEvent && startDate && endDate) {
          const blockTag = `[Blockveranstaltung: ${startDate} bis ${endDate}]`;
          finalNotes = finalNotes ? `${blockTag} ${finalNotes}` : blockTag;
        }

        // Create an event for EACH day on which this course takes place
        for (const dayNum of targetDays) {
          events.push({
            title: summary,
            moduleId: defaultModuleId,
            type,
            dayOfWeek: dayNum,
            startTime,
            endTime,
            room: location || 'N.N.',
            notes: finalNotes,
            isRecurring,
            startDate,
            endDate,
            date: singleDate,
            rrule: rrule || undefined,
          });
        }
      }
    } else if (inEvent) {
      if (line.startsWith('SUMMARY:')) {
        summary = line.substring(8);
      } else if (line.startsWith('DTSTART')) {
        dtstart = line.includes(':') ? line.split(':')[1] : line;
      } else if (line.startsWith('DTEND')) {
        dtend = line.includes(':') ? line.split(':')[1] : line;
      } else if (line.startsWith('RRULE:')) {
        rrule = line.substring(6);
      } else if (line.startsWith('LOCATION:')) {
        location = line.substring(9).replace(/\\,/g, ',');
      } else if (line.startsWith('DESCRIPTION:')) {
        description = line.substring(12);
      }
    }
  }

  return events;
}

// CSV Parser for schedules
export function parseScheduleCsv(csvContent: string, defaultModuleId: string): Partial<EventCourse>[] {
  const events: Partial<EventCourse>[] = [];
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return events;

  // Determine delimiter: comma, semicolon, or tab
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes(';')) delimiter = ';';
  else if (headerLine.includes('\t')) delimiter = '\t';

  // Read header indices
  const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());
  const titleIdx = headers.findIndex((h) => h.includes('titel') || h.includes('fach') || h.includes('veranstaltung') || h.includes('name'));
  const dayIdx = headers.findIndex((h) => h.includes('tag') || h.includes('wochentag') || h.includes('day'));
  const startIdx = headers.findIndex((h) => h.includes('start') || h.includes('beginn') || h.includes('von'));
  const endIdx = headers.findIndex((h) => h.includes('ende') || h.includes('bis'));
  const roomIdx = headers.findIndex((h) => h.includes('raum') || h.includes('ort') || h.includes('room'));
  const typeIdx = headers.findIndex((h) => h.includes('typ') || h.includes('art'));
  const lecturerIdx = headers.findIndex((h) => h.includes('dozent') || h.includes('prof') || h.includes('leiter'));

  const dayMap: Record<string, number> = {
    mo: 1, montag: 1, mon: 1, monday: 1, '1': 1,
    di: 2, dienstag: 2, tue: 2, tuesday: 2, '2': 2,
    mi: 3, mittwoch: 3, wed: 3, wednesday: 3, '3': 3,
    do: 4, donnerstag: 4, thu: 4, thursday: 4, '4': 4,
    fr: 5, freitag: 5, fri: 5, friday: 5, '5': 5,
    sa: 6, samstag: 6, sat: 6, saturday: 6, '6': 6,
    so: 7, sonntag: 7, sun: 7, sunday: 7, '7': 7,
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
    if (cols.length < 2) continue;

    const title = titleIdx !== -1 ? cols[titleIdx] : cols[0];
    if (!title) continue;

    // Support multiple days in CSV column, e.g. "Mo, Mi, Fr" or "Montag - Freitag" or "Mo-Fr"
    const targetDays: number[] = [];
    if (dayIdx !== -1 && cols[dayIdx]) {
      const rawDayCol = cols[dayIdx].toLowerCase();
      if (rawDayCol.includes('mo-fr') || rawDayCol.includes('montag - freitag') || rawDayCol.includes('montag bis freitag')) {
        targetDays.push(1, 2, 3, 4, 5);
      } else {
        const parts = rawDayCol.split(/[,/;&+]+/);
        for (const p of parts) {
          const cleanP = p.replace(/[^a-z0-9]/g, '');
          const mapped = dayMap[cleanP];
          if (mapped && !targetDays.includes(mapped)) {
            targetDays.push(mapped);
          }
        }
      }
    }

    if (targetDays.length === 0) {
      targetDays.push(1);
    }

    const startTime = startIdx !== -1 && cols[startIdx] ? formatTimeStr(cols[startIdx]) : '08:00';
    const endTime = endIdx !== -1 && cols[endIdx] ? formatTimeStr(cols[endIdx]) : '10:00';
    const room = roomIdx !== -1 && cols[roomIdx] ? cols[roomIdx] : 'Hörsaal / Labor';
    const lecturer = lecturerIdx !== -1 && cols[lecturerIdx] ? cols[lecturerIdx] : '';

    let type: EventType = 'vorlesung';
    if (typeIdx !== -1 && cols[typeIdx]) {
      const t = cols[typeIdx].toLowerCase();
      if (t.includes('prak') || t.includes('lab') || title.toLowerCase().includes('block')) type = 'praktikum';
      else if (t.includes('sem')) type = 'seminar';
      else if (t.includes('ueb') || t.includes('üb')) type = 'uebung';
      else if (t.includes('tut')) type = 'tutorium';
    }

    for (const dNum of targetDays) {
      events.push({
        title,
        moduleId: defaultModuleId,
        type,
        dayOfWeek: dNum,
        startTime,
        endTime,
        room,
        lecturer,
        isRecurring: true,
      });
    }
  }

  return events;
}

function formatTimeStr(t: string): string {
  const match = t.match(/(\d{1,2})[:.](\d{2})/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    return `${hh}:${match[2]}`;
  }
  return t.length === 5 ? t : '08:00';
}
