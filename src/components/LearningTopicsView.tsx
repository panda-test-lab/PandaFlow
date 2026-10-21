import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  RotateCw, 
  Search, 
  Edit3, 
  Trash2, 
  Calendar,
  Link2,
  ChevronDown,
  ChevronUp,
  X,
  Target,
  AlertCircle,
  Sparkles,
  Clock,
  Star,
  Award,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Calculator,
  FileText
} from 'lucide-react';
import { LearningTopic, Module, LectureNote, Exam } from '../types';
import { renderTextWithWikiLinks, findBacklinks } from '../utils/wikiLinks';

const QUICK_SYMBOLS = ['→', '⇄', '↓', '↑', '⁺', '⁻', '²', '³', 'Δ', 'λ', 'μ', '±', '·', '≈', '°C'];

interface TopicComboboxProps {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  selectedIds: string[];
  allTopics: LearningTopic[];
  currentTopicId?: string;
  modules: Module[];
  accentColor: 'cyan' | 'teal';
  placeholder: string;
  onAddId: (id: string) => void;
  onRemoveId: (id: string) => void;
  onCreateAndLink: (title: string) => void;
}

const TopicCombobox: React.FC<TopicComboboxProps> = ({
  label,
  subtitle,
  icon,
  selectedIds,
  allTopics,
  currentTopicId,
  modules,
  accentColor,
  placeholder,
  onAddId,
  onRemoveId,
  onCreateAndLink,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getModule = (modId: string) => modules.find((m) => m.id === modId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableTopics = allTopics.filter(
    (t) => t.id !== currentTopicId && !selectedIds.includes(t.id)
  );

  const filteredTopics = query.trim()
    ? availableTopics.filter((t) =>
        t.title.toLowerCase().includes(query.trim().toLowerCase())
      )
    : availableTopics.slice(0, 8);

  const exactMatch = allTopics.find(
    (t) => t.title.toLowerCase() === query.trim().toLowerCase()
  );

  const handleSelectOrCreate = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (exactMatch) {
      if (!selectedIds.includes(exactMatch.id)) {
        onAddId(exactMatch.id);
      }
    } else {
      onCreateAndLink(trimmed);
    }
    setQuery('');
    setIsOpen(false);
  };

  const selectedTopics = selectedIds
    .map((id) => allTopics.find((t) => t.id === id))
    .filter((t): t is LearningTopic => Boolean(t));

  const borderFocusClass =
    accentColor === 'cyan' ? 'focus:border-cyan-500' : 'focus:border-teal-500';
  const tagBgClass =
    accentColor === 'cyan'
      ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200'
      : 'bg-teal-950/40 border-teal-500/30 text-teal-200';
  const codeColor = accentColor === 'cyan' ? 'text-cyan-400' : 'text-teal-400';

  return (
    <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3" ref={containerRef}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            {icon}
            <span>{label}</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
            accentColor === 'cyan'
              ? 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30'
              : 'text-teal-400 bg-teal-950/40 border-teal-500/30'
          }`}
        >
          {selectedIds.length} verknüpft
        </span>
      </div>

      {/* Selected chips */}
      {selectedTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/80 border border-slate-800 rounded-lg">
          {selectedTopics.map((t) => {
            const mod = getModule(t.moduleId);
            return (
              <span
                key={t.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-md text-xs ${tagBgClass}`}
              >
                <span className={`font-mono text-[10px] ${codeColor}`}>{mod?.code}</span>
                <span className="font-medium">{t.title}</span>
                <button
                  type="button"
                  onClick={() => onRemoveId(t.id)}
                  className="text-slate-400 hover:text-red-400 ml-0.5 cursor-pointer"
                  title="Verknüpfung entfernen"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Single text input line with Dropdown */}
      <div className="relative">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSelectOrCreate();
              } else if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            placeholder={placeholder}
            className={`w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors ${borderFocusClass}`}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
              title="Eingabe leeren"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Floating Dropdown results */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl divide-y divide-slate-800/80 text-xs">
            {/* Matching existing topics */}
            {filteredTopics.map((t) => {
              const mod = getModule(t.moduleId);
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    onAddId(t.id);
                    setQuery('');
                    setIsOpen(false);
                  }}
                  className="px-3.5 py-2.5 hover:bg-slate-800/90 text-slate-200 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-slate-400 group-hover:text-slate-300 shrink-0">
                      {mod?.code}
                    </span>
                    <span className="truncate font-medium">{t.title}</span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold shrink-0 ml-2 ${
                      accentColor === 'cyan' ? 'text-cyan-400' : 'text-teal-400'
                    }`}
                  >
                    + Hinzufügen
                  </span>
                </div>
              );
            })}

            {/* Create new topic option if user entered a title that does not exist */}
            {query.trim().length > 0 && !exactMatch && (
              <div
                onClick={() => {
                  onCreateAndLink(query.trim());
                  setQuery('');
                  setIsOpen(false);
                }}
                className={`px-3.5 py-2.5 cursor-pointer flex items-center gap-2 font-medium transition-colors ${
                  accentColor === 'cyan'
                    ? 'bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300'
                    : 'bg-teal-950/40 hover:bg-teal-900/60 text-teal-300'
                }`}
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  „<strong>{query.trim()}</strong>“ als neuen Lerninhalt anlegen &amp; verknüpfen
                </span>
                <span className="text-[10px] ml-auto font-mono text-slate-400 shrink-0">
                  [Enter ↵]
                </span>
              </div>
            )}

            {filteredTopics.length === 0 && query.trim().length === 0 && (
              <div className="px-3.5 py-3 text-slate-500 italic text-center">
                Keine weiteren Themen vorhanden. Tippe einen Namen ein, um ein neues Thema anzulegen.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface LearningTopicsViewProps {
  topics: LearningTopic[];
  modules: Module[];
  notes?: LectureNote[];
  exams?: Exam[];
  onAddTopic: (topic: LearningTopic) => void;
  onUpdateTopic: (topic: LearningTopic) => void;
  onDeleteTopic: (id: string) => void;
  onOpenReviewModal?: (topic: LearningTopic) => void;
  selectedTopicId?: string;
  onNavigateToTopic?: (topicId: string) => void;
  onNavigateToModule?: (moduleId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
  onNavigateToExam?: (examId: string) => void;
}

export const LearningTopicsView: React.FC<LearningTopicsViewProps> = ({
  topics,
  modules,
  notes = [],
  exams = [],
  onAddTopic,
  onUpdateTopic,
  onDeleteTopic,
  onOpenReviewModal,
  selectedTopicId,
  onNavigateToTopic,
  onNavigateToModule,
  onNavigateToNote,
  onNavigateToExam,
}) => {
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [selectedUnderstandingFilter, setSelectedUnderstandingFilter] = useState<string>('all');
  const [selectedRelevanceFilter, setSelectedRelevanceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTopicTab, setActiveTopicTab] = useState<'all' | 'unprocessed'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingTopic, setEditingTopic] = useState<LearningTopic | null>(null);

  // Expanded states on cards
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  const [expandedMistakesCardIds, setExpandedMistakesCardIds] = useState<Set<string>>(new Set());
  const [expandedMnemonicsCardIds, setExpandedMnemonicsCardIds] = useState<Set<string>>(new Set());
  const [focusedTopicId, setFocusedTopicId] = useState<string | undefined>(selectedTopicId);

  // WikiLink picker in topic modal
  const [showWikiLinkPicker, setShowWikiLinkPicker] = useState<boolean>(false);
  const [wikiLinkSearch, setWikiLinkSearch] = useState<string>('');
  const [activeWikiTarget, setActiveWikiTarget] = useState<'description' | 'commonMistakes' | 'mnemonics'>('description');

  // Modal editor mode & sections
  const [descEditorMode, setDescEditorMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [isMistakesOpenInModal, setIsMistakesOpenInModal] = useState<boolean>(false);
  const [isMnemonicsOpenInModal, setIsMnemonicsOpenInModal] = useState<boolean>(false);

  const selectedCardRef = useRef<HTMLDivElement | null>(null);
  const descTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mistakesTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mnemonicsTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (selectedTopicId) {
      setSelectedModuleFilter('all');
      setSelectedUnderstandingFilter('all');
      setSelectedRelevanceFilter('all');
      setSearchQuery('');
      setFocusedTopicId(selectedTopicId);
      setExpandedCardIds((prev) => new Set(prev).add(selectedTopicId));
      setTimeout(() => {
        if (selectedCardRef.current) {
          selectedCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [selectedTopicId]);

  // Form State
  const [topicForm, setTopicForm] = useState<Partial<LearningTopic>>({
    title: '',
    description: '',
    moduleId: modules[0]?.id || '',
    difficulty: 'mittel',
    understanding: 'Nicht verstanden',
    recallConfidence: 'noch nicht geprüft',
    relevance: '⭐ Normal',
    nextReviewDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    relatedTopicIds: [],
    prerequisiteTopicIds: [],
    prerequisiteForTopicIds: [],
    commonMistakes: '',
    mnemonics: '',
    keyFormulas: [],
  });

  const [formulasInput, setFormulasInput] = useState<string>('');

  const getModule = (modId: string) => modules.find((m) => m.id === modId);

  // Relevance helpers: yellow stars, clean labels, no "(1 Stern)" text
  const getRelevanceMeta = (rel: string = '') => {
    if (rel.includes('3') || rel.includes('⭐⭐⭐') || rel.toLowerCase().includes('sehr hoch')) {
      return {
        key: '⭐⭐⭐ Sehr hoch' as const,
        label: 'Sehr hoch',
        starCount: 3,
        text: 'text-amber-400 font-semibold',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        desc: 'Höchste Prüfungsrelevanz & Kernkonzept',
      };
    }
    if (rel.includes('2') || rel.includes('⭐⭐') || rel.toLowerCase().includes('hoch')) {
      return {
        key: '⭐⭐ Hoch' as const,
        label: 'Hoch',
        starCount: 2,
        text: 'text-amber-300 font-medium',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        desc: 'Häufig geprüfter Themenschwerpunkt',
      };
    }
    return {
      key: '⭐ Normal' as const,
      label: 'Normal',
      starCount: 1,
      text: 'text-slate-300',
      bg: 'bg-slate-800',
      border: 'border-slate-700',
      desc: 'Regulärer Vorlesungs- und Klausurstoff',
    };
  };

  const renderYellowStars = (count: number) => (
    <span className="inline-flex items-center gap-0.5" title={`${count} von 3 Sternen`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
      ))}
    </span>
  );

  const understandingConfig: Record<
    'Nicht verstanden' | 'Oberflächlich' | 'Teilweise Verstanden' | 'Verstanden' | 'sicher',
    { label: string; bg: string; text: string; border: string }
  > = {
    'sicher': {
      label: 'Sicher verstanden',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
    },
    'Verstanden': {
      label: 'Verstanden',
      bg: 'bg-teal-500/15',
      text: 'text-teal-300',
      border: 'border-teal-500/30',
    },
    'Teilweise Verstanden': {
      label: 'Teilweise',
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
    },
    'Oberflächlich': {
      label: 'Oberflächlich',
      bg: 'bg-orange-500/15',
      text: 'text-orange-300',
      border: 'border-orange-500/30',
    },
    'Nicht verstanden': {
      label: 'Nicht verstanden',
      bg: 'bg-slate-800',
      text: 'text-slate-300',
      border: 'border-slate-700',
    },
  };

  const recallConfidenceConfig: Record<
    'noch nicht geprüft' | 'schlecht' | 'unsicher' | 'akzeptabel' | 'sicher',
    { label: string; bg: string; text: string; border: string }
  > = {
    'sicher': {
      label: 'Abruf: sicher',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
    },
    'akzeptabel': {
      label: 'Abruf: akzeptabel',
      bg: 'bg-teal-500/15',
      text: 'text-teal-300',
      border: 'border-teal-500/30',
    },
    'unsicher': {
      label: 'Abruf: unsicher',
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
    },
    'schlecht': {
      label: 'Abruf: schlecht',
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
    },
    'noch nicht geprüft': {
      label: 'Abruf: ungeprüft',
      bg: 'bg-slate-800',
      text: 'text-slate-400',
      border: 'border-slate-700',
    },
  };

  interface RecommendationInfo {
    label: string;
    bg: string;
    text: string;
    border: string;
    reason: string;
    badge: string;
    urgencyLevel: 'high' | 'medium' | 'low' | 'good';
  }

  const getRecommendation = (topic: LearningTopic, examsList: Exam[]): RecommendationInfo => {
    const understandingRank: Record<string, number> = {
      'Nicht verstanden': 0,
      'Oberflächlich': 1,
      'Teilweise Verstanden': 2,
      'Verstanden': 3,
      'sicher': 4,
    };

    const recallRank: Record<string, number> = {
      'noch nicht geprüft': 0,
      'schlecht': 1,
      'unsicher': 2,
      'akzeptabel': 3,
      'sicher': 4,
    };

    const relMeta = getRelevanceMeta(topic.relevance);
    const uRank = understandingRank[topic.understanding] ?? 0;
    const rRank = recallRank[topic.recallConfidence] ?? 0;

    const now = new Date().setHours(0, 0, 0, 0);

    const relevantExams = examsList.filter(
      (e) => (e.linkedTopicIds?.includes(topic.id) || e.moduleId === topic.moduleId) && e.status !== 'bestanden'
    );

    const upcomingExams = relevantExams
      .map((e) => ({
        ...e,
        daysLeft: Math.ceil((new Date(e.date).getTime() - now) / (1000 * 60 * 60 * 24)),
      }))
      .filter((e) => e.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const nearestExam = upcomingExams[0];

    let daysSinceReview: number | null = null;
    if (topic.lastReviewedDate) {
      daysSinceReview = Math.floor((now - new Date(topic.lastReviewedDate).getTime()) / (1000 * 60 * 60 * 24));
    }

    const isDue = new Date(topic.nextReviewDate).getTime() <= now;

    if (nearestExam && nearestExam.daysLeft <= 14 && (uRank < 4 || rRank < 4)) {
      return {
        label: 'Prüfungsfokus: Höchste Dringlichkeit',
        badge: 'Klausurrelevant & Dringend',
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        urgencyLevel: 'high',
        reason: `Prüfung „${nearestExam.title}“ in ${nearestExam.daysLeft} Tagen! Verständnis (${topic.understanding}) oder Abruf (${topic.recallConfidence}) noch nicht sicher.`,
      };
    }

    if (relMeta.starCount === 3 && (uRank <= 1 || rRank <= 1)) {
      return {
        label: 'Dringend: Kernkonzept vertiefen',
        badge: 'Dringend lernen',
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        urgencyLevel: 'high',
        reason: 'Sehr hohe Prüfungsrelevanz (⭐⭐⭐), aber noch Wissenslücken oder unsicherer Abruf.',
      };
    }

    if (nearestExam && nearestExam.daysLeft <= 30 && (uRank <= 2 || rRank <= 2)) {
      return {
        label: `Prüfung in ${nearestExam.daysLeft} Tagen`,
        badge: 'Prüfungsfokus',
        bg: 'bg-amber-500/10',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        urgencyLevel: 'medium',
        reason: `Prüfung „${nearestExam.title}“ naht. Wissenslücken gezielt mit Vorlesungsmitschrift schließen.`,
      };
    }

    if (isDue || (daysSinceReview !== null && daysSinceReview > 12 && uRank < 4)) {
      const reviewText = daysSinceReview !== null ? `Vor ${daysSinceReview} Tagen zuletzt wiederholt` : 'Noch keine Wiederholung erfasst';
      return {
        label: 'Wiederholung fällig',
        badge: 'Intervall fällig',
        bg: 'bg-amber-500/10',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        urgencyLevel: 'medium',
        reason: `${reviewText} · Spaced-Repetition Zeitfenster nutzen, um Vergessen vorzubeugen.`,
      };
    }

    if (uRank <= 2 || rRank <= 2) {
      return {
        label: 'Vertiefung & Active Recall',
        badge: 'Aktiv festigen',
        bg: 'bg-sky-500/10',
        text: 'text-sky-300',
        border: 'border-sky-500/30',
        urgencyLevel: 'low',
        reason: rRank === 0 ? 'Abrufsicherheit noch nicht getestet (Selbsttest / Anki empfohlen).' : 'Konzept schrittweise festigen und Formeln anwenden.',
      };
    }

    if (uRank >= 3 && rRank >= 3) {
      return {
        label: 'Gefestigt & Prüfungsbereit',
        badge: 'Gefestigt',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-300',
        border: 'border-emerald-500/30',
        urgencyLevel: 'good',
        reason: 'Optimaler Lernstand! Regelmäßigen Wiederholungszyklus beibehalten.',
      };
    }

    return {
      label: 'Lernplan einhalten',
      badge: 'Im Plan',
      bg: 'bg-slate-800',
      text: 'text-slate-300',
      border: 'border-slate-700',
      urgencyLevel: 'good',
      reason: 'Kontinuierlich nach Lernplan weiterführen.',
    };
  };

  const unprocessedCount = topics.filter((t) => {
    const hasContent = (t.description && t.description.trim().length >= 15 && !t.description.startsWith('Erstellt aus Mitschrift')) ||
                       (t.keyFormulas && t.keyFormulas.length > 0) ||
                       (t.commonMistakes && t.commonMistakes.trim().length > 0) ||
                       (t.mnemonics && t.mnemonics.trim().length > 0);
    return !hasContent;
  }).length;

  const filteredTopics = topics.filter((t) => {
    if (activeTopicTab === 'unprocessed') {
      const hasContent = (t.description && t.description.trim().length >= 15 && !t.description.startsWith('Erstellt aus Mitschrift')) ||
                         (t.keyFormulas && t.keyFormulas.length > 0) ||
                         (t.commonMistakes && t.commonMistakes.trim().length > 0) ||
                         (t.mnemonics && t.mnemonics.trim().length > 0);
      if (hasContent) return false;
    }
    if (selectedModuleFilter !== 'all' && t.moduleId !== selectedModuleFilter) return false;
    if (selectedUnderstandingFilter !== 'all' && t.understanding !== selectedUnderstandingFilter) return false;
    if (selectedRelevanceFilter !== 'all') {
      const meta = getRelevanceMeta(t.relevance);
      if (selectedRelevanceFilter === '3' && meta.starCount !== 3) return false;
      if (selectedRelevanceFilter === '2' && meta.starCount !== 2) return false;
      if (selectedRelevanceFilter === '1' && meta.starCount !== 1) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q) ?? false;
      const matchMistakes = t.commonMistakes?.toLowerCase().includes(q) ?? false;
      const matchMnemonics = t.mnemonics?.toLowerCase().includes(q) ?? false;
      const matchFormulas = (t.keyFormulas || []).some((f) => f.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchMistakes && !matchMnemonics && !matchFormulas) return false;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingTopic(null);
    setTopicForm({
      title: '',
      description: '',
      moduleId: modules[0]?.id || '',
      understanding: 'Nicht verstanden',
      recallConfidence: 'noch nicht geprüft',
      relevance: '⭐ Normal',
      difficulty: 'mittel',
      nextReviewDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      relatedTopicIds: [],
      prerequisiteTopicIds: [],
      prerequisiteForTopicIds: [],
      commonMistakes: '',
      mnemonics: '',
      keyFormulas: [],
    });
    setFormulasInput('');
    setIsMistakesOpenInModal(false);
    setIsMnemonicsOpenInModal(false);
    setDescEditorMode('edit');
    setShowAddModal(true);
  };

  const handleOpenEdit = (t: LearningTopic) => {
    setEditingTopic(t);
    setTopicForm({
      ...t,
      prerequisiteTopicIds: t.prerequisiteTopicIds || [],
      prerequisiteForTopicIds: t.prerequisiteForTopicIds || [],
      commonMistakes: t.commonMistakes || '',
      mnemonics: t.mnemonics || '',
    });
    setFormulasInput((t.keyFormulas || []).join('\n'));
    setIsMistakesOpenInModal(Boolean(t.commonMistakes && t.commonMistakes.trim().length > 0));
    setIsMnemonicsOpenInModal(Boolean(t.mnemonics && t.mnemonics.trim().length > 0));
    setDescEditorMode('edit');
    setShowAddModal(true);
  };

  // Create prerequisite or follow-up topic on the fly if not existing
  const handleCreateAndLinkTopic = (title: string, direction: 'prerequisite' | 'prerequisiteFor') => {
    const trimmed = title.trim();
    if (!trimmed) return;

    // Check if topic exists
    const existing = topics.find((t) => t.title.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (direction === 'prerequisite') {
        const current = topicForm.prerequisiteTopicIds || [];
        if (!current.includes(existing.id)) {
          setTopicForm({ ...topicForm, prerequisiteTopicIds: [...current, existing.id] });
        }
      } else {
        const current = topicForm.prerequisiteForTopicIds || [];
        if (!current.includes(existing.id)) {
          setTopicForm({ ...topicForm, prerequisiteForTopicIds: [...current, existing.id] });
        }
      }
      return;
    }

    const newId = `top-${Date.now()}`;
    const createdTopic: LearningTopic = {
      id: newId,
      moduleId: topicForm.moduleId || modules[0]?.id || '',
      title: trimmed,
      description:
        direction === 'prerequisite'
          ? `Grundlagen & Vorwissen für „${topicForm.title || 'Lerninhalt'}“.`
          : `Aufbauender Lerninhalt basierend auf „${topicForm.title || 'Lerninhalt'}“.`,
      understanding: 'Nicht verstanden',
      recallConfidence: 'noch nicht geprüft',
      relevance: '⭐ Normal',
      difficulty: 'mittel',
      nextReviewDate: new Date().toISOString().split('T')[0],
      relatedTopicIds: topicForm.id ? [topicForm.id] : [],
      prerequisiteTopicIds: direction === 'prerequisiteFor' && topicForm.id ? [topicForm.id] : [],
      prerequisiteForTopicIds: direction === 'prerequisite' && topicForm.id ? [topicForm.id] : [],
      keyFormulas: [],
    };

    onAddTopic(createdTopic);

    if (direction === 'prerequisite') {
      const current = topicForm.prerequisiteTopicIds || [];
      setTopicForm({ ...topicForm, prerequisiteTopicIds: [...current, newId] });
    } else {
      const current = topicForm.prerequisiteForTopicIds || [];
      setTopicForm({ ...topicForm, prerequisiteForTopicIds: [...current, newId] });
    }
  };

  const handleTogglePrerequisiteId = (topicId: string) => {
    const current = topicForm.prerequisiteTopicIds || [];
    if (current.includes(topicId)) {
      setTopicForm({ ...topicForm, prerequisiteTopicIds: current.filter((id) => id !== topicId) });
    } else {
      setTopicForm({ ...topicForm, prerequisiteTopicIds: [...current, topicId] });
    }
  };

  const handleTogglePrerequisiteForId = (topicId: string) => {
    const current = topicForm.prerequisiteForTopicIds || [];
    if (current.includes(topicId)) {
      setTopicForm({ ...topicForm, prerequisiteForTopicIds: current.filter((id) => id !== topicId) });
    } else {
      setTopicForm({ ...topicForm, prerequisiteForTopicIds: [...current, topicId] });
    }
  };

  const insertSymbolIntoTarget = (sym: string, targetField: 'description' | 'commonMistakes' | 'mnemonics') => {
    const current = (topicForm[targetField] || '') as string;
    setTopicForm({
      ...topicForm,
      [targetField]: current ? `${current} ${sym} ` : `${sym} `,
    });
  };

  const handleInsertWikiLinkToActiveTarget = (textToInsert: string) => {
    const current = (topicForm[activeWikiTarget] || '') as string;
    setTopicForm({
      ...topicForm,
      [activeWikiTarget]: current ? `${current} ${textToInsert}` : textToInsert,
    });
    setShowWikiLinkPicker(false);
  };

  const handleSaveTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicForm.title || !topicForm.moduleId) return;

    const parsedFormulas = formulasInput
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const rel = topicForm.relevance || '⭐ Normal';

    if (editingTopic) {
      onUpdateTopic({
        ...editingTopic,
        title: topicForm.title || '',
        description: topicForm.description || '',
        moduleId: topicForm.moduleId || modules[0]?.id || '',
        understanding: topicForm.understanding || 'Nicht verstanden',
        recallConfidence: topicForm.recallConfidence || 'noch nicht geprüft',
        relevance: rel,
        difficulty: topicForm.difficulty || 'mittel',
        nextReviewDate: topicForm.nextReviewDate || new Date().toISOString().split('T')[0],
        relatedTopicIds: topicForm.relatedTopicIds || [],
        prerequisiteTopicIds: topicForm.prerequisiteTopicIds || [],
        prerequisiteForTopicIds: topicForm.prerequisiteForTopicIds || [],
        commonMistakes: topicForm.commonMistakes || undefined,
        mnemonics: topicForm.mnemonics || undefined,
        keyFormulas: parsedFormulas,
      });
    } else {
      const newTopic: LearningTopic = {
        id: `top-${Date.now()}`,
        title: topicForm.title || '',
        description: topicForm.description || '',
        moduleId: topicForm.moduleId || modules[0]?.id || '',
        understanding: topicForm.understanding || 'Nicht verstanden',
        recallConfidence: topicForm.recallConfidence || 'noch nicht geprüft',
        relevance: rel,
        difficulty: topicForm.difficulty || 'mittel',
        nextReviewDate: topicForm.nextReviewDate || new Date().toISOString().split('T')[0],
        relatedTopicIds: topicForm.relatedTopicIds || [],
        prerequisiteTopicIds: topicForm.prerequisiteTopicIds || [],
        prerequisiteForTopicIds: topicForm.prerequisiteForTopicIds || [],
        commonMistakes: topicForm.commonMistakes || undefined,
        mnemonics: topicForm.mnemonics || undefined,
        keyFormulas: parsedFormulas,
      };
      onAddTopic(newTopic);
    }
    setShowAddModal(false);
  };

  const handleAdvanceUnderstanding = (topic: LearningTopic) => {
    const cycle: Record<string, 'Nicht verstanden' | 'Oberflächlich' | 'Teilweise Verstanden' | 'Verstanden' | 'sicher'> = {
      'Nicht verstanden': 'Oberflächlich',
      'Oberflächlich': 'Teilweise Verstanden',
      'Teilweise Verstanden': 'Verstanden',
      'Verstanden': 'sicher',
      'sicher': 'sicher',
    };
    const nextUnderstanding = cycle[topic.understanding] || 'Verstanden';
    const nextDays = nextUnderstanding === 'sicher' ? 14 : nextUnderstanding === 'Verstanden' ? 7 : 3;
    const nextDate = new Date(Date.now() + 86400000 * nextDays).toISOString().split('T')[0];

    const nextConfidence =
      topic.recallConfidence === 'noch nicht geprüft' || topic.recallConfidence === 'schlecht'
        ? 'unsicher'
        : topic.recallConfidence === 'unsicher'
        ? 'akzeptabel'
        : 'sicher';

    onUpdateTopic({
      ...topic,
      understanding: nextUnderstanding,
      recallConfidence: nextConfidence,
      lastReviewedDate: new Date().toISOString().split('T')[0],
      nextReviewDate: nextDate,
    });
  };

  const handleScheduleRepetition = (topic: LearningTopic) => {
    onUpdateTopic({
      ...topic,
      nextReviewDate: new Date().toISOString().split('T')[0],
    });
  };

  const toggleExpandCard = (id: string) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandMistakes = (id: string) => {
    setExpandedMistakesCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandMnemonics = (id: string) => {
    setExpandedMnemonicsCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const db = { modules, topics, notes, exams };
  const handlers = {
    onNavigateToTopic,
    onNavigateToModule,
    onNavigateToNote,
    onNavigateToExam,
  };

  const focusedTopic = topics.find((t) => t.id === focusedTopicId);

  return (
    <div className="space-y-6">
      {/* Top Header - Renamed to "Lerninhalte, Themen & Konzepte" */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Lerninhalte, Themen &amp; Konzepte
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Spaced-Repetition, Voraussetzungen, Stolpersteine &amp; Lernhilfen</span>
              <span>·</span>
              <span className="font-mono tabular-nums text-teal-400 font-medium">
                {topics.length} Lerninhalte erfasst
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-teal-500/20 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Neuen Lerninhalt anlegen</span>
        </button>
      </div>

      {/* Focused Topic Banner if navigated to from a WikiLink */}
      {focusedTopic && (
        <div className="p-3 bg-teal-950/40 border border-teal-500/40 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-teal-200">
            <Target className="w-4 h-4 text-teal-400 shrink-0" />
            <span>
              Fokussierter Lerninhalt:{' '}
              <strong className="text-slate-100 font-semibold">{focusedTopic.title}</strong>
            </span>
          </div>
          <button
            onClick={() => setFocusedTopicId(undefined)}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Fokus aufheben</span>
          </button>
        </div>
      )}

      {/* Topic Tabs: Alle vs Unbearbeitete Lerninhalte */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTopicTab('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTopicTab === 'all'
              ? 'bg-teal-500 text-slate-950 shadow-sm font-bold'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
          }`}
        >
          Alle Lerninhalte ({topics.length})
        </button>
        <button
          onClick={() => setActiveTopicTab('unprocessed')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTopicTab === 'unprocessed'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
              : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Unbearbeitete Lerninhalte ({unprocessedCount})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Module Filter */}
          <select
            value={selectedModuleFilter}
            onChange={(e) => setSelectedModuleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Alle Fächer</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} - {m.shortName}
              </option>
            ))}
          </select>

          {/* Verständnis Filter */}
          <select
            value={selectedUnderstandingFilter}
            onChange={(e) => setSelectedUnderstandingFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Alle Verständnisstufen</option>
            <option value="Nicht verstanden">Nicht verstanden</option>
            <option value="Oberflächlich">Oberflächlich</option>
            <option value="Teilweise Verstanden">Teilweise Verstanden</option>
            <option value="Verstanden">Verstanden</option>
            <option value="sicher">sicher</option>
          </select>

          {/* Relevanz Filter with Stars */}
          <select
            value={selectedRelevanceFilter}
            onChange={(e) => setSelectedRelevanceFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Alle Relevanzstufen</option>
            <option value="3">⭐⭐⭐ Sehr hoch</option>
            <option value="2">⭐⭐ Hoch</option>
            <option value="1">⭐ Normal</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Thema, Fehler, Merksatz suchen..."
            className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 w-56"
          />
        </div>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTopics.map((topic) => {
          const mod = getModule(topic.moduleId);
          const config = understandingConfig[topic.understanding] || understandingConfig['Nicht verstanden'];
          const recallConf = recallConfidenceConfig[topic.recallConfidence] || recallConfidenceConfig['noch nicht geprüft'];
          const relMeta = getRelevanceMeta(topic.relevance);
          const recommendation = getRecommendation(topic, exams);
          const isDue = new Date(topic.nextReviewDate).getTime() <= new Date().getTime();
          const isFocused = topic.id === focusedTopicId;
          const isExpanded = expandedCardIds.has(topic.id);
          const isMistakesExpanded = expandedMistakesCardIds.has(topic.id);
          const isMnemonicsExpanded = expandedMnemonicsCardIds.has(topic.id);

          // Resolve prerequisite topics
          const prereqTopics = (topic.prerequisiteTopicIds || [])
            .map((id) => topics.find((t) => t.id === id))
            .filter((t): t is LearningTopic => Boolean(t));

          // Resolve prerequisite-for topics
          const prereqForTopics = (topic.prerequisiteForTopicIds || [])
            .map((id) => topics.find((t) => t.id === id))
            .filter((t): t is LearningTopic => Boolean(t));

          return (
            <div
              key={topic.id}
              ref={isFocused ? selectedCardRef : null}
              className={`bg-slate-900 border rounded-xl p-5 shadow-lg flex flex-col justify-between transition-all group min-w-0 overflow-hidden ${
                isFocused
                  ? 'border-teal-400 ring-2 ring-teal-500/30 shadow-teal-950/40 bg-slate-900/95'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3 min-w-0">
                {/* Header: Module, Relevanz with Yellow Stars, Verständnis, Abrufsicherheit */}
                <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      style={{ color: mod?.color || '#06b6d4' }}
                      className="font-mono font-semibold truncate cursor-pointer hover:underline"
                      onClick={() => onNavigateToModule && mod && onNavigateToModule(mod.id)}
                      title={`Zum Modul ${mod?.code || ''}`}
                    >
                      {mod?.shortName || mod?.code}
                    </span>
                    {isFocused && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        Fokus
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* Relevanz Badge with Yellow Stars and clean text (no "(1 Stern)") */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1.5 ${relMeta.bg} ${relMeta.text} ${relMeta.border}`}
                      title={`Relevanz: ${relMeta.label} - ${relMeta.desc}`}
                    >
                      {renderYellowStars(relMeta.starCount)}
                      <span>{relMeta.label}</span>
                    </span>

                    {/* Verständnis Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${config.bg} ${config.text} ${config.border}`}
                      title="Verständnis des Themas"
                    >
                      {config.label}
                    </span>

                    {/* Abrufsicherheit Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${recallConf.bg} ${recallConf.text} ${recallConf.border}`}
                      title="Abrufsicherheit (Active Recall)"
                    >
                      {recallConf.label}
                    </span>
                  </div>
                </div>

                {/* Topic Title */}
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-teal-300 transition-colors leading-snug break-words">
                  {topic.title}
                </h3>

                {/* Description with Interactive Markdown & WikiLinks */}
                <div className="text-xs text-slate-300 leading-relaxed break-words">
                  <div className={isExpanded ? '' : 'line-clamp-3'}>
                    {renderTextWithWikiLinks(topic.description, db, handlers)}
                  </div>
                  {topic.description && topic.description.length > 110 && (
                    <button
                      type="button"
                      onClick={() => toggleExpandCard(topic.id)}
                      className="text-[11px] text-teal-400 hover:text-teal-300 mt-1 font-medium inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <span>{isExpanded ? 'Weniger anzeigen' : 'Mehr & Links anzeigen'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* Voraussetzungen (Dependencies) */}
                {prereqTopics.length > 0 && (
                  <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                      <ArrowLeft className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>Voraussetzungen ({prereqTopics.length}):</span>
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {prereqTopics.map((pt) => {
                        const ptMod = getModule(pt.moduleId);
                        return (
                          <span
                            key={pt.id}
                            onClick={() => onNavigateToTopic && onNavigateToTopic(pt.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 hover:bg-cyan-950/40 border border-slate-700/80 hover:border-cyan-500/40 rounded text-[11px] text-cyan-300 cursor-pointer transition-colors"
                            title={`Zu: ${pt.title} (${ptMod?.code || ''})`}
                          >
                            <span className="font-mono text-[9px] text-cyan-500">{ptMod?.code}</span>
                            <span className="truncate max-w-[140px]">{pt.title}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Voraussetzung für (Follow-up topics) */}
                {prereqForTopics.length > 0 && (
                  <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                      <ArrowRight className="w-3 h-3 text-teal-400 shrink-0" />
                      <span>Weiterführende Themen ({prereqForTopics.length}):</span>
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {prereqForTopics.map((pft) => {
                        const pftMod = getModule(pft.moduleId);
                        return (
                          <span
                            key={pft.id}
                            onClick={() => onNavigateToTopic && onNavigateToTopic(pft.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 hover:bg-teal-950/40 border border-slate-700/80 hover:border-teal-500/40 rounded text-[11px] text-teal-300 cursor-pointer transition-colors"
                            title={`Zu: ${pft.title} (${pftMod?.code || ''})`}
                          >
                            <span className="font-mono text-[9px] text-teal-500">{pftMod?.code}</span>
                            <span className="truncate max-w-[140px]">{pft.title}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Häufige Fehler & Klausurfallen */}
                {topic.commonMistakes && (
                  <div className="border border-amber-500/25 bg-amber-500/5 rounded-lg overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => toggleExpandMistakes(topic.id)}
                      className="w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-amber-500/10 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 font-medium text-amber-300 text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Häufige Fehler &amp; Klausurfallen</span>
                      </span>
                      <div className="flex items-center gap-1 text-amber-400/80 text-[10px]">
                        <span>{isMistakesExpanded ? 'Ausblenden' : 'Anzeigen'}</span>
                        {isMistakesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </button>
                    {isMistakesExpanded && (
                      <div className="p-3 border-t border-amber-500/20 bg-slate-950/80 text-slate-200 text-xs leading-relaxed space-y-1">
                        {renderTextWithWikiLinks(topic.commonMistakes, db, handlers)}
                      </div>
                    )}
                  </div>
                )}

                {/* Eselsbrücken & Merksätze */}
                {topic.mnemonics && (
                  <div className="border border-teal-500/25 bg-teal-500/5 rounded-lg overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => toggleExpandMnemonics(topic.id)}
                      className="w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-teal-500/10 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 font-medium text-teal-300 text-[11px]">
                        <Lightbulb className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span>Eselsbrücken &amp; Merksätze</span>
                      </span>
                      <div className="flex items-center gap-1 text-teal-400/80 text-[10px]">
                        <span>{isMnemonicsExpanded ? 'Ausblenden' : 'Anzeigen'}</span>
                        {isMnemonicsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </button>
                    {isMnemonicsExpanded && (
                      <div className="p-3 border-t border-teal-500/20 bg-slate-950/80 text-slate-200 text-xs leading-relaxed space-y-1">
                        {renderTextWithWikiLinks(topic.mnemonics, db, handlers)}
                      </div>
                    )}
                  </div>
                )}

                {/* Key Formulas with WikiLinks support */}
                {topic.keyFormulas && topic.keyFormulas.length > 0 && (
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800/80 font-mono text-[11px] text-teal-300 space-y-1">
                    {topic.keyFormulas.map((f, i) => (
                      <div key={i} className="break-words">
                        {renderTextWithWikiLinks(f, db, handlers)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Backlinks when expanded - Only shows the linking document (name & type), NOT the raw [[link]] */}
                {isExpanded && (() => {
                  const backlinks = findBacklinks(topic.id, 'topic', notes, topics, modules, exams);
                  if (backlinks.length === 0) return null;
                  return (
                    <div className="p-2.5 bg-purple-950/20 border border-purple-900/30 rounded-lg space-y-1.5 text-[11px]">
                      <span className="font-semibold text-purple-300 block">
                        Verlinkt in folgenden Dokumenten ({backlinks.length}):
                      </span>
                      <div className="space-y-1">
                        {backlinks.map((bl, bi) => (
                          <div
                            key={bi}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (bl.sourceNote && onNavigateToNote) onNavigateToNote(bl.sourceNote.id);
                              else if (bl.sourceTopic && onNavigateToTopic) onNavigateToTopic(bl.sourceTopic.id);
                            }}
                            className="p-2 rounded bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-950/40 cursor-pointer transition-colors flex items-center gap-2 text-xs"
                          >
                            {bl.sourceNote ? (
                              <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            )}
                            <span className="text-slate-200 truncate font-medium">
                              {bl.sourceNote ? `Mitschrift: ${bl.sourceNote.title}` : `Lerninhalt: ${bl.sourceTopic?.title}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Automated Learning Recommendation Box */}
                <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${recommendation.bg} ${recommendation.border}`}>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                      {recommendation.urgencyLevel === 'high' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : recommendation.urgencyLevel === 'medium' ? (
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      )}
                      <span className={recommendation.text}>{recommendation.label}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider ${recommendation.bg} ${recommendation.text} border ${recommendation.border}`}>
                      {recommendation.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {recommendation.reason}
                  </p>
                </div>

                {/* Review Date Indicator */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <RotateCw className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">Zuletzt:</span>
                    <span className="font-mono text-slate-300 truncate">
                      {topic.lastReviewedDate || 'Noch nie'}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 min-w-0">
                    <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">Nächste:</span>
                    <span
                      className={`font-mono tabular-nums truncate ${
                        isDue ? 'text-amber-400 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      {topic.nextReviewDate} {isDue ? '(!)' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => (onOpenReviewModal ? onOpenReviewModal(topic) : handleAdvanceUnderstanding(topic))}
                    className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Lernfortschritt erhöhen"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Gelernt!</span>
                  </button>
                  <button
                    onClick={() => handleScheduleRepetition(topic)}
                    className="p-1 text-slate-400 hover:text-amber-300 rounded cursor-pointer"
                    title="Als Wiederholung markieren"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => handleOpenEdit(topic)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                    title="Lerninhalt bearbeiten"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteTopic(topic.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors cursor-pointer"
                    title="Lerninhalt löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTopics.length === 0 && (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-2">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Keine Lerninhalte gefunden</p>
          <p className="text-xs text-slate-500">
            Passe die Filter an oder erstelle einen neuen Lerninhalt.
          </p>
        </div>
      )}

      {/* Structured "Lerninhalt bearbeiten" Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-5">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {editingTopic ? 'Lerninhalt bearbeiten' : 'Neuen Lerninhalt anlegen'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Definition, Lernstand, Vorbedingungen und Lernhilfen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Scrollable Content */}
            <form onSubmit={handleSaveTopic} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 1. Modul, Schwierigkeit & Titel */}
              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Modul / Fach *
                    </label>
                    <select
                      value={topicForm.moduleId}
                      onChange={(e) => setTopicForm({ ...topicForm, moduleId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code} - {m.name} ({m.shortName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Schwierigkeit
                    </label>
                    <select
                      value={topicForm.difficulty || 'mittel'}
                      onChange={(e) => setTopicForm({ ...topicForm, difficulty: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="leicht">Leicht</option>
                      <option value="mittel">Mittel</option>
                      <option value="anspruchsvoll">Anspruchsvoll</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Thema / Konzeptname *
                  </label>
                  <input
                    type="text"
                    required
                    value={topicForm.title}
                    onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                    placeholder="z.B. Massenwirkungsgesetz & Säure-Base-Gleichgewichte"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* 2. Einstufung & Lernfortschritt: Verständnis, Abrufsicherheit, Relevanz */}
              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-teal-400" />
                  <span>Lernstand &amp; Einstufung</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Verständnis */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Verständnis
                    </label>
                    <select
                      value={topicForm.understanding}
                      onChange={(e) => setTopicForm({ ...topicForm, understanding: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="Nicht verstanden">Nicht verstanden</option>
                      <option value="Oberflächlich">Oberflächlich</option>
                      <option value="Teilweise Verstanden">Teilweise Verstanden</option>
                      <option value="Verstanden">Verstanden</option>
                      <option value="sicher">sicher</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Theoretisches Verständnis des Stoffes
                    </span>
                  </div>

                  {/* Abrufsicherheit */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Abrufsicherheit
                    </label>
                    <select
                      value={topicForm.recallConfidence}
                      onChange={(e) => setTopicForm({ ...topicForm, recallConfidence: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="noch nicht geprüft">noch nicht geprüft</option>
                      <option value="schlecht">schlecht</option>
                      <option value="unsicher">unsicher</option>
                      <option value="akzeptabel">akzeptabel</option>
                      <option value="sicher">sicher</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Fähigkeit zur aktiven Wiedergabe in der Klausur
                    </span>
                  </div>
                </div>

                {/* Relevanz with Yellow Stars */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Relevanz (Prüfungsgewichtung)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { value: '⭐ Normal', label: 'Normal', stars: 1, desc: 'Regulärer Prüfungsstoff' },
                      { value: '⭐⭐ Hoch', label: 'Hoch', stars: 2, desc: 'Häufiger Klausurschwerpunkt' },
                      { value: '⭐⭐⭐ Sehr hoch', label: 'Sehr hoch', stars: 3, desc: 'Zentrales Kernkonzept' },
                    ].map((opt) => {
                      const isSelected = getRelevanceMeta(topicForm.relevance).starCount === opt.stars;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTopicForm({ ...topicForm, relevance: opt.value as any })}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/40 text-amber-200'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{opt.label}</span>
                            {renderYellowStars(opt.stars)}
                          </div>
                          <span className="text-[10px] text-slate-400 leading-tight">
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Voraussetzungen (Single text input line with Dropdown & auto-creation) */}
              <TopicCombobox
                label="Voraussetzungen"
                subtitle="Themen, die vor diesem Lerninhalt verstanden sein sollten"
                icon={<ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />}
                selectedIds={topicForm.prerequisiteTopicIds || []}
                allTopics={topics}
                currentTopicId={editingTopic?.id}
                modules={modules}
                accentColor="cyan"
                placeholder="Vorhandene Voraussetzung suchen oder neue eingeben..."
                onAddId={(id) => {
                  const current = topicForm.prerequisiteTopicIds || [];
                  if (!current.includes(id)) {
                    setTopicForm({ ...topicForm, prerequisiteTopicIds: [...current, id] });
                  }
                }}
                onRemoveId={handleTogglePrerequisiteId}
                onCreateAndLink={(title) => handleCreateAndLinkTopic(title, 'prerequisite')}
              />

              {/* 4. Weiterführende Themen (Single text input line with Dropdown & auto-creation) */}
              <TopicCombobox
                label="Weiterführende Themen"
                subtitle="Themen, die auf diesem Lerninhalt aufbauen"
                icon={<ArrowRight className="w-3.5 h-3.5 text-teal-400" />}
                selectedIds={topicForm.prerequisiteForTopicIds || []}
                allTopics={topics}
                currentTopicId={editingTopic?.id}
                modules={modules}
                accentColor="teal"
                placeholder="Vorhandenes Folgethema suchen oder neues eingeben..."
                onAddId={(id) => {
                  const current = topicForm.prerequisiteForTopicIds || [];
                  if (!current.includes(id)) {
                    setTopicForm({ ...topicForm, prerequisiteForTopicIds: [...current, id] });
                  }
                }}
                onRemoveId={handleTogglePrerequisiteForId}
                onCreateAndLink={(title) => handleCreateAndLinkTopic(title, 'prerequisiteFor')}
              />

              {/* 5. Beschreibung */}
              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                      Beschreibung
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Detaillierte Erklärung, Herleitungen, Reaktionsmechanismen oder Zusammenhänge
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* WikiLink button */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveWikiTarget('description');
                        setShowWikiLinkPicker(!showWikiLinkPicker);
                      }}
                      className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-1 font-medium bg-purple-950/40 px-2 py-1 rounded border border-purple-500/30 cursor-pointer"
                    >
                      <Link2 className="w-3 h-3 text-purple-400" />
                      <span>[[WikiLink einfügen]]</span>
                    </button>

                    {/* Mode toggle */}
                    <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setDescEditorMode('edit')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          descEditorMode === 'edit' ? 'bg-teal-500/20 text-teal-300 font-medium' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setDescEditorMode('split')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          descEditorMode === 'split' ? 'bg-teal-500/20 text-teal-300 font-medium' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Split
                      </button>
                      <button
                        type="button"
                        onClick={() => setDescEditorMode('preview')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          descEditorMode === 'preview' ? 'bg-teal-500/20 text-teal-300 font-medium' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Vorschau
                      </button>
                    </div>
                  </div>
                </div>

                {/* WikiLink Picker Popover */}
                {showWikiLinkPicker && (
                  <div className="p-3 bg-slate-900 border border-purple-500/40 rounded-xl space-y-2 text-xs shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-purple-300 text-[11px]">
                        Verknüpfung einfügen (wird als [[Ziel]] eingefügt):
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowWikiLinkPicker(false)}
                        className="text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={wikiLinkSearch}
                      onChange={(e) => setWikiLinkSearch(e.target.value)}
                      placeholder="Thema, Fach oder Mitschrift suchen..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      autoFocus
                    />
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {topics
                        .filter((t) => !wikiLinkSearch || t.title.toLowerCase().includes(wikiLinkSearch.toLowerCase()))
                        .slice(0, 6)
                        .map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleInsertWikiLinkToActiveTarget(`[[${t.title}]]`)}
                            className="p-1.5 rounded bg-slate-950/80 hover:bg-emerald-950/50 text-emerald-300 cursor-pointer flex items-center justify-between text-[11px]"
                          >
                            <span className="truncate">{t.title}</span>
                            <span className="text-[10px] text-slate-500">Lerninhalt</span>
                          </div>
                        ))}
                      {modules
                        .filter(
                          (m) =>
                            !wikiLinkSearch ||
                            m.name.toLowerCase().includes(wikiLinkSearch.toLowerCase()) ||
                            m.code.toLowerCase().includes(wikiLinkSearch.toLowerCase())
                        )
                        .slice(0, 4)
                        .map((m) => (
                          <div
                            key={m.id}
                            onClick={() => handleInsertWikiLinkToActiveTarget(`[[${m.code}]]`)}
                            className="p-1.5 rounded bg-slate-950/80 hover:bg-cyan-950/50 text-cyan-300 cursor-pointer flex items-center justify-between text-[11px]"
                          >
                            <span className="truncate">{m.code} - {m.shortName}</span>
                            <span className="text-[10px] text-slate-500">Modul</span>
                          </div>
                        ))}
                      {notes
                        .filter((n) => !wikiLinkSearch || n.title.toLowerCase().includes(wikiLinkSearch.toLowerCase()))
                        .slice(0, 4)
                        .map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleInsertWikiLinkToActiveTarget(`[[${n.title}]]`)}
                            className="p-1.5 rounded bg-slate-950/80 hover:bg-purple-950/50 text-purple-300 cursor-pointer flex items-center justify-between text-[11px]"
                          >
                            <span className="truncate">{n.title}</span>
                            <span className="text-[10px] text-slate-500">Mitschrift</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Schnell-Symbole Bar */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                    <Calculator className="w-3.5 h-3.5 text-teal-400" />
                    <span>Symbole:</span>
                  </span>
                  {QUICK_SYMBOLS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => insertSymbolIntoTarget(sym, 'description')}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-teal-900/60 text-teal-200 border border-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
                      title={`Symbol "${sym}" einfügen`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>

                {/* Textarea / Split / Preview */}
                <div className={`grid gap-3 ${descEditorMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {descEditorMode !== 'preview' && (
                    <textarea
                      ref={descTextareaRef}
                      rows={8}
                      value={topicForm.description}
                      onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                      placeholder="Erklärung, Definition, Reaktionsmechanismen, Herleitungen oder Zusammenhänge..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-teal-500 resize-y"
                    />
                  )}

                  {(descEditorMode === 'preview' || descEditorMode === 'split') && (
                    <div className="p-3.5 bg-slate-900/80 rounded-xl border border-teal-500/30 text-xs text-slate-200 leading-relaxed max-h-[300px] overflow-y-auto space-y-2">
                      <span className="text-[10px] uppercase font-bold text-teal-400 block tracking-wider">
                        Vorschau:
                      </span>
                      {topicForm.description ? (
                        <div>{renderTextWithWikiLinks(topicForm.description, db, handlers)}</div>
                      ) : (
                        <p className="text-slate-500 italic">Noch keine Beschreibung eingegeben...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Häufige Fehler & Klausurfallen */}
              <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMistakesOpenInModal(!isMistakesOpenInModal)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-amber-500/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider flex items-center gap-2">
                        <span>Häufige Fehler &amp; Klausurfallen</span>
                        {topicForm.commonMistakes && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono font-normal">
                            vorhanden
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-amber-400/80 mt-0.5">
                        Typische Fehlkonzepte, Vorzeichenfehler, Verwechslungen oder Prüfungsfallen
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    <span>{isMistakesOpenInModal ? 'Einklappen' : 'Ausklappen & Bearbeiten'}</span>
                    {isMistakesOpenInModal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isMistakesOpenInModal && (
                  <div className="p-4 border-t border-amber-500/20 bg-slate-950/80 space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                        <Calculator className="w-3.5 h-3.5 text-amber-400" />
                        <span>Symbole:</span>
                      </span>
                      {QUICK_SYMBOLS.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => insertSymbolIntoTarget(sym, 'commonMistakes')}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-amber-900/60 text-amber-200 border border-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>

                    <textarea
                      ref={mistakesTextareaRef}
                      rows={4}
                      value={topicForm.commonMistakes || ''}
                      onChange={(e) => setTopicForm({ ...topicForm, commonMistakes: e.target.value })}
                      placeholder="* Fehler 1: Verwechslung von pKs und pH-Wert...&#10;* Fehler 2: Bei 2-basigen Säuren den Faktor 2 beim Neutralisationspunkt vergessen..."
                      className="w-full bg-slate-900 border border-amber-500/30 rounded-xl p-3 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-amber-400 resize-y"
                    />

                    {topicForm.commonMistakes && (
                      <div className="p-3 bg-slate-900/80 rounded-lg border border-amber-500/20 text-xs text-slate-200 leading-relaxed">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">
                          Vorschau:
                        </span>
                        {renderTextWithWikiLinks(topicForm.commonMistakes, db, handlers)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 7. Eselsbrücken & Merksätze */}
              <div className="border border-teal-500/30 bg-teal-500/5 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMnemonicsOpenInModal(!isMnemonicsOpenInModal)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-teal-500/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-teal-200 uppercase tracking-wider flex items-center gap-2">
                        <span>Eselsbrücken &amp; Merksätze</span>
                        {topicForm.mnemonics && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-teal-500/20 text-teal-300 font-mono font-normal">
                            vorhanden
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-teal-400/80 mt-0.5">
                        Merksprüche, Akronyme, Analogien oder Gedächtnisstützen
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-teal-400 text-xs">
                    <span>{isMnemonicsOpenInModal ? 'Einklappen' : 'Ausklappen & Bearbeiten'}</span>
                    {isMnemonicsOpenInModal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isMnemonicsOpenInModal && (
                  <div className="p-4 border-t border-teal-500/20 bg-slate-950/80 space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                        <Calculator className="w-3.5 h-3.5 text-teal-400" />
                        <span>Symbole:</span>
                      </span>
                      {QUICK_SYMBOLS.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => insertSymbolIntoTarget(sym, 'mnemonics')}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-teal-900/60 text-teal-200 border border-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>

                    <textarea
                      ref={mnemonicsTextareaRef}
                      rows={4}
                      value={topicForm.mnemonics || ''}
                      onChange={(e) => setTopicForm({ ...topicForm, mnemonics: e.target.value })}
                      placeholder="* Merksatz: „Salz über Säure“ für Henderson-Hasselbalch...&#10;* Akronym: „Alle braven Hunde bellen“ für Ag+, Pb2+, Hg2(2+)..."
                      className="w-full bg-slate-900 border border-teal-500/30 rounded-xl p-3 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-teal-400 resize-y"
                    />

                    {topicForm.mnemonics && (
                      <div className="p-3 bg-slate-900/80 rounded-lg border border-teal-500/20 text-xs text-slate-200 leading-relaxed">
                        <span className="text-[10px] uppercase font-bold text-teal-400 block mb-1">
                          Vorschau:
                        </span>
                        {renderTextWithWikiLinks(topicForm.mnemonics, db, handlers)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 8. Wichtige Formeln & Wiederholungsdatum */}
              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Wichtige Formeln / Reaktionen (eine pro Zeile):
                  </label>
                  <textarea
                    rows={2}
                    value={formulasInput}
                    onChange={(e) => setFormulasInput(e.target.value)}
                    placeholder="pH = pKs + lg([A-]/[HA])&#10;beta = dcB / dpH"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Nächste Wiederholung:
                  </label>
                  <input
                    type="date"
                    value={topicForm.nextReviewDate || ''}
                    onChange={(e) => setTopicForm({ ...topicForm, nextReviewDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Spaced Repetition Intervall
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-teal-500/20 transition-colors cursor-pointer"
                >
                  {editingTopic ? 'Änderungen speichern' : 'Lerninhalt speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
