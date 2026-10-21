import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Award, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  Check, 
  Sparkles,
  BookOpen,
  Search,
  X,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Exam, DeadlineItem, Module, LearningTopic, ExamType, ExamStatus } from '../types';

interface ExamsAndDeadlinesProps {
  exams: Exam[];
  deadlines: DeadlineItem[];
  modules: Module[];
  topics: LearningTopic[];
  onAddExam: (exam: Exam) => void;
  onUpdateExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
  onAddDeadline: (deadline: DeadlineItem) => void;
  onUpdateDeadline: (deadline: DeadlineItem) => void;
  onDeleteDeadline: (id: string) => void;
  onAddTopic?: (topic: LearningTopic) => void;
  selectedExamId?: string;
  ectsScoringMode?: 'modules' | 'exams' | 'both';
}

export const ExamsAndDeadlines: React.FC<ExamsAndDeadlinesProps> = ({
  exams,
  deadlines,
  modules,
  topics,
  selectedExamId,
  ectsScoringMode = 'modules',
  onAddExam,
  onUpdateExam,
  onDeleteExam,
  onAddDeadline,
  onUpdateDeadline,
  onDeleteDeadline,
  onAddTopic,
}) => {
  const [activeTab, setActiveTab] = useState<'exams' | 'deadlines'>('exams');
  const [showExamModal, setShowExamModal] = useState<boolean>(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState<boolean>(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<DeadlineItem | null>(null);

  // Automatically open exam modal when navigated to via WikiLink
  useEffect(() => {
    if (selectedExamId) {
      setActiveTab('exams');
      const found = exams.find((e) => e.id === selectedExamId);
      if (found) {
        setEditingExam(found);
        setShowExamModal(true);
      }
    }
  }, [selectedExamId, exams]);

  // Autocomplete & Search state for linking topics in the Exam Modal
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);
  const topicInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        topicInputRef.current &&
        !topicInputRef.current.contains(e.target as Node)
      ) {
        setShowTopicSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const PREDEFINED_EXAM_TYPES = [
    'Schriftliche Prüfung',
    '(Modul-) Abschlussklausur',
    'Zwischenklausur',
    'Benotete Übung',
    'Mündliche Prüfung',
    'Kolloquium',
    'Vortrag',
    'Praktische Leistung',
    'Protokoll',
    'Fallstudie',
    'Bericht',
  ];

  const [isCustomExamType, setIsCustomExamType] = useState(false);
  const [customExamTypeInput, setCustomExamTypeInput] = useState('');

  // Exam Form
  const [examForm, setExamForm] = useState<Partial<Exam>>({
    title: '',
    moduleId: modules[0]?.id || '',
    type: 'Schriftliche Prüfung',
    date: new Date(Date.now() + 86400000 * 20).toISOString().split('T')[0],
    time: '10:00',
    room: 'Hörsaal A101',
    registrationDeadline: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
    targetGrade: '1.7',
    actualGrade: '',
    status: 'vorbereitung',
    weightEcts: 5,
    linkedTopicIds: [],
    notes: '',
  });

  // Deadline Form
  const [deadlineForm, setDeadlineForm] = useState<Partial<DeadlineItem>>({
    title: '',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    dueTime: '12:00',
    moduleId: modules[0]?.id || '',
    type: 'abgabe',
    priority: 'dringend',
    details: '',
  });

  const getModule = (modId?: string) => modules.find((m) => m.id === modId);

  const calculateDaysRemaining = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleOpenAddExam = () => {
    setEditingExam(null);
    setIsCustomExamType(false);
    setCustomExamTypeInput('');
    setTopicSearchQuery('');
    setShowTopicSuggestions(false);
    setExamForm({
      title: '',
      moduleId: modules[0]?.id || '',
      type: 'Schriftliche Prüfung',
      date: new Date(Date.now() + 86400000 * 20).toISOString().split('T')[0],
      time: '10:00',
      room: 'Hörsaal Liebig C101',
      registrationDeadline: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
      targetGrade: '1.7',
      actualGrade: '',
      status: 'vorbereitung',
      weightEcts: 5,
      linkedTopicIds: [],
      notes: '',
    });
    setShowExamModal(true);
  };

  const handleOpenEditExam = (ex: Exam) => {
    setEditingExam(ex);
    const isPreset = PREDEFINED_EXAM_TYPES.includes(ex.type);
    setIsCustomExamType(!isPreset);
    if (!isPreset) setCustomExamTypeInput(ex.type);
    setTopicSearchQuery('');
    setShowTopicSuggestions(false);
    setExamForm({ ...ex });
    setShowExamModal(true);
  };

  // Currently linked topic objects for the active exam form
  const currentlyLinkedTopics = useMemo(() => {
    const ids = examForm.linkedTopicIds || [];
    return ids
      .map((id) => topics.find((t) => t.id === id))
      .filter(Boolean) as LearningTopic[];
  }, [examForm.linkedTopicIds, topics]);

  // Filtered topic suggestions based on user search query
  const topicSuggestions = useMemo(() => {
    const query = topicSearchQuery.trim().toLowerCase();
    const currentLinkedIds = new Set(examForm.linkedTopicIds || []);

    // Exclude topics that are already linked
    const unlinked = topics.filter((t) => !currentLinkedIds.has(t.id));

    if (!query) {
      // If query is empty, show topics for current module first, then others
      const forCurrentModule = unlinked.filter((t) => t.moduleId === examForm.moduleId);
      const otherModules = unlinked.filter((t) => t.moduleId !== examForm.moduleId);
      return [...forCurrentModule, ...otherModules].slice(0, 8);
    }

    // Matching query against title, description, formulas
    const matched = unlinked.filter((t) => {
      const inTitle = t.title.toLowerCase().includes(query);
      const inDesc = t.description?.toLowerCase().includes(query);
      const inFormulas = t.keyFormulas?.some((f) => f.toLowerCase().includes(query));
      return inTitle || inDesc || inFormulas;
    });

    return matched.sort((a, b) => {
      const aIsCurrent = a.moduleId === examForm.moduleId ? 1 : 0;
      const bIsCurrent = b.moduleId === examForm.moduleId ? 1 : 0;
      if (aIsCurrent !== bIsCurrent) return bIsCurrent - aIsCurrent;

      const aStarts = a.title.toLowerCase().startsWith(query) ? 1 : 0;
      const bStarts = b.title.toLowerCase().startsWith(query) ? 1 : 0;
      return bStarts - aStarts;
    }).slice(0, 10);
  }, [topics, topicSearchQuery, examForm.linkedTopicIds, examForm.moduleId]);

  // Check if search query matches an existing topic exactly
  const isExactExistingTopic = useMemo(() => {
    const query = topicSearchQuery.trim().toLowerCase();
    if (!query) return false;
    return topics.some((t) => t.title.toLowerCase() === query);
  }, [topics, topicSearchQuery]);

  const handleLinkTopic = (topicId: string) => {
    const curr = examForm.linkedTopicIds || [];
    if (!curr.includes(topicId)) {
      setExamForm({
        ...examForm,
        linkedTopicIds: [...curr, topicId],
      });
    }
    setTopicSearchQuery('');
    setShowTopicSuggestions(false);
  };

  const handleUnlinkTopic = (topicId: string) => {
    const curr = examForm.linkedTopicIds || [];
    setExamForm({
      ...examForm,
      linkedTopicIds: curr.filter((id) => id !== topicId),
    });
  };

  const handleCreateAndLinkTopic = (title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    // Check if it already exists
    const existing = topics.find((t) => t.title.toLowerCase() === trimmedTitle.toLowerCase());
    if (existing) {
      handleLinkTopic(existing.id);
      return;
    }

    const newTopicId = `topic-${Date.now()}`;
    const newTopic: LearningTopic = {
      id: newTopicId,
      moduleId: examForm.moduleId || modules[0]?.id || '',
      title: trimmedTitle,
      description: `Erfasst für Prüfung/Testat „${examForm.title || 'Prüfung'}“.`,
      keyFormulas: [],
      understanding: 'Nicht verstanden',
      recallConfidence: 'noch nicht geprüft',
      relevance: '⭐ Normal',
      difficulty: 'mittel',
      relatedTopicIds: [],
      nextReviewDate: new Date().toISOString().split('T')[0],
    };


    if (onAddTopic) {
      onAddTopic(newTopic);
    }
    handleLinkTopic(newTopicId);
  };

  const renderHighlightedMatch = (text: string, query: string) => {
    if (!query) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const idx = lowerText.indexOf(lowerQuery);
    if (idx === -1) return text;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);

    return (
      <>
        {before}
        <span className="bg-amber-500/25 text-amber-200 font-semibold px-0.5 rounded">
          {match}
        </span>
        {after}
      </>
    );
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.title || !examForm.moduleId) return;

    if (editingExam) {
      onUpdateExam({
        ...editingExam,
        title: examForm.title || '',
        moduleId: examForm.moduleId || '',
        type: examForm.type || 'klausur',
        date: examForm.date || '',
        time: examForm.time || '10:00',
        room: examForm.room || '',
        registrationDeadline: examForm.registrationDeadline,
        targetGrade: examForm.targetGrade,
        actualGrade: examForm.actualGrade,
        status: examForm.status || 'vorbereitung',
        weightEcts: Math.max(0, Number(examForm.weightEcts) || 0),
        linkedTopicIds: examForm.linkedTopicIds || [],
        notes: examForm.notes || '',
      });
    } else {
      const newEx: Exam = {
        id: `exam-${Date.now()}`,
        title: examForm.title || '',
        moduleId: examForm.moduleId || '',
        type: examForm.type || 'klausur',
        date: examForm.date || '',
        time: examForm.time || '10:00',
        room: examForm.room || '',
        registrationDeadline: examForm.registrationDeadline,
        targetGrade: examForm.targetGrade,
        actualGrade: examForm.actualGrade,
        status: examForm.status || 'vorbereitung',
        weightEcts: Math.max(0, Number(examForm.weightEcts) || 0),
        linkedTopicIds: examForm.linkedTopicIds || [],
        notes: examForm.notes || '',
      };
      onAddExam(newEx);
    }
    setShowExamModal(false);
  };

  const handleMarkStatus = (exam: Exam, status: ExamStatus) => {
    if (status === 'bestanden') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
    onUpdateExam({
      ...exam,
      status,
    });
  };

  const handleSaveDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadlineForm.title) return;

    if (editingDeadline) {
      onUpdateDeadline({
        ...editingDeadline,
        title: deadlineForm.title || '',
        dueDate: deadlineForm.dueDate || '',
        dueTime: deadlineForm.dueTime || '12:00',
        moduleId: deadlineForm.moduleId,
        type: deadlineForm.type || 'abgabe',
        priority: deadlineForm.priority || 'mittel',
        details: deadlineForm.details || '',
      });
    } else {
      const newDl: DeadlineItem = {
        id: `dl-${Date.now()}`,
        title: deadlineForm.title || '',
        dueDate: deadlineForm.dueDate || '',
        dueTime: deadlineForm.dueTime || '12:00',
        moduleId: deadlineForm.moduleId,
        type: deadlineForm.type || 'abgabe',
        priority: deadlineForm.priority || 'mittel',
        isCompleted: false,
        details: deadlineForm.details || '',
      };
      onAddDeadline(newDl);
    }
    setShowDeadlineModal(false);
  };

  const toggleDeadlineDone = (dl: DeadlineItem) => {
    onUpdateDeadline({
      ...dl,
      isCompleted: !dl.isCompleted,
    });
  };

  const examTypeLabels: Record<ExamType, string> = {
    klausur: 'Schriftliche Klausur',
    muendlich: 'Mündliche Prüfung',
    testat: 'Praktikumstestat',
    praktikumsschein: 'Praktikumsschein',
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100">
              Prüfungs- & Fristenverwaltung
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>·</span>
              <span className="font-mono tabular-nums text-amber-400 font-medium">
                {exams.filter((e) => e.status !== 'bestanden' && e.status !== 'nicht_bestanden').length} anstehende Prüfungen
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'exams' ? (
            <button
              onClick={handleOpenAddExam}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-amber-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Prüfung anlegen</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingDeadline(null);
                setDeadlineForm({
                  title: '',
                  dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
                  dueTime: '12:00',
                  moduleId: modules[0]?.id || '',
                  type: 'abgabe',
                  priority: 'dringend',
                  details: '',
                });
                setShowDeadlineModal(true);
              }}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-teal-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Frist eintragen</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'exams'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Prüfungen & Testate ({exams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('deadlines')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'deadlines'
              ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Fristen & Abgaben ({deadlines.length})</span>
        </button>
      </div>

      {/* EXAMS VIEW */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {exams.map((exam) => {
              const mod = getModule(exam.moduleId);
              const daysLeft = calculateDaysRemaining(exam.date);
              const regDaysLeft = exam.registrationDeadline
                ? calculateDaysRemaining(exam.registrationDeadline)
                : null;
              const isPassed = exam.status === 'bestanden';

              const linkedTopics = topics.filter((t) =>
                exam.linkedTopicIds?.includes(t.id)
              );

              return (
                <div
                  key={exam.id}
                  className={`bg-slate-900 border rounded-xl p-5 shadow-lg flex flex-col justify-between transition-all min-w-0 overflow-hidden ${
                    exam.status === 'bestanden'
                      ? 'border-emerald-500/40 bg-emerald-950/10'
                      : exam.status === 'nicht_bestanden'
                      ? 'border-rose-500/40 bg-rose-950/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between text-xs">
                      <span
                        style={{ color: mod?.color || '#06b6d4' }}
                        className="font-mono font-semibold"
                      >
                        {mod?.shortName}
                      </span>
                      <span className="font-mono tabular-nums text-slate-400">
                        {exam.weightEcts} ECTS
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 leading-snug break-words">
                      {exam.title}
                    </h3>

                    {/* Countdown and Date Box */}
                    <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="font-mono font-semibold">{exam.date}</span>
                          <span className="text-slate-500">um {exam.time} Uhr</span>
                        </div>

                        {exam.status !== 'bestanden' && exam.status !== 'nicht_bestanden' && (
                          <span
                            className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                              daysLeft <= 7
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            }`}
                          >
                            {daysLeft > 0
                              ? `In ${daysLeft} Tagen`
                              : daysLeft === 0
                              ? 'HEUTE!'
                              : 'Bereits vorbei'}
                          </span>
                        )}
                        {exam.status === 'bestanden' && (
                          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" /> Bestanden {exam.actualGrade ? `(${exam.actualGrade})` : ''}
                          </span>
                        )}
                        {exam.status === 'nicht_bestanden' && (
                          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 shrink-0">
                            Nicht bestanden
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">Raum: {exam.room || 'Wird bekanntgegeben'}</span>
                      </div>

                      {exam.registrationDeadline && exam.status !== 'bestanden' && exam.status !== 'nicht_bestanden' && (
                        <div className="pt-1 border-t border-slate-800 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                          <span className="text-slate-500">Anmeldefrist:</span>
                          <span
                            className={`font-mono ${
                              regDaysLeft !== null && regDaysLeft <= 5
                                ? 'text-red-400 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            bis {exam.registrationDeadline}{' '}
                            {regDaysLeft !== null && regDaysLeft >= 0
                              ? `(noch ${regDaysLeft} Tage)`
                              : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Linked Topics Checklist */}
                    {linkedTopics.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-teal-400 shrink-0" />
                          Prüfungsrelevante Themen ({linkedTopics.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {linkedTopics.map((top) => (
                            <span
                              key={top.id}
                              className="text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 truncate max-w-[200px]"
                            >
                              {top.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {exam.notes && (
                      <p className="text-xs text-slate-400 italic break-words">
                        „{exam.notes}“
                      </p>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {exam.status !== 'bestanden' && (
                        <button
                          onClick={() => handleMarkStatus(exam, 'bestanden')}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Bestanden</span>
                        </button>
                      )}
                      {exam.status !== 'nicht_bestanden' && (
                        <button
                          onClick={() => handleMarkStatus(exam, 'nicht_bestanden')}
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md text-[11px] font-semibold transition-colors"
                        >
                          <span>Nicht bestanden</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => handleOpenEditExam(exam)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteExam(exam.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DEADLINES VIEW */}
      {activeTab === 'deadlines' && (
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800 overflow-hidden shadow-lg">
            {[...deadlines, ...exams
              .filter((e) => e.registrationDeadline && e.status !== 'bestanden' && e.status !== 'nicht_bestanden')
              .map((e) => ({
                id: `reg-dl-${e.id}`,
                title: `Anmeldefrist: ${e.title}`,
                dueDate: e.registrationDeadline!,
                moduleId: e.moduleId,
                type: 'anmeldung' as const,
                isCompleted: false,
                priority: 'dringend' as const,
                details: `Anmeldung für: ${e.title} (${e.date})`
              }))
            ]
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .map((dl) => {
              const mod = getModule(dl.moduleId);
              const daysLeft = calculateDaysRemaining(dl.dueDate);

              return (
                <div
                  key={dl.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors ${
                    dl.isCompleted ? 'bg-slate-950/40 opacity-70' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => !dl.id.startsWith('reg-dl-') && toggleDeadlineDone(dl as DeadlineItem)}
                      disabled={dl.id.startsWith('reg-dl-')}
                      className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        dl.isCompleted
                          ? 'bg-teal-500 border-teal-500 text-slate-950'
                          : dl.id.startsWith('reg-dl-')
                          ? 'border-slate-800 bg-slate-900/50 cursor-not-allowed'
                          : 'border-slate-700 hover:border-teal-500 bg-slate-950'
                      }`}
                    >
                      {dl.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {mod && (
                          <span
                            style={{ color: mod.color }}
                            className="text-[11px] font-mono font-semibold shrink-0"
                          >
                            {mod.code}
                          </span>
                        )}
                        {dl.type === 'anmeldung' && (
                          <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Anmeldung
                          </span>
                        )}
                        <span
                          className={`text-xs font-semibold text-slate-100 break-words ${
                            dl.isCompleted ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {dl.title}
                        </span>
                      </div>

                      {dl.details && (
                        <p className="text-xs text-slate-400 break-words">{dl.details}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 ml-8 sm:ml-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-mono tabular-nums text-slate-300">
                        {dl.dueDate} {'dueTime' in dl && dl.dueTime ? `(${dl.dueTime} Uhr)` : ''}
                      </div>
                      {!dl.isCompleted && (
                        <span
                          className={`text-[10px] font-mono block ${
                            daysLeft <= 3
                              ? 'text-red-400 font-semibold'
                              : daysLeft <= 7
                              ? 'text-amber-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {daysLeft > 0
                            ? `noch ${daysLeft} Tage`
                            : daysLeft === 0
                            ? 'Heute fällig!'
                            : 'Frist abgelaufen'}
                        </span>
                      )}
                    </div>

                    {!dl.id.startsWith('reg-dl-') && (
                      <button
                        onClick={() => onDeleteDeadline(dl.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Exam Modal */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                {editingExam ? 'Prüfung bearbeiten' : 'Neue Prüfung / Testat erfassen'}
              </h3>
              <button
                onClick={() => setShowExamModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Modul-Zuordnung *
                </label>
                <select
                  value={examForm.moduleId}
                  onChange={(e) => setExamForm({ ...examForm, moduleId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Prüfungstitel *
                </label>
                <input
                  type="text"
                  required
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  placeholder="z.B. Abschlussklausur Anorganische Chemie I"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Prüfungsart
                  </label>
                  <select
                    value={isCustomExamType ? '__custom__' : (examForm.type || 'Schriftliche Prüfung')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setIsCustomExamType(true);
                        setCustomExamTypeInput('');
                      } else {
                        setIsCustomExamType(false);
                        setExamForm({ ...examForm, type: val as ExamType });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {PREDEFINED_EXAM_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="__custom__">[Eigene Prüfungsart anlegen]</option>
                  </select>
                  {isCustomExamType && (
                    <input
                      type="text"
                      required
                      value={customExamTypeInput}
                      onChange={(e) => {
                        setCustomExamTypeInput(e.target.value);
                        setExamForm({ ...examForm, type: e.target.value as ExamType });
                      }}
                      placeholder="Eigene Prüfungsart eingeben..."
                      className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">
                      ECTS-Gewichtung
                    </label>
                    {ectsScoringMode === 'modules' && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        (Ausgegraut: nur Module)
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    disabled={ectsScoringMode === 'modules'}
                    value={ectsScoringMode === 'modules' ? 0 : examForm.weightEcts}
                    onChange={(e) => setExamForm({ ...examForm, weightEcts: Math.max(0, Number(e.target.value)) })}
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      ectsScoringMode === 'modules'
                        ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500'
                    }`}
                  />
                  {ectsScoringMode === 'modules' && (
                    <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                      Laut Studiengang-Einstellung werden ECTS ausschließlich auf Modulebene vergeben.
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Prüfungsdatum
                  </label>
                  <input
                    type="date"
                    required
                    value={examForm.date}
                    onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Uhrzeit
                  </label>
                  <input
                    type="time"
                    value={examForm.time}
                    onChange={(e) => setExamForm({ ...examForm, time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Raum / Prüfungsort
                  </label>
                  <input
                    type="text"
                    value={examForm.room}
                    onChange={(e) => setExamForm({ ...examForm, room: e.target.value })}
                    placeholder="Hörsaal A101"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Anmeldefrist (Deadline)
                  </label>
                  <input
                    type="date"
                    value={examForm.registrationDeadline}
                    onChange={(e) => setExamForm({ ...examForm, registrationDeadline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Status
                  </label>
                  <select
                    value={examForm.status || 'vorbereitung'}
                    onChange={(e) => setExamForm({ ...examForm, status: e.target.value as ExamStatus })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="geplant">Geplant</option>
                    <option value="vorbereitung">In Vorbereitung</option>
                    <option value="bestanden">Bestanden</option>
                    <option value="nicht_bestanden">Nicht bestanden</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Erzielte Note (optional)
                  </label>
                  <input
                    type="text"
                    value={examForm.actualGrade || ''}
                    onChange={(e) => setExamForm({ ...examForm, actualGrade: e.target.value })}
                    placeholder="z.B. 1.3"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Relevante Lerninhalte verknüpfen</span>
                    {currentlyLinkedTopics.length > 0 && (
                      <span className="font-mono text-[10px] text-amber-400 font-bold px-1.5 py-0.2 bg-amber-500/10 border border-amber-500/20 rounded">
                        {currentlyLinkedTopics.length}
                      </span>
                    )}
                  </label>
                  {currentlyLinkedTopics.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExamForm({ ...examForm, linkedTopicIds: [] })}
                      className="text-[10px] text-slate-400 hover:text-red-400 transition-colors"
                    >
                      Alle entfernen
                    </button>
                  )}
                </div>

                {/* Currently linked topics as interactive removable chips */}
                {currentlyLinkedTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950/80 border border-slate-800 rounded-lg max-h-28 overflow-y-auto">
                    {currentlyLinkedTopics.map((top) => {
                      const mod = getModule(top.moduleId);
                      return (
                        <span
                          key={top.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-900 border border-slate-700/80 text-slate-200 shadow-sm"
                        >
                          <span
                            style={{ color: mod?.color || '#06b6d4' }}
                            className="text-[10px] font-mono font-semibold"
                          >
                            {mod?.code || 'MOD'}
                          </span>
                          <span className="truncate max-w-[200px]" title={top.title}>
                            {top.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnlinkTopic(top.id)}
                            className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                            title="Lerninhalt entfernen"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Freely writable input line with live suggestions dropdown */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                    <input
                      ref={topicInputRef}
                      type="text"
                      value={topicSearchQuery}
                      onChange={(e) => {
                        setTopicSearchQuery(e.target.value);
                        setShowTopicSuggestions(true);
                      }}
                      onFocus={() => setShowTopicSuggestions(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (topicSuggestions.length > 0) {
                            handleLinkTopic(topicSuggestions[0].id);
                          } else if (topicSearchQuery.trim()) {
                            handleCreateAndLinkTopic(topicSearchQuery);
                          }
                        } else if (e.key === 'Escape') {
                          setShowTopicSuggestions(false);
                        }
                      }}
                      placeholder="Lerninhalt eintippen oder suchen (Vorschläge werden live angezeigt)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    {topicSearchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTopicSearchQuery('');
                          topicInputRef.current?.focus();
                        }}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-200 p-0.5"
                        title="Eingabe löschen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {showTopicSuggestions && (
                    <div
                      ref={suggestionsRef}
                      className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-800/80 animate-in fade-in slide-in-from-top-1 duration-150 scrollbar-thin"
                    >
                      {/* Dropdown Header */}
                      <div className="px-3 py-1.5 bg-slate-950 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>
                          {topicSearchQuery
                            ? `Passende Vorschläge (${topicSuggestions.length})`
                            : `Vorschläge für ${getModule(examForm.moduleId)?.shortName || 'dieses Fach'}`}
                        </span>
                        <span className="text-slate-500 font-mono text-[9px] lowercase">
                          Klick zum Verknüpfen
                        </span>
                      </div>

                      {/* Suggestions list */}
                      {topicSuggestions.map((topic) => {
                        const mod = getModule(topic.moduleId);
                        const isCurrentMod = topic.moduleId === examForm.moduleId;
                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => handleLinkTopic(topic.id)}
                            className="w-full p-2.5 text-left hover:bg-slate-800/80 flex items-start justify-between gap-2 transition-colors group"
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  style={{ color: mod?.color || '#06b6d4' }}
                                  className="text-[10px] font-mono font-semibold"
                                >
                                  {mod?.code || 'MOD'}
                                </span>
                                <span className="text-xs font-semibold text-slate-100 group-hover:text-amber-300 transition-colors truncate">
                                  {renderHighlightedMatch(topic.title, topicSearchQuery)}
                                </span>
                                {isCurrentMod && (
                                  <span className="text-[9px] px-1 py-0.2 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded font-medium">
                                    Modulstoff
                                  </span>
                                )}
                              </div>
                              {topic.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-1">
                                  {topic.description}
                                </p>
                              )}
                              {topic.keyFormulas && topic.keyFormulas.length > 0 && (
                                <p className="text-[10px] font-mono text-teal-300/80 truncate">
                                  {topic.keyFormulas[0]}
                                </p>
                              )}
                            </div>
                            <span className="px-2 py-0.5 bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300 text-[10px] font-semibold rounded shrink-0 transition-colors">
                              + Verknüpfen
                            </span>
                          </button>
                        );
                      })}

                      {/* Option to create a new custom topic if typed query doesn't exactly match */}
                      {topicSearchQuery.trim() && !isExactExistingTopic && (
                        <button
                          type="button"
                          onClick={() => handleCreateAndLinkTopic(topicSearchQuery)}
                          className="w-full p-2.5 text-left bg-amber-500/5 hover:bg-amber-500/15 border-t border-amber-500/20 text-xs font-medium text-amber-300 flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Plus className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                            <span className="truncate">
                              Als neues Lernthema <strong className="text-white">„{topicSearchQuery.trim()}“</strong> anlegen & verknüpfen
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-bold rounded shrink-0">
                            Neu anlegen
                          </span>
                        </button>
                      )}

                      {topicSuggestions.length === 0 && !topicSearchQuery.trim() && (
                        <div className="p-4 text-center text-xs text-slate-500 italic">
                          Alle Lerninhalte dieses Moduls sind bereits verknüpft oder keine Themen erfasst. Tippe einfach einen Begriff ein.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold shadow-sm"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Deadline Modal */}
      {showDeadlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                Frist / Abgabetermin eintragen
              </h3>
              <button
                onClick={() => setShowDeadlineModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDeadline} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Bezeichnung der Frist *
                </label>
                <input
                  type="text"
                  required
                  value={deadlineForm.title}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, title: e.target.value })}
                  placeholder="z.B. Abgabe Praktikumsprotokoll 2 (Salzsäuregruppe)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Zugehöriges Modul (optional)
                </label>
                <select
                  value={deadlineForm.moduleId}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, moduleId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="">Kein spezifisches Modul</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.shortName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Fälligkeitsdatum *
                  </label>
                  <input
                    type="date"
                    required
                    value={deadlineForm.dueDate}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Uhrzeit
                  </label>
                  <input
                    type="time"
                    value={deadlineForm.dueTime}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, dueTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Details / Abgabeort
                </label>
                <textarea
                  rows={2}
                  value={deadlineForm.details}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, details: e.target.value })}
                  placeholder="z.B. Einwurf in Briefkasten vor Labor C204 oder Moodle-Upload"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeadlineModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-semibold shadow-sm"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
