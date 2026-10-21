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
  StudyMaterial,
  StudyStage,
} from '../types';

function normalizeDuplicateValue(value: string | undefined): string {
  return (value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function normalizeResourceUrl(value: string | undefined): string {
  const trimmed = (value || '').normalize('NFKC').trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    url.hash = '';
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return normalizeDuplicateValue(trimmed);
  }
}

function findDuplicate<T extends { id: string }>(
  items: T[],
  candidate: T,
  isSameRecord: (existing: T) => boolean,
  excludeId?: string
): T | undefined {
  return items.find((existing) =>
    existing.id !== excludeId
    && (existing.id === candidate.id || isSameRecord(existing))
  );
}

export function findDuplicateModule(items: Module[], candidate: Module, excludeId?: string): Module | undefined {
  const code = normalizeDuplicateValue(candidate.code);
  const name = normalizeDuplicateValue(candidate.name);
  return findDuplicate(items, candidate, (existing) =>
    existing.semesterId === candidate.semesterId
    && ((code !== '' && normalizeDuplicateValue(existing.code) === code)
      || (name !== '' && normalizeDuplicateValue(existing.name) === name)),
  excludeId);
}

export function findDuplicateSemester(items: Semester[], candidate: Semester, excludeId?: string): Semester | undefined {
  const termName = normalizeDuplicateValue(candidate.termName);
  return findDuplicate(items, candidate, (existing) => {
    const existingTermName = normalizeDuplicateValue(existing.termName);
    const sameStage = (existing.stageId || '') === (candidate.stageId || '');
    if (termName !== '' && existingTermName !== '') return sameStage && existingTermName === termName;
    return sameStage && existing.number === candidate.number;
  }, excludeId);
}

export function findDuplicateStudyStage(items: StudyStage[], candidate: StudyStage, excludeId?: string): StudyStage | undefined {
  const name = normalizeDuplicateValue(candidate.name);
  return findDuplicate(items, candidate, (existing) => normalizeDuplicateValue(existing.name) === name, excludeId);
}

export function findDuplicateEvent(items: EventCourse[], candidate: EventCourse, excludeId?: string): EventCourse | undefined {
  return findDuplicate(items, candidate, (existing) =>
    existing.moduleId === candidate.moduleId
    && normalizeDuplicateValue(existing.title) === normalizeDuplicateValue(candidate.title)
    && existing.startTime === candidate.startTime
    && existing.endTime === candidate.endTime
    && (candidate.isRecurring
      ? existing.isRecurring && existing.dayOfWeek === candidate.dayOfWeek
      : !existing.isRecurring && existing.date === candidate.date),
  excludeId);
}

export function findDuplicateNote(items: LectureNote[], candidate: LectureNote, excludeId?: string): LectureNote | undefined {
  return findDuplicate(items, candidate, (existing) =>
    existing.moduleId === candidate.moduleId
    && (existing.courseId || '') === (candidate.courseId || '')
    && existing.lectureDate === candidate.lectureDate
    && normalizeDuplicateValue(existing.title) === normalizeDuplicateValue(candidate.title),
  excludeId);
}

export function findDuplicateTopic(items: LearningTopic[], candidate: LearningTopic, excludeId?: string): LearningTopic | undefined {
  return findDuplicate(items, candidate, (existing) =>
    existing.moduleId === candidate.moduleId
    && normalizeDuplicateValue(existing.title) === normalizeDuplicateValue(candidate.title),
  excludeId);
}

export function findDuplicateExam(items: Exam[], candidate: Exam, excludeId?: string): Exam | undefined {
  return findDuplicate(items, candidate, (existing) =>
    existing.moduleId === candidate.moduleId
    && existing.date === candidate.date
    && normalizeDuplicateValue(existing.title) === normalizeDuplicateValue(candidate.title),
  excludeId);
}

export function findDuplicateDeadline(items: DeadlineItem[], candidate: DeadlineItem, excludeId?: string): DeadlineItem | undefined {
  return findDuplicate(items, candidate, (existing) =>
    (existing.moduleId || '') === (candidate.moduleId || '')
    && existing.dueDate === candidate.dueDate
    && (existing.dueTime || '') === (candidate.dueTime || '')
    && existing.type === candidate.type
    && normalizeDuplicateValue(existing.title) === normalizeDuplicateValue(candidate.title),
  excludeId);
}

export function findDuplicateMaterial(items: StudyMaterial[], candidate: StudyMaterial, excludeId?: string): StudyMaterial | undefined {
  const url = normalizeResourceUrl(candidate.url);
  return findDuplicate(items, candidate, (existing) =>
    existing.moduleId === candidate.moduleId
    && (url !== ''
      ? normalizeResourceUrl(existing.url) === url
      : existing.type === candidate.type && normalizeDuplicateValue(existing.title) === normalizeDuplicateValue(candidate.title)),
  excludeId);
}

export function findDuplicateAnkiCard(items: AnkiCard[], candidate: AnkiCard, excludeId?: string): AnkiCard | undefined {
  return findDuplicate(items, candidate, (existing) =>
    (existing.moduleId || '') === (candidate.moduleId || '')
    && normalizeDuplicateValue(existing.front) === normalizeDuplicateValue(candidate.front)
    && normalizeDuplicateValue(existing.back) === normalizeDuplicateValue(candidate.back),
  excludeId);
}

export function findFirstDatabaseDuplicate(database: AppDatabase): string | undefined {
  const duplicateLabel = <T extends { id: string }>(
    records: T[],
    finder: (items: T[], item: T) => T | undefined,
    describe: (item: T) => string
  ): string | undefined => {
    for (let index = 0; index < records.length; index += 1) {
      if (finder(records.slice(0, index), records[index])) return describe(records[index]);
    }
    return undefined;
  };

  return duplicateLabel(database.modules, findDuplicateModule, (module) => `Modul „${module.name}“`)
    || duplicateLabel(database.semesters, findDuplicateSemester, (semester) => `Semester „${semester.termName || semester.name}“`)
    || duplicateLabel(database.studyStages || [], findDuplicateStudyStage, (stage) => `Studienabschnitt „${stage.name}“`)
    || duplicateLabel(database.events, findDuplicateEvent, (event) => `Termin „${event.title}“`)
    || duplicateLabel(database.notes, findDuplicateNote, (note) => `Mitschrift „${note.title}“`)
    || duplicateLabel(database.topics, findDuplicateTopic, (topic) => `Lerninhalt „${topic.title}“`)
    || duplicateLabel(database.exams, findDuplicateExam, (exam) => `Prüfung „${exam.title}“`)
    || duplicateLabel(database.deadlines, findDuplicateDeadline, (deadline) => `Frist „${deadline.title}“`)
    || duplicateLabel(database.materials, findDuplicateMaterial, (material) => `Material „${material.title}“`)
    || duplicateLabel(database.ankiInbox, findDuplicateAnkiCard, (card) => `Anki-Karte „${card.front}“`);
}

export function addById<T extends { id: string }>(items: T[], item: T): T[] {
  if (items.some((existing) => existing.id === item.id)) {
    throw new Error(`Ein Eintrag mit der ID "${item.id}" existiert bereits.`);
  }
  return [...items, item];
}

export function prependById<T extends { id: string }>(items: T[], item: T): T[] {
  if (items.some((existing) => existing.id === item.id)) {
    throw new Error(`Ein Eintrag mit der ID "${item.id}" existiert bereits.`);
  }
  return [item, ...items];
}

export function updateById<T extends { id: string }>(items: T[], item: T): T[] {
  return items.map((existing) => (existing.id === item.id ? item : existing));
}

export function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}

export function deleteEventAndRelations(database: AppDatabase, eventId: string): AppDatabase {
  return {
    ...database,
    events: removeById(database.events, eventId),
    notes: database.notes.map((note) => (
      note.courseId === eventId ? { ...note, courseId: undefined } : note
    )),
  };
}

export function deleteNoteAndRelations(database: AppDatabase, noteId: string): AppDatabase {
  return {
    ...database,
    notes: removeById(database.notes, noteId),
    ankiInbox: database.ankiInbox.map((card) => (
      card.sourceNoteId === noteId ? { ...card, sourceNoteId: undefined } : card
    )),
  };
}

export function deleteTopicAndRelations(database: AppDatabase, topicId: string): AppDatabase {
  const deletedTopicIds = new Set([topicId]);

  return {
    ...database,
    topics: removeById(database.topics, topicId).map((topic) => ({
      ...topic,
      relatedTopicIds: withoutIds(topic.relatedTopicIds, deletedTopicIds) || [],
      prerequisiteTopicIds: withoutIds(topic.prerequisiteTopicIds, deletedTopicIds),
      prerequisiteForTopicIds: withoutIds(topic.prerequisiteForTopicIds, deletedTopicIds),
    })),
    notes: database.notes.map((note) => ({
      ...note,
      linkedTopicIds: withoutIds(note.linkedTopicIds, deletedTopicIds),
    })),
    exams: database.exams.map((exam) => ({
      ...exam,
      linkedTopicIds: withoutIds(exam.linkedTopicIds, deletedTopicIds) || [],
    })),
    ankiInbox: database.ankiInbox.map((card) => (
      card.learningTopicId === topicId ? { ...card, learningTopicId: undefined } : card
    )),
  };
}

export function deleteMaterialAndRelations(database: AppDatabase, materialId: string): AppDatabase {
  return {
    ...database,
    materials: removeById(database.materials, materialId),
    notes: database.notes.map((note) => ({
      ...note,
      linkedMaterialIds: withoutIds(note.linkedMaterialIds, new Set([materialId])),
    })),
  };
}

export function setActiveSemester(database: AppDatabase, semesterId: string): AppDatabase {
  const targetSemester = database.semesters.find((semester) => semester.id === semesterId);
  if (!targetSemester) return database;

  return {
    ...database,
    settings: {
      ...database.settings,
      currentSemesterId: semesterId,
    },
    semesters: database.semesters.map((semester) => {
      if (semester.id === semesterId) return { ...semester, status: 'aktiv' };
      if (semester.number < targetSemester.number) return { ...semester, status: 'abgeschlossen' };
      return { ...semester, status: 'geplant' };
    }),
  };
}

function withoutIds(values: string[] | undefined, ids: Set<string>): string[] | undefined {
  return values?.filter((value) => !ids.has(value));
}

export function deleteModuleAndRelations(database: AppDatabase, moduleId: string): AppDatabase {
  const deletedNoteIds = new Set(database.notes.filter((note) => note.moduleId === moduleId).map((note) => note.id));
  const deletedTopicIds = new Set(database.topics.filter((topic) => topic.moduleId === moduleId).map((topic) => topic.id));
  const deletedMaterialIds = new Set(database.materials.filter((material) => material.moduleId === moduleId).map((material) => material.id));

  return {
    ...database,
    modules: removeById(database.modules, moduleId),
    events: database.events.filter((event) => event.moduleId !== moduleId),
    notes: database.notes
      .filter((note) => note.moduleId !== moduleId)
      .map((note) => ({
        ...note,
        linkedTopicIds: withoutIds(note.linkedTopicIds, deletedTopicIds),
        linkedMaterialIds: withoutIds(note.linkedMaterialIds, deletedMaterialIds),
      })),
    topics: database.topics
      .filter((topic) => topic.moduleId !== moduleId)
      .map((topic) => ({
        ...topic,
        relatedTopicIds: withoutIds(topic.relatedTopicIds, deletedTopicIds) || [],
        prerequisiteTopicIds: withoutIds(topic.prerequisiteTopicIds, deletedTopicIds),
        prerequisiteForTopicIds: withoutIds(topic.prerequisiteForTopicIds, deletedTopicIds),
      })),
    exams: database.exams
      .filter((exam) => exam.moduleId !== moduleId)
      .map((exam) => ({
        ...exam,
        linkedTopicIds: withoutIds(exam.linkedTopicIds, deletedTopicIds) || [],
      })),
    materials: database.materials.filter((material) => material.moduleId !== moduleId),
    ankiInbox: database.ankiInbox
      .filter((card) => card.moduleId !== moduleId)
      .map((card) => ({
        ...card,
        sourceNoteId: card.sourceNoteId && deletedNoteIds.has(card.sourceNoteId) ? undefined : card.sourceNoteId,
        learningTopicId: card.learningTopicId && deletedTopicIds.has(card.learningTopicId)
          ? undefined
          : card.learningTopicId,
      })),
    deadlines: database.deadlines.filter((deadline) => deadline.moduleId !== moduleId),
  };
}
