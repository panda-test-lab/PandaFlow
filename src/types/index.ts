export type SemesterStatus = 'aktiv' | 'geplant' | 'abgeschlossen';

// Studienabschnitt / Grundform (z.B. Bachelor, Master, Grundstudium, Hauptstudium, Praktisches Jahr)
export interface StudyStage {
  id: string;
  name: string; // z.B. "Grundstudium (1.-4. Semester)", "Hauptstudium", "Bachelor", "Master"
  type?: 'grundstudium' | 'hauptstudium' | 'bachelor' | 'master' | 'pj' | 'sonstiges';
  description?: string;
  targetDegree?: string; // z.B. "1. Staatsexamen", "B.Sc.", "M.Sc.", "Staatsexamen"
  order: number;
}

export interface Semester {
  id: string;
  number: number; // Semester-Ziffer (z.B. 1, 2, 3...)
  name: string; // z.B. "1. Semester" oder "WS 2026/2027"
  termName?: string; // Turnus z.B. "WS 2026/2027", "SoSe 2027"
  stageId?: string; // Zuordnung zu Studienabschnitt (z.B. Grundstudium / Hauptstudium / Bachelor)
  status: SemesterStatus;
  startDate: string;
  endDate: string;
}

export type ModuleCategory = 'pflicht' | 'wahlpflicht' | 'wahl' | 'extracurricular' | 'zusatz';

export interface Module {
  id: string;
  semesterId: string;
  stageId?: string; // Optional: direkter Bezug zu Studienabschnitt
  category?: ModuleCategory; // z.B. 'pflicht' | 'extracurricular' | 'zusatz' etc.
  code: string; // z.B. "CHE-101"
  name: string; // z.B. "Allgemeine und Analytische Chemie"
  shortName: string; // z.B. "Anorganische Chemie"
  credits: number; // ECTS
  color: string; // Hex color for calendar/graph
  lecturer: string;
  room?: string;
  description: string;
  isCompleted?: boolean;
  retakeSemesterId?: string; // Zielsemester zum Nachholen/Wiederholen, falls noch nicht abgeschlossen
  lecturerDetails?: {
    office?: string;
    officeHours?: string;
    email?: string;
    phone?: string;
    homepage?: string;
    notes?: string;
  };
}

export type EventType = 'vorlesung' | 'praktikum' | 'seminar' | 'uebung' | 'tutorium';

export interface EventCourse {
  id: string;
  moduleId: string;
  semesterId?: string; // Verknüpftes Semester
  title: string; // z.B. "Chemisches Grundpraktikum (Qualitative Analyse)"
  type: EventType;
  dayOfWeek: number; // 1 = Montag, 2 = Dienstag, ... 7 = Sonntag
  startTime: string; // "HH:MM" z.B. "08:15"
  endTime: string; // "HH:MM" z.B. "10:00"
  room: string; // z.B. "Hörsaal A101"
  lecturer: string;
  notes?: string;
  isRecurring: boolean;
  date?: string; // "YYYY-MM-DD" für Einzeltermine
  startDate?: string; // "YYYY-MM-DD" Beginn des Gültigkeitszeitraums (z.B. Blockpraktikum oder Vorlesungsbeginn)
  endDate?: string; // "YYYY-MM-DD" Ende des Gültigkeitszeitraums (z.B. Blockpraktikum oder Vorlesungsende)
  rrule?: string; // iCal RRULE (z.B. FREQ=WEEKLY;UNTIL=20270206)
}

export interface NoteChecklistShortTerm {
  visited: boolean;              // Veranstaltung besucht
  completed: boolean;            // Mitschrift vervollständigt
  questionsIdentified: boolean;  // Offene Fragen identifiziert
  topicsMapped: boolean;         // Lerninhalte zugeordnet
  materialsChecked: boolean;     // Materialien geprüft
  done: boolean;                 // Nachbereitung abgeschlossen
}

export interface NoteChecklistExamPrep {
  reviewed: boolean;             // Mitschrift durchgesehen
  questionsCleared: boolean;     // Offene Fragen geklärt
  topicsIdentified: boolean;     // Relevante Lerninhalte identifiziert
  topicsEvaluated: boolean;      // Lerninhalte bewertet
  sourcesLookedUp: boolean;      // Quellen nachgeschlagen
  ankiCandidatesChecked: boolean;// Anki-Kandidaten geprüft
}

export interface NoteChecklistNotionLM {
  summaryGenerated: boolean;     // Übersicht generiert
  quizGenerated: boolean;        // Quizfragen generiert
  ankiGenerated: boolean;        // Anki-Kandidaten erzeugt
}

export interface LectureNote {
  id: string;
  moduleId: string;
  courseId?: string;
  eventType?: string; // "Vorlesung" | "Seminar" | "Proseminar" | "Praktikum" | "Tutorium" | "Übung" | "Arbeitsgruppe"
  title: string;
  content: string; // Markdown supported
  summary?: string;
  tags: string[];
  lectureDate: string;
  updatedAt: string;
  keyTakeaways: string[];

  // Textfelder & Listen
  connections?: string;         // Zusammenhänge
  connectionsList?: string[];
  openQuestions?: string;       // Offene Fragen
  openQuestionsList?: string[];
  insights?: string;            // Erkenntnisse
  insightsList?: string[];
  examHints?: string;           // Prüfungsrelevante Hinweise
  examHintsList?: string[];

  // Verknüpfungen mit mehreren Lernthemen & Materialien
  linkedTopicIds?: string[];
  linkedMaterialIds?: string[];

  // Aufklappbare Checklisten
  checklistShortTerm?: Partial<NoteChecklistShortTerm>;
  checklistExamPrep?: Partial<NoteChecklistExamPrep>;
  checklistNotionLM?: Partial<NoteChecklistNotionLM>;
}

export type MasteryLevel = 'neu' | 'wiederholen' | 'in_arbeit' | 'gemeistert';

export type TopicUnderstanding = 'Nicht verstanden' | 'Oberflächlich' | 'Teilweise Verstanden' | 'Verstanden' | 'sicher';
export type TopicRecallConfidence = 'noch nicht geprüft' | 'schlecht' | 'unsicher' | 'akzeptabel' | 'sicher';
export type TopicRelevance = '⭐ Normal' | '⭐⭐ Hoch' | '⭐⭐⭐ Sehr hoch' | 'Normal' | 'Hoch' | 'Sehr hoch' | '(1 Stern) Normal' | '(2 Sterne) Hoch' | '(3 Sterne) Sehr hoch';

export interface LearningTopic {
  id: string;
  moduleId: string;
  title: string; // z.B. "Kationentrennungsgang (Salzsäure- & H2S-Gruppe)"
  description: string;
  understanding: TopicUnderstanding;
  recallConfidence: TopicRecallConfidence;
  relevance: TopicRelevance;
  lastReviewedDate?: string;
  nextReviewDate: string;
  difficulty: 'leicht' | 'mittel' | 'anspruchsvoll';
  relatedTopicIds: string[];
  keyFormulas?: string[];
  masteryLevel?: MasteryLevel;
  // Vorbedingungen & Abhängigkeiten
  prerequisiteTopicIds?: string[]; // Voraussetzungen (Mehrfachauswahl, Verknüpfung mit anderen Lerninhalten)
  prerequisiteForTopicIds?: string[]; // Voraussetzung für (Mehrfachauswahl, Verknüpfung mit anderen Lerninhalten)
  // Lernhilfen & Stolpersteine
  commonMistakes?: string; // Häufige Fehler (ausklappbar, Markdown)
  mnemonics?: string; // Eselsbrücken / Merksätze / Lernhilfen (ausklappbar, Markdown)
}



export type ExamType = 'Schriftliche Prüfung' | '(Modul-) Abschlussklausur' | 'Zwischenklausur' | 'Benotete Übung' | 'Mündliche Prüfung' | 'Kolloquium' | 'Vortrag' | 'Praktische Leistung' | 'Protokoll' | 'Fallstudie' | 'Bericht' | string;
export type ExamStatus = 'geplant' | 'vorbereitung' | 'bestanden' | 'nicht_bestanden';

export interface Exam {
  id: string;
  moduleId: string;
  title: string; // z.B. "Klausur: Anorganische Chemie I (Quali)"
  type: ExamType;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  room: string;
  registrationDeadline?: string; // Anmeldefrist
  withdrawalDeadline?: string; // Rücktrittsfrist
  withdrawalDeadlineMatchesRegistration?: boolean;
  registrationSentAt?: string; // Zeitpunkt der Anmeldung per E-Mail
  registrationConfirmedAt?: string; // Zeitpunkt des Bestätigungseingangs
  targetGrade?: string;
  actualGrade?: string;
  status: ExamStatus;
  weightEcts: number; // 0 for exams without ECTS
  linkedTopicIds: string[];
  notes?: string;
}

export type MaterialType = 'skript' | 'buch' | 'folien' | 'uebungsblatt' | 'altklausur' | 'link';

export interface ModuleHandbookEntry {
  officialCode: string; // z.B. "B.Phar.101" oder "PHA-B-101"
  officialName: string; // Vollständiger langer Name nach Prüfungsordnung
  shortName: string; // Handlicher Kurzname für Tagesansichten
  semesterNumber: number; // 1..8
  ects: number;
  lecturer?: string;
  description?: string;
  courseNumbers?: string[]; // Campus-Lehrveranstaltungsnummern wie "165411", "165412"
  keywords?: string[]; // Schlagwörter zur automatischen Erkennung
}

export interface ModuleHandbook {
  id: string;
  title: string;
  universityName: string;
  versionOrYear?: string;
  description?: string;
  uploadedAt: string;
  pdfData?: string;
  fileName?: string;
  fileSize?: string;
  url?: string;
}

export interface StudyRegulations {
  id: string;
  title: string;
  universityName: string;
  versionOrYear?: string;
  description?: string;
  uploadedAt: string;
  pdfData?: string;
  fileName?: string;
  fileSize?: string;
  url?: string;
}

export interface ModuleOverviewDocument {
  id: string;
  title: string;
  universityName: string;
  versionOrYear?: string;
  description?: string;
  uploadedAt: string;
  fileType?: 'pdf' | 'csv' | 'txt' | 'other';
  pdfData?: string;
  csvData?: string;
  rawContent?: string;
  fileName?: string;
  fileSize?: string;
  url?: string;
}

export interface StudyMaterial {
  id: string;
  moduleId: string;
  title: string; // z.B. "Standardwerk: Einführung & Methodik der Fachdisziplin"
  type: MaterialType;
  url: string; // Nextcloud, Moodle, Google Drive, Web-Link
  annotations: string; // z.B. "Kapitel 3, Seite 45-68 besonders klausurrelevant!"
  pageReference?: string; // z.B. "S. 45 - 88"
  addedAt: string;
}

export type FlashcardType = 'basic' | 'two_ways' | 'cloze' | 'image_occlusion';

export interface QualityCheckList {
  singleAspect: boolean;      // Prüft genau einen Wissensaspekt
  clearQuestion: boolean;     // Frage ist eindeutig
  shortAnswer: boolean;       // Antwort ist kurz
  noUnnecessaryInfo: boolean; // Keine unnötigen Informationen
  notRedundant: boolean;      // Nicht redundant zu bestehenden Karten
  correctMapping: boolean;    // Lerninhalt ist korrekt zugeordnet
  knownSource: boolean;       // Quelle ist bekannt
}

export type AnkiCardStatus = 'entwurf' | 'ueberarbeiten' | 'freigegeben' | 'in_anki' | 'verworfen' | 'inbox' | 'reviewed' | 'exported';

export interface AnkiCard {
  id: string; // [Kürzel]-#### z.B. [MOD-101]-0005
  cardType?: FlashcardType; // 'basic' | 'cloze' | 'image_occlusion'
  
  // Basic & Cloze
  front: string; // Basic: Frage / Cloze: Lückentext mit {{c1::Antwort}} / Image Occlusion: Beschreibung oder Titel
  back: string;  // Basic: Antwort / Cloze: Vollständiger Text / Image Occlusion: Beschreibung
  explanation?: string; // Erklärung auf der Rückseite

  // Image Occlusion
  frontImageUrl?: string; // Verdecktes Bild
  backImageUrl?: string;  // Offenes / unbedecktes Bild

  // Module & Topic Metadata
  moduleId?: string;
  moduleCode?: string; // Modul-Kürzel (z.B. "MOD-101" oder "STAT-1")
  topic?: string;      // Lerninhalt (z.B. "Hypothesentests")
  learningTopicId?: string; // Anknüpfung an Lerninhalt ID
  sources?: string;    // Quellen (z.B. "Lehrbuch S. 142, Skript 03")

  qualityCheck?: Partial<QualityCheckList>;

  tags: string[];
  status: AnkiCardStatus;
  sourceNoteId?: string;
  createdAt: string;
  deckName?: string;
}

export interface DeadlineItem {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string;
  moduleId?: string;
  type: 'abgabe' | 'anmeldung' | 'ruecktritt' | 'klausur' | 'praktikum' | 'sonstiges';
  isCompleted: boolean;
  priority: 'dringend' | 'mittel' | 'normal';
  details?: string;
}

export interface AppDatabase {
  version: number;
  lastUpdated: string;
  studyStages?: StudyStage[];
  semesters: Semester[];
  modules: Module[];
  events: EventCourse[];
  notes: LectureNote[];
  topics: LearningTopic[];
  exams: Exam[];
  materials: StudyMaterial[];
  ankiInbox: AnkiCard[];
  predefinedTags?: string[];
  deadlines: DeadlineItem[];
  moduleHandbook?: ModuleHandbook;
  studyRegulations?: StudyRegulations;
  moduleOverview?: ModuleOverviewDocument;
  settings: {
    studentName: string;
    university: string;
    currentSemesterId: string;
    autoSaveEnabled: boolean;
    darkMode: boolean;
    ectsScoringMode?: 'modules' | 'exams' | 'both';
  };
}

// Knowledge Graph Nodes & Edges
export type GraphNodeType = 'module' | 'topic' | 'note' | 'exam';
export type GraphEdgeType = 'hierarchy' | 'related' | 'wikilink' | 'exam_link' | 'auto_keyword';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  moduleId?: string;
  color: string;
  radius: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  itemData?: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  dashed?: boolean;
  edgeType?: GraphEdgeType;
  color?: string;
}
