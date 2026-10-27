import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { beforeEach, describe, it } from 'node:test';
import { webcrypto } from 'node:crypto';
import { createElement, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createEmptyQualityCheck, getQualityScore } from '../src/components/AnkiInbox';
import {
  addById,
  deleteEventAndRelations,
  deleteMaterialAndRelations,
  deleteModuleAndRelations,
  deleteNoteAndRelations,
  deleteTopicAndRelations,
  findDuplicateAnkiCard,
  findDuplicateDeadline,
  findDuplicateEvent,
  findDuplicateExam,
  findDuplicateMaterial,
  findDuplicateModule,
  findDuplicateNote,
  findDuplicateSemester,
  findDuplicateStudyStage,
  findDuplicateTopic,
  findFirstDatabaseDuplicate,
  prependById,
  removeById,
  setActiveSemester,
  updateById,
} from '../src/services/databaseMutations';
import {
  APP_DIR_CONFIG,
  clearDatabase,
  emptyDatabase,
  exportDatabaseAsJson,
  importDatabaseFromJson,
  isAppDirectoryStorageActive,
  loadDatabase,
  loadDatabaseWithRecovery,
  saveDatabase,
} from '../src/services/storage';
import { saveEncryptedDatabaseToAppDirectory } from '../src/services/appDirectoryStorage';
import {
  decryptSqliteData,
  encryptSqliteData,
  isEncryptedSqlite,
  isRawSqlite,
} from '../src/services/sqliteService';
import { getExamRegistrationDeadlines } from '../src/utils/examDeadlines';
import { isMarkdownBlockText, MarkdownRenderer, renderInlineMarkdown } from '../src/utils/markdownRenderer';
import { isEventScheduledOnDate } from '../src/utils/schedule';
import {
  AnkiCard,
  AppDatabase,
  DeadlineItem,
  EventCourse,
  Exam,
  LectureNote,
  LearningTopic,
  Module,
  Semester,
  StudyStage,
  StudyMaterial,
} from '../src/types';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

const localStorageMock = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  APP_DIR_CONFIG.enabled = true;
});

describe('Datenbank-Persistenz', () => {
  it('aktiviert native Dateisynchronisation ausschließlich im Tauri-Desktop', async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const originalConsoleError = console.error;

    try {
      console.error = () => undefined;
      Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
      assert.equal(isAppDirectoryStorageActive(), false);

      const failedWrite = await saveEncryptedDatabaseToAppDirectory(emptyDatabase);
      assert.equal(failedWrite.success, false);
      assert.match(failedWrite.message, /nur in der Tauri-Desktop-App/);

      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { __TAURI_IPC__: () => undefined },
      });
      assert.equal(isAppDirectoryStorageActive(), true);
    } finally {
      console.error = originalConsoleError;
      if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });

  it('startet ohne Demo-Module und Beispieldaten', () => {
    const database = loadDatabase();
    assert.deepEqual(database.studyStages, []);
    assert.deepEqual(database.semesters, []);
    assert.equal(database.settings.currentSemesterId, '');
    assert.deepEqual(database.modules, []);
    assert.deepEqual(database.events, []);
    assert.deepEqual(database.notes, []);
    assert.deepEqual(database.topics, []);
    assert.deepEqual(database.exams, []);
    assert.deepEqual(database.materials, []);
    assert.deepEqual(database.ankiInbox, []);
    assert.deepEqual(database.deadlines, []);
  });

  it('speichert Änderungen und lädt sie wieder, ohne den übergebenen State zu verändern', () => {
    const data: AppDatabase = {
      ...emptyDatabase,
      modules: [{
        id: 'module-1',
        semesterId: 'sem-1',
        code: 'BIO-101',
        name: 'Biologie',
        shortName: 'Bio',
        credits: 5,
        color: '#123456',
        lecturer: 'Dr. Beispiel',
        description: '',
      }],
      exams: [{
        id: 'exam-registration',
        moduleId: 'module-1',
        title: 'Prüfung',
        type: 'Klausur',
        date: '2026-12-01',
        time: '09:00',
        room: '',
        registrationDeadline: '2026-11-15',
        withdrawalDeadline: '2026-11-20',
        withdrawalDeadlineMatchesRegistration: false,
        registrationSentAt: '2026-11-01T10:00:00.000Z',
        registrationConfirmedAt: '2026-11-01T11:00:00.000Z',
        status: 'geplant',
        weightEcts: 5,
        linkedTopicIds: [],
      }],
    };

    saveDatabase(data);
    const loaded = loadDatabase();

    assert.equal(loaded.modules.length, 1);
    assert.equal(loaded.modules[0].code, 'BIO-101');
    assert.deepEqual(loaded.exams, data.exams);
    assert.notEqual(loaded.lastUpdated, data.lastUpdated);
    assert.equal(data.modules.length, 1);
  });

  it('lädt im Browser weiterhin den lokalen Datenbestand über den Wiederherstellungspfad', async () => {
    localStorageMock.setItem('pandaflow_database_v1', JSON.stringify({
      ...emptyDatabase,
      modules: [{ id: 'module-restore', name: 'Biologie' }],
    }));

    const restored = await loadDatabaseWithRecovery();

    assert.equal(restored.data.modules[0].id, 'module-restore');
    assert.equal(restored.warning, undefined);
  });

  it('meldet fehlgeschlagene localStorage-Speicherungen als Fehler', async () => {
    const originalSetItem = localStorageMock.setItem.bind(localStorageMock);
    const originalConsoleError = console.error;
    localStorageMock.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    console.error = () => undefined;

    try {
      await assert.rejects(saveDatabase(emptyDatabase), /QuotaExceededError/);
    } finally {
      localStorageMock.setItem = originalSetItem;
      console.error = originalConsoleError;
    }
  });

  it('liest das ältere Storage-Format und normalisiert Semesterdaten', () => {
    localStorageMock.setItem('pharmstudy_database_v1', JSON.stringify({
      semesters: [{ id: 'legacy-sem', studySemester: 2, status: 'geplant', startDate: '', endDate: '' }],
      modules: [],
    }));

    const loaded = loadDatabase();
    assert.equal(loaded.semesters[0].number, 2);
    assert.equal(loaded.semesters[0].termName, 'SoSe 2027');
    assert.equal(loaded.semesters[0].stageId, undefined);
    assert.deepEqual(loaded.studyStages, []);
    assert.deepEqual(loaded.modules, []);
  });

  describe('Dashboard-Tagesdaten', () => {
    it('zeigt nur Veranstaltungen, die am Datum nach Stundenplan stattfinden', () => {
      const semester: Semester = {
        id: 'sem-1', number: 1, name: 'Semester', status: 'aktiv',
        startDate: '2026-10-01', endDate: '2027-03-31',
      };
      const recurringEvent: EventCourse = {
        id: 'event-1', moduleId: 'module-1', title: 'Vorlesung', type: 'vorlesung',
        dayOfWeek: 1, startTime: '08:00', endTime: '09:00', room: '', lecturer: '',
        isRecurring: true, semesterId: semester.id,
      };

      assert.equal(isEventScheduledOnDate(recurringEvent, '2026-10-26', [semester]), true);
      assert.equal(isEventScheduledOnDate(recurringEvent, '2026-09-28', [semester]), false);
      assert.equal(isEventScheduledOnDate(recurringEvent, '2026-10-27', [semester]), false);
      assert.equal(isEventScheduledOnDate({
        ...recurringEvent, date: '2026-10-27', dayOfWeek: 2,
      }, '2026-10-27', [semester]), true);
      assert.equal(isEventScheduledOnDate({
        ...recurringEvent, dayOfWeek: 2, isRecurring: false, startDate: '2026-10-26', endDate: '2026-10-27',
      }, '2026-10-27', [semester]), true);
    });

    describe('Markdown-Formatierung', () => {
      it('formatiert ++ als Fetttext und reserviert ## für Überschriften', () => {
        const [bold] = renderInlineMarkdown('++Wichtig++');
        assert.ok(isValidElement(bold));
        assert.equal(bold.type, 'strong');
        assert.equal(isMarkdownBlockText('## Überschrift 2'), true);
        const [headingText] = renderInlineMarkdown('## Überschrift 2');
        assert.ok(isValidElement(headingText));
        assert.notEqual(headingText.type, 'strong');
      });

      it('verarbeitet unvollständige Überschriften-Zeilen ohne den Renderer aufzuhalten', () => {
        const markup = renderToStaticMarkup(createElement(MarkdownRenderer, {
          content: 'Einleitung\n##\n### Überschrift',
        }));

        assert.match(markup, /Einleitung/);
        assert.match(markup, /##/);
        assert.match(markup, /<h3/);
        assert.match(markup, /Überschrift/);
      });

      describe('Anki-Qualitätscheckliste', () => {
        it('startet neue Karten ohne vorausgewählte Kriterien', () => {
          const checklist = createEmptyQualityCheck();
          assert.equal(getQualityScore(checklist).count, 0);
          assert.equal(getQualityScore(checklist).isComplete, false);
          assert.ok(Object.values(checklist).every((checked) => checked === false));
        });
      });
    });

    it('leitet aktive Prüfungsanmeldefristen für Fristenliste und Dashboard ab', () => {
      const exam: Exam = {
        id: 'exam-1', moduleId: 'module-1', title: 'Klausur', type: 'Schriftliche Prüfung',
        date: '2026-12-01', time: '09:00', room: '', registrationDeadline: '2026-11-15',
        status: 'geplant', weightEcts: 5, linkedTopicIds: [],
      };
      const deadlines = getExamRegistrationDeadlines([
        exam,
        { ...exam, id: 'exam-passed', status: 'bestanden' },
        { ...exam, id: 'exam-no-deadline', registrationDeadline: undefined },
      ]);

      assert.equal(deadlines.length, 1);
      assert.equal(deadlines[0].id, 'reg-dl-exam-1');
      assert.equal(deadlines[0].dueDate, '2026-11-15');
      assert.equal(deadlines[0].type, 'anmeldung');

      const emailSentExam = {
        ...exam,
        withdrawalDeadline: '2026-11-20',
        registrationSentAt: '2026-11-01T10:00:00.000Z',
      };
      assert.deepEqual(
        getExamRegistrationDeadlines([emailSentExam]).map(({ id }) => id),
        ['reg-dl-exam-1']
      );

      const confirmedExam = {
        ...emailSentExam,
        registrationConfirmedAt: '2026-11-01T11:00:00.000Z',
        withdrawalDeadline: '2026-11-20',
      };
      const confirmedDeadlines = getExamRegistrationDeadlines([confirmedExam]);
      assert.equal(confirmedDeadlines.length, 1);
      assert.equal(confirmedDeadlines[0].id, 'withdrawal-dl-exam-1');
      assert.equal(confirmedDeadlines[0].dueDate, '2026-11-20');
      assert.equal(confirmedDeadlines[0].type, 'ruecktritt');
    });
  });

  it('löscht den gespeicherten Zustand und stellt die leere Datenbank wieder her', () => {
    localStorageMock.setItem('pandaflow_database_v1', JSON.stringify({
      ...emptyDatabase,
      modules: [{ id: 'old-module' }],
    }));

    clearDatabase();

    assert.deepEqual(loadDatabase().modules, []);
  });
});

describe('CRUD-Operationen für App-Datensätze', () => {
  it('legt Datensätze an, bearbeitet genau den passenden Datensatz und löscht ihn', () => {
    const original = [{ id: 'one', value: 'alt' }, { id: 'two', value: 'bleibt' }];
    const created = addById(original, { id: 'three', value: 'neu' });
    const updated = updateById(created, { id: 'one', value: 'bearbeitet' });
    const deleted = removeById(updated, 'three');

    assert.deepEqual(original, [{ id: 'one', value: 'alt' }, { id: 'two', value: 'bleibt' }]);
    assert.equal(updated.filter((item) => item.id === 'one').length, 1);
    assert.equal(updated.find((item) => item.id === 'one')?.value, 'bearbeitet');
    assert.equal(deleted.some((item) => item.id === 'three'), false);
    assert.equal(updateById(updated, { id: 'missing', value: 'nichts' }).length, updated.length);
    assert.throws(() => addById(created, { id: 'one', value: 'Duplikat' }), /existiert bereits/);
  });

  it('erhält die erwartete Reihenfolge für Notizen und Anki-Karten', () => {
    const entries = [{ id: 'old' }];
    assert.deepEqual(prependById(entries, { id: 'new' }).map(({ id }) => id), ['new', 'old']);
  });

  it('setzt Semesterstatus eindeutig und lässt unbekannte Semester unangetastet', () => {
    const database: AppDatabase = {
      ...emptyDatabase,
      semesters: [
        { id: 'sem-1', number: 1, name: '1', status: 'aktiv', startDate: '', endDate: '' },
        { id: 'sem-2', number: 2, name: '2', status: 'geplant', startDate: '', endDate: '' },
        { id: 'sem-3', number: 3, name: '3', status: 'geplant', startDate: '', endDate: '' },
      ],
    };
    const changed = setActiveSemester(database, 'sem-2');

    assert.deepEqual(changed.semesters.map(({ id, status }) => [id, status]), [
      ['sem-1', 'abgeschlossen'],
      ['sem-2', 'aktiv'],
      ['sem-3', 'geplant'],
    ]);
    assert.equal(changed.settings.currentSemesterId, 'sem-2');
    assert.equal(setActiveSemester(database, 'missing-semester'), database);
  });
});

describe('Schutz vor doppelten Datensätzen', () => {
  it('weist beim Wiederherstellen Backups mit internen Duplikaten zurück', () => {
    const module: Module = {
      id: 'm1', semesterId: 'sem-1', code: 'BIO-101', name: 'Zellbiologie',
      shortName: 'Bio', credits: 5, color: '#000', lecturer: '', description: '',
    };
    assert.equal(findFirstDatabaseDuplicate({ ...emptyDatabase, modules: [module] }), undefined);
    assert.match(
      findFirstDatabaseDuplicate({
        ...emptyDatabase,
        modules: [module, { ...module, id: 'm2', code: ' bio-101 ' }],
      }) || '',
      /Modul „Zellbiologie“/
    );
    assert.match(
      findFirstDatabaseDuplicate({
        ...emptyDatabase,
        ankiInbox: [
          { id: 'card-1', front: 'Frage', back: 'Antwort', tags: [], status: 'inbox', createdAt: '' },
          { id: 'card-1', front: 'Andere Frage', back: 'Andere Antwort', tags: [], status: 'inbox', createdAt: '' },
        ],
      }) || '',
      /Anki-Karte/
    );
  });

  it('erkennt normalisierte Duplikate und lässt legitime Abweichungen sowie den bearbeiteten Eintrag zu', () => {
    const module: Module = {
      id: 'm1', semesterId: 'sem-1', code: 'BIO-101', name: 'Zellbiologie',
      shortName: 'Bio', credits: 5, color: '#000', lecturer: '', description: '',
    };
    assert.equal(findDuplicateModule([module], { ...module, id: 'm2', name: 'Andere Bezeichnung' })?.id, 'm1');
    assert.equal(findDuplicateModule([module], { ...module, id: 'm2', code: 'bio-101 ', name: ' Zellbiologie ' })?.id, 'm1');
    assert.equal(findDuplicateModule([module], { ...module, id: 'm2', semesterId: 'sem-2' }), undefined);
    assert.equal(findDuplicateModule([module], { ...module, name: 'ZELLBIOLOGIE' }, module.id), undefined);
    assert.equal(findDuplicateModule([module], { ...module, id: 'm1', name: 'Andere Bezeichnung' })?.id, 'm1');

    const semester: Semester = {
      id: 's1', number: 1, name: 'Wintersemester', termName: 'WS 2026/2027',
      stageId: 'stage-1', status: 'aktiv', startDate: '', endDate: '',
    };
    assert.equal(findDuplicateSemester([semester], { ...semester, id: 's2', termName: ' ws 2026/2027 ' })?.id, 's1');
    assert.equal(findDuplicateSemester([semester], { ...semester, id: 's2', stageId: 'stage-2' }), undefined);

    const stage: StudyStage = { id: 'stage-1', name: ' Bachelor ', order: 1 };
    assert.equal(findDuplicateStudyStage([stage], { id: 'stage-2', name: 'bachelor', order: 2 })?.id, 'stage-1');
  });

  it('erkennt fachliche Duplikate für Termine, Mitschriften, Themen, Prüfungen, Fristen, Materialien und Anki-Karten', () => {
    const event: EventCourse = {
      id: 'event-1', moduleId: 'm1', title: 'Vorlesung', type: 'vorlesung', dayOfWeek: 1,
      startTime: '08:00', endTime: '09:00', room: '', lecturer: '', isRecurring: true,
    };
    assert.equal(findDuplicateEvent([event], { ...event, id: 'event-2', title: ' vorlesung ' })?.id, 'event-1');
    assert.equal(findDuplicateEvent([event], { ...event, id: 'event-2', dayOfWeek: 2 }), undefined);

    const note: LectureNote = {
      id: 'note-1', moduleId: 'm1', courseId: 'event-1', title: 'Einführung', content: '',
      tags: [], lectureDate: '2026-10-19', updatedAt: '', keyTakeaways: [],
    };
    assert.equal(findDuplicateNote([note], { ...note, id: 'note-2', title: ' einführung ' })?.id, 'note-1');
    assert.equal(findDuplicateNote([note], { ...note, id: 'note-2', lectureDate: '2026-10-20' }), undefined);

    const topic: LearningTopic = {
      id: 'topic-1', moduleId: 'm1', title: 'Zellkern', description: '', understanding: 'Nicht verstanden',
      recallConfidence: 'noch nicht geprüft', relevance: 'Normal', nextReviewDate: '', difficulty: 'leicht', relatedTopicIds: [],
    };
    assert.equal(findDuplicateTopic([topic], { ...topic, id: 'topic-2', title: ' zellkern ' })?.id, 'topic-1');

    const exam: Exam = {
      id: 'exam-1', moduleId: 'm1', title: 'Klausur', type: 'Schriftlich', date: '2026-12-01',
      time: '09:00', room: '', status: 'geplant', weightEcts: 5, linkedTopicIds: [],
    };
    assert.equal(findDuplicateExam([exam], { ...exam, id: 'exam-2', title: ' klausur ' })?.id, 'exam-1');
    assert.equal(findDuplicateExam([exam], { ...exam, id: 'exam-2', date: '2026-12-02' }), undefined);

    const deadline: DeadlineItem = {
      id: 'deadline-1', title: 'Abgabe', dueDate: '2026-11-01', moduleId: 'm1',
      type: 'abgabe', isCompleted: false, priority: 'normal',
    };
    assert.equal(findDuplicateDeadline([deadline], { ...deadline, id: 'deadline-2', title: ' abgabe ' })?.id, 'deadline-1');

    const material: StudyMaterial = {
      id: 'material-1', moduleId: 'm1', title: 'Skript', type: 'skript',
      url: 'https://example.com/skript', annotations: '', addedAt: '',
    };
    assert.equal(findDuplicateMaterial([material], { ...material, id: 'material-2', title: 'anderer Titel' })?.id, 'material-1');
    assert.equal(findDuplicateMaterial([material], { ...material, id: 'material-2', url: 'https://example.com/other' }), undefined);

    const card: AnkiCard = {
      id: 'card-1', moduleId: 'm1', front: 'Was ist Zellbiologie?', back: 'Die Lehre von Zellen.',
      tags: [], status: 'inbox', createdAt: '',
    };
    assert.equal(findDuplicateAnkiCard([card], { ...card, id: 'card-2', front: ' was ist zellbiologie? ' })?.id, 'card-1');
    assert.equal(findDuplicateAnkiCard([card], { ...card, id: 'card-2', back: 'Eine andere Antwort' }), undefined);
  });
});

describe('Konsistenz verknüpfter Daten', () => {
  it('entfernt beim Löschen eines Moduls abhängige Datensätze und verwaiste Verweise', () => {
    const modules: Module[] = [
      { id: 'm1', semesterId: 'sem-1', code: 'A', name: 'A', shortName: 'A', credits: 5, color: '#000', lecturer: '', description: '' },
      { id: 'm2', semesterId: 'sem-1', code: 'B', name: 'B', shortName: 'B', credits: 5, color: '#111', lecturer: '', description: '' },
    ];
    const events: EventCourse[] = [{
      id: 'event-1', moduleId: 'm1', title: 'Vorlesung', type: 'vorlesung', dayOfWeek: 1,
      startTime: '08:00', endTime: '09:00', room: '', lecturer: '', isRecurring: true,
    }];
    const notes: LectureNote[] = [
      { id: 'note-1', moduleId: 'm1', title: 'Notiz', content: '', tags: [], lectureDate: '', updatedAt: '', keyTakeaways: [] },
      { id: 'note-2', moduleId: 'm2', title: 'Notiz 2', content: '', tags: [], lectureDate: '', updatedAt: '', keyTakeaways: [], linkedTopicIds: ['topic-1'], linkedMaterialIds: ['material-1'] },
    ];
    const topics: LearningTopic[] = [
      { id: 'topic-1', moduleId: 'm1', title: 'Thema', description: '', understanding: 'Nicht verstanden', recallConfidence: 'noch nicht geprüft', relevance: 'Normal', nextReviewDate: '', difficulty: 'leicht', relatedTopicIds: [] },
      { id: 'topic-2', moduleId: 'm2', title: 'Thema 2', description: '', understanding: 'Nicht verstanden', recallConfidence: 'noch nicht geprüft', relevance: 'Normal', nextReviewDate: '', difficulty: 'leicht', relatedTopicIds: ['topic-1'], prerequisiteTopicIds: ['topic-1'], prerequisiteForTopicIds: ['topic-1'] },
    ];
    const exams: Exam[] = [
      { id: 'exam-1', moduleId: 'm1', title: 'Prüfung', type: 'Klausur', date: '', time: '', room: '', status: 'geplant', weightEcts: 5, linkedTopicIds: [] },
      { id: 'exam-2', moduleId: 'm2', title: 'Prüfung 2', type: 'Klausur', date: '', time: '', room: '', status: 'geplant', weightEcts: 5, linkedTopicIds: ['topic-1'] },
    ];
    const materials: StudyMaterial[] = [
      { id: 'material-1', moduleId: 'm1', title: 'Skript', type: 'skript', url: '', annotations: '', addedAt: '' },
    ];
    const cards: AnkiCard[] = [
      { id: 'card-1', moduleId: 'm1', front: 'Q', back: 'A', tags: [], status: 'inbox', createdAt: '' },
      { id: 'card-2', moduleId: 'm2', learningTopicId: 'topic-1', sourceNoteId: 'note-1', front: 'Q2', back: 'A2', tags: [], status: 'inbox', createdAt: '' },
    ];
    const deadlines: DeadlineItem[] = [
      { id: 'deadline-1', moduleId: 'm1', title: 'Abgabe', dueDate: '', type: 'abgabe', isCompleted: false, priority: 'normal' },
      { id: 'deadline-2', moduleId: 'm2', title: 'Abgabe 2', dueDate: '', type: 'abgabe', isCompleted: false, priority: 'normal' },
    ];
    const database: AppDatabase = {
      ...emptyDatabase, modules, events, notes, topics, exams, materials, ankiInbox: cards, deadlines,
    };

    const result = deleteModuleAndRelations(database, 'm1');

    assert.deepEqual(result.modules.map(({ id }) => id), ['m2']);
    assert.deepEqual(result.events, []);
    assert.deepEqual(result.notes.map(({ id }) => id), ['note-2']);
    assert.deepEqual(result.topics.map(({ id }) => id), ['topic-2']);
    assert.deepEqual(result.exams.map(({ id }) => id), ['exam-2']);
    assert.deepEqual(result.materials, []);
    assert.deepEqual(result.ankiInbox.map(({ id }) => id), ['card-2']);
    assert.equal(result.ankiInbox[0].sourceNoteId, undefined);
    assert.equal(result.ankiInbox[0].learningTopicId, undefined);
    assert.equal(result.deadlines.map(({ id }) => id).join(','), 'deadline-2');
    assert.deepEqual(result.notes[0].linkedTopicIds, []);
    assert.deepEqual(result.notes[0].linkedMaterialIds, []);
    assert.deepEqual(result.topics[0].relatedTopicIds, []);
    assert.deepEqual(result.topics[0].prerequisiteTopicIds, []);
    assert.deepEqual(result.topics[0].prerequisiteForTopicIds, []);
    assert.deepEqual(result.exams[0].linkedTopicIds, []);
    assert.equal(database.modules.length, 2, 'Löschen darf den bisherigen State nicht mutieren');
  });

  it('bereinigt Verknüpfungen beim Löschen einzelner Notizen, Themen, Materialien und Termine', () => {
    const database: AppDatabase = {
      ...emptyDatabase,
      events: [{
        id: 'event-1', moduleId: 'm1', title: 'Vorlesung', type: 'vorlesung', dayOfWeek: 1,
        startTime: '08:00', endTime: '09:00', room: '', lecturer: '', isRecurring: true,
      }],
      notes: [{
        id: 'note-1',
        moduleId: 'm1',
        courseId: 'event-1',
        title: 'Notiz',
        content: '',
        tags: [],
        lectureDate: '',
        updatedAt: '',
        keyTakeaways: [],
        linkedTopicIds: ['topic-1'],
        linkedMaterialIds: ['material-1'],
      }],
      topics: [{
        id: 'topic-1',
        moduleId: 'm1',
        title: 'Thema',
        description: '',
        understanding: 'Nicht verstanden',
        recallConfidence: 'noch nicht geprüft',
        relevance: 'Normal',
        nextReviewDate: '',
        difficulty: 'leicht',
        relatedTopicIds: [],
      }],
      materials: [{
        id: 'material-1', moduleId: 'm1', title: 'Skript', type: 'skript', url: '', annotations: '', addedAt: '',
      }],
      exams: [{
        id: 'exam-1',
        moduleId: 'm1',
        title: 'Prüfung',
        type: 'Klausur',
        date: '',
        time: '',
        room: '',
        status: 'geplant',
        weightEcts: 5,
        linkedTopicIds: ['topic-1'],
      }],
      ankiInbox: [{
        id: 'card-1',
        sourceNoteId: 'note-1',
        learningTopicId: 'topic-1',
        front: 'Frage',
        back: 'Antwort',
        tags: [],
        status: 'inbox',
        createdAt: '',
      }],
    };

    const withoutTopic = deleteTopicAndRelations(database, 'topic-1');
    assert.deepEqual(withoutTopic.topics, []);
    assert.deepEqual(withoutTopic.notes[0].linkedTopicIds, []);
    assert.deepEqual(withoutTopic.exams[0].linkedTopicIds, []);
    assert.equal(withoutTopic.ankiInbox[0].learningTopicId, undefined);

    const withoutMaterial = deleteMaterialAndRelations(database, 'material-1');
    assert.deepEqual(withoutMaterial.materials, []);
    assert.deepEqual(withoutMaterial.notes[0].linkedMaterialIds, []);

    const withoutNote = deleteNoteAndRelations(database, 'note-1');
    assert.deepEqual(withoutNote.notes, []);
    assert.equal(withoutNote.ankiInbox[0].sourceNoteId, undefined);

    const withoutEvent = deleteEventAndRelations(database, 'event-1');
    assert.deepEqual(withoutEvent.events, []);
    assert.equal(withoutEvent.notes[0].courseId, undefined);
  });
});

describe('JSON-Backup-Import', () => {
  it('exportiert ein herunterladbares JSON-Backup mit Datenbankinhalt', async () => {
    let clicked = false;
    let exportedBlob: Blob | undefined;
    const anchor = { href: '', download: '', click: () => { clicked = true; } };
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        createElement: () => anchor,
        body: { appendChild: () => undefined, removeChild: () => undefined },
      },
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (blob: Blob) => {
        exportedBlob = blob;
        return 'blob:test-backup';
      },
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });

    try {
      exportDatabaseAsJson(emptyDatabase);
      assert.equal(clicked, true);
      assert.equal(anchor.href, 'blob:test-backup');
      assert.match(anchor.download, /^PharmStudy_Backup_\d{4}-\d{2}-\d{2}\.json$/);
      assert.ok(exportedBlob);
      assert.deepEqual(JSON.parse(await exportedBlob.text()).modules, []);
    } finally {
      if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
      else Reflect.deleteProperty(globalThis, 'document');
      if (originalCreateObjectUrl) Object.defineProperty(URL, 'createObjectURL', originalCreateObjectUrl);
      if (originalRevokeObjectUrl) Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectUrl);
    }
  });

  it('übernimmt ein valides Backup und weist unvollständige Dateien zurück', async () => {
    class FileReaderMock {
      result: string | ArrayBuffer | null = null;
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

      readAsText(file: Blob): void {
        void file.text().then((text) => {
          this.result = text;
          this.onload?.({ target: this as unknown as FileReader } as ProgressEvent<FileReader>);
        }).catch(() => {
          this.onerror?.({ target: this as unknown as FileReader } as ProgressEvent<FileReader>);
        });
      }
    }
    Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: FileReaderMock });
    const validFile = new File([JSON.stringify({ modules: [], semesters: [] })], 'backup.json');
    const invalidFile = new File([JSON.stringify({ notes: [] })], 'invalid.json');

    const restored = await importDatabaseFromJson(validFile);
    assert.deepEqual(restored.modules, []);
    await assert.rejects(() => importDatabaseFromJson(invalidFile), /Ungültige Backup-Datei/);
  });
});

describe('Verschlüsselte SQLite-Backups', () => {
  it('verwendet die zum sql.js-Paket passende WASM-Binärdatei', async () => {
    const publicWasm = await readFile(new URL('../public/sql-wasm.wasm', import.meta.url));
    const packageWasm = await readFile(new URL('../node_modules/sql.js/dist/sql-wasm-browser.wasm', import.meta.url));

    assert.deepEqual(publicWasm, packageWasm);
  });

  it('verschlüsselt und entschlüsselt unverändert und erkennt ungültige Passwörter', async () => {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { crypto: webcrypto } });
    const rawSqlite = new TextEncoder().encode('SQLite format 3\0test-database');
    const encrypted = await encryptSqliteData(rawSqlite, 'test-passphrase');

    assert.equal(isEncryptedSqlite(encrypted), true);
    assert.equal(isRawSqlite(rawSqlite), true);
    assert.deepEqual(await decryptSqliteData(encrypted, 'test-passphrase'), rawSqlite);
    await assert.rejects(() => decryptSqliteData(encrypted, 'wrong-passphrase'), /Falsches Passwort/);
  });

  it('weist zu kurze Passwörter vor dem Export zurück', async () => {
    const { exportDatabaseAsEncryptedSqlite } = await import('../src/services/storage');
    await assert.rejects(
      () => exportDatabaseAsEncryptedSqlite(emptyDatabase, 'abc'),
      /mindestens 4 Zeichen/
    );
  });
});
