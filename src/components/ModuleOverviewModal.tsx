import React, { useState, useMemo } from 'react';
import { 
  Table, 
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
  FileCheck,
  Search,
  LayoutGrid,
  Filter
} from 'lucide-react';
import { ModuleOverviewDocument } from '../types';
import { standardModuleOverview, parseCsvToTable, ParsedCsvTable } from '../services/moduleOverview';
import { readFileAsPdfDataUrl } from '../services/pdfViewerHelper';
import { extractTextAndTablesFromPdf, convertTextToTableFormat } from '../services/pdfExtractor';

interface ModuleOverviewModalProps {
  currentOverview?: ModuleOverviewDocument;
  onSaveOverview: (overview: ModuleOverviewDocument | undefined) => void;
  onClose: () => void;
}

export const ModuleOverviewModal: React.FC<ModuleOverviewModalProps> = ({
  currentOverview,
  onSaveOverview,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>(
    currentOverview?.pdfData || currentOverview?.csvData || currentOverview?.url ? 'view' : 'edit'
  );
  const [title, setTitle] = useState<string>(
    currentOverview?.title || 'Modulübersicht & Studien-Curriculum'
  );
  const [universityName, setUniversityName] = useState<string>(
    currentOverview?.universityName || 'Universität / Hochschule'
  );
  const [versionOrYear, setVersionOrYear] = useState<string>(
    currentOverview?.versionOrYear || 'Studienplan 2026/27'
  );
  const [description, setDescription] = useState<string>(
    currentOverview?.description || 'Übersicht über alle Module, offizielle Kürzel, Semester und ECTS-Punkte.'
  );
  const [url, setUrl] = useState<string>(currentOverview?.url || '');
  const [fileType, setFileType] = useState<'pdf' | 'csv' | 'txt' | 'other'>(
    currentOverview?.fileType || (currentOverview?.pdfData ? 'pdf' : 'csv')
  );
  const [pdfData, setPdfData] = useState<string>(currentOverview?.pdfData || '');
  const [csvData, setCsvData] = useState<string>(currentOverview?.csvData || '');
  const [rawContent, setRawContent] = useState<string>(currentOverview?.rawContent || '');
  const [fileName, setFileName] = useState<string>(currentOverview?.fileName || '');
  const [fileSize, setFileSize] = useState<string>(currentOverview?.fileSize || '');

  // Table search & filter state
  const [tableSearch, setTableSearch] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    const lowerName = file.name.toLowerCase();

    const sizeInMB = file.size / (1024 * 1024);
    const sizeFormatted = sizeInMB >= 1 ? `${sizeInMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
    setFileName(file.name);
    setFileSize(sizeFormatted);

    if (lowerName.endsWith('.pdf') || file.type.includes('pdf')) {
      // PDF File
      try {
        const { dataUrl } = await readFileAsPdfDataUrl(file);
        setPdfData(dataUrl);
        setFileType('pdf');
        if (!title || title.includes('Modulübersicht & Curriculum')) {
          setTitle(`Modulübersicht: ${file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')}`);
        }

        // Run automatic text & table extraction with page orientation normalization
        try {
          const res = await extractTextAndTablesFromPdf(dataUrl);
          if (res.csvText && res.csvText.trim().length > 0) {
            setCsvData(res.csvText);
            setRawContent(res.text);
          }
        } catch (pdfErr) {
          console.warn('PDF extraction notice:', pdfErr);
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Fehler beim Laden der PDF-Datei.');
      }
    } else if (lowerName.endsWith('.csv') || lowerName.endsWith('.tsv') || lowerName.endsWith('.txt') || file.type.includes('text') || file.type.includes('csv')) {
      // CSV or Text File
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setCsvData(text);
        setRawContent(text);
        setFileType(lowerName.endsWith('.csv') || lowerName.endsWith('.tsv') ? 'csv' : 'txt');
        if (!title || title.includes('Modulübersicht & Curriculum')) {
          setTitle(`Modulübersicht: ${file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]/g, ' ')}`);
        }
      };
      reader.onerror = () => {
        setErrorMsg('Fehler beim Lesen der Text-/CSV-Datei.');
      };
      reader.readAsText(file);
    } else {
      setErrorMsg('Bitte wähle eine PDF-Datei (.pdf) oder eine CSV-/Text-Tabelle (.csv, .tsv, .txt) aus.');
    }
  };

  const handleLoadSample = () => {
    setTitle(standardModuleOverview.title);
    setUniversityName(standardModuleOverview.universityName);
    setVersionOrYear(standardModuleOverview.versionOrYear || '');
    setDescription(standardModuleOverview.description || '');
    setUrl(standardModuleOverview.url || '');
    setFileType('csv');
    setCsvData(standardModuleOverview.csvData || '');
    setPdfData(standardModuleOverview.pdfData || '');
    setFileName(standardModuleOverview.fileName || 'Moduluebersicht_Curriculum.csv');
    setFileSize(standardModuleOverview.fileSize || '4.2 KB');
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
      setErrorMsg('Bitte gib einen Titel für die Modulübersicht an.');
      return;
    }

    const updated: ModuleOverviewDocument = {
      id: currentOverview?.id || `overview-${Date.now()}`,
      title: title.trim(),
      universityName: universityName.trim(),
      versionOrYear: versionOrYear.trim(),
      description: description.trim(),
      url: url.trim(),
      fileType,
      pdfData: pdfData || undefined,
      csvData: csvData || undefined,
      rawContent: rawContent || undefined,
      fileName: fileName || undefined,
      fileSize: fileSize || undefined,
      uploadedAt: new Date().toISOString(),
    };

    onSaveOverview(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleDelete = () => {
    onSaveOverview(undefined);
    onClose();
  };

  // Parsed Table Data
  const parsedTable: ParsedCsvTable = useMemo(() => {
    return parseCsvToTable(csvData);
  }, [csvData]);

  const filteredTableRows = useMemo(() => {
    if (!tableSearch.trim()) return parsedTable.rows;
    const q = tableSearch.toLowerCase();
    return parsedTable.rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(q))
    );
  }, [parsedTable.rows, tableSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Modulübersicht (Kürzel & Curriculum)
              </h3>
              <p className="text-xs text-slate-400">
                Übersicht über alle Module, Kürzel, Semester und ECTS (PDF, CSV oder Tabelle)
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
                  ? 'border-blue-400 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Modulübersicht ansehen</span>
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'border-blue-400 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Dokument hochladen / Bearbeiten</span>
            </button>
          </div>

          {currentOverview && (
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
            <div className="p-3 bg-blue-950/50 border border-blue-500/50 rounded-lg text-xs text-blue-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Modulübersicht erfolgreich gespeichert!</span>
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
                      <span className="text-[11px] px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded font-mono">
                        {versionOrYear}
                      </span>
                    )}
                    {fileType && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                        Format: {fileType}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-400">{universityName}</p>
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
                        download={fileName || 'Moduluebersicht.pdf'}
                        className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="PDF herunterladen"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF Download</span>
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* CSV TABLE VIEW */}
              {csvData && parsedTable.headers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <LayoutGrid className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold">
                        Tabellarische Modul- & Kürzelübersicht ({filteredTableRows.length} Einträge)
                      </span>
                    </div>

                    <div className="relative w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="In Modulen & Kürzeln suchen..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-inner max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-800 sticky top-0 backdrop-blur-sm z-10">
                        <tr>
                          {parsedTable.headers.map((h, i) => (
                            <th key={i} className="px-3.5 py-2.5 font-medium">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {filteredTableRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-900/50 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3.5 py-2 text-slate-300">
                                {cIdx === 0 ? (
                                  <span className="font-bold text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                    {cell}
                                  </span>
                                ) : (
                                  cell
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* EMBEDDED PDF VIEWER */}
              {pdfData && (!csvData || fileType === 'pdf') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span className="flex items-center gap-1.5 font-medium text-slate-300">
                      <FileCheck className="w-4 h-4 text-blue-400" />
                      <span>PDF-Dokumentenvorschau: {fileName}</span>
                    </span>
                    {fileSize && <span className="font-mono text-[11px] text-slate-500">Dateigröße: {fileSize}</span>}
                  </div>

                  <div className="w-full h-[540px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                    <iframe
                      src={pdfData}
                      className="w-full h-full border-0"
                      title="Modulübersicht PDF"
                    />
                  </div>
                </div>
              )}

              {/* EMPTY STATE */}
              {!pdfData && !csvData && !url && (
                <div className="p-12 text-center bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-3">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Noch keine Modulübersicht hinterlegt</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Lade eine PDF-Datei oder eine CSV-Tabelle deiner Modul- und Fächerübersicht hoch, um alle Kürzel und Semester im Blick zu haben.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                  >
                    Jetzt Modulübersicht hochladen
                  </button>
                </div>
              )}
            </div>
          )}

          {/* EDIT / UPLOAD TAB */}
          {activeTab === 'edit' && (
            <div className="space-y-4">
              {/* File Upload Card (PDF, CSV, TXT, TSV) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 block">
                    Modulübersicht auswählen (PDF oder CSV / Tabelle) *
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    Muster-Übersicht laden
                  </button>
                </div>

                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-500/40 hover:border-blue-500/80 rounded-xl cursor-pointer bg-slate-950/40 hover:bg-blue-500/5 transition-all text-center group">
                  <div className="p-3 bg-blue-500/10 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">
                    Modulübersicht-Datei hochladen
                  </span>
                  <span className="text-[11px] text-blue-400 font-mono mt-1 font-medium">
                    Unterstützte Formate: PDF (.pdf), CSV-Tabelle (.csv, .tsv), Textdatei (.txt)
                  </span>
                  {fileName && (
                    <div className="mt-2 text-xs font-mono text-blue-300 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-md">
                      Ausgewählt: {fileName} ({fileSize})
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.csv,.tsv,.txt,application/pdf,text/csv,text/plain"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Weblink input */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Weblink zur Universitäts-Modulübersicht / zum Download (optional)
                </label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.universitaet.de/studium/curriculum.html"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
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
                    placeholder="z.B. Modulübersicht 1.-6. Semester (Bachelor/Master)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
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
                    placeholder="z.B. Studienplan 2026/27"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
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
                    placeholder="z.B. Offizielle Übersicht aller Fachsemester mitsamt Kürzeln"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Text / CSV Direct Editor & Workaround Helper */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <label className="text-xs font-bold text-slate-200 block">
                      Tabellarischer Inhalt / Ausgelesener Text (Workaround-Editor)
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Du kannst hier beliebigen Tabellentext einfügen oder anpassen.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!csvData.trim()) return;
                      const res = convertTextToTableFormat(csvData);
                      if (res.csvText) {
                        setCsvData(res.csvText);
                        setErrorMsg('');
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Table className="w-3.5 h-3.5 text-blue-400" />
                    <span>1. Zeile als Überschrift festlegen & formatieren</span>
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="Kürzel;Modulname;Kurzname;Semester;ECTS;Dozent&#10;B.Phar.101;Allgemeine und analytische Chemie;Anorganische Chemie;1;10;Prof. Liebig"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500 resize-y"
                />
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
            className="px-5 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Übersicht speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
};
