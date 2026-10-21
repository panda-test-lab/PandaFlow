import React, { useState } from 'react';
import { 
  Paperclip, 
  ExternalLink, 
  Plus, 
  Book, 
  FileText, 
  Bookmark, 
  Search, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  Tag, 
  BookMarked, 
  Scale,
  FileCheck2,
  ShieldCheck,
  Table
} from 'lucide-react';
import { StudyMaterial, Module, MaterialType, ModuleHandbook, StudyRegulations, ModuleOverviewDocument } from '../types';
import { ModuleHandbookModal } from './ModuleHandbookModal';
import { StudyRegulationsModal } from './StudyRegulationsModal';
import { ModuleOverviewModal } from './ModuleOverviewModal';

interface MaterialsViewProps {
  materials: StudyMaterial[];
  modules: Module[];
  moduleHandbook?: ModuleHandbook;
  studyRegulations?: StudyRegulations;
  moduleOverview?: ModuleOverviewDocument;
  onAddMaterial: (mat: StudyMaterial) => void;
  onUpdateMaterial: (mat: StudyMaterial) => void;
  onDeleteMaterial: (id: string) => void;
  onSaveHandbook: (handbook: ModuleHandbook | undefined) => void;
  onSaveRegulations: (regulations: StudyRegulations | undefined) => void;
  onSaveOverview: (overview: ModuleOverviewDocument | undefined) => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  materials,
  modules,
  moduleHandbook,
  studyRegulations,
  moduleOverview,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onSaveHandbook,
  onSaveRegulations,
  onSaveOverview,
}) => {
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showHandbookModal, setShowHandbookModal] = useState<boolean>(false);
  const [showRegulationsModal, setShowRegulationsModal] = useState<boolean>(false);
  const [showOverviewModal, setShowOverviewModal] = useState<boolean>(false);
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterial | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [materialForm, setMaterialForm] = useState<Partial<StudyMaterial>>({
    moduleId: modules[0]?.id || '',
    title: '',
    type: 'skript',
    url: '',
    annotations: '',
    pageReference: '',
  });

  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setMaterialForm({
      moduleId: modules[0]?.id || '',
      title: '',
      type: 'skript',
      url: '',
      annotations: '',
      pageReference: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (mat: StudyMaterial) => {
    setEditingMaterial(mat);
    setMaterialForm(mat);
    setShowAddModal(true);
  };

  const handleCopyLink = (url: string, id: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getModule = (modId?: string): Module | undefined => {
    return modules.find((m) => m.id === modId);
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesModule = selectedModuleFilter === 'all' || m.moduleId === selectedModuleFilter;
    const matchesType = selectedTypeFilter === 'all' || m.type === selectedTypeFilter;
    const matchesSearch =
      searchQuery === '' ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.annotations.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModule && matchesType && matchesSearch;
  });

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.title?.trim() || !materialForm.moduleId) return;

    if (editingMaterial) {
      onUpdateMaterial({
        ...editingMaterial,
        moduleId: materialForm.moduleId,
        title: materialForm.title.trim(),
        type: materialForm.type || 'skript',
        url: materialForm.url?.trim() || '',
        annotations: materialForm.annotations?.trim() || '',
        pageReference: materialForm.pageReference?.trim() || '',
      });
    } else {
      const newMat: StudyMaterial = {
        id: `mat-${Date.now()}`,
        moduleId: materialForm.moduleId,
        title: materialForm.title.trim(),
        type: materialForm.type || 'skript',
        url: materialForm.url?.trim() || '',
        annotations: materialForm.annotations?.trim() || '',
        pageReference: materialForm.pageReference?.trim() || '',
        addedAt: new Date().toISOString().split('T')[0],
      };
      onAddMaterial(newMat);
    }
    setShowAddModal(false);
  };

  const typeIcons: Record<MaterialType, React.ReactNode> = {
    buch: <Book className="w-4 h-4 text-emerald-400" />,
    folien: <FileText className="w-4 h-4 text-cyan-400" />,
    skript: <FileText className="w-4 h-4 text-teal-400" />,
    uebungsblatt: <Bookmark className="w-4 h-4 text-amber-400" />,
    altklausur: <Bookmark className="w-4 h-4 text-purple-400" />,
    link: <Paperclip className="w-4 h-4 text-blue-400" />,
  };

  const typeLabels: Record<MaterialType, string> = {
    buch: 'Lehrbuch / Monographie',
    folien: 'Vorlesungsfolien',
    skript: 'Praktikumsskript',
    uebungsblatt: 'Übungsblatt',
    altklausur: 'Altklausur',
    link: 'Weblink / Cloud-Ressource',
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400">
            <Paperclip className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Material- & Literaturverwaltung
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Hinterlegte Universitäts-Dokumente & Links zu Skripten, Lehrbüchern und Vorlesungsfolien</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowOverviewModal(true)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Table className="w-3.5 h-3.5 text-blue-400" />
            <span>Modulübersicht</span>
          </button>

          <button
            onClick={() => setShowRegulationsModal(true)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span>Studienordnung</span>
          </button>

          <button
            onClick={() => setShowHandbookModal(true)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <BookMarked className="w-3.5 h-3.5 text-teal-400" />
            <span>Modulhandbuch</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-teal-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Material verlinken</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Offizielle Universitäts- & Studiendokumente (Global, keinem Modul zugeordnet) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Offizielle Universitäts- & Studiendokumente (Global / Modulunabhängig)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Zentrale Studiengangsdokumente – werden keinem einzelnen Modul zugeordnet
          </span>
        </div>

        {/* Triple Cards: Modulübersicht, Modulhandbuch & Studienordnung */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1: Modulübersicht */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-500/30 rounded-2xl shadow-xl flex flex-col justify-between space-y-4 min-w-0 overflow-hidden">
            <div className="space-y-3 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 shrink-0">
                    <Table className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded truncate inline-block max-w-full">
                      Modulübersicht (Curriculum)
                    </span>
                    <h4 className="text-sm font-bold text-slate-100 mt-1 truncate">
                      {moduleOverview ? moduleOverview.title : 'Modulübersicht & Kürzel'}
                    </h4>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed break-words">
                {moduleOverview
                  ? (moduleOverview.description || 'Übersicht über alle Module mitsamt den offiziellen Kürzeln hinterlegt.')
                  : 'Lade hier eine Übersicht aller Module mitsamt Kürzeln als PDF oder CSV-Tabelle hoch.'}
              </p>

              {moduleOverview && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span className="text-blue-400">{moduleOverview.universityName}</span>
                  {moduleOverview.versionOrYear && (
                    <>
                      <span>·</span>
                      <span>{moduleOverview.versionOrYear}</span>
                    </>
                  )}
                  {moduleOverview.fileName && (
                    <>
                      <span>·</span>
                      <span className="text-blue-300 truncate max-w-[200px]">📄 {moduleOverview.fileName}</span>
                    </>
                  )}
                  {moduleOverview.fileSize && (
                    <span className="text-slate-500">({moduleOverview.fileSize})</span>
                  )}
                  {moduleOverview.url && (
                    <span className="text-blue-400/80">🌐 Weblink</span>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 min-w-0">
              <span className="text-[11px] text-slate-500 truncate">
                {moduleOverview?.pdfData || moduleOverview?.csvData ? 'Übersicht aktiv hinterlegt' : moduleOverview?.url ? 'Weblink hinterlegt' : 'Noch nicht hinterlegt'}
              </span>
              <button
                type="button"
                onClick={() => setShowOverviewModal(true)}
                className="px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ml-auto"
              >
                <Table className="w-3.5 h-3.5" />
                <span>{moduleOverview ? 'Übersicht einsehen' : 'Übersicht hochladen'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Modulhandbuch */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-teal-500/30 rounded-2xl shadow-xl flex flex-col justify-between space-y-4 min-w-0 overflow-hidden">
            <div className="space-y-3 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400 shrink-0">
                    <BookMarked className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded truncate inline-block max-w-full">
                      Offizielles Modulhandbuch (MHB)
                    </span>
                    <h4 className="text-sm font-bold text-slate-100 mt-1 truncate">
                      {moduleHandbook ? moduleHandbook.title : 'Universitäts-Modulhandbuch'}
                    </h4>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed break-words">
                {moduleHandbook
                  ? (moduleHandbook.description || 'Offizielles Modulhandbuch der Universität hinterlegt.')
                  : 'Hinterlege hier das Modulhandbuch deines Studiengangs als PDF oder Weblink zur direkten Ansicht in der App.'}
              </p>

              {moduleHandbook && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span className="text-teal-400">{moduleHandbook.universityName}</span>
                  {moduleHandbook.versionOrYear && (
                    <>
                      <span>·</span>
                      <span>{moduleHandbook.versionOrYear}</span>
                    </>
                  )}
                  {moduleHandbook.fileName && (
                    <>
                      <span>·</span>
                      <span className="text-teal-300 truncate max-w-[200px]">📄 {moduleHandbook.fileName}</span>
                    </>
                  )}
                  {moduleHandbook.fileSize && (
                    <span className="text-slate-500">({moduleHandbook.fileSize})</span>
                  )}
                  {moduleHandbook.url && (
                    <span className="text-teal-400/80">🌐 Weblink aktiv</span>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 min-w-0">
              <span className="text-[11px] text-slate-500 truncate">
                {moduleHandbook?.pdfData ? 'PDF aktiv hinterlegt' : moduleHandbook?.url ? 'Weblink hinterlegt' : 'Noch nicht hinterlegt'}
              </span>
              <button
                type="button"
                onClick={() => setShowHandbookModal(true)}
                className="px-3.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ml-auto"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{moduleHandbook ? 'Handbuch einsehen' : 'Handbuch hinterlegen'}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Studien- & Prüfungsordnung */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl shadow-xl flex flex-col justify-between space-y-4 min-w-0 overflow-hidden">
            <div className="space-y-3 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded truncate inline-block max-w-full">
                      Studien- & Prüfungsordnung (StPO)
                    </span>
                    <h4 className="text-sm font-bold text-slate-100 mt-1 truncate">
                      {studyRegulations ? studyRegulations.title : 'Studien- & Prüfungsordnung'}
                    </h4>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed break-words">
                {studyRegulations
                  ? (studyRegulations.description || 'Offizielle Studien- und Prüfungsordnung hinterlegt.')
                  : 'Hinterlege hier die Studien- und Prüfungsordnung deines Fachbereichs als PDF oder Weblink zur ständigen Einsicht.'}
              </p>

              {studyRegulations && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span className="text-emerald-400">{studyRegulations.universityName}</span>
                  {studyRegulations.versionOrYear && (
                    <>
                      <span>·</span>
                      <span>{studyRegulations.versionOrYear}</span>
                    </>
                  )}
                  {studyRegulations.fileName && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-300 truncate max-w-[200px]">📄 {studyRegulations.fileName}</span>
                    </>
                  )}
                  {studyRegulations.fileSize && (
                    <span className="text-slate-500">({studyRegulations.fileSize})</span>
                  )}
                  {studyRegulations.url && (
                    <span className="text-emerald-400/80">🌐 Weblink aktiv</span>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 min-w-0">
              <span className="text-[11px] text-slate-500 truncate">
                {studyRegulations?.pdfData ? 'PDF aktiv hinterlegt' : studyRegulations?.url ? 'Weblink hinterlegt' : 'Noch nicht hinterlegt'}
              </span>
              <button
                type="button"
                onClick={() => setShowRegulationsModal(true)}
                className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ml-auto"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>{studyRegulations ? 'Ordnung einsehen' : 'Ordnung hinterlegen'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Externe Lernmaterialien & Literaturverzeichnis */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Book className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Literatur- & Materialverzeichnis (Skripte, Bücher, Vorlesungsfolien)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            {filteredMaterials.length} von {materials.length} Einträgen
          </span>
        </div>

        {/* Filter and Search Bar */}
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

            {/* Type Filter */}
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
            >
              <option value="all">Alle Materialarten</option>
              <option value="buch">Lehrbücher</option>
              <option value="folien">Vorlesungsfolien</option>
              <option value="skript">Praktikumsskripte</option>
              <option value="uebungsblatt">Übungsblätter</option>
              <option value="altklausur">Altklausuren</option>
              <option value="link">Web-Links</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Titel oder Anmerkung..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 w-52"
            />
          </div>
        </div>

        {/* Materials List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMaterials.map((mat) => {
            const mod = getModule(mat.moduleId);

            return (
              <div
                key={mat.id}
                className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl space-y-3 transition-colors flex flex-col justify-between min-w-0 overflow-hidden"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                        {typeIcons[mat.type] || <Paperclip className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                          {typeLabels[mat.type] || mat.type}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">
                          {mat.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(mat)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteMaterial(mat.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {mod && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: mod.color }}
                      />
                      <span className="text-slate-300 font-medium">{mod.shortName}</span>
                      <span className="text-slate-500 font-mono text-[11px]">({mod.code})</span>
                    </div>
                  )}

                  {mat.pageReference && (
                    <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md font-mono">
                      📖 {mat.pageReference}
                    </div>
                  )}

                  {mat.annotations && (
                    <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed italic">
                      "{mat.annotations}"
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-slate-500">
                    Hinzugefügt: {mat.addedAt}
                  </span>

                  {mat.url && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyLink(mat.url, mat.id)}
                        className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 transition-colors"
                        title="Link kopieren"
                      >
                        {copiedId === mat.id ? (
                          <>
                            <Check className="w-3 h-3 text-teal-400" />
                            <span className="text-teal-400">Kopiert</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Kopieren</span>
                          </>
                        )}
                      </button>
                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-[11px] bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded flex items-center gap-1 font-medium transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Öffnen</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredMaterials.length === 0 && (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-2">
            <Paperclip className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Keine Materialien gefunden</p>
            <p className="text-xs text-slate-500">
              Verknüpfe Lehrbuchkapitel, Moodle-Links oder Vorlesungsfolien.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-teal-400" />
                {editingMaterial ? 'Materialeintrag bearbeiten' : 'Material oder Literatur verknüpfen'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Modul / Fach *
                </label>
                <select
                  value={materialForm.moduleId}
                  onChange={(e) => setMaterialForm({ ...materialForm, moduleId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.shortName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Titel der Ressource *
                </label>
                <input
                  type="text"
                  required
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  placeholder="z.B. Ehlers Analytik I oder Vorlesungssatz 3 (Puffer)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Material-Typ
                  </label>
                  <select
                    value={materialForm.type}
                    onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value as MaterialType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="skript">Praktikumsskript</option>
                    <option value="buch">Lehrbuch / Monographie</option>
                    <option value="folien">Vorlesungsfolien</option>
                    <option value="uebungsblatt">Übungsblatt</option>
                    <option value="altklausur">Altklausur</option>
                    <option value="link">Web-Ressource</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Seitenzahlen / Kapitel
                  </label>
                  <input
                    type="text"
                    value={materialForm.pageReference}
                    onChange={(e) => setMaterialForm({ ...materialForm, pageReference: e.target.value })}
                    placeholder="z.B. S. 45 - 88"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Link / URL (Nextcloud, Moodle, Google Drive, etc.)
                </label>
                <input
                  type="url"
                  value={materialForm.url}
                  onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })}
                  placeholder="https://nextcloud.uni.edu/s/... oder Moodle-Link"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Eigene Anmerkungen & Prüfungsrelevanz
                </label>
                <textarea
                  rows={3}
                  value={materialForm.annotations}
                  onChange={(e) => setMaterialForm({ ...materialForm, annotations: e.target.value })}
                  placeholder="Besonders klausurrelevant: Henderson-Hasselbalch Herleitung und Fällung der Kationengruppen..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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

      {/* Module Overview Modal */}
      {showOverviewModal && (
        <ModuleOverviewModal
          currentOverview={moduleOverview}
          onSaveOverview={onSaveOverview}
          onClose={() => setShowOverviewModal(false)}
        />
      )}

      {/* Module Handbook Modal */}
      {showHandbookModal && (
        <ModuleHandbookModal
          currentHandbook={moduleHandbook}
          onSaveHandbook={onSaveHandbook}
          onClose={() => setShowHandbookModal(false)}
        />
      )}

      {/* Study Regulations Modal */}
      {showRegulationsModal && (
        <StudyRegulationsModal
          currentRegulations={studyRegulations}
          onSaveRegulations={onSaveRegulations}
          onClose={() => setShowRegulationsModal(false)}
        />
      )}
    </div>
  );
};
