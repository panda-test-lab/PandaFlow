import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Tag, 
  Calendar, 
  Search, 
  Sparkles, 
  BookOpen, 
  Check, 
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Bookmark,
  Paperclip,
  CheckSquare,
  Square,
  X,
  ExternalLink,
  Layers,
  Brain,
  HelpCircle as QuestionIcon,
  Lightbulb,
  FileCheck,
  Link,
  Link2,
  FlaskConical,
  Calculator,
  Copy,
  Info
} from 'lucide-react';
import { 
  renderTextWithWikiLinks, 
  extractWikiLinks, 
  resolveWikiLink, 
  findBacklinks, 
  WikiLinkBadge,
  WikiLinkDatabase,
  WikiLinkNavigationHandlers
} from '../utils/wikiLinks';
import {
  formatFormulaToReadableText,
  convertAllFormulaCodesToReadableText,
  FORMULA_GUIDE_DATA,
  FormattedFormulaView,
} from '../utils/formulaFormatter';
import { 
  LectureNote, 
  Module, 
  EventCourse, 
  AnkiCard, 
  LearningTopic, 
  StudyMaterial,
  Exam,
  NoteChecklistShortTerm,
  NoteChecklistExamPrep,
  NoteChecklistNotionLM
} from '../types';
import { logError } from '../services/logger';

interface NotesEditorProps {
  notes: LectureNote[];
  modules: Module[];
  events: EventCourse[];
  topics?: LearningTopic[];
  materials?: StudyMaterial[];
  exams?: Exam[];
  onAddNote: (note: LectureNote) => void;
  onUpdateNote: (note: LectureNote) => void;
  onDeleteNote: (id: string) => void;
  onAddAnkiCard: (card: AnkiCard) => void;
  onAddTopic?: (topic: LearningTopic) => void;
  onAddMaterial?: (mat: StudyMaterial) => void;
  selectedModuleId?: string;
  selectedCourseId?: string;
  selectedNoteId?: string;
  onNavigateToTopic?: (topicId: string) => void;
  onNavigateToModule?: (moduleId: string) => void;
  onNavigateToExam?: (examId: string) => void;
}

const EVENT_TYPES = [
  'Vorlesung',
  'Seminar',
  'Proseminar',
  'Praktikum',
  'Tutorium',
  'Übung',
  'Arbeitsgruppe',
] as const;

export const NotesEditor: React.FC<NotesEditorProps> = ({
  notes,
  modules,
  events,
  topics = [],
  materials = [],
  exams = [],
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddAnkiCard,
  onAddTopic,
  onAddMaterial,
  selectedModuleId,
  selectedCourseId,
  selectedNoteId,
  onNavigateToTopic,
  onNavigateToModule,
  onNavigateToExam,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModuleFilter, setActiveModuleFilter] = useState<string>(selectedModuleId || 'all');
  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || '');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showMarkdownHelp, setShowMarkdownHelp] = useState<boolean>(false);
  const [helpTab, setHelpTab] = useState<'formulas' | 'markdown'>('formulas');
  const [formulaTesterInput, setFormulaTesterInput] = useState<string>('($HA \\rightarrow H^+ + A^-)');
  const [formulaCopied, setFormulaCopied] = useState<boolean>(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSymbolIntoContent = (symbol: string) => {
    const textarea = contentTextareaRef.current;
    const currentContent = currentNote.content || '';
    if (!textarea) {
      setCurrentNote({ ...currentNote, content: currentContent + symbol });
      return;
    }
    const start = textarea.selectionStart ?? currentContent.length;
    const end = textarea.selectionEnd ?? currentContent.length;
    const newContent = currentContent.substring(0, start) + symbol + currentContent.substring(end);
    setCurrentNote({ ...currentNote, content: newContent });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  const handleConvertCodesInContent = () => {
    if (!currentNote.content) return;
    const converted = convertAllFormulaCodesToReadableText(currentNote.content);
    setCurrentNote({ ...currentNote, content: converted });
  };

  // Auto-save preference and status
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('study_notes_autosave');
      return saved !== null ? saved === 'true' : true;
    } catch (error) {
      logError('Fehler beim Lesen der Mitschrift-Autosave-Einstellung', error);
      return true;
    }
  });
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [justAutoSaved, setJustAutoSaved] = useState<boolean>(false);

  const handleAutoSaveToggle = (enabled: boolean) => {
    setAutoSaveEnabled(enabled);
    try {
      localStorage.setItem('study_notes_autosave', String(enabled));
    } catch (error) {
      logError('Fehler beim Speichern der Mitschrift-Autosave-Einstellung', error);
    }
  };

  // WikiLink insertion state
  const [showWikiLinkPicker, setShowWikiLinkPicker] = useState<boolean>(false);
  const [wikiLinkSearch, setWikiLinkSearch] = useState<string>('');

  // Sync selectedNoteId when passed externally (e.g., from Knowledge Graph or WikiLink)
  useEffect(() => {
    if (selectedNoteId && notes.some((n) => n.id === selectedNoteId)) {
      setActiveNoteId(selectedNoteId);
      setIsEditing(false);
    }
  }, [selectedNoteId, notes]);

  // Collapsible Sections Toggle State
  const [openChecklistShortTerm, setOpenChecklistShortTerm] = useState<boolean>(false);
  const [openChecklistExamPrep, setOpenChecklistExamPrep] = useState<boolean>(false);
  const [openChecklistNotionLM, setOpenChecklistNotionLM] = useState<boolean>(false);

  // Form state for editing or creating note
  const [currentNote, setCurrentNote] = useState<Partial<LectureNote>>({
    title: '',
    eventType: 'Vorlesung',
    moduleId: modules[0]?.id || '',
    courseId: '',
    content: '',
    summary: '',
    tags: [],
    keyTakeaways: [],
    connectionsList: [],
    openQuestionsList: [],
    insightsList: [],
    examHintsList: [],
    lectureDate: new Date().toISOString().split('T')[0],
    linkedTopicIds: [],
    linkedMaterialIds: [],
    checklistShortTerm: {},
    checklistExamPrep: {},
    checklistNotionLM: {},
  });

  // Inputs for list sections
  const [takeawayInput, setTakeawayInput] = useState('');
  const [connectionInput, setConnectionInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [insightInput, setInsightInput] = useState('');
  const [examHintInput, setExamHintInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Inline Creation Inputs for Lernthemen & Quellen (nur sichtbar, wenn gewünscht oder nicht vorhanden)
  const [newTopicTitleInput, setNewTopicTitleInput] = useState('');
  const [showNewTopicInput, setShowNewTopicInput] = useState(false);
  const [newMaterialTitleInput, setNewMaterialTitleInput] = useState('');
  const [newMaterialUrlInput, setNewMaterialUrlInput] = useState('');
  const [showNewMaterialInput, setShowNewMaterialInput] = useState(false);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  const filteredNotes = notes.filter((n) => {
    if (activeModuleFilter !== 'all' && n.moduleId !== activeModuleFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const getModule = (modId: string) => modules.find((m) => m.id === modId);

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) return `${day}.${month}.${year}`;
    } catch {
      // fallback
    }
    return dateStr;
  };

  const generateDefaultTitle = (evtType: string, modId: string, dateStr: string) => {
    const mod = modules.find((m) => m.id === modId);
    const code = mod?.code || mod?.shortName || 'Modul';
    const formattedD = formatDate(dateStr);
    return `${evtType} in ${code} vom ${formattedD}`;
  };

  const handleStartNewNote = () => {
    const newId = `note-${Date.now()}`;
    const initialMod = activeModuleFilter !== 'all' ? activeModuleFilter : modules[0]?.id || '';
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultEvt = 'Vorlesung';
    const defaultTitle = generateDefaultTitle(defaultEvt, initialMod, todayStr);

    const noteTemplate: LectureNote = {
      id: newId,
      moduleId: initialMod,
      courseId: selectedCourseId || '',
      eventType: defaultEvt,
      title: defaultTitle,
      content: `### 1. Lernziele & Schwerpunkte
- 

### 2. Hauptteil & Definitionen
- 

### 3. Wichtige Formeln / Prinzipien
- `,
      summary: '',
      tags: ['1. Semester', defaultEvt],
      keyTakeaways: [],
      connectionsList: [],
      openQuestionsList: [],
      insightsList: [],
      examHintsList: [],
      lectureDate: todayStr,
      updatedAt: new Date().toISOString(),
      linkedTopicIds: [],
      linkedMaterialIds: [],
      checklistShortTerm: {
        visited: true,
        completed: false,
        questionsIdentified: false,
        topicsMapped: false,
        materialsChecked: false,
        done: false,
      },
      checklistExamPrep: {
        reviewed: false,
        questionsCleared: false,
        topicsIdentified: false,
        topicsEvaluated: false,
        sourcesLookedUp: false,
        ankiCandidatesChecked: false,
      },
      checklistNotionLM: {
        summaryGenerated: false,
        quizGenerated: false,
        ankiGenerated: false,
      },
    };

    onAddNote(noteTemplate);
    setActiveNoteId(newId);
    setCurrentNote(noteTemplate);
    setShowNewTopicInput(false);
    setShowNewMaterialInput(false);
    setNewTopicTitleInput('');
    setNewMaterialTitleInput('');
    setNewMaterialUrlInput('');
    setIsEditing(true);
  };

  const handleSelectNote = (note: LectureNote) => {
    setActiveNoteId(note.id);
    setCurrentNote({
      ...note,
      connectionsList: note.connectionsList || (note.connections ? [note.connections] : []),
      openQuestionsList: note.openQuestionsList || (note.openQuestions ? [note.openQuestions] : []),
      insightsList: note.insightsList || (note.insights ? [note.insights] : []),
      examHintsList: note.examHintsList || (note.examHints ? [note.examHints] : []),
      linkedTopicIds: note.linkedTopicIds || [],
      linkedMaterialIds: note.linkedMaterialIds || [],
    });
    setShowNewTopicInput(false);
    setShowNewMaterialInput(false);
    setNewTopicTitleInput('');
    setNewMaterialTitleInput('');
    setNewMaterialUrlInput('');
    setIsEditing(false);
  };

  const handleNavigateToNote = (noteId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (target) {
      handleSelectNote(target);
    } else {
      setActiveNoteId(noteId);
      setIsEditing(false);
    }
  };

  const wikiDb: WikiLinkDatabase = {
    modules,
    topics,
    notes,
    exams,
  };

  const wikiHandlers: WikiLinkNavigationHandlers = {
    onNavigateToTopic,
    onNavigateToModule,
    onNavigateToNote: handleNavigateToNote,
    onNavigateToExam,
  };

  const handleEventTypeChange = (evtType: string) => {
    const currentModId = currentNote.moduleId || modules[0]?.id || '';
    const currentDate = currentNote.lectureDate || new Date().toISOString().split('T')[0];
    const newTitle = generateDefaultTitle(evtType, currentModId, currentDate);

    setCurrentNote({
      ...currentNote,
      eventType: evtType,
      title: newTitle,
    });
  };

  const handleSaveNote = () => {
    if (!activeNote || !currentNote.title) return;
    const updated: LectureNote = {
      ...activeNote,
      ...currentNote,
      title: currentNote.title || 'Unbenannte Mitschrift',
      moduleId: currentNote.moduleId || modules[0]?.id || '',
      updatedAt: new Date().toISOString(),
      tags: currentNote.tags || [],
      keyTakeaways: currentNote.keyTakeaways || [],
      connectionsList: currentNote.connectionsList || [],
      openQuestionsList: currentNote.openQuestionsList || [],
      insightsList: currentNote.insightsList || [],
      examHintsList: currentNote.examHintsList || [],
      linkedTopicIds: currentNote.linkedTopicIds || [],
      linkedMaterialIds: currentNote.linkedMaterialIds || [],
      checklistShortTerm: currentNote.checklistShortTerm || {},
      checklistExamPrep: currentNote.checklistExamPrep || {},
      checklistNotionLM: currentNote.checklistNotionLM || {},
    };
    onUpdateNote(updated);
    const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    setLastSavedTime(timeStr);
    setIsEditing(false);
  };

  // Ref gives the debounced save callback the latest note and handlers.
  const autoSaveStateRef = useRef({
    currentNote,
    activeNote,
    isEditing,
    autoSaveEnabled,
    onUpdateNote,
    modules,
  });

  useEffect(() => {
    autoSaveStateRef.current = {
      currentNote,
      activeNote,
      isEditing,
      autoSaveEnabled,
      onUpdateNote,
      modules,
    };
  }, [currentNote, activeNote, isEditing, autoSaveEnabled, onUpdateNote, modules]);

  // Persist the draft shortly after typing stops instead of waiting several minutes.
  useEffect(() => {
    if (!autoSaveEnabled || !isEditing || !currentNote.title) return;

    const timeout = window.setTimeout(() => {
      const {
        currentNote: draft,
        activeNote: savedNote,
        isEditing: editing,
        autoSaveEnabled: enabled,
        onUpdateNote: updateNote,
        modules: currentModules,
      } = autoSaveStateRef.current;
      if (!enabled || !editing || !savedNote || !draft.title) return;

      const updated: LectureNote = {
        ...savedNote,
        ...draft,
        title: draft.title || 'Unbenannte Mitschrift',
        moduleId: draft.moduleId || currentModules[0]?.id || '',
        updatedAt: new Date().toISOString(),
        tags: draft.tags || [],
        keyTakeaways: draft.keyTakeaways || [],
        connectionsList: draft.connectionsList || [],
        openQuestionsList: draft.openQuestionsList || [],
        insightsList: draft.insightsList || [],
        examHintsList: draft.examHintsList || [],
        linkedTopicIds: draft.linkedTopicIds || [],
        linkedMaterialIds: draft.linkedMaterialIds || [],
        checklistShortTerm: draft.checklistShortTerm || {},
        checklistExamPrep: draft.checklistExamPrep || {},
        checklistNotionLM: draft.checklistNotionLM || {},
      };

      if (JSON.stringify({ ...updated, updatedAt: savedNote.updatedAt }) === JSON.stringify(savedNote)) return;

      updateNote(updated);
      const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(timeStr);
      setJustAutoSaved(true);
      window.setTimeout(() => setJustAutoSaved(false), 4000);
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [currentNote, isEditing, autoSaveEnabled]);

  // List Item Add/Remove Handlers
  const handleAddListItem = (
    field: 'keyTakeaways' | 'connectionsList' | 'openQuestionsList' | 'insightsList' | 'examHintsList',
    inputValue: string,
    setInputValue: (val: string) => void
  ) => {
    if (!inputValue.trim()) return;
    const currentList = currentNote[field] || [];
    setCurrentNote({
      ...currentNote,
      [field]: [...currentList, inputValue.trim()],
    });
    setInputValue('');
  };

  const handleRemoveListItem = (
    field: 'keyTakeaways' | 'connectionsList' | 'openQuestionsList' | 'insightsList' | 'examHintsList',
    index: number
  ) => {
    const currentList = currentNote[field] || [];
    setCurrentNote({
      ...currentNote,
      [field]: currentList.filter((_, i) => i !== index),
    });
  };

  // Tags
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const newTags = Array.from(new Set([...(currentNote.tags || []), tagInput.trim().replace(/^#/, '')]));
    setCurrentNote({ ...currentNote, tags: newTags });
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setCurrentNote({
      ...currentNote,
      tags: (currentNote.tags || []).filter((t) => t !== tag),
    });
  };

  // Lernthemen Link & Create
  const handleToggleLinkedTopic = (topicId: string) => {
    const currentList = currentNote.linkedTopicIds || [];
    if (currentList.includes(topicId)) {
      setCurrentNote({
        ...currentNote,
        linkedTopicIds: currentList.filter((id) => id !== topicId),
      });
    } else {
      setCurrentNote({
        ...currentNote,
        linkedTopicIds: [...currentList, topicId],
      });
    }
  };

  const handleCreateAndLinkTopic = () => {
    if (!newTopicTitleInput.trim()) return;
    const modId = currentNote.moduleId || modules[0]?.id || '';
    const newTopic: LearningTopic = {
      id: `topic-${Date.now()}`,
      moduleId: modId,
      title: newTopicTitleInput.trim(),
      description: `Erstellt aus Mitschrift: "${currentNote.title || 'Mitschrift'}"`,
      understanding: 'Nicht verstanden',
      recallConfidence: 'noch nicht geprüft',
      relevance: '⭐ Normal',
      nextReviewDate: new Date().toISOString().split('T')[0],
      difficulty: 'mittel',
      relatedTopicIds: [],
    };
    if (onAddTopic) {
      onAddTopic(newTopic);
    }
    const updatedLinked = Array.from(new Set([...(currentNote.linkedTopicIds || []), newTopic.id]));
    setCurrentNote({ ...currentNote, linkedTopicIds: updatedLinked });
    setNewTopicTitleInput('');
    setShowNewTopicInput(false);
  };

  // Quellen/Materialien Link & Create
  const handleToggleLinkedMaterial = (matId: string) => {
    const currentList = currentNote.linkedMaterialIds || [];
    if (currentList.includes(matId)) {
      setCurrentNote({
        ...currentNote,
        linkedMaterialIds: currentList.filter((id) => id !== matId),
      });
    } else {
      setCurrentNote({
        ...currentNote,
        linkedMaterialIds: [...currentList, matId],
      });
    }
  };

  const handleCreateAndLinkMaterial = () => {
    if (!newMaterialTitleInput.trim()) return;
    const modId = currentNote.moduleId || modules[0]?.id || '';
    const newMat: StudyMaterial = {
      id: `mat-${Date.now()}`,
      moduleId: modId,
      title: newMaterialTitleInput.trim(),
      type: 'skript',
      url: newMaterialUrlInput.trim() || '',
      annotations: `Verknüpft mit Mitschrift "${currentNote.title || 'Mitschrift'}"`,
      addedAt: new Date().toISOString().split('T')[0],
    };
    if (onAddMaterial) {
      onAddMaterial(newMat);
    }
    const updatedLinked = Array.from(new Set([...(currentNote.linkedMaterialIds || []), newMat.id]));
    setCurrentNote({ ...currentNote, linkedMaterialIds: updatedLinked });
    setNewMaterialTitleInput('');
    setNewMaterialUrlInput('');
    setShowNewMaterialInput(false);
  };

  // Checkbox toggle helpers
  const handleToggleShortTermCheck = (key: keyof NonNullable<LectureNote['checklistShortTerm']>) => {
    const currentVal = !!(currentNote.checklistShortTerm && currentNote.checklistShortTerm[key]);
    const updated = {
      ...(currentNote.checklistShortTerm || {}),
      [key]: !currentVal,
    };
    const newNoteState = { ...currentNote, checklistShortTerm: updated };
    setCurrentNote(newNoteState);
    if (activeNote && !isEditing) {
      onUpdateNote({ ...activeNote, checklistShortTerm: updated });
    }
  };

  const handleToggleExamPrepCheck = (key: keyof NonNullable<LectureNote['checklistExamPrep']>) => {
    const currentVal = !!(currentNote.checklistExamPrep && currentNote.checklistExamPrep[key]);
    const updated = {
      ...(currentNote.checklistExamPrep || {}),
      [key]: !currentVal,
    };
    const newNoteState = { ...currentNote, checklistExamPrep: updated };
    setCurrentNote(newNoteState);
    if (activeNote && !isEditing) {
      onUpdateNote({ ...activeNote, checklistExamPrep: updated });
    }
  };

  const handleToggleNotionLMCheck = (key: keyof NonNullable<LectureNote['checklistNotionLM']>) => {
    const currentVal = !!(currentNote.checklistNotionLM && currentNote.checklistNotionLM[key]);
    const updated = {
      ...(currentNote.checklistNotionLM || {}),
      [key]: !currentVal,
    };
    const newNoteState = { ...currentNote, checklistNotionLM: updated };
    setCurrentNote(newNoteState);
    if (activeNote && !isEditing) {
      onUpdateNote({ ...activeNote, checklistNotionLM: updated });
    }
  };

  // Helper renderer for dynamic item list sections (like Kernaussagen)
  const renderListSection = (
    title: string,
    icon: React.ReactNode,
    colorTextClass: string,
    field: 'keyTakeaways' | 'connectionsList' | 'openQuestionsList' | 'insightsList' | 'examHintsList',
    inputValue: string,
    setInputValue: (v: string) => void,
    placeholderText: string,
    emptyMessage: string
  ) => {
    const items = (isEditing ? currentNote[field] : activeNote?.[field]) || [];

    return (
      <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${colorTextClass}`}>
            {icon}
            <span>{title}</span>
          </h4>
        </div>

        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-2 p-2 bg-slate-900/80 border border-slate-800/80 rounded-lg text-xs text-slate-200"
            >
              <span className={`font-mono text-[11px] mt-0.5 ${colorTextClass}`}>
                {idx + 1}.
              </span>
              <span className="flex-1 leading-relaxed">
                {renderTextWithWikiLinks(
                  item,
                  wikiDb,
                  wikiHandlers
                )}
              </span>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => handleRemoveListItem(field, idx)}
                  className="text-slate-500 hover:text-red-400 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {items.length === 0 && !isEditing && (
            <p className="text-xs text-slate-500 italic p-2 bg-slate-900/40 rounded-lg">
              {emptyMessage}
            </p>
          )}
        </div>

        {isEditing && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddListItem(field, inputValue, setInputValue))}
              placeholder={placeholderText}
              className="min-w-0 flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
            <button
              type="button"
              onClick={() => handleAddListItem(field, inputValue, setInputValue)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold shrink-0"
            >
              Hinzufügen
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Vorlesungsmitschriften & Protokolle
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Strukturierte Mitschriften, Lernthemen- & Quellenverknüpfung und Nachbereitungs-Checklisten</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setHelpTab('formulas');
              setShowMarkdownHelp(true);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Anleitung zur Benutzung von Formel-Codes (Chemie, Mathematik & Physik) und Markdown öffnen"
          >
            <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
            <span>Formel- &amp; Markdown-Anleitung</span>
          </button>

          <button
            onClick={handleStartNewNote}
            className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-teal-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Neue Mitschrift anlegen</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Notes List Sidebar + Notes Reader/Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
        {/* Sidebar: Notes Navigation */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Notizen durchsuchen..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Module Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveModuleFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap text-[11px] font-medium ${
                activeModuleFilter === 'all'
                  ? 'bg-slate-800 text-teal-400 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              Alle Module
            </button>
            {modules.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveModuleFilter(m.id)}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap text-[11px] font-medium ${
                  activeModuleFilter === m.id
                    ? 'bg-slate-800 text-teal-400 border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {m.code}
              </button>
            ))}
          </div>

          {/* Notes list */}
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[520px] pr-1">
            {filteredNotes.map((note) => {
              const mod = getModule(note.moduleId);
              const isActive = note.id === activeNoteId;

              return (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-slate-800/90 border-teal-500/40 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span
                      style={{ color: mod?.color || '#06b6d4' }}
                      className="font-mono font-semibold"
                    >
                      {mod?.code || mod?.shortName || 'Modul'}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {note.lectureDate}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                    {note.title}
                  </h4>

                  {note.summary && (
                    <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                      {renderTextWithWikiLinks(
                        note.summary,
                        wikiDb,
                        wikiHandlers
                      )}
                    </div>
                  )}

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px] text-slate-400">
                      {note.tags.slice(0, 3).map((t, i) => (
                        <span key={i} className="text-slate-400 font-mono">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredNotes.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-xs">
                Keine Mitschriften gefunden.
              </div>
            )}
          </div>
        </div>

        {/* Note Reader & Editor */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          {activeNote ? (
            <div className="space-y-6">
              {/* 1) TITEL, VERANSTALTUNG, DATUM, MODUL */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1.5 w-full">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span
                      style={{ color: getModule(currentNote.moduleId || activeNote.moduleId)?.color }}
                      className="font-mono font-bold"
                    >
                      {getModule(currentNote.moduleId || activeNote.moduleId)?.code} - {getModule(currentNote.moduleId || activeNote.moduleId)?.shortName}
                    </span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">{currentNote.lectureDate || activeNote.lectureDate}</span>
                  </div>

                  {/* EVENT TYPE CHIPS */}
                  {isEditing && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">
                        Veranstaltungstyp wählen (generiert Titel automatisch):
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {EVENT_TYPES.map((evt) => {
                          const isSel = (currentNote.eventType || 'Vorlesung') === evt;
                          return (
                            <button
                              type="button"
                              key={evt}
                              onClick={() => handleEventTypeChange(evt)}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                                isSel
                                  ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-sm scale-105'
                                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
                              }`}
                            >
                              {evt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TITLE INPUT / HEADING */}
                  {isEditing ? (
                    <div className="pt-2">
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Titel der Mitschrift:
                      </label>
                      <input
                        type="text"
                        value={currentNote.title || ''}
                        onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                        placeholder="Mitschriftentitel..."
                        className="text-base font-bold bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 w-full focus:outline-none focus:border-teal-500"
                      />
                      <div className="pt-2">
                        <label className="text-xs font-semibold text-slate-400 block mb-1">
                          Kurzzusammenfassung (unterstützt [Klammern]):
                        </label>
                        <input
                          type="text"
                          value={currentNote.summary || ''}
                          onChange={(e) => setCurrentNote({ ...currentNote, summary: e.target.value })}
                          placeholder="z.B. Einführung in [Zellbiologie] und [MOD-101]..."
                          className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 w-full focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <h3 className="text-xl font-bold text-slate-100 pt-1">
                        {activeNote.title}
                      </h3>
                      {activeNote.summary && (
                        <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed italic">
                          <span className="not-italic font-bold text-slate-400 mr-1.5">Zusammenfassung:</span>
                          {renderTextWithWikiLinks(
                            activeNote.summary,
                            wikiDb,
                            wikiHandlers
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
                  {/* Switch Auto-Speicherung */}
                  <label 
                    className="flex items-center gap-2 cursor-pointer select-none px-2.5 py-1.5 bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
                    title="Speichert Entwürfe nach kurzer Eingabepause"
                  >
                    <div className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={autoSaveEnabled}
                        onChange={(e) => handleAutoSaveToggle(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-3.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-teal-500"></div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-300 whitespace-nowrap">
                      Auto-Speicherung
                    </span>
                  </label>

                  {isEditing ? (
                    <button
                      onClick={handleSaveNote}
                      className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Speichern</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setCurrentNote({ ...activeNote });
                        setIsEditing(true);
                      }}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Bearbeiten
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteNote(activeNote.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                    title="Mitschrift löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* KERNAUSSAGEN / PRÜFUNGSFOKUS */}
              {renderListSection(
                'Wichtige Kernaussagen & Prüfungsfokus',
                <Sparkles className="w-4 h-4 text-teal-400" />,
                'text-teal-400',
                'keyTakeaways',
                takeawayInput,
                setTakeawayInput,
                'Neue Kernaussage hinzufügen...',
                'Keine Kernaussagen erfasst'
              )}

              {/* MITSCHRIFT (MARKDOWN & WIKILINKS) */}
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                      Mitschrift (Markdown, Formeln &amp; [[WikiLinks]]):
                    </label>

                    {/* WikiLink Quick-Insert Helper Toolbar */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowWikiLinkPicker(!showWikiLinkPicker)}
                        className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                        title="Verknüpfe ein Thema oder Modul im Text"
                      >
                        <Link2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>[[WikiLink einfügen]]</span>
                      </button>

                      {showWikiLinkPicker && (
                        <div className="absolute right-0 top-full mt-1.5 w-72 max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl p-2.5 shadow-2xl z-30 space-y-2">
                          <input
                            type="text"
                            value={wikiLinkSearch}
                            onChange={(e) => setWikiLinkSearch(e.target.value)}
                            placeholder="Thema oder Modul filtern..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500"
                            autoFocus
                          />
                          <div className="text-[10px] text-slate-500 px-1">
                            Klicke auf einen Eintrag, um [[Link]] einzufügen:
                          </div>
                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                            {topics
                              .filter((t) => !wikiLinkSearch || t.title.toLowerCase().includes(wikiLinkSearch.toLowerCase()))
                              .map((top) => (
                                <button
                                  key={top.id}
                                  type="button"
                                  onClick={() => {
                                    const insertion = `[[${top.title}]]`;
                                    setCurrentNote({
                                      ...currentNote,
                                      content: (currentNote.content || '') + ' ' + insertion,
                                    });
                                    setShowWikiLinkPicker(false);
                                    setWikiLinkSearch('');
                                  }}
                                  className="w-full text-left p-1.5 rounded-lg bg-slate-950/70 hover:bg-purple-950/50 hover:text-purple-300 border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between transition-colors"
                                >
                                  <span className="truncate">{top.title}</span>
                                  <span className="text-[10px] text-emerald-400 shrink-0 font-mono">Thema</span>
                                </button>
                              ))}
                            {modules
                              .filter((m) => !wikiLinkSearch || m.name.toLowerCase().includes(wikiLinkSearch.toLowerCase()) || m.code.toLowerCase().includes(wikiLinkSearch.toLowerCase()))
                              .map((mod) => (
                                <button
                                  key={mod.id}
                                  type="button"
                                  onClick={() => {
                                    const insertion = `[[${mod.code}]]`;
                                    setCurrentNote({
                                      ...currentNote,
                                      content: (currentNote.content || '') + ' ' + insertion,
                                    });
                                    setShowWikiLinkPicker(false);
                                    setWikiLinkSearch('');
                                  }}
                                  className="w-full text-left p-1.5 rounded-lg bg-slate-950/70 hover:bg-cyan-950/50 hover:text-cyan-300 border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between transition-colors"
                                >
                                  <span className="truncate">{mod.code} · {mod.shortName || mod.name}</span>
                                  <span className="text-[10px] text-cyan-400 shrink-0 font-mono">Modul</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="p-2 bg-purple-950/20 border border-purple-900/30 rounded-lg text-[11px] text-purple-300/90 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>Tipp: Schreibe <code className="text-purple-200 font-mono font-semibold">[[Thema]]</code> oder <code className="text-purple-200 font-mono font-semibold">[[Modul]]</code> für klickbare Wissensgraph-Kanten.</span>
                    </div>
                    <div className="p-2 bg-teal-950/20 border border-teal-900/30 rounded-lg text-[11px] text-teal-300/90 flex items-center gap-1.5">
                      <FlaskConical className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Markdown &amp; Formeln: <code className="text-teal-200 font-mono font-semibold">##</code> für Überschriften, <code className="text-teal-200 font-mono font-semibold">++fett++</code>, <code className="text-teal-200 font-mono font-semibold">- Liste</code> und <code className="text-teal-200 font-mono font-semibold">($HA \rightarrow H^+ + A^-$)</code> werden formatiert.</span>
                    </div>
                  </div>

                  {/* Schnell-Symbole & Formel-Aktionen */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                        <Calculator className="w-3.5 h-3.5 text-teal-400" />
                        <span>Schnell-Symbole:</span>
                      </span>
                      {['→', '⇄', '↓', '↑', '⁺', '⁻', '²', '³', 'Δ', 'λ', 'μ', '±', '·', '≈', '°C'].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => insertSymbolIntoContent(sym)}
                          className="px-1.5 py-0.5 bg-slate-800/90 hover:bg-teal-900/60 text-teal-200 hover:text-teal-100 border border-slate-700/80 hover:border-teal-500/50 rounded text-xs font-mono transition-colors cursor-pointer"
                          title={`Symbol "${sym}" an Cursorposition einfügen`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConvertCodesInContent}
                        className="px-2.5 py-1 bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 border border-teal-500/40 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Wandelt alle Formel-Codes wie ($HA \rightarrow H^+ + A^-$) in dieser Mitschrift sofort dauerhaft in Klartext um"
                      >
                        <Sparkles className="w-3 h-3 text-teal-400" />
                        <span>Codes in Klartext umwandeln</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHelpTab('formulas');
                          setShowMarkdownHelp(true);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Anleitung zur Benutzung von Markdown und Formel-Codes öffnen"
                      >
                        <FlaskConical className="w-3 h-3 text-teal-400" />
                        <span>Code-Anleitung</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={contentTextareaRef}
                    rows={14}
                    value={currentNote.content || ''}
                    onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
                    placeholder="Schreibe hier Vorlesungsinhalte, Definitionen, Konzepte, Formeln oder Mitschriften... (z.B. ## Überschrift, ++fett++, ($HA \rightarrow H^+ + A^-$) oder [[Thema]])"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-teal-500 resize-y"
                  />

                  {/* Live-Vorschau der Klicklinks, Markdown & Formeln beim Tippen */}
                  {currentNote.content && (
                    <div className="p-3 bg-slate-950/90 rounded-xl border border-teal-500/30 text-xs text-slate-300 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="uppercase font-bold text-teal-400 tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                          <span>Live-Vorschau:</span>
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-lg text-slate-200 leading-relaxed font-sans">
                        {renderTextWithWikiLinks(
                          currentNote.content,
                          wikiDb,
                          wikiHandlers
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Mitschrift:
                    </span>
                  </div>

                  <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-5 rounded-xl border border-slate-800/80 font-sans">
                    {renderTextWithWikiLinks(
                      activeNote.content,
                      wikiDb,
                      wikiHandlers
                    )}
                  </div>

                  {/* Detected WikiLinks and Incoming Backlinks in this Note */}
                  {(() => {
                    const textCorpus = [
                      activeNote.content,
                      activeNote.summary,
                      ...(activeNote.connectionsList || []),
                      ...(activeNote.keyTakeaways || []),
                      ...(activeNote.insightsList || []),
                      ...(activeNote.examHintsList || []),
                      ...(activeNote.openQuestionsList || []),
                    ].join('\n');
                    const matches = extractWikiLinks(textCorpus, { modules, topics, notes, exams });
                    const resolved = matches.map((m) => resolveWikiLink(m.target, m.alias, { modules, topics, notes, exams }));
                    const backlinks = findBacklinks(activeNote.id, 'note', notes, topics, modules, exams);

                    if (resolved.length === 0 && backlinks.length === 0) return null;

                    return (
                      <div className="p-3.5 bg-slate-950/80 border border-purple-500/30 rounded-xl space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 uppercase tracking-wider">
                          <Link2 className="w-3.5 h-3.5 text-purple-400" />
                          <span>Text-Verknüpfungen dieser Mitschrift</span>
                        </div>

                        {resolved.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 font-medium block">
                              Im Text referenzierte Themen &amp; Module ({resolved.length}):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {resolved.map((res, i) => (
                                <WikiLinkBadge
                                  key={`note-ref-${i}`}
                                  resolved={res}
                                  handlers={wikiHandlers}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {backlinks.length > 0 && (
                          <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                            <span className="text-[11px] text-slate-400 font-medium block">
                              Verlinkt von anderen Einträgen (Backlinks):
                            </span>
                            <div className="space-y-1">
                              {backlinks.map((bl, i) => (
                                <div
                                  key={`note-bl-${i}`}
                                  onClick={() => {
                                    if (bl.sourceNote) handleNavigateToNote(bl.sourceNote.id);
                                    else if (bl.sourceTopic && onNavigateToTopic) onNavigateToTopic(bl.sourceTopic.id);
                                  }}
                                  className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-950/30 cursor-pointer transition-colors flex items-center justify-between text-xs"
                                >
                                  <span className="text-slate-200">
                                    {bl.sourceNote ? `Mitschrift: ${bl.sourceNote.title}` : `Thema: ${bl.sourceTopic?.title}`}
                                  </span>
                                  <span className="font-mono text-[11px] text-purple-400 shrink-0 ml-1">
                                    {bl.matchedLink}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ZUSAMMENHÄNGE / OFFENE FRAGEN / ERKENNTNISSE / PRÜFUNGSRELEVANTE HINWEISE */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Strukturierte Analyse & Notizen:
                </span>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Zusammenhänge */}
                  {renderListSection(
                    'Zusammenhänge',
                    <Brain className="w-4 h-4 text-cyan-400" />,
                    'text-cyan-400',
                    'connectionsList',
                    connectionInput,
                    setConnectionInput,
                    'Neuen Zusammenhang hinzufügen...',
                    'Keine Zusammenhänge erfasst'
                  )}

                  {/* Offene Fragen */}
                  {renderListSection(
                    'Offene Fragen',
                    <QuestionIcon className="w-4 h-4 text-amber-400" />,
                    'text-amber-400',
                    'openQuestionsList',
                    questionInput,
                    setQuestionInput,
                    'Neue offene Frage hinzufügen...',
                    'Keine offenen Fragen erfasst'
                  )}

                  {/* Erkenntnisse */}
                  {renderListSection(
                    'Erkenntnisse',
                    <Lightbulb className="w-4 h-4 text-teal-400" />,
                    'text-teal-400',
                    'insightsList',
                    insightInput,
                    setInsightInput,
                    'Neue Erkenntnis hinzufügen...',
                    'Keine Erkenntnisse erfasst'
                  )}

                  {/* Prüfungsrelevante Hinweise */}
                  {renderListSection(
                    'Prüfungsrelevante Hinweise',
                    <FileCheck className="w-4 h-4 text-rose-400" />,
                    'text-rose-400',
                    'examHintsList',
                    examHintInput,
                    setExamHintInput,
                    'Neuen Prüfungs-Hinweis hinzufügen...',
                    'Keine Prüfungs-Hinweise erfasst'
                  )}
                </div>
              </div>

              {/* NACHBEREITUNGS-CHECKLISTEN (AUFKLAPPBAR) */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                  Nachbereitungs-Checklisten:
                </label>

                {/* Panel 1: Nachbereitung - Kurz nach der Veranstaltung */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setOpenChecklistShortTerm(!openChecklistShortTerm)}
                    className="w-full p-3 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-teal-400" />
                      <span>Nachbereitung - Kurz nach der Veranstaltung</span>
                    </div>
                    {openChecklistShortTerm ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {openChecklistShortTerm && (
                    <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'visited', label: 'Veranstaltung besucht' },
                        { key: 'completed', label: 'Mitschrift vervollständigt' },
                        { key: 'questionsIdentified', label: 'Offene Fragen identifiziert' },
                        { key: 'topicsMapped', label: 'Lerninhalte zugeordnet' },
                        { key: 'materialsChecked', label: 'Materialien geprüft' },
                        { key: 'done', label: 'Nachbereitung abgeschlossen' },
                      ].map((item) => {
                        const isChecked = !!(currentNote.checklistShortTerm && currentNote.checklistShortTerm[item.key as keyof NoteChecklistShortTerm]);
                        return (
                          <button
                            type="button"
                            key={item.key}
                            onClick={() => handleToggleShortTermCheck(item.key as any)}
                            className={`p-2 rounded-lg text-left flex items-center gap-2 border transition-all ${
                              isChecked
                                ? 'bg-teal-950/30 border-teal-500/40 text-teal-200 font-semibold'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {isChecked ? <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-600 shrink-0" />}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Panel 2: Nachbereitung - Lernphase */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setOpenChecklistExamPrep(!openChecklistExamPrep)}
                    className="w-full p-3 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                      <span>Nachbereitung - Lernphase</span>
                    </div>
                    {openChecklistExamPrep ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {openChecklistExamPrep && (
                    <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'reviewed', label: 'Mitschrift durchgesehen' },
                        { key: 'questionsCleared', label: 'Offene Fragen geklärt' },
                        { key: 'topicsIdentified', label: 'Relevante Lerninhalte identifiziert' },
                        { key: 'topicsEvaluated', label: 'Lerninhalte bewertet' },
                        { key: 'sourcesLookedUp', label: 'Quellen nachgeschlagen' },
                        { key: 'ankiCandidatesChecked', label: 'Anki-Kandidaten geprüft' },
                      ].map((item) => {
                        const isChecked = !!(currentNote.checklistExamPrep && currentNote.checklistExamPrep[item.key as keyof NoteChecklistExamPrep]);
                        return (
                          <button
                            type="button"
                            key={item.key}
                            onClick={() => handleToggleExamPrepCheck(item.key as any)}
                            className={`p-2 rounded-lg text-left flex items-center gap-2 border transition-all ${
                              isChecked
                                ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200 font-semibold'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {isChecked ? <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-600 shrink-0" />}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Panel 3: Nachbereitung in NotionLM */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setOpenChecklistNotionLM(!openChecklistNotionLM)}
                    className="w-full p-3 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Nachbereitung in NotionLM</span>
                    </div>
                    {openChecklistNotionLM ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {openChecklistNotionLM && (
                    <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      {[
                        { key: 'summaryGenerated', label: 'Übersicht generiert' },
                        { key: 'quizGenerated', label: 'Quizfragen generiert' },
                        { key: 'ankiGenerated', label: 'Anki-Kandidaten erzeugt' },
                      ].map((item) => {
                        const isChecked = !!(currentNote.checklistNotionLM && currentNote.checklistNotionLM[item.key as keyof NoteChecklistNotionLM]);
                        return (
                          <button
                            type="button"
                            key={item.key}
                            onClick={() => handleToggleNotionLMCheck(item.key as any)}
                            className={`p-2 rounded-lg text-left flex items-center gap-2 border transition-all ${
                              isChecked
                                ? 'bg-purple-950/30 border-purple-500/40 text-purple-200 font-semibold'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {isChecked ? <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-600 shrink-0" />}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* VERKNÜPFTE LERNTHEMEN (AUS VORHANDENEN WÄHLEN / NUR BEI BEDARF NEU) */}
              <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Bookmark className="w-4 h-4 text-cyan-400" />
                      <span>Verknüpfte Lernthemen:</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Behandelte Themen aus den vorhandenen Modul-Lernthemen verknüpfen.
                    </p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    {/* 1. Bereits verknüpfte Themen */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Aktuell verknüpft ({(currentNote.linkedTopicIds || []).length}):
                      </span>
                      {(currentNote.linkedTopicIds && currentNote.linkedTopicIds.length > 0) ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {currentNote.linkedTopicIds.map((topId) => {
                            const top = topics.find((t) => t.id === topId);
                            return (
                              <span
                                key={topId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 text-xs rounded-lg font-medium shadow-xs"
                              >
                                <Bookmark className="w-3 h-3 text-cyan-400" />
                                <span>{top ? top.title : topId}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleLinkedTopic(topId)}
                                  className="text-cyan-400 hover:text-red-400 ml-1 p-0.5 rounded transition-colors"
                                  title="Verknüpfung aufheben"
                                >
                                  ✕
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Noch keine Lernthemen verknüpft</span>
                      )}
                    </div>

                    {/* 2. Aus vorhandenen Lernthemen verknüpfen */}
                    {(() => {
                      const noteModId = currentNote.moduleId || activeNote?.moduleId || '';
                      const moduleTopics = topics.filter((t) => !noteModId || t.moduleId === noteModId);
                      const otherTopics = topics.filter((t) => noteModId && t.moduleId !== noteModId);

                      return (
                        <div className="space-y-2 pt-2 border-t border-slate-800/80">
                          {moduleTopics.length > 0 ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-300 block">
                                  Aus vorhandenen Lernthemen des Moduls auswählen:
                                </label>
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleToggleLinkedTopic(e.target.value);
                                    }
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                                >
                                  <option value="">-- Aus vorhandenen Lernthemen wählen zum Verknüpfen --</option>
                                  {moduleTopics.map((t) => {
                                    const isLinked = (currentNote.linkedTopicIds || []).includes(t.id);
                                    return (
                                      <option key={t.id} value={t.id} disabled={isLinked}>
                                        {isLinked ? '✓ ' : ''}{t.title} {isLinked ? '(bereits verknüpft)' : ''}
                                      </option>
                                    );
                                  })}
                                  {otherTopics.length > 0 && (
                                    <optgroup label="Themen anderer Module">
                                      {otherTopics.map((t) => {
                                        const isLinked = (currentNote.linkedTopicIds || []).includes(t.id);
                                        const m = getModule(t.moduleId);
                                        return (
                                          <option key={t.id} value={t.id} disabled={isLinked}>
                                            [{m?.code || 'Modul'}] {t.title} {isLinked ? '(bereits verknüpft)' : ''}
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                  )}
                                </select>
                              </div>

                              {/* Klickbare Schnell-Chips für vorhandene Themen */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">
                                  Schnellauswahl:
                                </span>
                                {moduleTopics.map((topic) => {
                                  const isLinked = (currentNote.linkedTopicIds || []).includes(topic.id);
                                  return (
                                    <button
                                      type="button"
                                      key={topic.id}
                                      onClick={() => handleToggleLinkedTopic(topic.id)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                        isLinked
                                          ? 'bg-cyan-500 text-slate-950 font-bold border border-cyan-400 shadow-sm'
                                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                                      }`}
                                    >
                                      <span>{topic.title}</span>
                                      {isLinked && <Check className="w-3 h-3" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-amber-400/90 bg-amber-950/20 border border-amber-800/40 p-2.5 rounded-lg">
                              Für dieses Modul sind noch keine Lernthemen angelegt. Erstelle unten ein neues Thema.
                            </div>
                          )}

                          {/* 3. Lediglich, wenn nicht vorhanden: Neues Lernthema anlegen */}
                          <div className="pt-2">
                            {!showNewTopicInput && moduleTopics.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setShowNewTopicInput(true)}
                                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 underline-offset-2 hover:underline transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Thema nicht vorhanden? Neues Lernthema erstellen & verknüpfen</span>
                              </button>
                            ) : (
                              <div className="p-3 bg-slate-900/90 rounded-lg border border-cyan-500/30 space-y-2 mt-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Neues Lernthema anlegen (da noch nicht vorhanden):</span>
                                  </label>
                                  {moduleTopics.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowNewTopicInput(false);
                                        setNewTopicTitleInput('');
                                      }}
                                      className="text-slate-400 hover:text-slate-200 text-xs"
                                    >
                                      ✕ Abbrechen
                                    </button>
                                  )}
                                </div>
                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                                  <input
                                    type="text"
                                    value={newTopicTitleInput}
                                    onChange={(e) => setNewTopicTitleInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateAndLinkTopic())}
                                    placeholder="Titel des neuen Lernthemas (z.B. Säure-Base-Titrationen)..."
                                    className="min-w-0 flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCreateAndLinkTopic}
                                    className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-colors shadow-sm"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Erstellen & Verknüpfen</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(activeNote.linkedTopicIds && activeNote.linkedTopicIds.length > 0) ? (
                      activeNote.linkedTopicIds.map((topId) => {
                        const top = topics.find((t) => t.id === topId);
                        return top ? (
                          <span
                            key={topId}
                            className="px-2.5 py-1 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs rounded-lg font-semibold flex items-center gap-1"
                          >
                            <Bookmark className="w-3 h-3" />
                            <span>{top.title}</span>
                          </span>
                        ) : null;
                      })
                    ) : (
                      <span className="text-xs text-slate-500 italic">Keine Lernthemen verknüpft</span>
                    )}
                  </div>
                )}
              </div>

              {/* VERKNÜPFTE QUELLEN / MATERIALIEN (AUS VORHANDENEN WÄHLEN / NUR BEI BEDARF NEU) */}
              <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-teal-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Paperclip className="w-4 h-4 text-teal-400" />
                      <span>Verknüpfte Quellen & Materialien:</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Relevante Skripte, Bücher oder Folien aus den vorhandenen Modul-Materialien verknüpfen.
                    </p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    {/* 1. Bereits verknüpfte Materialien */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Aktuell verknüpft ({(currentNote.linkedMaterialIds || []).length}):
                      </span>
                      {(currentNote.linkedMaterialIds && currentNote.linkedMaterialIds.length > 0) ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {currentNote.linkedMaterialIds.map((matId) => {
                            const mat = materials.find((m) => m.id === matId);
                            return (
                              <span
                                key={matId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-950/80 border border-teal-500/50 text-teal-200 text-xs rounded-lg font-medium shadow-xs"
                              >
                                <Paperclip className="w-3 h-3 text-teal-400" />
                                <span>{mat ? mat.title : matId}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleLinkedMaterial(matId)}
                                  className="text-teal-400 hover:text-red-400 ml-1 p-0.5 rounded transition-colors"
                                  title="Verknüpfung aufheben"
                                >
                                  ✕
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Noch keine Quellen oder Materialien verknüpft</span>
                      )}
                    </div>

                    {/* 2. Aus vorhandenen Materialien verknüpfen */}
                    {(() => {
                      const noteModId = currentNote.moduleId || activeNote?.moduleId || '';
                      const moduleMaterials = materials.filter((m) => !noteModId || m.moduleId === noteModId);
                      const otherMaterials = materials.filter((m) => noteModId && m.moduleId !== noteModId);

                      return (
                        <div className="space-y-2 pt-2 border-t border-slate-800/80">
                          {moduleMaterials.length > 0 ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-300 block">
                                  Aus vorhandenen Materialien des Moduls auswählen:
                                </label>
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleToggleLinkedMaterial(e.target.value);
                                    }
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                                >
                                  <option value="">-- Aus vorhandenen Quellen & Materialien wählen zum Verknüpfen --</option>
                                  {moduleMaterials.map((m) => {
                                    const isLinked = (currentNote.linkedMaterialIds || []).includes(m.id);
                                    return (
                                      <option key={m.id} value={m.id} disabled={isLinked}>
                                        {isLinked ? '✓ ' : ''}[{m.type.toUpperCase()}] {m.title} {isLinked ? '(bereits verknüpft)' : ''}
                                      </option>
                                    );
                                  })}
                                  {otherMaterials.length > 0 && (
                                    <optgroup label="Materialien anderer Module">
                                      {otherMaterials.map((m) => {
                                        const isLinked = (currentNote.linkedMaterialIds || []).includes(m.id);
                                        const mod = getModule(m.moduleId);
                                        return (
                                          <option key={m.id} value={m.id} disabled={isLinked}>
                                            [{mod?.code || 'Modul'}] [{m.type.toUpperCase()}] {m.title} {isLinked ? '(bereits verknüpft)' : ''}
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                  )}
                                </select>
                              </div>

                              {/* Klickbare Schnell-Chips für vorhandene Materialien */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">
                                  Schnellauswahl:
                                </span>
                                {moduleMaterials.map((mat) => {
                                  const isLinked = (currentNote.linkedMaterialIds || []).includes(mat.id);
                                  return (
                                    <button
                                      type="button"
                                      key={mat.id}
                                      onClick={() => handleToggleLinkedMaterial(mat.id)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                        isLinked
                                          ? 'bg-teal-500 text-slate-950 font-bold border border-teal-400 shadow-sm'
                                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                                      }`}
                                    >
                                      <span>{mat.title}</span>
                                      {isLinked && <Check className="w-3 h-3" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-amber-400/90 bg-amber-950/20 border border-amber-800/40 p-2.5 rounded-lg">
                              Für dieses Modul sind noch keine Materialien hinterlegt. Lege unten eine neue Quelle an.
                            </div>
                          )}

                          {/* 3. Lediglich, wenn nicht vorhanden: Neues Material anlegen */}
                          <div className="pt-2">
                            {!showNewMaterialInput && moduleMaterials.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setShowNewMaterialInput(true)}
                                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1.5 underline-offset-2 hover:underline transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Quelle nicht vorhanden? Neues Material anlegen & verknüpfen</span>
                              </button>
                            ) : (
                              <div className="p-3 bg-slate-900/90 rounded-lg border border-teal-500/30 space-y-2 mt-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-teal-300 flex items-center gap-1">
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Neues Material / Quelle anlegen (da noch nicht vorhanden):</span>
                                  </label>
                                  {moduleMaterials.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowNewMaterialInput(false);
                                        setNewMaterialTitleInput('');
                                        setNewMaterialUrlInput('');
                                      }}
                                      className="text-slate-400 hover:text-slate-200 text-xs"
                                    >
                                      ✕ Abbrechen
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={newMaterialTitleInput}
                                    onChange={(e) => setNewMaterialTitleInput(e.target.value)}
                                    placeholder="Quellentitel (z.B. Standardlehrbuch S. 140)..."
                                    className="min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="url"
                                      value={newMaterialUrlInput}
                                      onChange={(e) => setNewMaterialUrlInput(e.target.value)}
                                      placeholder="Optional: URL / Link..."
                                      className="min-w-0 flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleCreateAndLinkMaterial}
                                      className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-colors shadow-sm"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Anlegen</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(activeNote.linkedMaterialIds && activeNote.linkedMaterialIds.length > 0) ? (
                      activeNote.linkedMaterialIds.map((matId) => {
                        const mat = materials.find((m) => m.id === matId);
                        return mat ? (
                          <a
                            key={matId}
                            href={mat.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-teal-950/60 border border-teal-500/40 text-teal-300 text-xs rounded-lg font-semibold flex items-center gap-1 hover:border-teal-400 transition-colors"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{mat.title}</span>
                            {mat.url && <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />}
                          </a>
                        ) : null;
                      })
                    ) : (
                      <span className="text-xs text-slate-500 italic">Keine Materialien verknüpft</span>
                    )}
                  </div>
                )}
              </div>

              {/* TAGS & METADATEN */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Tags & Metadaten:
                </span>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    {(isEditing ? currentNote.tags : activeNote.tags)?.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px] flex items-center gap-1 font-mono font-medium"
                      >
                        <span>{tag}</span>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-red-400 text-slate-400 ml-1"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    ))}
                    {isEditing && (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          placeholder="Tag + Enter..."
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 w-28 focus:outline-none focus:border-teal-500 font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-slate-500">
                    Zuletzt aktualisiert: {new Date(activeNote.updatedAt).toLocaleDateString('de-DE')}
                  </div>
                </div>
              </div>

              {/* UNTERER ABSCHNITT: ZWEITER SPEICHERN-BUTTON & AUTO-SPEICHERUNG */}
              <div className="pt-4 mt-6 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-950/60 -mx-6 -mb-6 p-6 rounded-b-xl">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors">
                    <div className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={autoSaveEnabled}
                        onChange={(e) => handleAutoSaveToggle(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">Auto-Speicherung</span>
                      <span className="text-[10px] text-slate-400">
                        {autoSaveEnabled ? 'Bei Änderungen aktiv' : 'Deaktiviert'}
                      </span>
                    </div>
                  </label>

                  {justAutoSaved && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1.5 rounded-lg animate-pulse font-medium">
                      <Check className="w-3.5 h-3.5" />
                      Automatisch gespeichert ({lastSavedTime})
                    </span>
                  )}
                  {!justAutoSaved && lastSavedTime && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      Zuletzt gespeichert um {lastSavedTime} Uhr
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      className="w-full sm:w-auto px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-500/10 active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Speichern</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNote({ ...activeNote });
                        setIsEditing(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      Bearbeiten
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-12">
              <BookOpen className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm font-medium text-slate-400">Keine Mitschrift ausgewählt</p>
              <p className="text-xs text-slate-600 mt-1">
                Wähle links eine Vorlesung aus oder erstelle eine neue Mitschrift.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FORMEL & MARKDOWN HELP MODAL */}
      {showMarkdownHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-slate-100 font-bold text-base">
                <div className="p-1.5 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <span>Hilfe &amp; Anleitung: Formel-Codes &amp; Markdown</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMarkdownHelp(false)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setHelpTab('formulas')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  helpTab === 'formulas'
                    ? 'bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Formel-Codes (Chemie, Mathe, Physik)</span>
              </button>

              <button
                type="button"
                onClick={() => setHelpTab('markdown')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  helpTab === 'markdown'
                    ? 'bg-teal-500 text-slate-950 shadow-sm shadow-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Markdown &amp; [[WikiLinks]]</span>
              </button>
            </div>

            {/* Tab 1: Formeln (Chemie, Mathe, Physik) */}
            {helpTab === 'formulas' && (
              <div className="space-y-4 text-xs text-slate-300 max-h-[65vh] overflow-y-auto pr-1">
                {/* Einleitung & Delimiter Erklärung */}
                <div className="p-3.5 bg-teal-950/30 rounded-xl border border-teal-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-teal-300 font-bold text-xs uppercase tracking-wider">
                    <Info className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Automatische Formel- &amp; Code-Umwandlung</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    In Mitschriften eingegebene Formel-Codes werden beim Lesen und in der Vorschau automatisch in <strong>sauberen Klartext</strong> mit echten Unicode-Zeichen (z.B. <code className="text-teal-200 font-mono">→</code>, <code className="text-teal-200 font-mono">↓</code>, <code className="text-teal-200 font-mono">H⁺</code>, <code className="text-teal-200 font-mono">H₂O</code>) umgewandelt.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-teal-500/20">
                      <span className="text-teal-400 font-bold block">($Code$)</span>
                      <span className="text-slate-400 text-[10px] font-sans">Eingeklammert im Text:</span>
                      <p className="text-slate-200 mt-1">($HA \rightarrow H^+ + A^-$)</p>
                      <p className="text-teal-300 text-[10px] mt-0.5">→ (HA → H⁺ + A⁻)</p>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-teal-500/20">
                      <span className="text-teal-400 font-bold block">$Code$</span>
                      <span className="text-slate-400 text-[10px] font-sans">Inline-Formel:</span>
                      <p className="text-slate-200 mt-1">$Ag^+ + Cl^- \rightarrow AgCl \downarrow$</p>
                      <p className="text-teal-300 text-[10px] mt-0.5">→ Ag⁺ + Cl⁻ → AgCl ↓</p>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-teal-500/20">
                      <span className="text-slate-400 text-[10px] font-sans">Block-Gleichung:</span>
                      <p className="text-slate-200 mt-1">{"$$\\text{pH} = \\text{p}K_s + \\lg \\frac{[A^-]}{[HA]}$$"}</p>
                      <p className="text-teal-300 text-[10px] mt-0.5">Hervorgehobener Kasten</p>
                    </div>
                  </div>
                </div>

                {/* Interaktiver Live-Formel-Tester */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>Interaktiver Code-Tester (Live-Umwandlung ausprobieren):</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Tippe oder klicke auf Beispiele</span>
                  </div>

                  {/* Schnellbeispiele zum Anklicken */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Säure-Base', code: '($HA \\rightarrow H^+ + A^-)' },
                      { label: 'Niederschlag (Silber)', code: '$Ag^+ + Cl^- \\rightarrow AgCl \\downarrow$' },
                      { label: 'Bleichromat', code: '$Pb^{2+} + CrO_4^{2-} \\rightarrow PbCrO_4 \\downarrow$' },
                      { label: 'Gleichgewicht', code: '$2 H_2O \\rightleftharpoons H_3O^+ + OH^-$' },
                      { label: 'Puffergleichung', code: '$$\\text{pH} = \\text{p}K_s + \\lg \\frac{[A^-]}{[HA]}$$' },
                      { label: 'Einstein E=mc²', code: '$E = m \\cdot c^2$' },
                      { label: 'Wellenlänge', code: '$\\lambda = \\frac{c}{f}$' },
                      { label: 'Temperatur', code: '$T = 25^{\\circ}\\text{C}$' },
                    ].map((ex) => (
                      <button
                        key={ex.label}
                        type="button"
                        onClick={() => setFormulaTesterInput(ex.code)}
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-teal-900/60 text-slate-300 hover:text-teal-200 border border-slate-700 text-[11px] transition-colors cursor-pointer"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={formulaTesterInput}
                    onChange={(e) => setFormulaTesterInput(e.target.value)}
                    placeholder="Formel-Code hier eingeben, z.B. ($HA \rightarrow H^+ + A^-$)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                  />

                  {/* Ergebnis der Umwandlung */}
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">
                        Umgewandelter Klartext:
                      </span>
                      <div className="text-sm font-mono text-teal-200 select-all font-semibold">
                        {convertAllFormulaCodesToReadableText(formulaTesterInput) || formatFormulaToReadableText(formulaTesterInput)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const converted = convertAllFormulaCodesToReadableText(formulaTesterInput) || formatFormulaToReadableText(formulaTesterInput);
                          navigator.clipboard.writeText(converted);
                          setFormulaCopied(true);
                          setTimeout(() => setFormulaCopied(false), 2000);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {formulaCopied ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{formulaCopied ? 'Kopiert!' : 'Kopieren'}</span>
                      </button>

                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            const converted = convertAllFormulaCodesToReadableText(formulaTesterInput) || formatFormulaToReadableText(formulaTesterInput);
                            insertSymbolIntoContent(converted);
                            setShowMarkdownHelp(false);
                          }}
                          className="px-2.5 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer"
                        >
                          In Notiz einfügen
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kategorisierte Anleitungen */}
                {FORMULA_GUIDE_DATA.map((section) => (
                  <div key={section.title} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                        <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
                        <span>{section.title}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans">{section.description}</span>
                    </div>

                    <div className="divide-y divide-slate-800/60">
                      {section.items.map((item, idx) => (
                        <div key={idx} className="py-2 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                          <div className="md:col-span-5 font-mono text-[11px] text-teal-400 bg-slate-900/60 px-2 py-1 rounded border border-slate-800 select-all">
                            {item.code}
                          </div>
                          <div className="md:col-span-1 text-center font-bold text-slate-500 hidden md:block">
                            →
                          </div>
                          <div className="md:col-span-6 flex flex-col">
                            <span className="font-mono text-[11px] font-bold text-teal-200 select-all">
                              {item.rendered}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">
                              {item.description}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Markdown & WikiLinks */}
            {helpTab === 'markdown' && (
              <div className="space-y-3 text-xs text-slate-300 max-h-[65vh] overflow-y-auto pr-1">
                <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-500/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                    <Link2 className="w-4 h-4 text-purple-400" />
                    <span>[[WikiLinks]] &amp; Wissensvernetzung</span>
                  </div>
                  <div className="font-mono text-purple-300">
                    <span>[[Name des Themas]]</span>
                    <p className="text-slate-300 text-[11px] font-sans mt-0.5">
                      Erstellt einen klickbaren Link zum Thema und spannt automatisch eine violette Kante im Wissensgraphen!
                    </p>
                  </div>
                  <div className="font-mono text-purple-300">
                    <span>[[Thema|Eigener Anzeigetext]]</span>
                    <p className="text-slate-300 text-[11px] font-sans mt-0.5">
                      Verlinkt das Thema mit einem alternativen Kurz- oder Anzeigetext (Alias).
                    </p>
                  </div>
                  <div className="font-mono text-purple-300">
                    <span>[[Modulkürzel]] (z.B. [[MOD-101]])</span>
                    <p className="text-slate-300 text-[11px] font-sans mt-0.5">
                      Verlinkt direkt auf das Eltern-Modul.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono">
                  <div>
                    <span className="text-teal-400 font-bold"># Überschrift 1</span>
                    <p className="text-slate-400 text-[11px] font-sans">Großer Hauptabschnitt (mit Trennlinie)</p>
                  </div>
                  <div>
                    <span className="text-teal-400 font-bold">## Überschrift 2</span>
                    <p className="text-slate-400 text-[11px] font-sans">Unterabschnitt (farblich akzentuiert)</p>
                  </div>
                  <div>
                    <span className="text-teal-400 font-bold">### Überschrift 3</span>
                    <p className="text-slate-400 text-[11px] font-sans">Themen-Unterpunkt</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono">
                  <div>
                    <span className="text-teal-400">++Fetter Text++</span>
                    <span className="text-slate-400 text-[11px] font-sans ml-2">→ ++Wichtig++</span>
                  </div>
                  <div>
                    <span className="text-teal-400">*Kursiver Text*</span>
                    <span className="text-slate-400 text-[11px] font-sans ml-2">→ *Lateinische Fachbegriffe*</span>
                  </div>
                  <div>
                    <span className="text-teal-400">~~Durchgestrichen~~</span>
                    <span className="text-slate-400 text-[11px] font-sans ml-2">→ ~~Veraltete Annahme~~</span>
                  </div>
                  <div>
                    <span className="text-teal-400">`inline code`</span>
                    <span className="text-slate-400 text-[11px] font-sans ml-2">→ Monospace-Box</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono">
                  <div>
                    <span className="text-teal-400">- Stichpunkt</span>
                    <p className="text-slate-400 text-[11px] font-sans">Aufzählungsliste mit Teal-Bullet</p>
                  </div>
                  <div>
                    <span className="text-teal-400">1. Erster Punkt</span>
                    <p className="text-slate-400 text-[11px] font-sans">Nummerierte Ablaufliste</p>
                  </div>
                  <div>
                    <span className="text-teal-400">- [ ] Offen / - [x] Erledigt</span>
                    <p className="text-slate-400 text-[11px] font-sans">Aufgabenliste mit Checkboxen</p>
                  </div>
                  <div>
                    <span className="text-teal-400">&gt; Merksatz / Zitat</span>
                    <p className="text-slate-400 text-[11px] font-sans">Hervorgehobener Blockquote-Kasten</p>
                  </div>
                  <div>
                    <span className="text-teal-400">| Spalte 1 | Spalte 2 |</span>
                    <p className="text-slate-400 text-[11px] font-sans">Formatierte Tabellen mit Header</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMarkdownHelp(false)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
