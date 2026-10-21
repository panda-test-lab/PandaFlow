import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookMarked, 
  Plus, 
  Calendar, 
  Edit3, 
  Trash2, 
  Award, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  GraduationCap,
  Layers,
  Settings,
  Sparkles,
  Check,
  FolderPlus,
  BookOpen,
  Filter,
  CalendarDays,
  FileText,
  UserCheck,
  UserPlus,
  AlertTriangle,
  Mail,
  Phone,
  Globe,
  Building,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { 
  Module, 
  Semester, 
  StudyStage, 
  ModuleCategory,
  EventCourse, 
  LectureNote, 
  Exam, 
  StudyMaterial, 
  ModuleHandbook, 
  StudyRegulations, 
  ModuleOverviewDocument,
  LearningTopic
} from '../types';
import { renderTextWithWikiLinks } from '../utils/wikiLinks';

interface ModulesViewProps {
  semesters: Semester[];
  studyStages?: StudyStage[];
  modules: Module[];
  events: EventCourse[];
  notes: LectureNote[];
  exams: Exam[];
  materials: StudyMaterial[];
  topics?: LearningTopic[];
  moduleHandbook?: ModuleHandbook;
  studyRegulations?: StudyRegulations;
  moduleOverview?: ModuleOverviewDocument;
  currentSemesterId?: string;
  ectsScoringMode?: 'modules' | 'exams' | 'both';
  onSetActiveSemester?: (semesterId: string) => void;
  onAddModule: (mod: Module) => void;
  onUpdateModule: (mod: Module) => void;
  onDeleteModule: (id: string) => void;
  onAddSemester: (sem: Semester) => void;
  onUpdateSemester?: (sem: Semester) => void;
  onDeleteSemester?: (id: string) => void;
  onAddStudyStage?: (stage: StudyStage) => void;
  onUpdateStudyStage?: (stage: StudyStage) => void;
  onDeleteStudyStage?: (id: string) => void;
  onOpenHandbookModal?: () => void;
  selectedModuleId?: string;
  onOpenRegulationsModal?: () => void;
  onOpenOverviewModal?: () => void;
  onSelectModuleForDetail?: (mod: Module) => void;
  onNavigateToTopic?: (topicId: string) => void;
  onNavigateToModule?: (moduleId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
  onNavigateToExam?: (examId: string) => void;
  onAddEvent?: (evt: EventCourse) => void;
}

export const ModulesView: React.FC<ModulesViewProps> = ({
  semesters = [],
  studyStages = [],
  modules = [],
  events = [],
  notes = [],
  exams = [],
  materials = [],
  topics = [],
  moduleHandbook,
  studyRegulations,
  moduleOverview,
  currentSemesterId,
  ectsScoringMode = 'modules',
  onSetActiveSemester,
  onAddModule,
  onUpdateModule,
  onDeleteModule,
  onAddSemester,
  onUpdateSemester,
  onDeleteSemester,
  onAddStudyStage,
  onUpdateStudyStage,
  onDeleteStudyStage,
  selectedModuleId,
  onNavigateToTopic,
  onNavigateToModule,
  onNavigateToNote,
  onNavigateToExam,
  onAddEvent,
}) => {
  const db = { modules, topics, notes, exams };
  const handlers = {
    onNavigateToTopic,
    onNavigateToModule,
    onNavigateToNote,
    onNavigateToExam,
  };

  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(
    currentSemesterId || semesters.find((s) => s.status === 'aktiv')?.id || semesters[0]?.id || 'sem-1'
  );

  // Sync selectedSemesterId when currentSemesterId changes
  useEffect(() => {
    if (currentSemesterId && semesters.some((s) => s.id === currentSemesterId)) {
      setSelectedSemesterId(currentSemesterId);
    }
  }, [currentSemesterId]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [showAddModuleModal, setShowAddModuleModal] = useState<boolean>(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLecturerModule, setEditingLecturerModule] = useState<Module | null>(null);
  const [activeDetailModule, setActiveDetailModule] = useState<Module | null>(null);
  const [showLecturerDetails, setShowLecturerDetails] = useState<boolean>(false);

  // Automatically open module detail when navigated to via WikiLink or search
  useEffect(() => {
    if (selectedModuleId) {
      const found = modules.find((m) => m.id === selectedModuleId);
      if (found) {
        setActiveDetailModule(found);
      }
    }
  }, [selectedModuleId, modules]);

  // Management modals for Semesters and Study Stages
  const [showSemesterManagerModal, setShowSemesterManagerModal] = useState<boolean>(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [semesterFormData, setSemesterFormData] = useState<Partial<Semester>>({
    name: '',
    termName: 'WS 2026/2027',
    number: (semesters.length || 0) + 1,
    stageId: studyStages[0]?.id || '',
    status: 'geplant',
    startDate: '',
    endDate: '',
  });

  const [showStageManagerModal, setShowStageManagerModal] = useState<boolean>(false);
  const [editingStage, setEditingStage] = useState<StudyStage | null>(null);
  const [stageFormData, setStageFormData] = useState<Partial<StudyStage>>({
    name: '',
    type: 'grundstudium',
    targetDegree: '1. Staatsexamen',
    description: '',
    order: (studyStages.length || 0) + 1,
  });

  // Module form state
  const [moduleFormData, setModuleFormData] = useState<Partial<Module> & { initialEvents?: Array<{ dayOfWeek: number; startTime: string; endTime: string; room?: string; type?: string }> }>({
    code: '',
    name: '',
    shortName: '',
    semesterId: selectedSemesterId,
    stageId: '',
    category: 'pflicht',
    credits: 5,
    color: '#06b6d4',
    lecturer: '',
    room: '',
    description: '',
    lecturerDetails: {
      office: '',
      officeHours: '',
      email: '',
      phone: '',
      homepage: '',
      notes: '',
    },
  });

  const currentSemester = semesters.find((s) => s.id === selectedSemesterId);
  const currentSemesterStage = studyStages.find((st) => st.id === currentSemester?.stageId);
  const activeSemesterObj = semesters.find((s) => s.status === 'aktiv') || semesters[0];

  // Filter modules of current semester
  const semesterModules = modules.filter((m) => {
    if (m.semesterId !== selectedSemesterId) return false;
    if (selectedCategoryFilter !== 'all') {
      const cat = m.category || 'pflicht';
      return cat === selectedCategoryFilter;
    }
    return true;
  });

  const allCurrentSemesterModules = modules.filter((m) => m.semesterId === selectedSemesterId);
  const uncompletedSemesterModules = allCurrentSemesterModules.filter((m) => !m.isCompleted);
  const uncompletedCurricularModules = allCurrentSemesterModules.filter((m) => ((m.category || 'pflicht') === 'pflicht' || m.category === 'wahlpflicht') && !m.isCompleted);
  const totalEcts = allCurrentSemesterModules.reduce((acc, m) => acc + (m.credits || 0), 0);
  const completedEcts = allCurrentSemesterModules.filter((m) => m.isCompleted).reduce((acc, m) => acc + (m.credits || 0), 0);

  // Retake modules from previous semesters scheduled to be taken in this viewed semester
  const retakeModulesInCurrentSemester = modules.filter(
    (m) => m.semesterId !== selectedSemesterId && m.retakeSemesterId === selectedSemesterId && !m.isCompleted
  );

  // Evaluate if current viewed semester is in the past
  const isCurrentSemesterPast = useMemo(() => {
    if (!currentSemester) return false;
    if (currentSemester.status === 'abgeschlossen') return true;
    if (activeSemesterObj && currentSemester.id !== activeSemesterObj.id) {
      return (currentSemester.number ?? 1) < (activeSemesterObj.number ?? 1);
    }
    return false;
  }, [currentSemester, activeSemesterObj]);

  const handleQuickSetActiveSemester = (semId: string) => {
    if (onSetActiveSemester) {
      onSetActiveSemester(semId);
    } else if (onUpdateSemester) {
      const target = semesters.find((s) => s.id === semId);
      const targetSemNum = target?.number ?? 1;
      semesters.forEach((s) => {
        const sNum = s.number ?? 1;
        if (s.id === semId) {
          onUpdateSemester({ ...s, status: 'aktiv' });
        } else if (sNum < targetSemNum) {
          onUpdateSemester({ ...s, status: 'abgeschlossen' });
        } else {
          onUpdateSemester({ ...s, status: 'geplant' });
        }
      });
    }
    setSelectedSemesterId(semId);
  };

  const handleSetRetakeSemester = (moduleId: string, retakeSemesterId: string) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (mod) {
      onUpdateModule({
        ...mod,
        retakeSemesterId: retakeSemesterId || undefined,
      });
    }
  };

  const handleToggleModuleCompleted = (moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (mod) {
      onUpdateModule({
        ...mod,
        isCompleted: !mod.isCompleted,
      });
    }
  };

  const colors = [
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#3b82f6', // Blue
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#6366f1', // Indigo
  ];

  const categoryLabels: Record<ModuleCategory, { label: string; desc: string; badge: string }> = {
    pflicht: {
      label: 'Pflichtmodul',
      desc: 'Curriculare Pflichtveranstaltung',
      badge: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
    },
    wahlpflicht: {
      label: 'Wahlpflichtmodul',
      desc: 'Wahlpflichtfach',
      badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    },
    wahl: {
      label: 'Wahlmodul',
      desc: 'Freies Wahlfach',
      badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    },
    extracurricular: {
      label: 'Außercurriculares Modul',
      desc: 'Außercurricular belegtes Modul / Studium Generale',
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    },
    zusatz: {
      label: 'Zusatzveranstaltung / Modul',
      desc: 'Zusatzqualifikation, Sprachkurs oder Soft Skills',
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    },
  };

  // Existing unique lecturers across all modules to avoid duplicate inputs
  const existingLecturers = useMemo(() => {
    const map = new Map<string, {
      name: string;
      office: string;
      officeHours: string;
      email: string;
      phone: string;
      homepage: string;
      notes: string;
    }>();

    modules.forEach((m) => {
      const name = m.lecturer?.trim();
      if (name) {
        const details = m.lecturerDetails;
        const existing = map.get(name);
        if (!existing) {
          map.set(name, {
            name,
            office: details?.office || '',
            officeHours: details?.officeHours || '',
            email: details?.email || '',
            phone: details?.phone || '',
            homepage: details?.homepage || '',
            notes: details?.notes || '',
          });
        } else if (details) {
          map.set(name, {
            name,
            office: details.office || existing.office,
            officeHours: details.officeHours || existing.officeHours,
            email: details.email || existing.email,
            phone: details.phone || existing.phone,
            homepage: details.homepage || existing.homepage,
            notes: details.notes || existing.notes,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [modules]);

  // Duplicate code check across modules
  const duplicateCodeMatch = useMemo(() => {
    const code = moduleFormData.code?.trim().toLowerCase();
    if (!code) return null;
    return modules.find(
      (m) => m.id !== editingModule?.id && m.code.toLowerCase() === code
    );
  }, [moduleFormData.code, modules, editingModule]);

  // --- Module Handlers ---
  const handleOpenAddModule = () => {
    setEditingModule(null);
    setShowLecturerDetails(false);
    setModuleFormData({
      code: '',
      name: '',
      shortName: '',
      semesterId: selectedSemesterId,
      stageId: currentSemester?.stageId || studyStages[0]?.id || '',
      category: 'pflicht',
      credits: 5,
      color: '#06b6d4',
      lecturer: '',
      room: '',
      description: '',
      initialEvents: [{ dayOfWeek: 1, startTime: '08:15', endTime: '10:00', room: '', type: 'vorlesung' }],
    });
    setShowAddModuleModal(true);
  };

  const handleOpenEditModule = (mod: Module) => {
    setEditingModule(mod);
    setShowLecturerDetails(!!(mod.lecturerDetails && Object.values(mod.lecturerDetails).some((v) => !!v)));
    setModuleFormData({
      ...mod,
      category: mod.category || 'pflicht',
      room: mod.room || '',
    });
    setShowAddModuleModal(true);
  };

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleFormData.code || !moduleFormData.name) return;

    const targetSem = moduleFormData.semesterId || selectedSemesterId;
    const semObj = semesters.find((s) => s.id === targetSem);

    if (editingModule) {
      onUpdateModule({
        ...editingModule,
        code: moduleFormData.code.trim(),
        name: moduleFormData.name.trim(),
        shortName: moduleFormData.shortName?.trim() || moduleFormData.name.trim(),
        semesterId: targetSem,
        stageId: moduleFormData.stageId || semObj?.stageId || '',
        category: (moduleFormData.category as ModuleCategory) || 'pflicht',
        credits: Number(moduleFormData.credits) || 0,
        color: moduleFormData.color || '#06b6d4',
        lecturer: moduleFormData.lecturer?.trim() || '',
        room: moduleFormData.room?.trim() || '',
        description: moduleFormData.description?.trim() || '',
        isCompleted: !!moduleFormData.isCompleted,
        lecturerDetails: moduleFormData.lecturerDetails,
      });
    } else {
      const newMod: Module = {
        id: `mod-${Date.now()}`,
        code: moduleFormData.code.trim(),
        name: moduleFormData.name.trim(),
        shortName: moduleFormData.shortName?.trim() || moduleFormData.name.trim(),
        semesterId: targetSem,
        stageId: moduleFormData.stageId || semObj?.stageId || '',
        category: (moduleFormData.category as ModuleCategory) || 'pflicht',
        credits: Number(moduleFormData.credits) || 0,
        color: moduleFormData.color || '#06b6d4',
        lecturer: moduleFormData.lecturer?.trim() || '',
        room: moduleFormData.room?.trim() || '',
        description: moduleFormData.description?.trim() || '',
        isCompleted: !!moduleFormData.isCompleted,
        lecturerDetails: moduleFormData.lecturerDetails,
      };
      onAddModule(newMod);

      const initEvents = (moduleFormData as any).initialEvents || [];
      if (onAddEvent && initEvents.length > 0) {
        initEvents.forEach((ev: any, index: number) => {
          onAddEvent({
            id: `evt-${Date.now()}-${index}`,
            moduleId: newMod.id,
            semesterId: targetSem,
            title: newMod.shortName || newMod.name,
            type: ev.type || 'vorlesung',
            dayOfWeek: ev.dayOfWeek || 1,
            startTime: ev.startTime || '08:15',
            endTime: ev.endTime || '10:00',
            room: ev.room?.trim() || '',
            lecturer: newMod.lecturer || '',
            isRecurring: true,
          });
        });
      }
    }

    setShowAddModuleModal(false);
  };

  // --- Semester Management Handlers ---
  const handleOpenAddSemester = () => {
    setEditingSemester(null);
    const nextSemNumber = semesters.length + 1;

    const autoTerm = nextSemNumber % 2 === 1
      ? `WS ${2026 + Math.floor((nextSemNumber - 1) / 2)}/${2027 + Math.floor((nextSemNumber - 1) / 2)}`
      : `SoSe ${2027 + Math.floor((nextSemNumber - 1) / 2)}`;

    setSemesterFormData({
      name: `${nextSemNumber}. Semester (${autoTerm})`,
      termName: autoTerm,
      number: nextSemNumber,
      stageId: studyStages[0]?.id || '',
      status: 'geplant',
      startDate: '',
      endDate: '',
    });
    setShowSemesterManagerModal(true);
  };

  const handleOpenEditSemester = (sem: Semester) => {
    setEditingSemester(sem);
    setSemesterFormData({
      ...sem,
      number: sem.number || 1,
    });
    setShowSemesterManagerModal(true);
  };

  const handleSaveSemester = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semesterFormData.name) return;

    const semNum = Number(semesterFormData.number) || 1;
    const term = semesterFormData.termName?.trim() || (semNum % 2 === 1 ? 'WS 2026/2027' : 'SoSe 2027');

    if (editingSemester) {
      if (onUpdateSemester) {
        onUpdateSemester({
          ...editingSemester,
          name: semesterFormData.name.trim(),
          termName: term,
          number: semNum,
          stageId: semesterFormData.stageId || '',
          status: semesterFormData.status || editingSemester.status,
          startDate: semesterFormData.startDate || '',
          endDate: semesterFormData.endDate || '',
        });
      }
      if (semesterFormData.status === 'aktiv') {
        handleQuickSetActiveSemester(editingSemester.id);
      }
    } else {
      const newSemId = `sem-${Date.now()}`;
      const newSem: Semester = {
        id: newSemId,
        name: semesterFormData.name.trim(),
        termName: term,
        number: semNum,
        stageId: semesterFormData.stageId || studyStages[0]?.id || '',
        status: semesterFormData.status || 'geplant',
        startDate: semesterFormData.startDate || '',
        endDate: semesterFormData.endDate || '',
      };
      onAddSemester(newSem);
      if (newSem.status === 'aktiv') {
        handleQuickSetActiveSemester(newSemId);
      }
      setSelectedSemesterId(newSem.id);
    }

    setShowSemesterManagerModal(false);
  };

  // --- Study Stage Handlers ---
  const handleOpenAddStage = () => {
    setEditingStage(null);
    setStageFormData({
      name: '',
      type: 'grundstudium',
      targetDegree: '1. Staatsexamen',
      description: '',
      order: (studyStages.length || 0) + 1,
    });
    setShowStageManagerModal(true);
  };

  const handleOpenEditStage = (stage: StudyStage) => {
    setEditingStage(stage);
    setStageFormData({ ...stage });
    setShowStageManagerModal(true);
  };

  const handleSaveStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageFormData.name) return;

    if (editingStage) {
      if (onUpdateStudyStage) {
        onUpdateStudyStage({
          ...editingStage,
          name: stageFormData.name.trim(),
          type: stageFormData.type || 'grundstudium',
          targetDegree: stageFormData.targetDegree?.trim() || '',
          description: stageFormData.description?.trim() || '',
          order: Number(stageFormData.order) || editingStage.order,
        });
      }
    } else {
      if (onAddStudyStage) {
        const newStage: StudyStage = {
          id: `stage-${Date.now()}`,
          name: stageFormData.name.trim(),
          type: stageFormData.type || 'grundstudium',
          targetDegree: stageFormData.targetDegree?.trim() || '',
          description: stageFormData.description?.trim() || '',
          order: Number(stageFormData.order) || (studyStages.length + 1),
        };
        onAddStudyStage(newStage);
      }
    }

    setShowStageManagerModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-100">
                Module & Semester
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Freie Studienstruktur & Belegung
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{studyStages.length} Studienabschnitte</span>
              <span>·</span>
              <span>{semesters.length} Semester angelegt</span>
              <span>·</span>
              <span className="font-mono tabular-nums">{totalEcts} ECTS im gewählten Semester</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Add Module, Manage Semesters, Manage Stages */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenAddStage}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Grundformen wie Bachelor, Master, Grundstudium, Hauptstudium definieren"
          >
            <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
            <span>Grundform / Abschnitt</span>
          </button>

          <button
            onClick={handleOpenAddSemester}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Semester anlegen oder Semesterbezeichnung anpassen"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Semester verwalten</span>
          </button>

          <button
            onClick={handleOpenAddModule}
            className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-teal-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Neues Modul anlegen</span>
          </button>
        </div>
      </div>

      {/* Study Stages Hierarchy Overview Bar */}
      {studyStages.length > 0 && (
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              Grundformen & Studienabschnitte (z. B. Grundstudium, Hauptstudium, Bachelor, Master):
            </span>
            <button
              onClick={handleOpenAddStage}
              className="text-[11px] text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Abschnitt hinzufügen</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {studyStages.map((stage) => {
              const stageSemesters = semesters.filter((s) => s.stageId === stage.id);
              const isCurrentStage = currentSemesterStage?.id === stage.id;

              return (
                <div
                  key={stage.id}
                  className={`p-2.5 rounded-lg border transition-all text-xs flex flex-col justify-between min-w-0 ${
                    isCurrentStage
                      ? 'bg-teal-950/30 border-teal-500/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 min-w-0">
                    <span className="font-semibold text-slate-200 truncate">{stage.name}</span>
                    <button
                      onClick={() => handleOpenEditStage(stage)}
                      className="p-1 text-slate-400 hover:text-slate-200 shrink-0"
                      title="Abschnitt bearbeiten"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 gap-1">
                    <span className="truncate">
                      {stage.targetDegree ? `Ziel: ${stage.targetDegree}` : 'Studienabschnitt'}
                    </span>
                    <span className="font-mono text-teal-400 shrink-0">
                      {stageSemesters.length} {stageSemesters.length === 1 ? 'Semester' : 'Semester'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Semester Segmented Tabs with Term Name & Stage Badge */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-300">Semester auswählen:</span>
            {currentSemester && (
              currentSemester.id === (currentSemesterId || activeSemesterObj?.id) || currentSemester.status === 'aktiv' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 text-[11px] font-semibold shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Aktuell aktives Semester</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleQuickSetActiveSemester(currentSemester.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-all shadow-sm shadow-amber-500/20 cursor-pointer"
                  title="Dieses Semester sofort zum aktuell laufenden Semester machen"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Als aktives Semester festlegen</span>
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentSemester && (
              <button
                type="button"
                onClick={() => handleOpenEditSemester(currentSemester)}
                className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                <span>Semester bearbeiten</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          {semesters.map((sem) => {
            const semStage = studyStages.find((st) => st.id === sem.stageId);
            const isSelected = selectedSemesterId === sem.id;
            const semNum = sem.number ?? 1;
            const isActive = sem.id === (currentSemesterId || activeSemesterObj?.id) || sem.status === 'aktiv';
            const isPast = semNum < (activeSemesterObj?.number ?? 1);
            const semCurricular = modules.filter(
              (m) => m.semesterId === sem.id && ((m.category || 'pflicht') === 'pflicht' || m.category === 'wahlpflicht')
            );
            const uncompleted = semCurricular.filter((m) => !m.isCompleted);

            return (
              <button
                key={sem.id}
                onClick={() => setSelectedSemesterId(sem.id)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className="font-semibold">
                  {semNum}. Semester
                </span>

                {/* Term Name (z.B. WS 2026/2027) */}
                {sem.termName && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isSelected
                        ? 'bg-slate-950/20 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {sem.termName}
                  </span>
                )}

                {/* Stage indicator */}
                {semStage && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded truncate max-w-[80px] ${
                      isSelected
                        ? 'bg-slate-950/30 text-slate-900 font-semibold'
                        : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                    }`}
                    title={semStage.name}
                  >
                    {semStage.name.split(' ')[0]}
                  </span>
                )}

                {/* Status Badges */}
                {isActive ? (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      isSelected
                        ? 'bg-slate-950 text-teal-400 border border-slate-950'
                        : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    }`}
                  >
                    ★ Aktiv
                  </span>
                ) : isPast ? (
                  uncompleted.length === 0 ? (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        isSelected
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      ✓ Abgeschlossen
                    </span>
                  ) : (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        isSelected
                          ? 'bg-amber-950 text-amber-300 font-bold'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                      title={`${uncompleted.length} offene curriculare Pflichtmodule`}
                    >
                      ⚠ {uncompleted.length} offen
                    </span>
                  )
                ) : (
                  <span
                    className={`text-[9px] px-1 py-0.5 rounded ${
                      isSelected ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    Geplant
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={handleOpenAddSemester}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-teal-300 hover:bg-slate-800/40 rounded-lg border border-dashed border-slate-700 transition-colors flex items-center gap-1 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Neues Semester</span>
          </button>
        </div>
      </div>

      {/* Semester Summary Banner & Filter */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px] truncate">
              Semester & Turnus
            </span>
            <span className="font-semibold text-slate-200 block truncate">
              {currentSemester?.number ?? 1}. Semester
              {currentSemester?.termName ? ` · ${currentSemester.termName}` : ''}
            </span>
          </div>

          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px] truncate">Studienabschnitt</span>
            <span className="font-semibold text-purple-300 block truncate">
              {currentSemesterStage ? currentSemesterStage.name : 'Kein Abschnitt'}
            </span>
          </div>

          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px] truncate">Belegte Fächer</span>
            <span className="font-semibold text-slate-200 block truncate">
              {allCurrentSemesterModules.length} Fächer ({completedEcts}/{totalEcts} ECTS bestanden)
            </span>
          </div>

          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px] truncate">Curricularer Status</span>
            {isCurrentSemesterPast ? (
              uncompletedCurricularModules.length === 0 ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Vollständig abgeschlossen</span>
                </span>
              ) : (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{uncompletedCurricularModules.length} offene Pflichtmodule</span>
                </span>
              )
            ) : currentSemester?.id === (currentSemesterId || activeSemesterObj?.id) ? (
              <span className="text-teal-400 font-semibold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Laufendes Semester</span>
              </span>
            ) : (
              <span className="text-slate-400 font-medium">Zukünftig geplant</span>
            )}
          </div>
        </div>

        {/* Category Filter Pills: All, Pflicht, Wahlpflicht, Außercurricular, Zusatz */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3 text-slate-500" />
            Filter:
          </span>
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
              selectedCategoryFilter === 'all'
                ? 'bg-teal-500 text-slate-950 font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Alle ({allCurrentSemesterModules.length})
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('pflicht')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
              selectedCategoryFilter === 'pflicht'
                ? 'bg-teal-500 text-slate-950 font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Pflicht ({allCurrentSemesterModules.filter((m) => (m.category || 'pflicht') === 'pflicht').length})
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('extracurricular')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
              selectedCategoryFilter === 'extracurricular'
                ? 'bg-amber-400 text-slate-950 font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Außercurricular ({allCurrentSemesterModules.filter((m) => m.category === 'extracurricular').length})
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('zusatz')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
              selectedCategoryFilter === 'zusatz'
                ? 'bg-emerald-400 text-slate-950 font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Zusatz ({allCurrentSemesterModules.filter((m) => m.category === 'zusatz').length})
          </button>
        </div>
      </div>

      {/* PAST SEMESTER EVALUATION BANNER */}
      {isCurrentSemesterPast && (
        uncompletedCurricularModules.length === 0 ? (
          <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-2.5 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Semester erfolgreich abgeschlossen:</strong> Alle curricularen Pflicht- und Wahlpflichtmodule dieses Semesters wurden bestanden ({completedEcts} von {totalEcts} ECTS erworben).
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0 font-medium">
              Curricular erfüllt
            </span>
          </div>
        ) : (
          <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
              <div className="flex items-center gap-2 text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-sm">
                  Curricular noch offene Module ({uncompletedCurricularModules.length})
                </span>
              </div>
              <span className="text-[11px] text-amber-300/90 font-mono">
                Fachsemester rückt erst nach Bestehen dieser Module vor
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              In diesem vergangenen Semester sind noch Module nicht abgeschlossen. Wähle für jedes Fach aus, in welchem Semester du es nachholen bzw. wiederholen möchtest. Das Fach wird dort automatisch in deine Arbeitsbereiche (Mitschriften, Lerninhalte, Stundenplan) integriert.
            </p>

            <div className="divide-y divide-slate-800/80 bg-slate-900/80 border border-slate-800 rounded-lg overflow-hidden">
              {uncompletedCurricularModules.map((mod) => (
                <div key={mod.id} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span style={{ backgroundColor: mod.color }} className="w-2.5 h-2.5 rounded-full shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-100 mr-2">{mod.code} · {mod.name}</span>
                      <span className="font-mono text-slate-400 text-[11px]">({mod.credits} ECTS)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <label className="text-[11px] text-slate-400">Nachholen in:</label>
                    <select
                      value={mod.retakeSemesterId || ''}
                      onChange={(e) => handleSetRetakeSemester(mod.id, e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-teal-300 focus:outline-none focus:border-teal-500 cursor-pointer font-medium"
                    >
                      <option value="">Noch nicht eingeplant</option>
                      {semesters
                        .filter((s) => (s.number ?? 1) >= (currentSemester?.number ?? 1))
                        .map((s) => {
                          const isAct = s.id === (currentSemesterId || activeSemesterObj?.id);
                          return (
                            <option key={s.id} value={s.id}>
                              {s.number}. Semester ({s.termName}) {isAct ? '★ Aktuell' : ''}
                            </option>
                          );
                        })}
                    </select>

                    {mod.retakeSemesterId !== activeSemesterObj?.id && activeSemesterObj && (
                      <button
                        type="button"
                        onClick={() => handleSetRetakeSemester(mod.id, activeSemesterObj.id)}
                        className="px-2 py-1 bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-500/40 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                        title="Sofort für das aktuelle laufende Semester einplanen"
                      >
                        Ins aktive Semester
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleModuleCompleted(mod.id)}
                      className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                      title="Als bestanden markieren"
                    >
                      <Check className="w-3 h-3" />
                      <span>Bestanden</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* RETAKE MODULES IN CURRENT SEMESTER */}
      {retakeModulesInCurrentSemester.length > 0 && (
        <div className="p-4 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
            <div className="flex items-center gap-2 text-purple-200">
              <RefreshCw className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="font-semibold text-sm">
                Wiederholungs- & Nachholfächer in diesem Semester ({retakeModulesInCurrentSemester.length})
              </span>
            </div>
            <span className="text-[11px] text-purple-300 font-mono">
              Aus früheren Semestern übernommen
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {retakeModulesInCurrentSemester.map((mod) => {
              const origSem = semesters.find((s) => s.id === mod.semesterId);
              return (
                <div
                  key={mod.id}
                  className="bg-slate-900/90 border border-purple-500/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded">
                        {mod.code}
                      </span>
                      <span className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                        Ursprung: {origSem?.number}. Semester
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-100 mb-1">{mod.name}</h4>
                    <span className="text-xs font-mono text-teal-400">{mod.credits} ECTS</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleToggleModuleCompleted(mod.id)}
                      className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Als bestanden markieren</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetRetakeSemester(mod.id, '')}
                      className="text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                      title="Aus der Nachholplanung dieses Semesters entfernen"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {semesterModules.map((mod) => {
          const modEvents = events.filter((e) => e.moduleId === mod.id);
          const modNotes = notes.filter((n) => n.moduleId === mod.id);
          const modExams = exams.filter((x) => x.moduleId === mod.id);
          const modMaterials = materials.filter((m) => m.moduleId === mod.id);
          const catInfo = categoryLabels[mod.category || 'pflicht'] || categoryLabels.pflicht;

          return (
            <div
              key={mod.id}
              className="group relative bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between min-w-0 overflow-hidden"
            >
              <div className="min-w-0">
                {/* Header: Code & Category Badge & ECTS */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span
                      style={{ backgroundColor: mod.color }}
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    />
                    <span className="text-xs font-mono font-bold text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded shrink-0">
                      {mod.code}
                    </span>
                    <span 
                      className={`text-[10px] px-1.5 py-0.5 rounded border truncate max-w-[140px] sm:max-w-[180px] ${catInfo.badge}`}
                      title={catInfo.label}
                    >
                      {catInfo.label}
                    </span>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-teal-400 font-medium px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 shrink-0">
                    {mod.credits} ECTS
                  </span>
                </div>

                {/* Module Title */}
                <h3 className="text-sm font-semibold text-slate-100 group-hover:text-teal-300 transition-colors leading-snug break-words">
                  {mod.name}
                </h3>

                {/* Short Name if different */}
                {mod.shortName && mod.shortName !== mod.name && (
                  <p className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1.5 truncate">
                    <span className="text-slate-500 shrink-0">Kurzform:</span>
                    <span className="text-slate-300 truncate">{mod.shortName}</span>
                  </p>
                )}

                {mod.lecturer && (
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span className="truncate">Dozent: {mod.lecturer}</span>
                    <button onClick={() => setEditingLecturerModule(mod)} className="text-teal-400 hover:text-teal-300">
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {mod.description && (
                  <div className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed break-words">
                    {renderTextWithWikiLinks(mod.description, db, handlers)}
                  </div>
                )}
                
                {/* Completion Status (Placeholder for space/layout) */}
                <div className="mt-3 h-6" />

                {/* Linked Assets Counter */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-4 gap-1.5 text-center text-slate-400 text-[10px] sm:text-[11px]">
                  <div className="p-1.5 bg-slate-950/60 rounded min-w-0">
                    <span className="block font-mono tabular-nums font-semibold text-slate-200 truncate">
                      {modEvents.length}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">Termine</span>
                  </div>
                  <div className="p-1.5 bg-slate-950/60 rounded min-w-0">
                    <span className="block font-mono tabular-nums font-semibold text-slate-200 truncate">
                      {modNotes.length}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">Notizen</span>
                  </div>
                  <div className="p-1.5 bg-slate-950/60 rounded min-w-0">
                    <span className="block font-mono tabular-nums font-semibold text-slate-200 truncate">
                      {modExams.length}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">Klausuren</span>
                  </div>
                  <div className="p-1.5 bg-slate-950/60 rounded min-w-0">
                    <span className="block font-mono tabular-nums font-semibold text-slate-200 truncate">
                      {modMaterials.length}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">Material</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => onUpdateModule({ ...mod, isCompleted: !mod.isCompleted })}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    mod.isCompleted 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {mod.isCompleted ? 'Modul abgeschlossen' : 'Modul abschließen'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailModule(mod)}
                  className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition-colors min-w-0 truncate"
                >
                  <span className="truncate">Verknüpfte Daten</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </button>

                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  <button
                    onClick={() => handleOpenEditModule(mod)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                    title="Bearbeiten & Semester ändern"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteModule(mod.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {semesterModules.length === 0 && (
          <div className="col-span-full p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl space-y-3">
            <BookMarked className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              Noch keine Module für {currentSemester?.name || 'dieses Semester'} angelegt.
            </p>
            <button
              onClick={handleOpenAddModule}
              className="px-3.5 py-1.5 bg-teal-500 text-slate-950 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Erstes Modul oder Zusatzfach anlegen</span>
            </button>
          </div>
        )}
      </div>

      {/* Module Detail Drawer/Modal */}
      {activeDetailModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    style={{ color: activeDetailModule.color }}
                    className="text-xs font-mono font-semibold"
                  >
                    {activeDetailModule.code} · {activeDetailModule.credits} ECTS
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${categoryLabels[activeDetailModule.category || 'pflicht'].badge}`}>
                    {categoryLabels[activeDetailModule.category || 'pflicht'].label}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-1">
                  {activeDetailModule.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Dozent: <button onClick={() => setEditingLecturerModule(activeDetailModule)} className="text-teal-400 hover:text-teal-300 flex items-center gap-1">
                    {activeDetailModule.lecturer || 'Nicht angegeben'}
                    <Edit3 className="w-3 h-3" />
                  </button> · Semester: {semesters.find((s) => s.id === activeDetailModule.semesterId)?.name || 'Unbekannt'}
                </p>
                {activeDetailModule.lecturerDetails && (
                  <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                    <span className="font-bold text-slate-200">Dozentendetails:</span>
                    {activeDetailModule.lecturerDetails.office && <p className="text-slate-400">Büro: {activeDetailModule.lecturerDetails.office}</p>}
                    {activeDetailModule.lecturerDetails.officeHours && <p className="text-slate-400">Sprechzeiten: {activeDetailModule.lecturerDetails.officeHours}</p>}
                    {activeDetailModule.lecturerDetails.email && <p className="text-slate-400">E-Mail: {activeDetailModule.lecturerDetails.email}</p>}
                    {activeDetailModule.lecturerDetails.phone && <p className="text-slate-400">Telefon: {activeDetailModule.lecturerDetails.phone}</p>}
                    {activeDetailModule.lecturerDetails.homepage && <p className="text-slate-400">Homepage: {activeDetailModule.lecturerDetails.homepage}</p>}
                    {activeDetailModule.lecturerDetails.notes && <p className="text-slate-400">Notizen: {activeDetailModule.lecturerDetails.notes}</p>}
                  </div>
                )}
              </div>
              <button
                onClick={() => setActiveDetailModule(null)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Module Description with WikiLinks */}
            {activeDetailModule.description && (
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Inhalt &amp; Schwerpunkte:
                </span>
                <div className="text-xs text-slate-300 leading-relaxed break-words">
                  {renderTextWithWikiLinks(activeDetailModule.description, db, handlers)}
                </div>
              </div>
            )}

            {/* Linked Events in Timetable */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                Zugeordnete Veranstaltungen im Stundenplan (
                {events.filter((e) => e.moduleId === activeDetailModule.id).length})
              </h4>
              <div className="space-y-1.5">
                {events
                  .filter((e) => e.moduleId === activeDetailModule.id)
                  .map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{evt.title}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="capitalize">{evt.type}</span>
                          <span>·</span>
                          <span>{evt.room}</span>
                        </div>
                      </div>
                      <span className="font-mono tabular-nums text-slate-300">
                        {evt.startTime} - {evt.endTime}
                      </span>
                    </div>
                  ))}
                {events.filter((e) => e.moduleId === activeDetailModule.id).length === 0 && (
                  <p className="text-xs text-slate-500 italic p-2">
                    Noch keine Veranstaltungen zugeordnet.
                  </p>
                )}
              </div>
            </div>

            {/* Linked Exams */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Prüfungen in diesem Modul (
                {exams.filter((x) => x.moduleId === activeDetailModule.id).length})
              </h4>
              <div className="space-y-1.5">
                {exams
                  .filter((x) => x.moduleId === activeDetailModule.id)
                  .map((ex) => (
                    <div
                      key={ex.id}
                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{ex.title}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Raum: {ex.room} · Typ: {ex.type}
                        </div>
                      </div>
                      <span className="font-mono tabular-nums text-amber-300">
                        {ex.date} ({ex.time} Uhr)
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Linked Topics (Lerninhalte) */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                Lerninhalte in diesem Modul (
                {topics.filter((t) => t.moduleId === activeDetailModule.id).length})
              </h4>
              <div className="space-y-1.5">
                {topics
                  .filter((t) => t.moduleId === activeDetailModule.id)
                  .map((top) => (
                    <div
                      key={top.id}
                      onClick={() => {
                        if (onNavigateToTopic) {
                          setActiveDetailModule(null);
                          onNavigateToTopic(top.id);
                        }
                      }}
                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs cursor-pointer hover:border-teal-500/50 transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{top.title}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Schwierigkeit: <span className="capitalize">{top.difficulty}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  ))}
                {topics.filter((t) => t.moduleId === activeDetailModule.id).length === 0 && (
                  <p className="text-xs text-slate-500 italic p-2">
                    Noch keine Lerninhalte zugeordnet.
                  </p>
                )}
              </div>
            </div>

            {/* Linked Notes (Mitschriften) */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                Mitschriften &amp; Notizen (
                {notes.filter((n) => n.moduleId === activeDetailModule.id).length})
              </h4>
              <div className="space-y-1.5">
                {notes
                  .filter((n) => n.moduleId === activeDetailModule.id)
                  .map((note) => (
                    <div
                      key={note.id}
                      onClick={() => {
                        if (onNavigateToNote) {
                          setActiveDetailModule(null);
                          onNavigateToNote(note.id);
                        }
                      }}
                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs cursor-pointer hover:border-purple-500/50 transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{note.title}</span>
                        {note.summary && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-md">
                            {note.summary}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  ))}
                {notes.filter((n) => n.moduleId === activeDetailModule.id).length === 0 && (
                  <p className="text-xs text-slate-500 italic p-2">
                    Noch keine Mitschriften zugeordnet.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setActiveDetailModule(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Module Erstellen / Bearbeiten */}
      {showAddModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-teal-400" />
                {editingModule ? 'Modul bearbeiten' : 'Neues Modul anlegen'}
              </h3>
              <button
                onClick={() => setShowAddModuleModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModule} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Kürzel *
                  </label>
                  <input
                    type="text"
                    required
                    value={moduleFormData.code}
                    onChange={(e) => setModuleFormData({ ...moduleFormData, code: e.target.value })}
                    placeholder="MOD-101"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Handlicher Kurzname *
                  </label>
                  <input
                    type="text"
                    required
                    value={moduleFormData.shortName}
                    onChange={(e) => setModuleFormData({ ...moduleFormData, shortName: e.target.value })}
                    placeholder="z.B. Anorganische Chemie (Quali)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {duplicateCodeMatch && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Hinweis: Kürzel <strong>{duplicateCodeMatch.code}</strong> existiert bereits im {semesters.find(s => s.id === duplicateCodeMatch.semesterId)?.name || 'Studienverlauf'} („{duplicateCodeMatch.name}“).
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Vollständiger Modulname *
                </label>
                <input
                  type="text"
                  required
                  value={moduleFormData.name}
                  onChange={(e) => setModuleFormData({ ...moduleFormData, name: e.target.value })}
                  placeholder="z.B. Allgemeine und analytische Chemie..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Semester & Modulart / Belegung (Curricular / Extracurricular) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Zugeordnetes Semester *
                  </label>
                  <select
                    value={moduleFormData.semesterId}
                    onChange={(e) => setModuleFormData({ ...moduleFormData, semesterId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    {semesters.map((sem) => (
                      <option key={sem.id} value={sem.id}>
                        {sem.name} {sem.termName ? `(${sem.termName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Modul-Kategorie / Belegung
                  </label>
                  <select
                    value={moduleFormData.category || 'pflicht'}
                    onChange={(e) => setModuleFormData({ ...moduleFormData, category: e.target.value as ModuleCategory })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="pflicht">Pflichtmodul</option>
                    <option value="wahlpflicht">Wahlpflichtmodul</option>
                    <option value="wahl">Wahlmodul</option>
                    <option value="extracurricular">Außercurriculares Modul</option>
                    <option value="zusatz">Zusatzveranstaltung / Soft Skill</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Raum / Hörsaal
                  </label>
                  <input
                    type="text"
                    value={moduleFormData.room || ''}
                    onChange={(e) => {
                      const newRoom = e.target.value;
                      const currentEvents = (moduleFormData as any).initialEvents || [];
                      const updatedEvents = currentEvents.map((b: any) => ({
                        ...b,
                        room: b.room === moduleFormData.room ? newRoom : (b.room === '' ? newRoom : b.room)
                      }));
                      setModuleFormData({ ...moduleFormData, room: newRoom, initialEvents: updatedEvents.length ? updatedEvents : currentEvents });
                    }}
                    placeholder="z.B. Hörsaal A101"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">
                      Dozent / Lehrstuhlinhaber
                    </label>
                    {existingLecturers.length > 0 && (
                      <span className="text-[10px] text-teal-400 font-medium">
                        {existingLecturers.length} Dozenten bekannt
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    {existingLecturers.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          const found = existingLecturers.find((l) => l.name === e.target.value);
                          if (found) {
                            setModuleFormData({
                              ...moduleFormData,
                              lecturer: found.name,
                              lecturerDetails: {
                                office: found.office,
                                officeHours: found.officeHours,
                                email: found.email,
                                phone: found.phone,
                                homepage: found.homepage,
                                notes: found.notes,
                              },
                            });
                            setShowLecturerDetails(true);
                          }
                        }}
                        className="w-full bg-slate-900 border border-teal-500/30 rounded-lg px-2.5 py-1 text-[11px] text-teal-200 focus:outline-none focus:border-teal-500 cursor-pointer"
                      >
                        <option value="">-- Bekannten Dozenten übernehmen & verknüpfen --</option>
                        {existingLecturers.map((lec) => (
                          <option key={lec.name} value={lec.name}>
                            {lec.name} {lec.email ? `(${lec.email})` : ''}
                          </option>
                        ))}
                      </select>
                    )}

                    <input
                      type="text"
                      list="lecturers-datalist"
                      value={moduleFormData.lecturer}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matched = existingLecturers.find((l) => l.name.toLowerCase() === val.trim().toLowerCase());
                        if (matched) {
                          setModuleFormData({
                            ...moduleFormData,
                            lecturer: val,
                            lecturerDetails: {
                              office: matched.office,
                              officeHours: matched.officeHours,
                              email: matched.email,
                              phone: matched.phone,
                              homepage: matched.homepage,
                              notes: matched.notes,
                            },
                          });
                        } else {
                          setModuleFormData({ ...moduleFormData, lecturer: val });
                        }
                      }}
                      placeholder="z.B. Prof. Dr. Müller"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                    />
                    <datalist id="lecturers-datalist">
                      {existingLecturers.map((lec) => (
                        <option key={lec.name} value={lec.name} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Dozenten-Kontaktdaten & Sprechzeiten */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLecturerDetails(!showLecturerDetails)}
                  className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span>Dozenten-Kontaktdaten &amp; Sprechzeiten {moduleFormData.lecturer ? `(${moduleFormData.lecturer})` : ''}</span>
                    {!!(moduleFormData.lecturerDetails?.email || moduleFormData.lecturerDetails?.office) && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
                        ausgefüllt
                      </span>
                    )}
                  </div>
                  {showLecturerDetails ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {showLecturerDetails && (
                  <div className="p-3 border-t border-slate-800 space-y-2.5 bg-slate-900/40">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-500" /> Büro / Raum
                        </label>
                        <input
                          type="text"
                          placeholder="z.B. Raum 204, Haus B"
                          value={moduleFormData.lecturerDetails?.office || ''}
                          onChange={(e) => setModuleFormData({
                            ...moduleFormData,
                            lecturerDetails: { ...moduleFormData.lecturerDetails, office: e.target.value }
                          })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" /> Sprechzeiten
                        </label>
                        <input
                          type="text"
                          placeholder="z.B. Di 14:00 - 15:00 Uhr"
                          value={moduleFormData.lecturerDetails?.officeHours || ''}
                          onChange={(e) => setModuleFormData({
                            ...moduleFormData,
                            lecturerDetails: { ...moduleFormData.lecturerDetails, officeHours: e.target.value }
                          })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" /> E-Mail
                        </label>
                        <input
                          type="email"
                          placeholder="dozent@uni.de"
                          value={moduleFormData.lecturerDetails?.email || ''}
                          onChange={(e) => setModuleFormData({
                            ...moduleFormData,
                            lecturerDetails: { ...moduleFormData.lecturerDetails, email: e.target.value }
                          })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" /> Telefon
                        </label>
                        <input
                          type="tel"
                          placeholder="+49 123 45678"
                          value={moduleFormData.lecturerDetails?.phone || ''}
                          onChange={(e) => setModuleFormData({
                            ...moduleFormData,
                            lecturerDetails: { ...moduleFormData.lecturerDetails, phone: e.target.value }
                          })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-medium block mb-1 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-500" /> Lehrstuhl-Website / Profil
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={moduleFormData.lecturerDetails?.homepage || ''}
                        onChange={(e) => setModuleFormData({
                          ...moduleFormData,
                          lecturerDetails: { ...moduleFormData.lecturerDetails, homepage: e.target.value }
                        })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-medium block mb-1">
                        Notizen zum Dozenten &amp; Formalia
                      </label>
                      <textarea
                        rows={2}
                        placeholder="z.B. E-Mail mit Matrikelnummer im Betreff..."
                        value={moduleFormData.lecturerDetails?.notes || ''}
                        onChange={(e) => setModuleFormData({
                          ...moduleFormData,
                          lecturerDetails: { ...moduleFormData.lecturerDetails, notes: e.target.value }
                        })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">
                      ECTS-Leistungspunkte
                    </label>
                    {ectsScoringMode === 'exams' && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        (Ausgegraut: nur Prüfungen)
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    disabled={ectsScoringMode === 'exams'}
                    value={ectsScoringMode === 'exams' ? 0 : moduleFormData.credits}
                    onChange={(e) => setModuleFormData({ ...moduleFormData, credits: Number(e.target.value) })}
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      ectsScoringMode === 'exams'
                        ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-teal-500'
                    }`}
                  />
                  {ectsScoringMode === 'exams' && (
                    <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                      Laut Studiengang-Einstellung werden ECTS ausschließlich auf Prüfungsebene vergeben.
                    </span>
                  )}
                </div>
                <div></div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Farbe für Stundenplan & Kalender
                </label>
                <div className="flex items-center gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setModuleFormData({ ...moduleFormData, color: c })}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-lg transition-transform ${
                        moduleFormData.color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Inhaltsbeschreibung / Schwerpunkte
                </label>
                <textarea
                  rows={2}
                  value={moduleFormData.description}
                  onChange={(e) => setModuleFormData({ ...moduleFormData, description: e.target.value })}
                  placeholder="Themenübersicht, Laboranforderungen, Prüfungsstoff..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={!!moduleFormData.isCompleted}
                  onChange={(e) => setModuleFormData({ ...moduleFormData, isCompleted: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500"
                />
                Modul als abgeschlossen markieren
              </label>

              {!editingModule && (
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-teal-400" />
                      Stundenplan-Termine (optional)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentEvents = (moduleFormData as any).initialEvents || [];
                        setModuleFormData({
                          ...moduleFormData,
                          initialEvents: [...currentEvents, { dayOfWeek: 2, startTime: '10:15', endTime: '11:45', room: moduleFormData.room || '', type: 'vorlesung' }]
                        });
                      }}
                      className="text-[11px] text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Termin hinzufügen
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    Füge direkt Termine hinzu, um den Stundenplan automatisch zu füllen.
                  </span>
                  {((moduleFormData as any).initialEvents || []).map((ev: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={ev.dayOfWeek}
                        onChange={(e) => {
                          const list = [...((moduleFormData as any).initialEvents || [])];
                          list[idx].dayOfWeek = Number(e.target.value);
                          setModuleFormData({ ...moduleFormData, initialEvents: list });
                        }}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                      >
                        <option value={1}>Mo</option>
                        <option value={2}>Di</option>
                        <option value={3}>Mi</option>
                        <option value={4}>Do</option>
                        <option value={5}>Fr</option>
                        <option value={6}>Sa</option>
                        <option value={7}>So</option>
                      </select>
                      <input
                        type="time"
                        value={ev.startTime}
                        onChange={(e) => {
                          const list = [...((moduleFormData as any).initialEvents || [])];
                          list[idx].startTime = e.target.value;
                          setModuleFormData({ ...moduleFormData, initialEvents: list });
                        }}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono w-20"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="time"
                        value={ev.endTime}
                        onChange={(e) => {
                          const list = [...((moduleFormData as any).initialEvents || [])];
                          list[idx].endTime = e.target.value;
                          setModuleFormData({ ...moduleFormData, initialEvents: list });
                        }}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono w-20"
                      />
                      <input
                        type="text"
                        placeholder="Hörsaal"
                        value={ev.room || ''}
                        onChange={(e) => {
                          const list = [...((moduleFormData as any).initialEvents || [])];
                          list[idx].room = e.target.value;
                          setModuleFormData({ ...moduleFormData, initialEvents: list });
                        }}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 flex-1 w-full sm:w-auto"
                      />
                      {((moduleFormData as any).initialEvents || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const list = ((moduleFormData as any).initialEvents || []).filter((_: any, i: number) => i !== idx);
                            setModuleFormData({ ...moduleFormData, initialEvents: list });
                          }}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModuleModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-semibold shadow-sm"
                >
                  {editingModule ? 'Änderungen speichern' : 'Modul erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Semester anlegen / bearbeiten */}
      {showSemesterManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                {editingSemester ? 'Semester bearbeiten' : 'Neues Semester anlegen'}
              </h3>
              <button
                onClick={() => setShowSemesterManagerModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSemester} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Name des Semesters *
                </label>
                <input
                  type="text"
                  required
                  value={semesterFormData.name}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, name: e.target.value })}
                  placeholder="z.B. 1. Fachsemester oder Zusatzsemester"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Turnus-Benennung (z.B. WS 2026/2027 oder SoSe 2027) *
                </label>
                <input
                  type="text"
                  required
                  value={semesterFormData.termName}
                  onChange={(e) => setSemesterFormData({ ...semesterFormData, termName: e.target.value })}
                  placeholder="z.B. WS 2026/2027"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Erlaubt die genaue zeitliche Zuordnung (Winter-/Sommersemester mit Jahreszahl)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Studienabschnitt / Grundform
                  </label>
                  <select
                    value={semesterFormData.stageId || ''}
                    onChange={(e) => setSemesterFormData({ ...semesterFormData, stageId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Keinem Abschnitt zugeordnet</option>
                    {studyStages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} {st.targetDegree ? `(${st.targetDegree})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Status
                  </label>
                  <select
                    value={semesterFormData.status || 'geplant'}
                    onChange={(e) => setSemesterFormData({ ...semesterFormData, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="aktiv">Aktiv (Laufend)</option>
                    <option value="geplant">Geplant</option>
                    <option value="abgeschlossen">Abgeschlossen</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Semester Nummer *
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={semesterFormData.number || 1}
                  onChange={(e) => setSemesterFormData({ 
                    ...semesterFormData, 
                    number: Number(e.target.value) 
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Semester-Ziffer (1, 2, 3...)
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {editingSemester && onDeleteSemester && semesters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Semester „${editingSemester.name}“ wirklich löschen?`)) {
                        onDeleteSemester(editingSemester.id);
                        setShowSemesterManagerModal(false);
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded"
                  >
                    Löschen
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowSemesterManagerModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-semibold shadow-sm"
                  >
                    {editingSemester ? 'Änderungen speichern' : 'Semester anlegen'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Grundform / Studienabschnitt anlegen / bearbeiten */}
      {showStageManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-400" />
                {editingStage ? 'Studienabschnitt bearbeiten' : 'Neue Grundform / Abschnitt anlegen'}
              </h3>
              <button
                onClick={() => setShowStageManagerModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStage} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Bezeichnung der Grundform / des Abschnitts *
                </label>
                <input
                  type="text"
                  required
                  value={stageFormData.name}
                  onChange={(e) => setStageFormData({ ...stageFormData, name: e.target.value })}
                  placeholder="z.B. Bachelor, Master, Grundstudium, Hauptstudium, PJ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Frei wählbar: z.B. Bachelor, Master, Grundstudium (1.-4. Sem.), Hauptstudium
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Typus
                  </label>
                  <select
                    value={stageFormData.type || 'grundstudium'}
                    onChange={(e) => setStageFormData({ ...stageFormData, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="grundstudium">Grundstudium</option>
                    <option value="hauptstudium">Hauptstudium</option>
                    <option value="bachelor">Bachelor</option>
                    <option value="master">Master</option>
                    <option value="pj">Praktisches Jahr (PJ)</option>
                    <option value="sonstiges">Sonstige Grundform</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Zielabschluss / Prüfung
                  </label>
                  <input
                    type="text"
                    value={stageFormData.targetDegree}
                    onChange={(e) => setStageFormData({ ...stageFormData, targetDegree: e.target.value })}
                    placeholder="z.B. 1. StEx, B.Sc., M.Sc."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Beschreibung / Erläuterung
                </label>
                <textarea
                  rows={2}
                  value={stageFormData.description}
                  onChange={(e) => setStageFormData({ ...stageFormData, description: e.target.value })}
                  placeholder="Inhaltlicher Fokus, Prüfungsordnung..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {editingStage && onDeleteStudyStage && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Studienabschnitt „${editingStage.name}“ wirklich löschen?`)) {
                        onDeleteStudyStage(editingStage.id);
                        setShowStageManagerModal(false);
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded"
                  >
                    Löschen
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowStageManagerModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 rounded-lg text-xs font-semibold shadow-sm"
                  >
                    {editingStage ? 'Änderungen speichern' : 'Abschnitt anlegen'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingLecturerModule && (
        <LecturerInfoModal
          module={editingLecturerModule}
          onClose={() => setEditingLecturerModule(null)}
          onSave={(updated) => {
            onUpdateModule(updated);
            setEditingLecturerModule(null);
            setActiveDetailModule(updated);
          }}
        />
      )}
    </div>
  );
};

const LecturerInfoModal: React.FC<{
  module: Module;
  onClose: () => void;
  onSave: (updated: Module) => void;
}> = ({ module, onClose, onSave }) => {
  const [details, setDetails] = useState(module.lecturerDetails || {
    office: '',
    officeHours: '',
    email: '',
    phone: '',
    homepage: '',
    notes: '',
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg space-y-4">
        <h3 className="text-base font-bold text-slate-100">Dozentendetails für {module.lecturer}</h3>
        <div className="space-y-3">
          <input type="text" placeholder="Büro" value={details.office || ''} onChange={(e) => setDetails({...details, office: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200" />
          <input type="text" placeholder="Sprechzeiten" value={details.officeHours || ''} onChange={(e) => setDetails({...details, officeHours: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200" />
          <input type="email" placeholder="E-Mail" value={details.email || ''} onChange={(e) => setDetails({...details, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200" />
          <input type="tel" placeholder="Telefon" value={details.phone || ''} onChange={(e) => setDetails({...details, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200" />
          <input type="url" placeholder="Homepage" value={details.homepage || ''} onChange={(e) => setDetails({...details, homepage: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200" />
          <textarea placeholder="Notizen" value={details.notes || ''} onChange={(e) => setDetails({...details, notes: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 resize-none" rows={3} />
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200">Abbrechen</button>
          <button onClick={() => onSave({...module, lecturerDetails: details})} className="px-3 py-1.5 bg-teal-500 rounded text-slate-950 text-xs font-semibold">Speichern</button>
        </div>
      </div>
    </div>
  );
};
