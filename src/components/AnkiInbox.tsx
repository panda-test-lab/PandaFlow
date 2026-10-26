import React, { useState, useMemo } from 'react';
import { 
  Inbox, 
  Download, 
  Copy, 
  Check, 
  Trash2, 
  Edit3, 
  Plus, 
  Filter, 
  Tag as TagIcon, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  HelpCircle,
  FileCode2,
  Image as ImageIcon,
  BookOpen,
  Eye,
  EyeOff,
  Settings2,
  X,
  Upload,
  Link,
  Info,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Bookmark,
  XCircle,
  RefreshCw,
  Hash
} from 'lucide-react';
import { AnkiCard, Module, FlashcardType, QualityCheckList, LearningTopic, StudyMaterial, AnkiCardStatus } from '../types';
import { exportAnkiCardsAsTsv, copyAnkiCardsToClipboard } from '../services/storage';

interface AnkiInboxProps {
  cards: AnkiCard[];
  modules: Module[];
  topics?: LearningTopic[];
  materials?: StudyMaterial[];
  predefinedTags?: string[];
  onAddCard: (card: AnkiCard) => void;
  onUpdateCard: (card: AnkiCard) => void;
  onDeleteCard: (id: string) => void;
  onUpdateStatus: (id: string, status: AnkiCardStatus) => void;
  onSavePredefinedTags?: (tags: string[]) => void;
}

const DEFAULT_PREDEFINED_TAGS = [
  'Semester::1._Semester',
  'Status::Klausurrelevant',
  'Kategorie::Formel',
  'Kategorie::Praktikum',
  'Kategorie::Methodik',
  'Kategorie::Definition',
  'Wichtig',
  'Grundlagen',
  'Prüfung::2026',
];

export const QUALITY_CRITERIA_LIST: { key: keyof QualityCheckList; label: string; description: string }[] = [
  { key: 'singleAspect', label: 'Prüft genau einen Wissensaspekt', description: 'Atomare Karte – nicht mehrere Fragen in einer Karte vermischen' },
  { key: 'clearQuestion', label: 'Frage ist eindeutig', description: 'Missverständnisfreie und präzise Formulierung auf der Vorderseite' },
  { key: 'shortAnswer', label: 'Antwort ist kurz', description: 'Knappe, leicht einprägsame Antwort auf der Rückseite' },
  { key: 'noUnnecessaryInfo', label: 'Keine unnötigen Informationen', description: 'Kein störender Ballast oder Ablenkung' },
  { key: 'notRedundant', label: 'Nicht redundant zu bestehenden Karten', description: 'Kein Doppelgänger oder Duplikat im Anki-Deck' },
  { key: 'correctMapping', label: 'Lerninhalt ist korrekt zugeordnet', description: 'Richtiges Modul-Kürzel & Lerninhalt hinterlegt' },
  { key: 'knownSource', label: 'Quelle ist bekannt', description: 'Nachvollziehbare Literatur-, Buch- oder Vorlesungsquelle' },
];

export function createEmptyQualityCheck(): QualityCheckList {
  return {
    singleAspect: false,
    clearQuestion: false,
    shortAnswer: false,
    noUnnecessaryInfo: false,
    notRedundant: false,
    correctMapping: false,
    knownSource: false,
  };
}

export function getQualityScore(qc?: Partial<QualityCheckList>): {
  count: number;
  total: number;
  isComplete: boolean;
  missingKeys: (keyof QualityCheckList)[];
} {
  const total = QUALITY_CRITERIA_LIST.length;
  if (!qc) return { count: 0, total, isComplete: false, missingKeys: QUALITY_CRITERIA_LIST.map((c) => c.key) };

  let count = 0;
  const missingKeys: (keyof QualityCheckList)[] = [];

  QUALITY_CRITERIA_LIST.forEach((item) => {
    if (qc[item.key]) {
      count++;
    } else {
      missingKeys.push(item.key);
    }
  });

  return {
    count,
    total,
    isComplete: count === total,
    missingKeys,
  };
}

export function normalizeStatus(status?: string): 'entwurf' | 'ueberarbeiten' | 'freigegeben' | 'in_anki' | 'verworfen' {
  if (!status || status === 'inbox' || status === 'entwurf') return 'entwurf';
  if (status === 'ueberarbeiten') return 'ueberarbeiten';
  if (status === 'reviewed' || status === 'freigegeben') return 'freigegeben';
  if (status === 'exported' || status === 'in_anki') return 'in_anki';
  if (status === 'verworfen') return 'verworfen';
  return 'entwurf';
}

export const STATUS_CONFIG: Record<string, { label: string; colorClass: string; bgClass: string; borderClass: string; icon: React.ReactNode }> = {
  entwurf: { 
    label: 'Entwurf', 
    colorClass: 'text-slate-300', 
    bgClass: 'bg-slate-800', 
    borderClass: 'border-slate-700',
    icon: <Clock className="w-3 h-3 text-slate-400" />
  },
  ueberarbeiten: { 
    label: 'Überarbeiten', 
    colorClass: 'text-amber-300', 
    bgClass: 'bg-amber-500/10', 
    borderClass: 'border-amber-500/30',
    icon: <AlertTriangle className="w-3 h-3 text-amber-400" />
  },
  freigegeben: { 
    label: 'Freigegeben', 
    colorClass: 'text-emerald-300', 
    bgClass: 'bg-emerald-500/10', 
    borderClass: 'border-emerald-500/30',
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />
  },
  in_anki: { 
    label: 'In Anki', 
    colorClass: 'text-purple-300', 
    bgClass: 'bg-purple-500/10', 
    borderClass: 'border-purple-500/30',
    icon: <Layers className="w-3 h-3 text-purple-400" />
  },
  verworfen: { 
    label: 'Verworfen', 
    colorClass: 'text-rose-400', 
    bgClass: 'bg-rose-500/10', 
    borderClass: 'border-rose-500/30',
    icon: <XCircle className="w-3 h-3 text-rose-400" />
  },
};

export function generateCardId(
  moduleCode: string | undefined,
  existingCards: AnkiCard[]
): string {
  const cleanCode = (moduleCode || 'CARD').replace(/[\[\]]/g, '').trim() || 'CARD';
  
  let maxNum = 0;
  existingCards.forEach((card) => {
    if (!card.id) return;
    const match = card.id.match(/^\[([^\]]+)\]-(\d{1,6})$/);
    if (match) {
      const codePart = match[1];
      const numPart = parseInt(match[2], 10);
      if (codePart.toLowerCase() === cleanCode.toLowerCase() && !isNaN(numPart)) {
        if (numPart > maxNum) maxNum = numPart;
      }
    } else {
      const digitMatch = card.id.match(/-(\d{1,6})$/);
      if (digitMatch && card.moduleCode?.toLowerCase() === cleanCode.toLowerCase()) {
        const numPart = parseInt(digitMatch[1], 10);
        if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
      }
    }
  });

  const nextNum = maxNum + 1;
  const numFormatted = String(nextNum).padStart(4, '0');
  return `[${cleanCode}]-${numFormatted}`;
}

export const AnkiInbox: React.FC<AnkiInboxProps> = ({
  cards,
  modules,
  topics = [],
  materials = [],
  predefinedTags = DEFAULT_PREDEFINED_TAGS,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onUpdateStatus,
  onSavePredefinedTags,
}) => {
  const [activeTab, setActiveTab] = useState<'entwurf' | 'ueberarbeiten' | 'freigegeben' | 'in_anki' | 'verworfen' | 'all'>('entwurf');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showTagManagerModal, setShowTagManagerModal] = useState<boolean>(false);
  const [editingCard, setEditingCard] = useState<AnkiCard | null>(null);

  // Track flipped state for individual cards in list: Record<cardId, boolean>
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  // Track expanded quality control panel for individual cards in list: Record<cardId, boolean>
  const [expandedQualityCards, setExpandedQualityCards] = useState<Record<string, boolean>>({});

  // Form State for Card Creation / Editing
  const [cardType, setCardType] = useState<FlashcardType>('basic');
  const [frontText, setFrontText] = useState<string>('');
  const [backText, setBackText] = useState<string>('');
  const [explanationText, setExplanationText] = useState<string>('');
  const [frontImageUrl, setFrontImageUrl] = useState<string>('');
  const [backImageUrl, setBackImageUrl] = useState<string>('');
  
  const [selectedModuleId, setSelectedModuleId] = useState<string>(modules[0]?.id || '');
  const [topicInput, setTopicInput] = useState<string>('');
  const [sourcesInput, setSourcesInput] = useState<string>('');
  const [cardStatusForm, setCardStatusForm] = useState<AnkiCardStatus>('entwurf');
  
  const [selectedCardTags, setSelectedCardTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [deckNameInput, setDeckNameInput] = useState<string>('Studium::1_Semester');

  // Form State for Quality Control Checklist (default false)
  const [qualityCheckForm, setQualityCheckForm] = useState<Partial<QualityCheckList>>(createEmptyQualityCheck);

  // Tag Manager State
  const [newTagToAdd, setNewTagToAdd] = useState<string>('');
  const [tagList, setTagList] = useState<string[]>(
    predefinedTags && predefinedTags.length > 0 ? predefinedTags : DEFAULT_PREDEFINED_TAGS
  );

  const getModule = (modId?: string) => modules.find((m) => m.id === modId);

  // Available topics for selected module (from topics prop + existing cards)
  const availableTopicsForModule = useMemo(() => {
    const set = new Set<string>();
    topics
      .filter((t) => !selectedModuleId || t.moduleId === selectedModuleId)
      .forEach((t) => {
        if (t.title) set.add(t.title);
      });
    cards
      .filter((c) => !selectedModuleId || c.moduleId === selectedModuleId)
      .forEach((c) => {
        if (c.topic) set.add(c.topic);
      });
    return Array.from(set);
  }, [topics, cards, selectedModuleId]);

  // Available sources/materials for selected module (from materials prop + existing cards)
  const availableSourcesForModule = useMemo(() => {
    const set = new Set<string>();
    materials
      .filter((m) => !selectedModuleId || m.moduleId === selectedModuleId)
      .forEach((m) => {
        if (m.title) {
          const pageStr = m.pageReference ? `, ${m.pageReference}` : '';
          set.add(`${m.title}${pageStr}`);
        }
      });
    cards
      .filter((c) => !selectedModuleId || c.moduleId === selectedModuleId)
      .forEach((c) => {
        if (c.sources) set.add(c.sources);
      });
    return Array.from(set);
  }, [materials, cards, selectedModuleId]);

  // Computed preview ID for new card
  const newCardIdPreview = useMemo(() => {
    const matchedMod = modules.find((m) => m.id === selectedModuleId);
    return generateCardId(matchedMod?.code, cards);
  }, [selectedModuleId, modules, cards]);

  const toggleCardFlip = (id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleQualityExpand = (id: string) => {
    setExpandedQualityCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleCardQualityItem = (card: AnkiCard, itemKey: keyof QualityCheckList) => {
    const currentQC = card.qualityCheck || {};
    const updatedQC: Partial<QualityCheckList> = {
      ...currentQC,
      [itemKey]: !currentQC[itemKey],
    };
    onUpdateCard({
      ...card,
      qualityCheck: updatedQC,
    });
  };

  const filteredCards = cards.filter((c) => {
    const norm = normalizeStatus(c.status);
    if (activeTab !== 'all' && norm !== activeTab) return false;
    if (selectedModuleFilter !== 'all' && c.moduleId !== selectedModuleFilter) return false;
    if (selectedTypeFilter !== 'all' && (c.cardType || 'basic') !== selectedTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (c.id || '').toLowerCase().includes(q);
      const matchFront = c.front.toLowerCase().includes(q);
      const matchBack = c.back.toLowerCase().includes(q);
      const matchTopic = (c.topic || '').toLowerCase().includes(q);
      const matchSources = (c.sources || '').toLowerCase().includes(q);
      const matchCode = (c.moduleCode || '').toLowerCase().includes(q);
      const matchTags = c.tags && c.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchId && !matchFront && !matchBack && !matchTopic && !matchSources && !matchCode && !matchTags) return false;
    }
    return true;
  });

  const entwurfCount = cards.filter((c) => normalizeStatus(c.status) === 'entwurf').length;
  const ueberarbeitenCount = cards.filter((c) => normalizeStatus(c.status) === 'ueberarbeiten').length;
  const freigegebenCount = cards.filter((c) => normalizeStatus(c.status) === 'freigegeben').length;
  const inAnkiCount = cards.filter((c) => normalizeStatus(c.status) === 'in_anki').length;
  const verworfenCount = cards.filter((c) => normalizeStatus(c.status) === 'verworfen').length;

  const handleExportSelected = () => {
    const toExport = cards.filter((c) => normalizeStatus(c.status) === 'freigegeben' || normalizeStatus(c.status) === 'in_anki');
    const exportTargets = toExport.length > 0 ? toExport : (activeTab === 'all' ? cards : filteredCards);
    if (exportTargets.length === 0) return;

    exportAnkiCardsAsTsv(exportTargets);

    exportTargets.forEach((c) => {
      onUpdateStatus(c.id, 'in_anki');
    });
  };

  const handleCopyToClipboard = async () => {
    const toExport = activeTab === 'all' ? cards : filteredCards;
    if (toExport.length === 0) return;

    const success = await copyAnkiCardsToClipboard(toExport);
    if (success) {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  const handleOpenAdd = () => {
    setEditingCard(null);
    setCardType('basic');
    setFrontText('');
    setBackText('');
    setExplanationText('');
    setFrontImageUrl('');
    setBackImageUrl('');
    setSelectedModuleId(modules[0]?.id || '');
    setTopicInput('');
    setSourcesInput('');
    setCardStatusForm('entwurf');
    setSelectedCardTags(['Semester::1._Semester', 'Status::Klausurrelevant']);
    setCustomTagInput('');
    setDeckNameInput('Studium::1_Semester');
    setQualityCheckForm(createEmptyQualityCheck());
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: AnkiCard) => {
    setEditingCard(c);
    setCardType(c.cardType || 'basic');
    setFrontText(c.front || '');
    setBackText(c.back || '');
    setExplanationText(c.explanation || '');
    setFrontImageUrl(c.frontImageUrl || '');
    setBackImageUrl(c.backImageUrl || '');
    setSelectedModuleId(c.moduleId || modules[0]?.id || '');
    setTopicInput(c.topic || '');
    setSourcesInput(c.sources || '');
    setCardStatusForm(normalizeStatus(c.status));
    setSelectedCardTags(c.tags || []);
    setCustomTagInput('');
    setDeckNameInput(c.deckName || 'Studium::1_Semester');
    setQualityCheckForm(
      c.qualityCheck || createEmptyQualityCheck()
    );
    setShowAddModal(true);
  };

  // Toggle quick tag selection
  const handleToggleTag = (tag: string) => {
    if (selectedCardTags.includes(tag)) {
      setSelectedCardTags(selectedCardTags.filter((t) => t !== tag));
    } else {
      setSelectedCardTags([...selectedCardTags, tag]);
    }
  };

  // Add custom tag on the fly
  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim().replace(/^#/, '');
    if (!trimmed) return;
    if (!selectedCardTags.includes(trimmed)) {
      setSelectedCardTags([...selectedCardTags, trimmed]);
    }
    if (!tagList.includes(trimmed)) {
      const updatedList = [...tagList, trimmed];
      setTagList(updatedList);
      if (onSavePredefinedTags) onSavePredefinedTags(updatedList);
    }
    setCustomTagInput('');
  };

  // Insert Cloze Bracket Helper {{c1::Anordnung}}
  const handleInsertCloze = (clozeNum: number = 1) => {
    setFrontText((prev) => `${prev} {{c${clozeNum}::Lückenbegriff}}`);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardType === 'basic' && (!frontText.trim() || !backText.trim())) return;
    if (cardType === 'cloze' && !frontText.trim()) return;
    if (cardType === 'image_occlusion' && (!frontImageUrl.trim() && !frontText.trim())) return;

    const matchedMod = modules.find((m) => m.id === selectedModuleId);
    const modCode = matchedMod ? matchedMod.code : '';

    const cardId = editingCard ? editingCard.id : generateCardId(modCode, cards);

    const newCardData: AnkiCard = {
      id: cardId,
      cardType,
      front: frontText.trim() || (cardType === 'image_occlusion' ? 'Image Occlusion Karte' : ''),
      back: backText.trim() || (cardType === 'cloze' ? frontText.trim() : ''),
      explanation: explanationText.trim() || undefined,
      frontImageUrl: frontImageUrl.trim() || undefined,
      backImageUrl: backImageUrl.trim() || undefined,
      moduleId: selectedModuleId || undefined,
      moduleCode: modCode || undefined,
      topic: topicInput.trim() || undefined,
      sources: sourcesInput.trim() || undefined,
      qualityCheck: qualityCheckForm,
      tags: selectedCardTags,
      status: cardStatusForm,
      createdAt: editingCard ? editingCard.createdAt : new Date().toISOString(),
      deckName: deckNameInput || 'Studium::1_Semester',
    };

    if (editingCard) {
      onUpdateCard(newCardData);
    } else {
      onAddCard(newCardData);
    }

    setShowAddModal(false);
  };

  const handleAddNewPredefinedTag = () => {
    const trimmed = newTagToAdd.trim().replace(/^#/, '');
    if (!trimmed) return;
    if (!tagList.includes(trimmed)) {
      const updated = [...tagList, trimmed];
      setTagList(updated);
      if (onSavePredefinedTags) onSavePredefinedTags(updated);
    }
    setNewTagToAdd('');
  };

  const handleDeletePredefinedTag = (tag: string) => {
    const updated = tagList.filter((t) => t !== tag);
    setTagList(updated);
    if (onSavePredefinedTags) onSavePredefinedTags(updated);
  };

  // Render Cloze Front Preview (Concealed Brackets)
  const renderClozeFront = (text: string) => {
    return text.replace(/\{\{c\d+::([^}]+)\}\}/g, '[...]');
  };

  // Render Cloze Back Preview (Highlighted Answer)
  const renderClozeBack = (text: string) => {
    const parts = text.split(/(\{\{c\d+::[^}]+\}\})/g);
    return parts.map((part, idx) => {
      const match = part.match(/\{\{c\d+::([^}]+)\}\}/);
      if (match) {
        return (
          <span
            key={idx}
            className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 rounded mx-0.5"
          >
            {match[1]}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Lernkarten-Kuration & Anki-Export</span>
              <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full font-mono">
                {cards.length} Karten
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Eindeutige Karten-IDs (<code className="text-cyan-300 font-mono">[Kürzel]-####</code>), Qualitätskontrolle & freier Anki-Export
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowTagManagerModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Vordefinierte Schnellauswahl-Tags verwalten"
          >
            <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tags verwalten</span>
          </button>

          <button
            type="button"
            onClick={handleCopyToClipboard}
            disabled={filteredCards.length === 0}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="TSV für Anki in Zwischenablage kopieren"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Kopieren (TSV)</span>
          </button>

          <button
            type="button"
            onClick={handleExportSelected}
            disabled={filteredCards.length === 0}
            className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Standard Anki Text/TSV-Datei herunterladen"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Anki-Export (.txt)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Neue Lernkarte</span>
          </button>
        </div>
      </div>

      {copiedNotification && (
        <div className="p-3 bg-cyan-950/60 border border-cyan-500/40 rounded-xl text-xs text-cyan-300 flex items-center gap-2">
          <Check className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Karten im Anki-Format in die Zwischenablage kopiert! Direkt bereit zum Einfügen in Anki.</span>
        </div>
      )}

      {/* Tabs and Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
        {/* Status Tab Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab('entwurf')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'entwurf'
                ? 'bg-slate-700 text-slate-100 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Entwurf ({entwurfCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('ueberarbeiten')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ueberarbeiten'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-amber-400 hover:text-amber-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Überarbeiten ({ueberarbeitenCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('freigegeben')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'freigegeben'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-emerald-400 hover:text-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Freigegeben ({freigegebenCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('in_anki')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'in_anki'
                ? 'bg-purple-500 text-slate-950 font-bold shadow-sm'
                : 'text-purple-400 hover:text-purple-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>In Anki ({inAnkiCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('verworfen')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'verworfen'
                ? 'bg-rose-500 text-slate-950 font-bold shadow-sm'
                : 'text-rose-400 hover:text-rose-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Verworfen ({verworfenCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Alle ({cards.length})
          </button>
        </div>

        {/* Type & Module Filter & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option value="all">Alle Typen</option>
            <option value="basic">Basic (Frage / Antwort)</option>
            <option value="cloze">Cloze (Lückentext)</option>
            <option value="image_occlusion">Image Occlusion</option>
          </select>

          <select
            value={selectedModuleFilter}
            onChange={(e) => setSelectedModuleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option value="all">Alle Module / Kürzel</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code ? `${m.code} (${m.shortName})` : m.shortName}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suchen (ID, Lerninhalt, Tag)..."
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-48"
          />
        </div>
      </div>

      {/* Cards List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCards.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <Inbox className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">Keine Lernkarten in dieser Ansicht</h3>
            <p className="text-xs text-slate-500">
              Erstelle deine erste Lernkarte mit eindeutiger ID <code className="text-cyan-300 font-mono">[Kürzel]-####</code> und Anknüpfung an Lerninhalte.
            </p>
          </div>
        ) : (
          filteredCards.map((card) => {
            const mod = getModule(card.moduleId);
            const isFlipped = !!flippedCards[card.id];
            const isQualityExpanded = !!expandedQualityCards[card.id];
            const cType = card.cardType || 'basic';
            const qScore = getQualityScore(card.qualityCheck);
            const normStatus = normalizeStatus(card.status);
            const stConf = STATUS_CONFIG[normStatus];

            return (
              <div
                key={card.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group relative overflow-hidden"
              >
                <div className="space-y-3.5">
                  {/* Top Header: Unique Card ID + Type + Module Code + Date */}
                  <div className="flex items-center justify-between gap-2 text-[11px] flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* UNIQUE CARD ID BADGE */}
                      <span className="font-mono font-bold text-xs text-cyan-300 bg-slate-950 border border-cyan-500/30 px-2 py-0.5 rounded shadow-sm">
                        {card.id}
                      </span>

                      {/* Card Type Badge */}
                      <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 border ${
                        cType === 'cloze'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : cType === 'image_occlusion'
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {cType === 'cloze' && <FileCode2 className="w-3 h-3 text-amber-400" />}
                        {cType === 'image_occlusion' && <ImageIcon className="w-3 h-3 text-purple-400" />}
                        {cType === 'basic' && <HelpCircle className="w-3 h-3 text-cyan-400" />}
                        <span>
                          {cType === 'cloze' ? 'Lückentext' : cType === 'image_occlusion' ? 'Image Occlusion' : 'Basic'}
                        </span>
                      </span>

                      {/* Module Code Badge */}
                      {(card.moduleCode || mod?.code) && (
                        <span
                          style={{ color: mod?.color || '#06b6d4' }}
                          className="font-mono font-bold px-2 py-0.5 bg-slate-950 border border-slate-800 rounded"
                        >
                          {card.moduleCode || mod?.code}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {card.createdAt.split('T')[0]}
                    </span>
                  </div>

                  {/* LERNINHALT & SOURCES LINE */}
                  <div className="space-y-1">
                    {card.topic && (
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800">
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-slate-400">Lerninhalt:</span>
                        <span className="text-cyan-300 truncate">{card.topic}</span>
                      </div>
                    )}

                    {card.sources && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800/80">
                        <BookOpen className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">Quelle: {card.sources}</span>
                      </div>
                    )}
                  </div>

                  {/* CARD CONTENT DISPLAY (FRONT vs BACK) */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3 min-h-[110px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
                        <span>{isFlipped ? 'Rückseite (Antwort & Lösung)' : 'Vorderseite (Frage / Lücke)'}</span>
                        <span className="text-cyan-400">{isFlipped ? 'REVEALED' : 'HIDDEN'}</span>
                      </div>

                      {/* BASIC CARD TYPE */}
                      {cType === 'basic' && (
                        <div className="text-xs text-slate-200 leading-relaxed font-medium">
                          {!isFlipped ? (
                            card.front
                          ) : (
                            <div className="space-y-2">
                              <div className="text-cyan-300 font-semibold">{card.back}</div>
                              {card.explanation && (
                                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-300 space-y-1">
                                  <span className="text-[10px] font-bold text-cyan-400 block uppercase">Erklärung:</span>
                                  <p>{card.explanation}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* CLOZE CARD TYPE */}
                      {cType === 'cloze' && (
                        <div className="text-xs text-slate-200 leading-relaxed font-medium">
                          {!isFlipped ? (
                            <span className="text-amber-200/90">{renderClozeFront(card.front)}</span>
                          ) : (
                            <div className="space-y-2">
                              <div>{renderClozeBack(card.front)}</div>
                              {card.explanation && (
                                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-300 space-y-1">
                                  <span className="text-[10px] font-bold text-amber-400 block uppercase">Erklärung:</span>
                                  <p>{card.explanation}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* IMAGE OCCLUSION CARD TYPE */}
                      {cType === 'image_occlusion' && (
                        <div className="space-y-2 text-xs text-slate-200">
                          <p className="font-semibold text-slate-300">{card.front}</p>
                          
                          {!isFlipped ? (
                            card.frontImageUrl ? (
                              <div className="relative rounded-lg overflow-hidden border border-slate-800 max-h-48 bg-slate-900 flex items-center justify-center">
                                <img
                                  src={card.frontImageUrl}
                                  alt="Verdecktes Bild"
                                  className="w-full h-auto object-cover max-h-48 filter contrast-105"
                                />
                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] rounded font-bold uppercase">
                                  Verdeckt
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 text-center bg-slate-900 rounded-lg border border-slate-800 text-slate-500 text-xs">
                                Kein Bild hinterlegt
                              </div>
                            )
                          ) : (
                            <div className="space-y-2">
                              {card.backImageUrl || card.frontImageUrl ? (
                                <div className="relative rounded-lg overflow-hidden border border-slate-800 max-h-48 bg-slate-900 flex items-center justify-center">
                                  <img
                                    src={card.backImageUrl || card.frontImageUrl}
                                    alt="Offenes Bild"
                                    className="w-full h-auto object-cover max-h-48"
                                  />
                                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] rounded font-bold uppercase">
                                    Offen / Aufgelöst
                                  </div>
                                </div>
                              ) : null}

                              <p className="text-cyan-300 font-semibold">{card.back}</p>

                              {card.explanation && (
                                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-300 space-y-1">
                                  <span className="text-[10px] font-bold text-purple-400 block uppercase">Erklärung & Details:</span>
                                  <p>{card.explanation}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* FLIP CARD TOGGLE BUTTON */}
                    <button
                      type="button"
                      onClick={() => toggleCardFlip(card.id)}
                      className="w-full py-1.5 mt-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {isFlipped ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          <span>Vorderseite anzeigen (verdecken)</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Rückseite aufdecken (Antwort)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* QUALITÄTSKONTROLLE (CHECKLISTE & EMPFEHLUNG) BAR */}
                  <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 ${qScore.isComplete ? 'text-emerald-400' : 'text-amber-400'}`} />
                        <span className="text-xs font-bold text-slate-200">Qualitätskontrolle:</span>
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                          qScore.isComplete
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}>
                          {qScore.count} / {qScore.total} Punkte
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleQualityExpand(card.id)}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium transition-colors"
                      >
                        <span>{isQualityExpanded ? 'Schließen' : 'Checkliste'}</span>
                        {isQualityExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* LIVE RECOMMENDATION BADGE */}
                    {qScore.isComplete ? (
                      <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-emerald-300 font-semibold gap-2">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Empfehlung: Karte in Anki übernehmen</span>
                        </div>
                        {normStatus !== 'freigegeben' && normStatus !== 'in_anki' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(card.id, 'freigegeben')}
                            className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded hover:bg-emerald-400 transition-colors shrink-0"
                          >
                            Freigeben
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-950/40 border border-amber-500/30 rounded-lg flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Empfehlung: Karte überarbeiten (Noch {qScore.total - qScore.count} Kriterien offen)</span>
                      </div>
                    )}

                    {/* EXPANDABLE QUALITY CHECKLIST ITEMS */}
                    {isQualityExpanded && (
                      <div className="pt-2 border-t border-slate-800 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                          Kriterien im Detail prüfen & abhakeln:
                        </span>
                        {QUALITY_CRITERIA_LIST.map((item) => {
                          const isChecked = !!(card.qualityCheck && card.qualityCheck[item.key]);
                          return (
                            <button
                              type="button"
                              key={item.key}
                              onClick={() => handleToggleCardQualityItem(card, item.key)}
                              className={`w-full text-left p-2 rounded-lg text-xs flex items-start gap-2 border transition-all ${
                                isChecked
                                  ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              {isChecked ? (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className={`font-semibold block ${isChecked ? 'text-slate-100' : 'text-slate-400'}`}>
                                  {item.label}
                                </span>
                                <span className="text-[10px] text-slate-500">{item.description}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* TAGS CHIPS DISPLAY */}
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {card.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-cyan-300 text-[10px] rounded font-mono font-medium flex items-center gap-1"
                        >
                          <TagIcon className="w-2.5 h-2.5 text-cyan-500/80 shrink-0" />
                          <span>{t}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* BOTTOM STATUS SELECTOR & ACTIONS */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs gap-2">
                  {/* Status Dropdown Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Status:</span>
                    <select
                      value={normStatus}
                      onChange={(e) => onUpdateStatus(card.id, e.target.value as AnkiCardStatus)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border focus:outline-none transition-colors ${stConf.bgClass} ${stConf.colorClass} ${stConf.borderClass}`}
                    >
                      <option value="entwurf">Entwurf</option>
                      <option value="ueberarbeiten">Überarbeiten</option>
                      <option value="freigegeben">Freigegeben</option>
                      <option value="in_anki">In Anki</option>
                      <option value="verworfen">Verworfen</option>
                    </select>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(card)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                      title="Karte bearbeiten"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteCard(card.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
                      title="Karte löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT CARD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">
                      {editingCard ? 'Lernkarte bearbeiten' : 'Neue Lernkarte erstellen'}
                    </h3>
                    <span className="font-mono text-xs font-bold text-cyan-300 bg-slate-950 border border-cyan-500/30 px-2 py-0.5 rounded">
                      {editingCard ? editingCard.id : newCardIdPreview}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generiert automatisch ID im Format <code className="text-cyan-300 font-mono">[Kürzel]-####</code>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FORM BODY */}
            <form onSubmit={handleSaveCard} className="space-y-4">
              {/* STATUS SELECTOR IN FORM */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                  Karten-Status festlegen:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {(['entwurf', 'ueberarbeiten', 'freigegeben', 'in_anki', 'verworfen'] as AnkiCardStatus[]).map((st) => {
                    const isSel = cardStatusForm === st;
                    const conf = STATUS_CONFIG[st];
                    return (
                      <button
                        type="button"
                        key={st}
                        onClick={() => setCardStatusForm(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
                          isSel
                            ? `${conf.bgClass} ${conf.colorClass} ${conf.borderClass} ring-1 ring-cyan-500/50 scale-105`
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {conf.icon}
                        <span>{conf.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CARD TYPE SELECTOR TABS */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                  Kartentyp wählen:
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCardType('basic')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      cardType === 'basic'
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Basic</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCardType('two_ways')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      cardType === 'two_ways'
                        ? 'bg-teal-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Two Ways</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCardType('cloze')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      cardType === 'cloze'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileCode2 className="w-4 h-4" />
                    <span>Cloze</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCardType('image_occlusion')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      cardType === 'image_occlusion'
                        ? 'bg-purple-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Image Occlusion</span>
                  </button>
                </div>
              </div>

              {/* CARD TYPE SPECIFIC FIELDS */}
              {(cardType === 'basic' || cardType === 'two_ways') && (
                <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Vorderseite: Frage * {cardType === 'two_ways' && <span className="text-teal-400 font-mono text-[10px]">(Beidseitig abfragbar)</span>}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={frontText}
                      onChange={(e) => setFrontText(e.target.value)}
                      placeholder="z.B. Wie lautet die Henderson-Hasselbalch-Gleichung?"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Vorderseite Bild-URL (optional)
                    </label>
                    <input
                      type="text"
                      value={frontImageUrl}
                      onChange={(e) => setFrontImageUrl(e.target.value)}
                      placeholder="https://... oder Data-URL für Bild auf Vorderseite"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Rückseite: Antwort *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={backText}
                      onChange={(e) => setBackText(e.target.value)}
                      placeholder="z.B. pH = pKs + lg([A-] / [HA])"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Rückseite Bild-URL (optional)
                    </label>
                    <input
                      type="text"
                      value={backImageUrl}
                      onChange={(e) => setBackImageUrl(e.target.value)}
                      placeholder="https://... oder Data-URL für Bild auf Rückseite"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Zusätzliche Erklärung (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={explanationText}
                      onChange={(e) => setExplanationText(e.target.value)}
                      placeholder="Erläuterung, Hintergründe, Eselsbrücken..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {cardType === 'cloze' && (
                <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-300 block">
                      Vorderseite: Lückentext *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleInsertCloze(1)}
                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[11px] font-bold"
                      >
                        + Lücke c1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertCloze(2)}
                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[11px] font-bold"
                      >
                        + Lücke c2
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    required
                    value={frontText}
                    onChange={(e) => setFrontText(e.target.value)}
                    placeholder="Die Formel für {{c1::kinetische Energie}} lautet {{c2::E = 1/2 m v²}}."
                    className="w-full bg-slate-900 border border-amber-500/30 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                  />

                  <div className="p-2.5 bg-amber-950/30 border border-amber-500/20 rounded-lg text-[11px] text-amber-300/90 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      Verwende <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300 font-mono">{`{{c1::Lückenwort}}`}</code> für Anki-Lückentexte.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Zusätzliche Erklärung / Vollständiger Kontext (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={explanationText}
                      onChange={(e) => setExplanationText(e.target.value)}
                      placeholder="Hintergrundwissen zur Lücke..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {cardType === 'image_occlusion' && (
                <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-xs font-semibold text-purple-300 block mb-1">
                      Karten-Titel / Aufgabenstellung
                    </label>
                    <input
                      type="text"
                      value={frontText}
                      onChange={(e) => setFrontText(e.target.value)}
                      placeholder="z.B. Beschrifte die verdeckten Diagrammbereiche:"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1">
                        Verdecktes Bild (Vorderseite URL / Base64)
                      </label>
                      <input
                        type="text"
                        value={frontImageUrl}
                        onChange={(e) => setFrontImageUrl(e.target.value)}
                        placeholder="https://... oder Data-URL"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1">
                        Offenes Bild (Rückseite URL / Lösung)
                      </label>
                      <input
                        type="text"
                        value={backImageUrl}
                        onChange={(e) => setBackImageUrl(e.target.value)}
                        placeholder="https://... oder Data-URL"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Lösung / Beschriftungen
                    </label>
                    <textarea
                      rows={2}
                      value={backText}
                      onChange={(e) => setBackText(e.target.value)}
                      placeholder="z.B. 1 = Epidermis, 2 = Phloem, 3 = Xylem"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-purple-300 font-medium focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Zusätzliche Erklärung (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={explanationText}
                      onChange={(e) => setExplanationText(e.target.value)}
                      placeholder="Anatomische Details, Besonderheiten..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              )}

              {/* METADATA: MODUL (DROPDOWN), LERNINHALTE (DROPDOWN + CUSTOM), QUELLEN (DROPDOWN + CUSTOM) */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                  Karteninformationen & Lerninhalt:
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Modul (Kürzel) Selector */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Modul (Kürzel) *
                    </label>
                    <select
                      value={selectedModuleId}
                      onChange={(e) => setSelectedModuleId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                    >
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code ? `${m.code} - ${m.shortName}` : m.shortName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Anknüpfung an Lerninhalt (Dropdown + Custom Input) */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Anknüpfung an Lerninhalt
                    </label>
                    {availableTopicsForModule.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) setTopicInput(e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 mb-1.5 focus:outline-none focus:border-cyan-500 font-medium"
                      >
                        <option value="">-- Aus angelegten Lerninhalten wählen --</option>
                        {availableTopicsForModule.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      placeholder="Neuen Lerninhalt eingeben..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Quellen Dropdown + Custom Input */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Quellen / Literatur
                    </label>
                    {availableSourcesForModule.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) setSourcesInput(e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 mb-1.5 focus:outline-none focus:border-cyan-500 font-medium"
                      >
                        <option value="">-- Aus hinterlegten Quellen wählen --</option>
                        {availableSourcesForModule.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      value={sourcesInput}
                      onChange={(e) => setSourcesInput(e.target.value)}
                      placeholder="z.B. Lehrbuch S. 142, VL-Skript 03"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* TAGS PRESETS & QUICK SELECTION */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                    Vordefinierte Schnellauswahl-Tags:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTagManagerModal(true)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>Tags verwalten</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap p-3 bg-slate-950 rounded-xl border border-slate-800">
                  {tagList.map((tag) => {
                    const isSelected = selectedCardTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleToggleTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 shadow-sm font-bold scale-105'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                        }`}
                      >
                        <TagIcon className="w-3 h-3 shrink-0" />
                        <span>{tag}</span>
                        {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    placeholder="Tag eingeben (z.B. Modul::E-Chemie) & Enter..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>

              {/* QUALITÄTSKONTROLLE CHECKLISTE & EMPFEHLUNG IN FORM */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Qualitätskontrolle (7 Kriterien Checkliste):</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  {QUALITY_CRITERIA_LIST.map((item) => {
                    const isChecked = !!qualityCheckForm[item.key];
                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => {
                          setQualityCheckForm((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key],
                          }));
                        }}
                        className={`text-left p-2 rounded-lg text-xs flex items-start gap-2 border transition-all ${
                          isChecked
                            ? 'bg-emerald-950/30 border-emerald-500/40 text-slate-100'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-semibold block leading-tight">{item.label}</span>
                          <span className="text-[10px] text-slate-500">{item.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* REALTIME RECOMMENDATION IN FORM */}
                {(() => {
                  const score = getQualityScore(qualityCheckForm);
                  if (score.isComplete) {
                    return (
                      <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold block text-emerald-200">
                            Empfehlung: Karte in Anki übernehmen!
                          </span>
                          <span className="text-[11px] text-emerald-300/80">
                            Alle 7 Qualitätskriterien wurden erfüllt.
                          </span>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-3 bg-amber-950/60 border border-amber-500/50 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <span className="font-bold block text-amber-200">
                            Empfehlung: Karte überarbeiten
                          </span>
                          <span className="text-[11px] text-amber-300/80">
                            Noch {score.total - score.count} von 7 Kriterien offen. Prüfe die Punkte vor dem Export.
                          </span>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCard ? 'Karte speichern' : 'Karte erstellen'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAG MANAGER MODAL */}
      {showTagManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
                <Settings2 className="w-4 h-4 text-cyan-400" />
                <span>Vordefinierte Schnellauswahl-Tags verwalten</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTagManagerModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Erstelle beliebige Tag-Strukturen wie <code className="text-cyan-300 font-mono">Modul::E-Chemie</code> oder <code className="text-cyan-300 font-mono">Semester::1._Semester</code> für perfekte Sortierbarkeit in Anki.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTagToAdd}
                onChange={(e) => setNewTagToAdd(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewPredefinedTag();
                  }
                }}
                placeholder="Tag z.B. Modul::E-Chemie eingeben..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="button"
                onClick={handleAddNewPredefinedTag}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs"
              >
                Hinzufügen
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
              {tagList.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center justify-between p-2 bg-slate-900/80 rounded-lg text-xs text-slate-200 border border-slate-800/80 font-mono"
                >
                  <span className="text-cyan-300 font-medium">{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleDeletePredefinedTag(tag)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTagManagerModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
