/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  AppDatabase, 
  EventCourse, 
  Module, 
  Semester,
  StudyStage,
  LectureNote, 
  LearningTopic, 
  TopicUnderstanding,
  TopicRecallConfidence,
  Exam, 
  DeadlineItem, 
  StudyMaterial, 
  AnkiCard,
  ModuleHandbook,
  StudyRegulations,
  ModuleOverviewDocument 
} from './types';
import { loadDatabase, loadDatabaseWithRecovery, saveDatabase, exportDatabaseAsJson, exportDatabaseAsEncryptedSqlite, clearDatabase, emptyDatabase, isAppDirectoryStorageActive } from './services/storage';
import { dismissAppError, logError, subscribeToAppErrors, type AppErrorNotice } from './services/logger';
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
  findFirstDatabaseDuplicate,
  findDuplicateMaterial,
  findDuplicateModule,
  findDuplicateNote,
  findDuplicateSemester,
  findDuplicateStudyStage,
  findDuplicateTopic,
  prependById,
  removeById,
  setActiveSemester,
  updateById,
} from './services/databaseMutations';
import { Trash2, AlertTriangle, RotateCcw, CheckCircle2, X } from 'lucide-react';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Timetable } from './components/Timetable';
import { ModulesView } from './components/ModulesView';
import { NotesEditor } from './components/NotesEditor';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { LearningTopicsView } from './components/LearningTopicsView';
import { ExamsAndDeadlines } from './components/ExamsAndDeadlines';
import { MaterialsView } from './components/MaterialsView';
import { AnkiInbox } from './components/AnkiInbox';
import { BackupAndSync } from './components/BackupAndSync';
import { ModuleHandbookModal } from './components/ModuleHandbookModal';
import { StudyRegulationsModal } from './components/StudyRegulationsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { TauriUpdatePrompt } from './components/TauriUpdatePrompt';

export default function App() {
  const [data, setReactData] = useState<AppDatabase>(() => loadDatabase());
  const dataRef = useRef(data);
  const [storageReady, setStorageReady] = useState<boolean>(() => !isAppDirectoryStorageActive());
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [appError, setAppError] = useState<AppErrorNotice | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const setData = (update: React.SetStateAction<AppDatabase>) => {
    const nextData = typeof update === 'function' ? update(dataRef.current) : update;
    dataRef.current = nextData;
    setReactData(nextData);
  };
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showHandbookModal, setShowHandbookModal] = useState<boolean>(false);
  const [showRegulationsModal, setShowRegulationsModal] = useState<boolean>(false);
  const [reviewingTopic, setReviewingTopic] = useState<LearningTopic | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  
  // Onboarding state
  const [isOnboarding, setIsOnboarding] = useState<boolean>(() => !localStorage.getItem('app_user_name'));
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('app_user_name') || '');

  useEffect(() => subscribeToAppErrors(setAppError), []);

  // Context parameters for cross-tab navigation
  const [navParams, setNavParams] = useState<{
    moduleId?: string;
    courseId?: string;
    courseTitle?: string;
    topicId?: string;
    examId?: string;
    noteId?: string;
  }>({});

  useEffect(() => {
    if (!isAppDirectoryStorageActive()) return;

    let mounted = true;
    void loadDatabaseWithRecovery()
      .then(({ data: restoredData, warning }) => {
        if (!mounted) return;
        dataRef.current = restoredData;
        setReactData(restoredData);
        setStorageWarning(warning || null);
        setStorageReady(true);
      })
      .catch((error) => {
        logError('Fehler bei der Speicher-Wiederherstellung beim Start', error);
        if (!mounted) return;
        setStorageWarning('Gespeicherte Daten konnten nicht wiederhergestellt werden.');
        setStorageReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const saveBeforePageHide = () => {
      void saveDatabase(dataRef.current).catch((error) => {
        logError('Fehler beim Abschlussspeichern der Daten', error);
      });
    };
    window.addEventListener('pagehide', saveBeforePageHide);
    return () => window.removeEventListener('pagehide', saveBeforePageHide);
  }, []);

  // Persist after a short quiet period, then serialize native writes in storage.ts.
  useEffect(() => {
    if (!storageReady) return;
    setIsSaving(true);
    const timeout = window.setTimeout(() => {
      void saveDatabase(data)
        .then(() => {
          setSaveError(null);
          setIsSaving(false);
        })
        .catch((error) => {
          setSaveError(error instanceof Error ? error.message : String(error));
          setIsSaving(false);
        });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [data, storageReady]);

  const handleNavigate = (tabId: string, params: any = {}) => {
    setNavParams(params || {});
    setActiveTab(tabId);
  };

  function rejectDuplicate<T extends { id: string }>(
    records: T[],
    candidate: T,
    find: (items: T[], item: T, excludeId?: string) => T | undefined,
    label: string,
    excludeId?: string
  ): boolean {
    if (!find(records, candidate, excludeId)) return false;
    setDuplicateWarning(`„${label}“ wurde nicht gespeichert: Ein gleicher oder sehr ähnlicher Eintrag ist bereits vorhanden.`);
    return true;
  }

  // Event Handlers
  const handleAddEvent = (event: EventCourse) => {
    if (!dataRef.current.modules.some((module) => module.id === event.moduleId)) {
      setDuplicateWarning(`„${event.title}“ wurde nicht gespeichert: Das zugehörige Modul ist nicht vorhanden.`);
      return;
    }
    if (rejectDuplicate(dataRef.current.events, event, findDuplicateEvent, event.title)) return;
    setData((prev) => ({
      ...prev,
      events: addById(prev.events, event),
    }));
  };

  const handleUpdateEvent = (event: EventCourse) => {
    if (rejectDuplicate(dataRef.current.events, event, findDuplicateEvent, event.title, event.id)) return;
    setData((prev) => ({
      ...prev,
      events: updateById(prev.events, event),
    }));
  };

  const handleDeleteEvent = (id: string) => {
    setData((prev) => deleteEventAndRelations(prev, id));
  };

  const handleImportEvents = (
    newEvents: EventCourse[],
    newModules?: Module[],
    assignedSemesterId?: string,
    newlyCreatedSemester?: Semester
  ) => {
    let moduleAdds = dataRef.current.modules;
    const acceptedModules: Module[] = [];
    let skippedCount = 0;
    (newModules || []).forEach((module) => {
      if (findDuplicateModule(moduleAdds, module)) {
        skippedCount += 1;
      } else {
        moduleAdds = [...moduleAdds, module];
        acceptedModules.push(module);
      }
    });

    let eventAdds = dataRef.current.events;
    const acceptedEvents: EventCourse[] = [];
    newEvents.forEach((event) => {
      if (!moduleAdds.some((module) => module.id === event.moduleId) || findDuplicateEvent(eventAdds, event)) {
        skippedCount += 1;
      } else {
        eventAdds = [...eventAdds, event];
        acceptedEvents.push(event);
      }
    });

    if (newlyCreatedSemester && findDuplicateSemester(dataRef.current.semesters, newlyCreatedSemester)) {
      skippedCount += 1;
    }
    if (skippedCount > 0) {
      setDuplicateWarning(`${skippedCount} bereits vorhandene oder doppelte Einträge wurden beim Import übersprungen.`);
    }

    setData((prev) => {
      let updatedSemesters = prev.semesters;
      if (newlyCreatedSemester) {
        if (!findDuplicateSemester(updatedSemesters, newlyCreatedSemester)) {
          updatedSemesters = [...updatedSemesters, newlyCreatedSemester];
        }
      }

      return {
        ...prev,
        semesters: updatedSemesters,
        modules: acceptedModules.length > 0
          ? acceptedModules.reduce((modules, module) => addById(modules, module), prev.modules)
          : prev.modules,
        events: acceptedEvents.reduce((events, event) => addById(events, event), prev.events),
      };
    });
  };

  // Module Handlers
  const handleAddModule = (mod: Module) => {
    if (rejectDuplicate(dataRef.current.modules, mod, findDuplicateModule, mod.name)) return;
    setData((prev) => ({
      ...prev,
      modules: addById(prev.modules, mod),
    }));
  };

  const handleUpdateModule = (mod: Module) => {
    if (rejectDuplicate(dataRef.current.modules, mod, findDuplicateModule, mod.name, mod.id)) return;
    setData((prev) => ({
      ...prev,
      modules: updateById(prev.modules, mod),
    }));
  };

  const handleDeleteModule = (id: string) => {
    setData((prev) => ({
      ...deleteModuleAndRelations(prev, id),
    }));
  };

  // Semester & Study Stage Handlers
  const handleAddSemester = (sem: Semester) => {
    if (rejectDuplicate(dataRef.current.semesters, sem, findDuplicateSemester, sem.termName || sem.name)) return;
    setData((prev) => ({
      ...prev,
      semesters: addById(prev.semesters, sem),
    }));
  };

  const handleUpdateSemester = (sem: Semester) => {
    if (rejectDuplicate(dataRef.current.semesters, sem, findDuplicateSemester, sem.termName || sem.name, sem.id)) return;
    setData((prev) => ({
      ...prev,
      semesters: updateById(prev.semesters, sem),
    }));
  };

  const handleSetActiveSemester = (semesterId: string) => {
    setData((prev) => setActiveSemester(prev, semesterId));
  };

  const handleDeleteSemester = (id: string) => {
    setData((prev) => ({
      ...prev,
      semesters: removeById(prev.semesters, id),
    }));
  };

  const handleAddStudyStage = (stage: StudyStage) => {
    if (rejectDuplicate(dataRef.current.studyStages || [], stage, findDuplicateStudyStage, stage.name)) return;
    setData((prev) => ({
      ...prev,
      studyStages: addById(prev.studyStages || [], stage),
    }));
  };

  const handleUpdateStudyStage = (stage: StudyStage) => {
    if (rejectDuplicate(dataRef.current.studyStages || [], stage, findDuplicateStudyStage, stage.name, stage.id)) return;
    setData((prev) => ({
      ...prev,
      studyStages: updateById(prev.studyStages || [], stage),
    }));
  };

  const handleDeleteStudyStage = (id: string) => {
    setData((prev) => ({
      ...prev,
      studyStages: removeById(prev.studyStages || [], id),
    }));
  };

  // Notes Handlers
  const handleAddNote = (note: LectureNote) => {
    if (rejectDuplicate(dataRef.current.notes, note, findDuplicateNote, note.title)) return;
    setData((prev) => ({
      ...prev,
      notes: prependById(prev.notes, note),
    }));
  };

  const handleUpdateNote = (note: LectureNote) => {
    if (rejectDuplicate(dataRef.current.notes, note, findDuplicateNote, note.title, note.id)) return;
    setData((prev) => ({
      ...prev,
      notes: updateById(prev.notes, note),
    }));
  };

  const handleDeleteNote = (id: string) => {
    setData((prev) => deleteNoteAndRelations(prev, id));
  };

  // Topic Handlers
  const handleAddTopic = (topic: LearningTopic) => {
    if (rejectDuplicate(dataRef.current.topics, topic, findDuplicateTopic, topic.title)) return;
    setData((prev) => ({
      ...prev,
      topics: addById(prev.topics, topic),
    }));
  };

  const handleUpdateTopic = (topic: LearningTopic) => {
    if (rejectDuplicate(dataRef.current.topics, topic, findDuplicateTopic, topic.title, topic.id)) return;
    setData((prev) => ({
      ...prev,
      topics: updateById(prev.topics, topic),
    }));
  };

  const handleDeleteTopic = (id: string) => {
    setData((prev) => deleteTopicAndRelations(prev, id));
  };

  const handleAdvanceTopicMastery = (topic: LearningTopic) => {
    const cycle: Record<string, 'Nicht verstanden' | 'Oberflächlich' | 'Teilweise Verstanden' | 'Verstanden' | 'sicher'> = {
      'Nicht verstanden': 'Oberflächlich',
      'Oberflächlich': 'Teilweise Verstanden',
      'Teilweise Verstanden': 'Verstanden',
      'Verstanden': 'sicher',
      'sicher': 'sicher',
    };
    const currentUnderstanding = topic.understanding || 'Nicht verstanden';
    const nextUnderstanding = cycle[currentUnderstanding] || 'Verstanden';
    const nextDays = nextUnderstanding === 'sicher' ? 14 : nextUnderstanding === 'Verstanden' ? 7 : 3;
    const nextDate = new Date(Date.now() + 86400000 * nextDays).toISOString().split('T')[0];

    const nextConfidence = 
      topic.recallConfidence === 'noch nicht geprüft' || topic.recallConfidence === 'schlecht'
        ? 'unsicher'
        : topic.recallConfidence === 'unsicher'
        ? 'akzeptabel'
        : 'sicher';

    handleUpdateTopic({
      ...topic,
      understanding: nextUnderstanding,
      recallConfidence: nextConfidence,
      lastReviewedDate: new Date().toISOString().split('T')[0],
      nextReviewDate: nextDate,
    });
  };


  // Exam Handlers
  const handleAddExam = (exam: Exam) => {
    if (rejectDuplicate(dataRef.current.exams, exam, findDuplicateExam, exam.title)) return;
    setData((prev) => ({
      ...prev,
      exams: addById(prev.exams, exam),
    }));
  };

  const handleUpdateExam = (exam: Exam) => {
    if (rejectDuplicate(dataRef.current.exams, exam, findDuplicateExam, exam.title, exam.id)) return;
    setData((prev) => ({
      ...prev,
      exams: updateById(prev.exams, exam),
    }));
  };

  const handleDeleteExam = (id: string) => {
    setData((prev) => ({
      ...prev,
      exams: removeById(prev.exams, id),
    }));
  };

  // Deadline Handlers
  const handleAddDeadline = (deadline: DeadlineItem) => {
    if (rejectDuplicate(dataRef.current.deadlines, deadline, findDuplicateDeadline, deadline.title)) return;
    setData((prev) => ({
      ...prev,
      deadlines: addById(prev.deadlines, deadline),
    }));
  };

  const handleUpdateDeadline = (deadline: DeadlineItem) => {
    if (rejectDuplicate(dataRef.current.deadlines, deadline, findDuplicateDeadline, deadline.title, deadline.id)) return;
    setData((prev) => ({
      ...prev,
      deadlines: updateById(prev.deadlines, deadline),
    }));
  };

  const handleDeleteDeadline = (id: string) => {
    setData((prev) => ({
      ...prev,
      deadlines: removeById(prev.deadlines, id),
    }));
  };

  const handleToggleDeadline = (deadline: DeadlineItem) => {
    handleUpdateDeadline({
      ...deadline,
      isCompleted: !deadline.isCompleted,
    });
  };

  // Material Handlers
  const handleAddMaterial = (material: StudyMaterial) => {
    if (rejectDuplicate(dataRef.current.materials, material, findDuplicateMaterial, material.title)) return;
    setData((prev) => ({
      ...prev,
      materials: addById(prev.materials, material),
    }));
  };

  const handleUpdateMaterial = (material: StudyMaterial) => {
    if (rejectDuplicate(dataRef.current.materials, material, findDuplicateMaterial, material.title, material.id)) return;
    setData((prev) => ({
      ...prev,
      materials: updateById(prev.materials, material),
    }));
  };

  const handleDeleteMaterial = (id: string) => {
    setData((prev) => deleteMaterialAndRelations(prev, id));
  };

  // Anki Handlers
  const handleAddAnkiCard = (card: AnkiCard) => {
    if (rejectDuplicate(dataRef.current.ankiInbox, card, findDuplicateAnkiCard, card.front)) return;
    setData((prev) => ({
      ...prev,
      ankiInbox: prependById(prev.ankiInbox, card),
    }));
  };

  const handleUpdateAnkiCard = (card: AnkiCard) => {
    if (rejectDuplicate(dataRef.current.ankiInbox, card, findDuplicateAnkiCard, card.front, card.id)) return;
    setData((prev) => ({
      ...prev,
      ankiInbox: updateById(prev.ankiInbox, card),
    }));
  };

  const handleDeleteAnkiCard = (id: string) => {
    setData((prev) => ({
      ...prev,
      ankiInbox: removeById(prev.ankiInbox, id),
    }));
  };

  const handleUpdateAnkiStatus = (id: string, status: AnkiCard['status']) => {
    setData((prev) => ({
      ...prev,
      ankiInbox: prev.ankiInbox.map((card) => (card.id === id ? { ...card, status } : card)),
    }));
  };

  const handleSavePredefinedTags = (tags: string[]) => {
    setData((prev) => ({
      ...prev,
      predefinedTags: tags,
    }));
  };

  // Database Backup Handlers
  const handleRestoreData = (restored: AppDatabase) => {
    const duplicateLabel = findFirstDatabaseDuplicate(restored);
    if (duplicateLabel) {
      setDuplicateWarning(`Backup nicht wiederhergestellt: ${duplicateLabel} ist mehrfach enthalten.`);
      return;
    }
    setData(restored);
  };

  const handleResetData = () => {
    try {
      clearDatabase();
      setData(emptyDatabase);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleClearAllData = () => {
    try {
      clearDatabase();
      setData(emptyDatabase);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleSaveHandbook = (handbook: ModuleHandbook | undefined) => {
    setData((prev) => ({
      ...prev,
      moduleHandbook: handbook,
    }));
  };

  const handleSaveRegulations = (regulations: StudyRegulations | undefined) => {
    setData((prev) => ({
      ...prev,
      studyRegulations: regulations,
    }));
  };

  const handleSaveModuleOverview = (overview: ModuleOverviewDocument | undefined) => {
    setData((prev) => ({
      ...prev,
      moduleOverview: overview,
    }));
  };

  const handleQuickExport = async () => {
    const savedPass = sessionStorage.getItem('pandaflow_session_passphrase') || 'Studium2026!Sicher';
    try {
      await exportDatabaseAsEncryptedSqlite(data, savedPass);
    } catch (error) {
      logError('Schnellexport fehlgeschlagen', error);
      handleNavigate('backup');
    }
  };

  const ankiInboxCount = data.ankiInbox.filter((c) => c.status === 'inbox').length;
  const upcomingExamsCount = data.exams.filter((e) => e.status !== 'bestanden').length;

  const activeSemester =
    data.semesters.find((s) => s.id === data.settings.currentSemesterId) ||
    data.semesters.find((s) => s.status === 'aktiv') ||
    data.semesters[0];

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 && window.innerWidth < 1024;
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!storageReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        Gespeicherte Daten werden wiederhergestellt …
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Header conforming to Top Bar Contract */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          handleNavigate(tab);
          setIsMobileMenuOpen(false);
        }}
        onQuickExport={handleQuickExport}
        onOpenOnboarding={() => setIsOnboarding(true)}
        ankiInboxCount={ankiInboxCount}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        currentSemester={activeSemester}
        semesters={data.semesters}
        modules={data.modules}
        onSetActiveSemester={handleSetActiveSemester}
      />

      {/* Main Workspace with Sidebar */}
      <div className="flex flex-1 overflow-hidden min-w-0">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            handleNavigate(tab);
            setIsMobileMenuOpen(false);
          }}
          ankiCount={ankiInboxCount}
          upcomingExamsCount={upcomingExamsCount}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isOpenOnMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          semesters={data.semesters}
          currentSemesterId={data.settings.currentSemesterId || activeSemester?.id}
          onSelectSemester={handleSetActiveSemester}
        />

        {/* Viewport Scroll Container */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 min-w-0">
          <div className="max-w-7xl mx-auto pb-12 min-w-0">
            {appError && (
              <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <div className="min-w-0 flex-1">
                  <p>{appError.context}</p>
                  <p className="mt-1 break-words text-xs text-red-200/80">{appError.details}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    dismissAppError(appError.id);
                    setAppError(null);
                  }}
                  aria-label="Fehlerhinweis schließen"
                  className="rounded p-1 text-red-200 hover:bg-red-500/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {duplicateWarning && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <p className="flex-1">{duplicateWarning}</p>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  aria-label="Hinweis zu Duplikaten schließen"
                  className="rounded p-1 text-amber-200 hover:bg-amber-500/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {storageWarning && (
              <div role="alert" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                {storageWarning}
              </div>
            )}
            {saveError && (
              <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <p className="flex-1">Beim Speichern ist ein Fehler aufgetreten: {saveError}</p>
                <button
                  type="button"
                  onClick={() => setSaveError(null)}
                  aria-label="Speicherfehler schließen"
                  className="rounded p-1 text-red-200 hover:bg-red-500/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {isSaving && !saveError && (
              <p role="status" className="mb-3 text-xs text-slate-400">Änderungen werden gespeichert …</p>
            )}
            {activeTab === 'dashboard' && (
              <Dashboard
                data={data}
                userName={userName}
                onNavigate={handleNavigate}
                onAdvanceTopicMastery={handleAdvanceTopicMastery}
                onOpenReviewModal={(topic) => setReviewingTopic(topic)}
                onAddAnkiCard={handleAddAnkiCard}
                onUpdateAnkiStatus={handleUpdateAnkiStatus}
                onToggleDeadline={handleToggleDeadline}
              />
            )}

            {activeTab === 'stundenplan' && (
              <Timetable
                events={data.events}
                modules={data.modules}
                semesters={data.semesters}
                studyStages={data.studyStages}
                moduleHandbook={data.moduleHandbook}
                onAddEvent={handleAddEvent}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
                onImportEvents={handleImportEvents}
                onNavigateToNotes={(modId, cId, cTitle) =>
                  handleNavigate('mitschriften', { moduleId: modId, courseId: cId, courseTitle: cTitle })
                }
              />
            )}

            {activeTab === 'module' && (
              <ModulesView
                semesters={data.semesters}
                studyStages={data.studyStages}
                modules={data.modules}
                events={data.events}
                notes={data.notes}
                exams={data.exams}
                materials={data.materials}
                moduleHandbook={data.moduleHandbook}
                studyRegulations={data.studyRegulations}
                moduleOverview={data.moduleOverview}
                onAddModule={handleAddModule}
                onUpdateModule={handleUpdateModule}
                onDeleteModule={handleDeleteModule}
                onAddEvent={handleAddEvent}
                onOpenHandbookModal={() => setShowHandbookModal(true)}
                onOpenRegulationsModal={() => setShowRegulationsModal(true)}
                onOpenOverviewModal={() => handleNavigate('material')}
                onAddSemester={handleAddSemester}
                onUpdateSemester={handleUpdateSemester}
                onDeleteSemester={handleDeleteSemester}
                onAddStudyStage={handleAddStudyStage}
                onUpdateStudyStage={handleUpdateStudyStage}
                onDeleteStudyStage={handleDeleteStudyStage}
                selectedModuleId={navParams.moduleId}
                topics={data.topics}
                currentSemesterId={data.settings.currentSemesterId || activeSemester?.id}
                ectsScoringMode={data.settings.ectsScoringMode || 'modules'}
                onSetActiveSemester={handleSetActiveSemester}
                onNavigateToTopic={(topicId) => handleNavigate('lerninhalte', { topicId })}
                onNavigateToModule={(moduleId) => handleNavigate('module', { moduleId })}
                onNavigateToNote={(noteId) => handleNavigate('mitschriften', { noteId })}
                onNavigateToExam={(examId) => handleNavigate('pruefungen', { examId })}
              />
            )}

            {activeTab === 'mitschriften' && (
              <NotesEditor
                notes={data.notes}
                modules={data.modules}
                events={data.events}
                topics={data.topics}
                materials={data.materials}
                exams={data.exams}
                onAddNote={handleAddNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onAddAnkiCard={handleAddAnkiCard}
                onAddTopic={handleAddTopic}
                onAddMaterial={handleAddMaterial}
                selectedModuleId={navParams.moduleId}
                selectedCourseId={navParams.courseId}
                selectedNoteId={navParams.noteId}
                onNavigateToTopic={(topicId) => handleNavigate('lerninhalte', { topicId })}
                onNavigateToModule={(moduleId) => handleNavigate('module', { moduleId })}
                onNavigateToExam={(examId) => handleNavigate('pruefungen', { examId })}
              />
            )}

            {activeTab === 'wissensgraph' && (
              <KnowledgeGraph
                modules={data.modules}
                topics={data.topics}
                notes={data.notes}
                exams={data.exams}
                onNavigateToTopic={(topicId) => handleNavigate('lerninhalte', { topicId })}
                onNavigateToNote={(noteId) => handleNavigate('mitschriften', { noteId })}
                onNavigateToExam={(examId) => handleNavigate('pruefungen', { examId })}
                onNavigateToModule={(moduleId) => handleNavigate('module', { moduleId })}
              />
            )}

            {activeTab === 'lerninhalte' && (
              <LearningTopicsView
                topics={data.topics}
                modules={data.modules}
                notes={data.notes}
                exams={data.exams}
                onAddTopic={handleAddTopic}
                onUpdateTopic={handleUpdateTopic}
                onDeleteTopic={handleDeleteTopic}
                onOpenReviewModal={(topic) => setReviewingTopic(topic)}
                selectedTopicId={navParams.topicId}
                onNavigateToTopic={(topicId) => handleNavigate('lerninhalte', { topicId })}
                onNavigateToModule={(moduleId) => handleNavigate('module', { moduleId })}
                onNavigateToNote={(noteId) => handleNavigate('mitschriften', { noteId })}
                onNavigateToExam={(examId) => handleNavigate('pruefungen', { examId })}
              />
            )}

            {activeTab === 'pruefungen' && (
              <ExamsAndDeadlines
                exams={data.exams}
                deadlines={data.deadlines}
                modules={data.modules}
                topics={data.topics}
                selectedExamId={navParams.examId}
                ectsScoringMode={data.settings.ectsScoringMode || 'modules'}
                onAddExam={handleAddExam}
                onUpdateExam={handleUpdateExam}
                onDeleteExam={handleDeleteExam}
                onAddDeadline={handleAddDeadline}
                onUpdateDeadline={handleUpdateDeadline}
                onDeleteDeadline={handleDeleteDeadline}
                onAddTopic={handleAddTopic}
              />
            )}

            {activeTab === 'material' && (
              <MaterialsView
                materials={data.materials}
                modules={data.modules}
                moduleHandbook={data.moduleHandbook}
                studyRegulations={data.studyRegulations}
                moduleOverview={data.moduleOverview}
                onAddMaterial={handleAddMaterial}
                onUpdateMaterial={handleUpdateMaterial}
                onDeleteMaterial={handleDeleteMaterial}
                onSaveHandbook={handleSaveHandbook}
                onSaveRegulations={handleSaveRegulations}
                onSaveOverview={handleSaveModuleOverview}
              />
            )}

            {activeTab === 'anki-inbox' && (
              <AnkiInbox
                cards={data.ankiInbox}
                modules={data.modules}
                topics={data.topics}
                materials={data.materials}
                predefinedTags={data.predefinedTags}
                onAddCard={handleAddAnkiCard}
                onUpdateCard={handleUpdateAnkiCard}
                onDeleteCard={handleDeleteAnkiCard}
                onUpdateStatus={handleUpdateAnkiStatus}
                onSavePredefinedTags={handleSavePredefinedTags}
              />
            )}

            {activeTab === 'backup' && (
              <BackupAndSync
                data={data}
                onRestoreData={handleRestoreData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Module Handbook Modal */}
      {showHandbookModal && (
        <ModuleHandbookModal
          currentHandbook={data.moduleHandbook}
          onSaveHandbook={handleSaveHandbook}
          onClose={() => setShowHandbookModal(false)}
        />
      )}

      {/* Study Regulations Modal */}
      {showRegulationsModal && (
        <StudyRegulationsModal
          currentRegulations={data.studyRegulations}
          onSaveRegulations={handleSaveRegulations}
          onClose={() => setShowRegulationsModal(false)}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 bg-slate-950 p-2 shrink-0 z-40 text-[10px]">
        <button
          onClick={() => handleNavigate('dashboard')}
          className={`flex flex-col items-center gap-0.5 p-1 ${
            activeTab === 'dashboard' ? 'text-teal-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => handleNavigate('stundenplan')}
          className={`flex flex-col items-center gap-0.5 p-1 ${
            activeTab === 'stundenplan' ? 'text-teal-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <span>Plan</span>
        </button>
        <button
          onClick={() => handleNavigate('mitschriften')}
          className={`flex flex-col items-center gap-0.5 p-1 ${
            activeTab === 'mitschriften' ? 'text-teal-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <span>Notizen</span>
        </button>
        <button
          onClick={() => handleNavigate('wissensgraph')}
          className={`flex flex-col items-center gap-0.5 p-1 ${
            activeTab === 'wissensgraph' ? 'text-teal-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <span>Graph</span>
        </button>
        <button
          onClick={() => handleNavigate('anki-inbox')}
          className={`flex flex-col items-center gap-0.5 p-1 relative ${
            activeTab === 'anki-inbox' ? 'text-teal-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <span>Anki</span>
          {ankiInboxCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1 right-2" />
          )}
        </button>
      </div>

      {/* Topic Review Modal for "Gelernt" action */}
      {reviewingTopic && (
        <TopicReviewModal
          topic={reviewingTopic}
          onClose={() => setReviewingTopic(null)}
          onSave={(updated) => {
            handleUpdateTopic(updated);
            setReviewingTopic(null);
          }}
        />
      )}

      {isOnboarding && (
        <OnboardingModal
          initialName={userName}
          onComplete={(enteredName, settings) => {
            const finalName = enteredName.trim() || 'Student';
            setUserName(finalName);
            localStorage.setItem('app_user_name', finalName);
            setData((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                studentName: finalName,
                ectsScoringMode: settings.ectsScoringMode,
              },
            }));
            setIsOnboarding(false);
          }}
          onClose={() => setIsOnboarding(false)}
        />
      )}
      <TauriUpdatePrompt />
    </div>
  );
}

interface TopicReviewModalProps {
  topic: LearningTopic;
  onClose: () => void;
  onSave: (updated: LearningTopic) => void;
}

const TopicReviewModal: React.FC<TopicReviewModalProps> = ({ topic, onClose, onSave }) => {
  const [understanding, setUnderstanding] = useState<TopicUnderstanding>(topic.understanding || 'Nicht verstanden');
  const [recallConfidence, setRecallConfidence] = useState<TopicRecallConfidence>(topic.recallConfidence || 'noch nicht geprüft');
  const [nextReviewDate, setNextReviewDate] = useState<string>(topic.nextReviewDate || new Date().toISOString().split('T')[0]);

  const handleQuickDays = (days: number) => {
    const d = new Date(Date.now() + 86400000 * days).toISOString().split('T')[0];
    setNextReviewDate(d);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...topic,
      understanding,
      recallConfidence,
      lastReviewedDate: new Date().toISOString().split('T')[0],
      nextReviewDate,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Lernstand &amp; Abrufsicherheit prüfen</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Aktualisiere dein echtes Verständnis für: <strong className="text-slate-200">{topic.title}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
              1. Aktuelles Verständnis:
            </label>
            <select
              value={understanding}
              onChange={(e) => setUnderstanding(e.target.value as TopicUnderstanding)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-teal-500"
            >
              <option value="Nicht verstanden">Nicht verstanden</option>
              <option value="Oberflächlich">Oberflächlich</option>
              <option value="Teilweise Verstanden">Teilweise Verstanden</option>
              <option value="Verstanden">Verstanden</option>
              <option value="sicher">Sicher verstanden</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
              2. Abrufsicherheit (Active Recall):
            </label>
            <select
              value={recallConfidence}
              onChange={(e) => setRecallConfidence(e.target.value as TopicRecallConfidence)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-teal-500"
            >
              <option value="noch nicht geprüft">Noch nicht geprüft</option>
              <option value="schlecht">Schlecht (Lücken)</option>
              <option value="unsicher">Unsicher</option>
              <option value="akzeptabel">Akzeptabel</option>
              <option value="sicher">Sicher &amp; flüssig abrufbar</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
              3. Nächstes Wiederholungsdatum:
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="date"
                required
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 flex-1"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Schnellauswahl:</span>
              <button type="button" onClick={() => handleQuickDays(3)} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 text-[11px] rounded font-mono font-semibold cursor-pointer">+3 Tage</button>
              <button type="button" onClick={() => handleQuickDays(7)} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 text-[11px] rounded font-mono font-semibold cursor-pointer">+7 Tage</button>
              <button type="button" onClick={() => handleQuickDays(14)} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 text-[11px] rounded font-mono font-semibold cursor-pointer">+14 Tage</button>
              <button type="button" onClick={() => handleQuickDays(30)} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 text-[11px] rounded font-mono font-semibold cursor-pointer">+30 Tage</button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-500 hover:bg-teal-400 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Änderungen speichern &amp; bestätigen</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
