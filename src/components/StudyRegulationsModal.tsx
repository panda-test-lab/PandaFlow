import React, { useState } from 'react';
import { 
  Scale, 
  Upload, 
  Check, 
  FileText, 
  X, 
  AlertCircle, 
  BookOpen, 
  Trash2, 
  ExternalLink,
  Edit3,
  Globe,
  Download,
  FileCheck
} from 'lucide-react';
import { StudyRegulations } from '../types';
import { standardStudyRegulations } from '../services/studyRegulations';
import { readFileAsPdfDataUrl } from '../services/pdfViewerHelper';

interface StudyRegulationsModalProps {
  currentRegulations?: StudyRegulations;
  onSaveRegulations: (regulations: StudyRegulations | undefined) => void;
  onClose: () => void;
}

export const StudyRegulationsModal: React.FC<StudyRegulationsModalProps> = ({
  currentRegulations,
  onSaveRegulations,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>(
    currentRegulations?.pdfData || currentRegulations?.url ? 'view' : 'edit'
  );
  const [title, setTitle] = useState<string>(currentRegulations?.title || 'Studien- und Prüfungsordnung (SPO)');
  const [universityName, setUniversityName] = useState<string>(currentRegulations?.universityName || 'Universität / Hochschule');
  const [versionOrYear, setVersionOrYear] = useState<string>(currentRegulations?.versionOrYear || 'Fassung 2026/27');
  const [description, setDescription] = useState<string>(currentRegulations?.description || 'Offizielle Prüfungs- und Studienordnung.');
  const [url, setUrl] = useState<string>(currentRegulations?.url || '');
  const [pdfData, setPdfData] = useState<string>(currentRegulations?.pdfData || '');
  const [fileName, setFileName] = useState<string>(currentRegulations?.fileName || '');
  const [fileSize, setFileSize] = useState<string>(currentRegulations?.fileSize || '');
  
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');

    if (!file.name.toLowerCase().endsWith('.pdf') && !file.type.includes('pdf')) {
      setErrorMsg('Bitte wähle eine gültige PDF-Datei (.pdf) aus.');
      return;
    }

    try {
      const { dataUrl, sizeFormatted } = await readFileAsPdfDataUrl(file);
      setPdfData(dataUrl);
      setFileName(file.name);
      setFileSize(sizeFormatted);
      if (!title || title.includes('Studien- und Prüfungsordnung (SPO)')) {
        setTitle(`Studienordnung: ${file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')}`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Fehler beim Laden der PDF-Datei.');
    }
  };

  const handleLoadSample = () => {
    setTitle(standardStudyRegulations.title);
    setUniversityName(standardStudyRegulations.universityName);
    setVersionOrYear(standardStudyRegulations.versionOrYear || '');
    setDescription(standardStudyRegulations.description || '');
    setUrl(standardStudyRegulations.url || '');
    setPdfData(standardStudyRegulations.pdfData || '');
    setFileName(standardStudyRegulations.fileName || 'Studienordnung_SPO.pdf');
    setFileSize(standardStudyRegulations.fileSize || '1.2 MB');
    setErrorMsg('');
  };

  const handleOpenPdfNewTab = () => {
    if (!pdfData) return;
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${pdfData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMsg('Bitte gib einen Titel für das Dokument an.');
      return;
    }

    const updated: StudyRegulations = {
      id: currentRegulations?.id || `spo-${Date.now()}`,
      title: title.trim(),
      universityName: universityName.trim(),
      versionOrYear: versionOrYear.trim(),
      description: description.trim(),
      url: url.trim(),
      pdfData: pdfData || undefined,
      fileName: fileName || undefined,
      fileSize: fileSize || undefined,
      uploadedAt: new Date().toISOString(),
    };

    onSaveRegulations(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleDelete = () => {
    onSaveRegulations(undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Studien- & Prüfungsordnung (SPO)
              </h3>
              <p className="text-xs text-slate-400">
                Offizielles universitäres PDF-Dokument & Weblink
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('view')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'view'
                  ? 'border-emerald-400 text-emerald-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>PDF & Dokument ansehen</span>
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'border-emerald-400 text-emerald-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>PDF hochladen / Bearbeiten</span>
            </button>
          </div>

          {currentRegulations && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 mb-1.5 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Dokument entfernen</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Studienordnung erfolgreich gespeichert!</span>
            </div>
          )}

          {/* VIEW TAB */}
          {activeTab === 'view' && (
            <div className="space-y-4">
              {/* Document Metadata Bar */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
                    {versionOrYear && (
                      <span className="text-[11px] px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded font-mono">
                        {versionOrYear}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-400">{universityName}</p>
                  {description && <p className="text-xs text-slate-300 mt-1">{description}</p>}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5 text-teal-400" />
                      <span>Weblink öffnen</span>
                    </a>
                  )}

                  {pdfData && (
                    <>
                      <button
                        type="button"
                        onClick={handleOpenPdfNewTab}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="In eigenem Tab öffnen"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Vergrößern</span>
                      </button>

                      <a
                        href={pdfData}
                        download={fileName || 'Studienordnung.pdf'}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="PDF herunterladen"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Embedded PDF Viewer */}
              {pdfData ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span className="flex items-center gap-1.5 font-medium text-slate-300">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span>PDF-Dokumentenvorschau: {fileName}</span>
                    </span>
                    {fileSize && <span className="font-mono text-[11px] text-slate-500">Dateigröße: {fileSize}</span>}
                  </div>

                  <div className="w-full h-[540px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                    <iframe
                      src={pdfData}
                      className="w-full h-full border-0"
                      title="Studienordnung PDF"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-3">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Noch keine PDF-Datei hinterlegt</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Lade die PDF-Datei deiner Studien- und Prüfungsordnung hoch, um sie hier direkt in der App betrachten zu können.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                  >
                    Jetzt PDF-Datei hochladen
                  </button>
                </div>
              )}
            </div>
          )}

          {/* EDIT / UPLOAD TAB */}
          {activeTab === 'edit' && (
            <div className="space-y-4">
              {/* PDF File Upload Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 block">
                    PDF-Datei auswählen * (Ausschließlich .pdf)
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Muster-PDF laden
                  </button>
                </div>

                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-500/40 hover:border-emerald-500/80 rounded-xl cursor-pointer bg-slate-950/40 hover:bg-emerald-500/5 transition-all text-center group">
                  <div className="p-3 bg-emerald-500/10 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">
                    PDF-Datei der Studienordnung hochladen
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono mt-1 font-medium">
                    Unterstütztes Format: .pdf
                  </span>
                  {fileName && (
                    <div className="mt-2 text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-md">
                      Ausgewählt: {fileName} ({fileSize})
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Weblink input */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Weblink zur Universitäts-Homepage / zum Download (optional)
                </label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.universitaet.de/studium/spo.html"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Dokumenttitel *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="z.B. Studien- und Prüfungsordnung (SPO)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Universität / Institut
                  </label>
                  <input
                    type="text"
                    value={universityName}
                    onChange={(e) => setUniversityName(e.target.value)}
                    placeholder="z.B. Universität Heidelberg"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Fassung / Gültigkeit
                  </label>
                  <input
                    type="text"
                    value={versionOrYear}
                    onChange={(e) => setVersionOrYear(e.target.value)}
                    placeholder="z.B. Fassung 2026/27"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Kurzbeschreibung / Notizen
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="z.B. Offizielle Studien- und Prüfungsordnung der Fakultät"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-900/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Schließen
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Dokument speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
};
