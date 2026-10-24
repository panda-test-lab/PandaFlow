import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { 
  AppDatabase, 
  EventCourse, 
  Module, 
  LectureNote, 
  LearningTopic, 
  Exam, 
  StudyMaterial, 
  AnkiCard, 
  DeadlineItem, 
  Semester, 
  StudyStage 
} from '../types';

const ENCRYPT_MAGIC = 'PHARMSQLITE_ENC1'; // 16 bytes magic header
const MAGIC_BYTES = new TextEncoder().encode(ENCRYPT_MAGIC);

// Password Derivation via PBKDF2 (100,000 iterations, SHA-256)
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt SQLite Uint8Array using AES-256-GCM
export async function encryptSqliteData(sqliteBytes: Uint8Array, passphrase: string): Promise<Uint8Array> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    sqliteBytes as unknown as BufferSource
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);
  // Format: MAGIC (16 bytes) + SALT (16 bytes) + IV (12 bytes) + CIPHERTEXT (with 16-byte GCM tag appended)
  const totalLength = MAGIC_BYTES.length + salt.length + iv.length + ciphertext.length;
  const result = new Uint8Array(totalLength);

  let offset = 0;
  result.set(MAGIC_BYTES, offset);
  offset += MAGIC_BYTES.length;
  result.set(salt, offset);
  offset += salt.length;
  result.set(iv, offset);
  offset += iv.length;
  result.set(ciphertext, offset);

  return result;
}

// Decrypt encrypted SQLite Uint8Array
export async function decryptSqliteData(encryptedBytes: Uint8Array, passphrase: string): Promise<Uint8Array> {
  if (encryptedBytes.length < 16 + 16 + 12 + 16) {
    throw new Error('Die Datei ist zu klein oder keine gültige verschlüsselte SQLite-Datenbank.');
  }

  // Check magic header
  const magic = new TextDecoder().decode(encryptedBytes.slice(0, 16));
  if (magic !== ENCRYPT_MAGIC) {
    throw new Error('Ungültiges Format: Die Datei enthält keine PandaFlow-SQLite-Verschlüsselung (Magic Header fehlt).');
  }

  const salt = encryptedBytes.slice(16, 32);
  const iv = encryptedBytes.slice(32, 44);
  const ciphertext = encryptedBytes.slice(44);

  const key = await deriveKey(passphrase, salt);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource
    );
    return new Uint8Array(decryptedBuffer);
  } catch (err) {
    throw new Error('Entschlüsselung fehlgeschlagen: Falsches Passwort oder manipulierte SQLite-Datei.');
  }
}

// Check if raw bytes are encrypted SQLite
export function isEncryptedSqlite(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  const magic = new TextDecoder().decode(bytes.slice(0, 16));
  return magic === ENCRYPT_MAGIC;
}

// Check if raw bytes are standard unencrypted SQLite 3 format
export function isRawSqlite(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  const header = new TextDecoder().decode(bytes.slice(0, 15));
  return header.startsWith('SQLite format 3');
}

// Cached SQL.js engine
let sqlEnginePromise: Promise<any> | null = null;

async function getSqlEngine() {
  if (!sqlEnginePromise) {
    sqlEnginePromise = import('sql.js/dist/sql-wasm.wasm?url')
      .then(({ default: sqlWasmUrl }) => initSqlJs({
        locateFile: (file) => {
          return file.endsWith('.wasm') ? sqlWasmUrl : `/${file}`;
        },
      }))
      .catch(async (err) => {
        console.warn('Lokales SQL.wasm konnte nicht geladen werden, versuche CDN Fallback...', err);
        return initSqlJs({
          locateFile: (file) => `https://sql.js.org/dist/${file}`,
        });
      });
  }
  return sqlEnginePromise;
}

// Generate SQLite Schema & export raw SQLite 3 binary file
export async function createSqliteBinaryFromAppDatabase(data: AppDatabase): Promise<Uint8Array> {
  const SQL = await getSqlEngine();
  const db: SqlJsDatabase = new SQL.Database();

  try {
    // Create tables
    db.run(`
    CREATE TABLE metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE settings (
      studentName TEXT,
      university TEXT,
      currentSemesterId TEXT,
      autoSaveEnabled INTEGER,
      darkMode INTEGER
    );

    CREATE TABLE study_stages (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      targetDegree TEXT,
      sort_order INTEGER
    );

    CREATE TABLE semesters (
      id TEXT PRIMARY KEY,
      number INTEGER,
      name TEXT,
      termName TEXT,
      stageId TEXT,
      status TEXT,
      startDate TEXT,
      endDate TEXT
    );

    CREATE TABLE modules (
      id TEXT PRIMARY KEY,
      code TEXT,
      name TEXT,
      shortName TEXT,
      semesterId TEXT,
      stageId TEXT,
      credits REAL,
      color TEXT,
      category TEXT,
      description TEXT,
      lecturer TEXT
    );

    CREATE TABLE events (
      id TEXT PRIMARY KEY,
      moduleId TEXT,
      semesterId TEXT,
      title TEXT,
      type TEXT,
      dayOfWeek INTEGER,
      startTime TEXT,
      endTime TEXT,
      room TEXT,
      lecturer TEXT,
      notes TEXT,
      isRecurring INTEGER,
      date TEXT,
      startDate TEXT,
      endDate TEXT,
      rrule TEXT
    );

    CREATE TABLE notes (
      id TEXT PRIMARY KEY,
      moduleId TEXT,
      courseId TEXT,
      eventType TEXT,
      title TEXT,
      content TEXT,
      summary TEXT,
      tags TEXT,
      lectureDate TEXT,
      updatedAt TEXT,
      keyTakeaways TEXT,
      linkedTopicIds TEXT,
      linkedMaterialIds TEXT,
      checklistJson TEXT
    );

    CREATE TABLE topics (
      id TEXT PRIMARY KEY,
      moduleId TEXT,
      title TEXT,
      description TEXT,
      understanding TEXT,
      recallConfidence TEXT,
      relevance TEXT,
      difficulty TEXT,
      keyFormulas TEXT,
      relatedTopicIds TEXT,
      lastReviewedDate TEXT,
      nextReviewDate TEXT,
      prerequisiteTopicIds TEXT,
      prerequisiteForTopicIds TEXT,
      commonMistakes TEXT,
      mnemonics TEXT
    );


    CREATE TABLE exams (
      id TEXT PRIMARY KEY,
      moduleId TEXT,
      title TEXT,
      type TEXT,
      date TEXT,
      time TEXT,
      room TEXT,
      registrationDeadline TEXT,
      targetGrade TEXT,
      actualGrade TEXT,
      status TEXT,
      weightEcts REAL,
      linkedTopicIds TEXT,
      notes TEXT
    );

    CREATE TABLE materials (
      id TEXT PRIMARY KEY,
      moduleId TEXT,
      title TEXT,
      type TEXT,
      url TEXT,
      annotations TEXT,
      pageReference TEXT,
      addedAt TEXT
    );

    CREATE TABLE anki_inbox (
      id TEXT PRIMARY KEY,
      cardType TEXT,
      front TEXT,
      back TEXT,
      explanation TEXT,
      frontImageUrl TEXT,
      backImageUrl TEXT,
      moduleId TEXT,
      moduleCode TEXT,
      topic TEXT,
      learningTopicId TEXT,
      sources TEXT,
      tags TEXT,
      status TEXT,
      sourceNoteId TEXT,
      createdAt TEXT,
      deckName TEXT
    );

    CREATE TABLE deadlines (
      id TEXT PRIMARY KEY,
      title TEXT,
      dueDate TEXT,
      dueTime TEXT,
      moduleId TEXT,
      type TEXT,
      isCompleted INTEGER,
      priority TEXT,
      details TEXT
    );

    CREATE TABLE documents (
      key TEXT PRIMARY KEY,
      json_content TEXT
    );
    `);

    db.run('BEGIN TRANSACTION');

  // Insert metadata
  const insertMeta = db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
  insertMeta.run(['version', String(data.version || 1)]);
  insertMeta.run(['lastUpdated', data.lastUpdated || new Date().toISOString()]);
  insertMeta.run(['exportedAt', new Date().toISOString()]);
  insertMeta.run(['appName', 'PandaFlow']);
  insertMeta.run(['databaseFormat', 'SQLite3_Encrypted']);
  insertMeta.free();

  // Insert settings
  if (data.settings) {
    const insertSettings = db.prepare('INSERT INTO settings VALUES (?, ?, ?, ?, ?)');
    insertSettings.run([
      data.settings.studentName || '',
      data.settings.university || '',
      data.settings.currentSemesterId || '',
      data.settings.autoSaveEnabled ? 1 : 0,
      data.settings.darkMode ? 1 : 0,
    ]);
    insertSettings.free();
  }

  // Insert study stages
  if (data.studyStages && data.studyStages.length > 0) {
    const stmt = db.prepare('INSERT INTO study_stages VALUES (?, ?, ?, ?, ?)');
    data.studyStages.forEach((s) => {
      stmt.run([s.id, s.name, s.type || 'grundstudium', s.targetDegree || '', s.order || 0]);
    });
    stmt.free();
  }

  // Insert semesters
  if (data.semesters && data.semesters.length > 0) {
    const stmt = db.prepare('INSERT INTO semesters VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    data.semesters.forEach((s) => {
      stmt.run([s.id, s.number ?? 1, s.name, s.termName || '', s.stageId || '', s.status, s.startDate || '', s.endDate || '']);
    });
    stmt.free();
  }

  // Insert modules
  if (data.modules && data.modules.length > 0) {
    const stmt = db.prepare('INSERT INTO modules VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    data.modules.forEach((m) => {
      stmt.run([
        m.id,
        m.code,
        m.name,
        m.shortName || m.name,
        m.semesterId || '',
        m.stageId || '',
        m.credits || 0,
        m.color || '#0d9488',
        m.category || 'pflicht',
        m.description || '',
        m.lecturer || '',
      ]);
    });
    stmt.free();
  }

  // Insert events
  if (data.events && data.events.length > 0) {
    const stmt = db.prepare('INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    data.events.forEach((e) => {
      stmt.run([
        e.id,
        e.moduleId,
        e.semesterId || '',
        e.title,
        e.type,
        e.dayOfWeek,
        e.startTime,
        e.endTime,
        e.room || '',
        e.lecturer || '',
        e.notes || '',
        e.isRecurring ? 1 : 0,
        e.date || '',
        e.startDate || '',
        e.endDate || '',
        e.rrule || '',
      ]);
    });
    stmt.free();
  }

  // Insert notes
  if (data.notes && data.notes.length > 0) {
    const stmt = db.prepare('INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    data.notes.forEach((n) => {
      stmt.run([
        n.id,
        n.moduleId,
        n.courseId || '',
        n.eventType || '',
        n.title,
        n.content,
        n.summary || '',
        JSON.stringify(n.tags || []),
        n.lectureDate || '',
        n.updatedAt || new Date().toISOString(),
        JSON.stringify(n.keyTakeaways || []),
        JSON.stringify(n.linkedTopicIds || []),
        JSON.stringify(n.linkedMaterialIds || []),
        JSON.stringify({
          checklistShortTerm: n.checklistShortTerm,
          checklistExamPrep: n.checklistExamPrep,
          checklistNotionLM: n.checklistNotionLM,
          openQuestions: n.openQuestions,
          insights: n.insights,
          examHints: n.examHints,
        }),
      ]);
    });
    stmt.free();
  }

  // Insert topics
  if (data.topics && data.topics.length > 0) {
    const stmt = db.prepare('INSERT INTO topics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    data.topics.forEach((t) => {
      stmt.run([
        t.id,
        t.moduleId,
        t.title,
        t.description || '',
        t.understanding || 'Nicht verstanden',
        t.recallConfidence || 'noch nicht geprüft',
        t.relevance || '⭐ Normal',
        t.difficulty,
        JSON.stringify(t.keyFormulas || []),
        JSON.stringify(t.relatedTopicIds || []),
        t.lastReviewedDate || '',
        t.nextReviewDate || '',
        JSON.stringify(t.prerequisiteTopicIds || []),
        JSON.stringify(t.prerequisiteForTopicIds || []),
        t.commonMistakes || '',
        t.mnemonics || '',
      ]);
    });
    stmt.free();
  }



  // Insert exams
  if (data.exams && data.exams.length > 0) {
    const stmt = db.prepare('INSERT INTO exams VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    data.exams.forEach((ex) => {
      stmt.run([
        ex.id,
        ex.moduleId,
        ex.title,
        ex.type,
        ex.date,
        ex.time,
        ex.room || '',
        ex.registrationDeadline || '',
        ex.targetGrade || '',
        ex.actualGrade || '',
        ex.status,
        ex.weightEcts || 0,
        JSON.stringify(ex.linkedTopicIds || []),
        ex.notes || '',
      ]);
    });
    stmt.free();
  }

  // Insert materials
  if (data.materials && data.materials.length > 0) {
    const stmt = db.prepare('INSERT INTO materials VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    data.materials.forEach((m) => {
      stmt.run([
        m.id,
        m.moduleId,
        m.title,
        m.type,
        m.url || '',
        m.annotations || '',
        m.pageReference || '',
        m.addedAt || '',
      ]);
    });
    stmt.free();
  }

  // Insert anki inbox
  if (data.ankiInbox && data.ankiInbox.length > 0) {
    const stmt = db.prepare('INSERT INTO anki_inbox VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    data.ankiInbox.forEach((c) => {
      stmt.run([
        c.id,
        c.cardType || 'basic',
        c.front || '',
        c.back || '',
        c.explanation || '',
        c.frontImageUrl || '',
        c.backImageUrl || '',
        c.moduleId || '',
        c.moduleCode || '',
        c.topic || '',
        c.learningTopicId || '',
        c.sources || '',
        JSON.stringify(c.tags || []),
        c.status,
        c.sourceNoteId || '',
        c.createdAt || '',
        c.deckName || '',
      ]);
    });
    stmt.free();
  }

  // Insert deadlines
  if (data.deadlines && data.deadlines.length > 0) {
    const stmt = db.prepare('INSERT INTO deadlines VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    data.deadlines.forEach((d) => {
      stmt.run([
        d.id,
        d.title,
        d.dueDate,
        d.dueTime || '',
        d.moduleId || '',
        d.type,
        d.isCompleted ? 1 : 0,
        d.priority,
        d.details || '',
      ]);
    });
    stmt.free();
  }

  // Insert documents (handbook, regulations, etc.)
  const docStmt = db.prepare('INSERT INTO documents VALUES (?, ?)');
  if (data.moduleHandbook) {
    docStmt.run(['moduleHandbook', JSON.stringify(data.moduleHandbook)]);
  }
  if (data.studyRegulations) {
    docStmt.run(['studyRegulations', JSON.stringify(data.studyRegulations)]);
  }
  if (data.moduleOverview) {
    docStmt.run(['moduleOverview', JSON.stringify(data.moduleOverview)]);
  }
  if (data.predefinedTags) {
    docStmt.run(['predefinedTags', JSON.stringify(data.predefinedTags)]);
  }
  docStmt.free();

    db.run('COMMIT');
    return db.export();
  } finally {
    db.close();
  }
}

// Parse SQLite 3 binary file back into AppDatabase
export async function parseSqliteBinaryToAppDatabase(sqliteBytes: Uint8Array): Promise<AppDatabase> {
  const SQL = await getSqlEngine();
  const db: SqlJsDatabase = new SQL.Database(sqliteBytes);

  const queryTable = (sql: string): any[] => {
    try {
      const res = db.exec(sql);
      if (!res || res.length === 0) return [];
      const columns = res[0].columns;
      return res[0].values.map((row) => {
        const obj: any = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });
    } catch (err) {
      console.warn(`Query ${sql} skipped:`, err);
      return [];
    }
  };

  // Metadata & version
  const metaRows = queryTable('SELECT key, value FROM metadata');
  const metaMap = new Map<string, string>();
  metaRows.forEach((r) => metaMap.set(r.key, r.value));
  const version = parseInt(metaMap.get('version') || '1', 10);
  const lastUpdated = metaMap.get('lastUpdated') || new Date().toISOString();

  // Settings
  const settingsRows = queryTable('SELECT * FROM settings LIMIT 1');
  let settings = {
    studentName: 'Student/in',
    university: 'Universität',
    currentSemesterId: 'sem-1',
    autoSaveEnabled: true,
    darkMode: true,
  };
  if (settingsRows.length > 0) {
    const s = settingsRows[0];
    settings = {
      studentName: s.studentName || settings.studentName,
      university: s.university || settings.university,
      currentSemesterId: s.currentSemesterId || settings.currentSemesterId,
      autoSaveEnabled: s.autoSaveEnabled === 1,
      darkMode: s.darkMode === 1,
    };
  }

  // Study Stages
  const stagesRows = queryTable('SELECT * FROM study_stages ORDER BY sort_order ASC');
  const studyStages: StudyStage[] = stagesRows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    targetDegree: r.targetDegree,
    order: r.sort_order,
  }));

  // Semesters
  const semRows = queryTable('SELECT * FROM semesters ORDER BY number ASC');
  const semesters: Semester[] = semRows.map((r, idx) => {
    const semNum = Number(r.number) || (idx + 1);
    return {
      id: r.id,
      number: semNum,
      name: r.name,
      termName: r.termName || undefined,
      stageId: r.stageId || undefined,
      status: r.status,
      startDate: r.startDate || undefined,
      endDate: r.endDate || undefined,
    };
  });

  // Modules
  const modRows = queryTable('SELECT * FROM modules');
  const modules: Module[] = modRows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    shortName: r.shortName || r.name,
    semesterId: r.semesterId || 'sem-1',
    stageId: r.stageId || undefined,
    credits: Number(r.credits) || 0,
    color: r.color || '#0d9488',
    category: r.category || 'pflicht',
    description: r.description || '',
    lecturer: r.lecturer || '',
  }));

  // Events
  const eventRows = queryTable('SELECT * FROM events');
  const events: EventCourse[] = eventRows.map((r) => ({
    id: r.id,
    moduleId: r.moduleId,
    semesterId: r.semesterId || undefined,
    title: r.title,
    type: r.type,
    dayOfWeek: Number(r.dayOfWeek) || 1,
    startTime: r.startTime,
    endTime: r.endTime,
    room: r.room || '',
    lecturer: r.lecturer || '',
    notes: r.notes || undefined,
    isRecurring: r.isRecurring === 1,
    date: r.date || undefined,
    startDate: r.startDate || undefined,
    endDate: r.endDate || undefined,
    rrule: r.rrule || undefined,
  }));

  // Notes
  const noteRows = queryTable('SELECT * FROM notes');
  const notes: LectureNote[] = noteRows.map((r) => {
    const extra = safeJsonParse(r.checklistJson, {});
    return {
      id: r.id,
      moduleId: r.moduleId,
      courseId: r.courseId || undefined,
      eventType: r.eventType || undefined,
      title: r.title,
      content: r.content || '',
      summary: r.summary || undefined,
      tags: safeJsonParse(r.tags, []),
      lectureDate: r.lectureDate || new Date().toISOString().split('T')[0],
      updatedAt: r.updatedAt || new Date().toISOString(),
      keyTakeaways: safeJsonParse(r.keyTakeaways, []),
      linkedTopicIds: safeJsonParse(r.linkedTopicIds, []),
      linkedMaterialIds: safeJsonParse(r.linkedMaterialIds, []),
      checklistShortTerm: extra.checklistShortTerm,
      checklistExamPrep: extra.checklistExamPrep,
      checklistNotionLM: extra.checklistNotionLM,
      openQuestions: extra.openQuestions,
      insights: extra.insights,
      examHints: extra.examHints,
    };
  });

  // Topics
  const topicRows = queryTable('SELECT * FROM topics');
  const topics: LearningTopic[] = topicRows.map((r) => {
    let understanding = r.understanding;
    if (!understanding) {
      if (r.masteryLevel === 'gemeistert') understanding = 'sicher';
      else if (r.masteryLevel === 'in_arbeit') understanding = 'Verstanden';
      else if (r.masteryLevel === 'wiederholen') understanding = 'Teilweise Verstanden';
      else understanding = 'Nicht verstanden';
    }
    return {
      id: r.id,
      moduleId: r.moduleId,
      title: r.title,
      description: r.description || '',
      understanding: (understanding || 'Nicht verstanden') as any,
      recallConfidence: (r.recallConfidence || 'noch nicht geprüft') as any,
      relevance: (r.relevance || '(1 Stern) Normal') as any,
      masteryLevel: r.masteryLevel || undefined,
      difficulty: r.difficulty || 'mittel',
      prerequisiteTopicIds: safeJsonParse(r.prerequisiteTopicIds, []),
      prerequisiteForTopicIds: safeJsonParse(r.prerequisiteForTopicIds, []),
      commonMistakes: r.commonMistakes || undefined,
      mnemonics: r.mnemonics || undefined,
      keyFormulas: safeJsonParse(r.keyFormulas, []),
      relatedTopicIds: safeJsonParse(r.relatedTopicIds, []),
      lastReviewedDate: r.lastReviewedDate || undefined,
      nextReviewDate: r.nextReviewDate || new Date().toISOString().split('T')[0],
    };
  });


  // Exams
  const examRows = queryTable('SELECT * FROM exams');
  const exams: Exam[] = examRows.map((r) => ({
    id: r.id,
    moduleId: r.moduleId,
    title: r.title,
    type: r.type,
    date: r.date,
    time: r.time,
    room: r.room || '',
    registrationDeadline: r.registrationDeadline || undefined,
    targetGrade: r.targetGrade || undefined,
    actualGrade: r.actualGrade || undefined,
    status: r.status,
    weightEcts: Number(r.weightEcts) || 0,
    linkedTopicIds: safeJsonParse(r.linkedTopicIds, []),
    notes: r.notes || undefined,
  }));

  // Materials
  const matRows = queryTable('SELECT * FROM materials');
  const materials: StudyMaterial[] = matRows.map((r) => ({
    id: r.id,
    moduleId: r.moduleId,
    title: r.title,
    type: r.type,
    url: r.url || '',
    annotations: r.annotations || '',
    pageReference: r.pageReference || undefined,
    addedAt: r.addedAt || '',
  }));

  // Anki Inbox
  const ankiRows = queryTable('SELECT * FROM anki_inbox');
  const ankiInbox: AnkiCard[] = ankiRows.map((r) => ({
    id: r.id,
    cardType: r.cardType || 'basic',
    front: r.front || '',
    back: r.back || '',
    explanation: r.explanation || undefined,
    frontImageUrl: r.frontImageUrl || undefined,
    backImageUrl: r.backImageUrl || undefined,
    moduleId: r.moduleId || undefined,
    moduleCode: r.moduleCode || undefined,
    topic: r.topic || undefined,
    learningTopicId: r.learningTopicId || undefined,
    sources: r.sources || undefined,
    tags: safeJsonParse(r.tags, []),
    status: r.status,
    sourceNoteId: r.sourceNoteId || undefined,
    createdAt: r.createdAt || '',
    deckName: r.deckName || undefined,
  }));

  // Deadlines
  const deadlineRows = queryTable('SELECT * FROM deadlines');
  const deadlines: DeadlineItem[] = deadlineRows.map((r) => ({
    id: r.id,
    title: r.title,
    dueDate: r.dueDate,
    dueTime: r.dueTime || undefined,
    moduleId: r.moduleId || undefined,
    type: r.type,
    isCompleted: r.isCompleted === 1,
    priority: r.priority,
    details: r.details || undefined,
  }));

  // Documents
  const docRows = queryTable('SELECT key, json_content FROM documents');
  const docMap = new Map<string, any>();
  docRows.forEach((r) => {
    try {
      docMap.set(r.key, JSON.parse(r.json_content));
    } catch (e) {
      // ignore
    }
  });

  db.close();

  return {
    version,
    lastUpdated,
    settings,
    studyStages: studyStages.length > 0 ? studyStages : undefined,
    semesters,
    modules,
    events,
    notes,
    topics,
    exams,
    materials,
    ankiInbox,
    deadlines,
    moduleHandbook: docMap.get('moduleHandbook'),
    studyRegulations: docMap.get('studyRegulations'),
    moduleOverview: docMap.get('moduleOverview'),
    predefinedTags: docMap.get('predefinedTags'),
  };
}

function safeJsonParse(str: string | null | undefined, fallback: any) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Generate human-readable SQL DDL and INSERT dump
export function generateSqlDump(data: AppDatabase): string {
  const lines: string[] = [];
  lines.push('-- PandaFlow SQLite Database Export');
  lines.push(`-- Exportiert am: ${new Date().toLocaleString('de-DE')}`);
  lines.push(`-- Version: ${data.version || 1}`);
  lines.push('');
  lines.push('PRAGMA foreign_keys = ON;');
  lines.push('BEGIN TRANSACTION;');
  lines.push('');

  lines.push(`-- Module: ${data.modules.length}`);
  lines.push('CREATE TABLE IF NOT EXISTS modules (id TEXT PRIMARY KEY, code TEXT, name TEXT, shortName TEXT, semesterId TEXT, credits REAL, color TEXT, category TEXT);');
  data.modules.forEach((m) => {
    const esc = (s: string = '') => s.replace(/'/g, "''");
    lines.push(`INSERT OR REPLACE INTO modules VALUES ('${esc(m.id)}', '${esc(m.code)}', '${esc(m.name)}', '${esc(m.shortName || m.name)}', '${esc(m.semesterId)}', ${m.credits || 0}, '${esc(m.color)}', '${esc(m.category || 'pflicht')}');`);
  });
  lines.push('');

  lines.push(`-- Termine: ${data.events.length}`);
  lines.push('CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, moduleId TEXT, title TEXT, type TEXT, dayOfWeek INTEGER, startTime TEXT, endTime TEXT, room TEXT);');
  data.events.forEach((e) => {
    const esc = (s: string = '') => s.replace(/'/g, "''");
    lines.push(`INSERT OR REPLACE INTO events VALUES ('${esc(e.id)}', '${esc(e.moduleId)}', '${esc(e.title)}', '${esc(e.type)}', ${e.dayOfWeek}, '${esc(e.startTime)}', '${esc(e.endTime)}', '${esc(e.room)}');`);
  });
  lines.push('');

  lines.push(`-- Lerninhalte & Formeln: ${data.topics.length}`);
  lines.push('CREATE TABLE IF NOT EXISTS topics (id TEXT PRIMARY KEY, moduleId TEXT, title TEXT, understanding TEXT, recallConfidence TEXT, relevance TEXT, difficulty TEXT);');
  data.topics.forEach((t) => {
    const esc = (s: string = '') => s.replace(/'/g, "''");
    lines.push(`INSERT OR REPLACE INTO topics VALUES ('${esc(t.id)}', '${esc(t.moduleId)}', '${esc(t.title)}', '${esc(t.understanding)}', '${esc(t.recallConfidence)}', '${esc(t.relevance)}', '${esc(t.difficulty)}');`);
  });
  lines.push('');


  lines.push('COMMIT;');
  return lines.join('\n');
}
