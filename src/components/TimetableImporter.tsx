import React, { useState, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  Calendar, 
  Table, 
  Check, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  X,
  Layers,
  Plus,
  CheckCircle2,
  BookOpen,
  Loader2
} from 'lucide-react';
import { EventCourse, Module, ModuleHandbook, Semester, StudyStage } from '../types';
import { parseIcsCalendar, parseScheduleCsv } from '../services/storage';
import { extractTextFromPdf } from '../services/pdfExtractor';

interface TimetableImporterProps {
  modules: Module[];
  semesters?: Semester[];
  studyStages?: StudyStage[];
  moduleHandbook?: ModuleHandbook;
  onImportEvents: (newEvents: EventCourse[], newModules?: Module[], assignedSemesterId?: string, newlyCreatedSemester?: Semester) => void;
  onClose: () => void;
}

// Helper: Check if an existing module matches the title
export function findMatchingModule(title: string, existingModules: Module[]): Module | null {
  if (!existingModules || existingModules.length === 0) return null;
  const cleanTitle = title.toLowerCase().trim();

  // 1. Exact code or exact name match
  for (const mod of existingModules) {
    if (mod.code && cleanTitle.includes(mod.code.toLowerCase())) {
      return mod;
    }
    if (mod.shortName && (cleanTitle.includes(mod.shortName.toLowerCase()) || mod.shortName.toLowerCase().includes(cleanTitle))) {
      return mod;
    }
    if (mod.name && (cleanTitle.includes(mod.name.toLowerCase()) || mod.name.toLowerCase().includes(cleanTitle))) {
      return mod;
    }
  }

  // 2. Academic domain keyword matching
  const keywordRules: { keywords: string[]; matchWords: string[] }[] = [
    { keywords: ['anorganik', 'analytik', 'quali', 'kation', 'anion', 'hcl-gruppe'], matchWords: ['anorganisch', 'analytik', 'quali'] },
    { keywords: ['chemie', 'chemisch'], matchWords: ['chemie', 'chemisch'] },
    { keywords: ['botanik', 'pflanze', 'mikroskop', 'bestimmung', 'morphologie', 'plastid'], matchWords: ['biologie', 'botanik'] },
    { keywords: ['biologie', 'bio'], matchWords: ['biologie'] },
    { keywords: ['humanbiologie', 'anatomie', 'physiologie', 'zytologie', 'histologie', 'gewebe', 'epithel'], matchWords: ['anatomie', 'humanbiologie', 'physiologie'] },
    { keywords: ['terminologie', 'latein', 'nomenklatur'], matchWords: ['terminologie'] },
    { keywords: ['mathematik', 'statistik', 'mathe', 'rechnen'], matchWords: ['mathematik', 'statistik'] },
    { keywords: ['physik', 'optik', 'strahlung'], matchWords: ['physik'] },
    { keywords: ['toxikologie', 'wirkstoff'], matchWords: ['toxikologie'] },
    { keywords: ['technologie', 'verfahrenstechnik'], matchWords: ['technologie'] },
    { keywords: ['biochemie'], matchWords: ['biochemie'] },
    { keywords: ['instrumentell', 'spektroskopie', 'chromatographie'], matchWords: ['instrumentell', 'analytik'] },
  ];

  for (const rule of keywordRules) {
    const titleMatches = rule.keywords.some((kw) => cleanTitle.includes(kw));
    if (titleMatches) {
      const found = existingModules.find((m) =>
        rule.matchWords.some((mw) => m.name.toLowerCase().includes(mw) || m.shortName.toLowerCase().includes(mw))
      );
      if (found) return found;
    }
  }

  return null;
}

// Helper: Clean subject title for a new module
export function cleanSubjectName(title: string): string {
  let cleaned = title
    .replace(/^(vorlesung|vl|seminar|praktikum|labor|übung|uebung|tutorium)[:\s-]+/i, '')
    .replace(/\s*[-–(].*$/, '') // remove trailing room/parenthesis
    .trim();

  // If still too long or empty
  if (!cleaned) cleaned = title;
  return cleaned;
}

export const TimetableImporter: React.FC<TimetableImporterProps> = ({
  modules,
  semesters = [],
  studyStages = [],
  moduleHandbook,
  onImportEvents,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'ics' | 'csv' | 'text'>('ics');
  const [defaultModuleId, setDefaultModuleId] = useState<string>(modules[0]?.id || '');

  // Semester assignment choice
  const initialSemesterId = semesters.find((s) => s.status === 'aktiv')?.id || semesters[0]?.id || '__new__';
  const [targetSemesterId, setTargetSemesterId] = useState<string>(initialSemesterId);
  const [newSemesterName, setNewSemesterName] = useState<string>('Aktuelles Semester');
  const [newSemesterTermName, setNewSemesterTermName] = useState<string>('WS 2026/2027');
  const [newSemesterStageId, setNewSemesterStageId] = useState<string>(studyStages[0]?.id || '');

  const [inputText, setInputText] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<Partial<EventCourse>[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const [isExtractingPdf, setIsExtractingPdf] = useState<boolean>(false);

  // User question: Should new modules be created automatically for entries that don't match existing modules?
  const [autoCreateModules, setAutoCreateModules] = useState<boolean>(true);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg('');
    setParsedPreview([]);

    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      setIsExtractingPdf(true);
      try {
        const extractedText = await extractTextFromPdf(file);
        if (!extractedText.trim()) {
          throw new Error('Das PDF enthielt keinen lesbaren Text.');
        }
        setInputText(extractedText);
        setActiveTab('text');
        parseContent(extractedText, 'text');
      } catch (err: any) {
        setErrorMsg(`Fehler beim Einlesen des PDFs: ${err?.message || 'Ungültiges PDF'}`);
      } finally {
        setIsExtractingPdf(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setInputText(content);
        parseContent(content, file.name.endsWith('.ics') ? 'ics' : file.name.endsWith('.csv') ? 'csv' : 'text');
      };
      reader.onerror = () => {
        setErrorMsg('Fehler beim Lesen der Datei.');
      };
      reader.readAsText(file);
    }
  };

  const parseContent = (content: string, type: 'ics' | 'csv' | 'text') => {
    try {
      let results: Partial<EventCourse>[] = [];
      if (type === 'ics') {
        results = parseIcsCalendar(content, defaultModuleId);
      } else if (type === 'csv') {
        results = parseScheduleCsv(content, defaultModuleId);
      } else {
        results = parseTextSchedule(content, defaultModuleId);
      }

      if (results.length === 0) {
        setErrorMsg('Es konnten keine Veranstaltungen erkannt werden. Bitte prüfe das Format.');
      } else {
        setErrorMsg('');
      }
      setParsedPreview(results);
    } catch (err: any) {
      setErrorMsg(`Parsing-Fehler: ${err?.message || 'Unbekanntes Format'}`);
      setParsedPreview([]);
    }
  };

  const parseTextSchedule = (text: string, modId: string): Partial<EventCourse>[] => {
    const lines = text.split('\n');
    const list: Partial<EventCourse>[] = [];
    const dayKeywords: Record<string, number> = {
      montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6, sonntag: 7,
      mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, so: 7,
    };

    let activeDays: number[] = [1];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const lower = line.toLowerCase();
      if (lower.includes('mo-fr') || lower.includes('montag - freitag') || lower.includes('montag bis freitag')) {
        activeDays = [1, 2, 3, 4, 5];
      } else {
        const detectedDays: number[] = [];
        for (const [kw, dayNum] of Object.entries(dayKeywords)) {
          if (new RegExp(`\\b${kw}\\b`, 'i').test(lower)) {
            if (!detectedDays.includes(dayNum)) detectedDays.push(dayNum);
          }
        }
        if (detectedDays.length > 0) {
          activeDays = detectedDays.sort();
        }
      }

      const timeMatch = line.match(/(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/);
      if (timeMatch) {
        const startTime = timeMatch[1].replace('.', ':').padStart(5, '0');
        const endTime = timeMatch[2].replace('.', ':').padStart(5, '0');
        
        const remainder = line.replace(timeMatch[0], '').replace(/^[,\s;|-]+/, '').trim();
        const parts = remainder.split(/[,|;]/);
        const title = parts[0]?.trim() || 'Veranstaltung';
        const room = parts[1]?.trim() || 'Hörsaal A101';

        let type: EventCourse['type'] = 'vorlesung';
        if (title.toLowerCase().includes('prakt') || title.toLowerCase().includes('labor') || title.toLowerCase().includes('block')) type = 'praktikum';
        else if (title.toLowerCase().includes('sem')) type = 'seminar';
        else if (title.toLowerCase().includes('übung') || title.toLowerCase().includes('uebung')) type = 'uebung';

        for (const d of activeDays) {
          list.push({
            title,
            moduleId: modId,
            type,
            dayOfWeek: d,
            startTime,
            endTime,
            room,
            isRecurring: true,
          });
        }
      }
    }

    return list;
  };

  // Analyze preview: Match against existing modules or plan new modules
  const previewAnalysis = useMemo(() => {
    const colorPalette = [
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

    const plannedNewModules: Map<string, Module> = new Map();
    let newModCounter = 0;

    // Determine the semesterId that new modules will belong to
    const effectiveSemesterId = targetSemesterId === '__new__' ? `sem-${Date.now()}` : targetSemesterId;

    const items = parsedPreview.map((item) => {
      const title = item.title || 'Veranstaltung';

      // 1. Direct match with existing modules
      const existingMatch = findMatchingModule(title, modules);
      if (existingMatch) {
        return {
          item,
          matchedModule: existingMatch,
          isNewModule: false,
          targetModuleId: existingMatch.id,
          moduleLabel: `${existingMatch.code} - ${existingMatch.shortName}`,
        };
      }

      // 2. Auto-create modules if requested
      if (autoCreateModules) {
        const subjectName = cleanSubjectName(title);
        const key = subjectName.toLowerCase();

        let generatedModule = plannedNewModules.get(key);
        if (!generatedModule) {
          const codePrefix = subjectName
            .replace(/[^a-zA-ZäöüÄÖÜ]/g, '')
            .slice(0, 3)
            .toUpperCase() || 'MOD';
          const code = `${codePrefix}-${101 + modules.length + newModCounter}`;
          const color = colorPalette[(modules.length + newModCounter) % colorPalette.length];

          const importedLec = item.lecturer?.trim() || '';
          const existingLecMod = modules.find((m) => 
            m.lecturer && importedLec && (
              m.lecturer.toLowerCase().includes(importedLec.toLowerCase()) || 
              importedLec.toLowerCase().includes(m.lecturer.toLowerCase())
            )
          );

          generatedModule = {
            id: `mod-auto-${Date.now()}-${newModCounter}`,
            semesterId: effectiveSemesterId,
            code,
            name: subjectName,
            shortName: subjectName.length > 24 ? subjectName.slice(0, 22) + '…' : subjectName,
            credits: 5,
            color,
            lecturer: existingLecMod?.lecturer || importedLec,
            lecturerDetails: existingLecMod?.lecturerDetails || undefined,
            description: `Aus Stundenplan-Import („${title}“) angelegtes Fachmodul.`,
          };

          plannedNewModules.set(key, generatedModule);
          newModCounter++;
        }
        return {
          item,
          matchedModule: generatedModule,
          isNewModule: true,
          targetModuleId: generatedModule.id,
          moduleLabel: `+ Neu: ${generatedModule.code} - ${generatedModule.shortName}`,
        };
      } else {
        const fallback = modules.find((m) => m.id === defaultModuleId) || modules[0];
        return {
          item,
          matchedModule: fallback,
          isNewModule: false,
          targetModuleId: fallback?.id || defaultModuleId,
          moduleLabel: fallback ? `${fallback.code} - ${fallback.shortName}` : 'Standard',
        };
      }
    });

    const distinctNewModules = Array.from(plannedNewModules.values());
    const matchedCount = items.filter((i) => !i.isNewModule).length;
    const newCount = items.filter((i) => i.isNewModule).length;

    return {
      items,
      distinctNewModules,
      matchedCount,
      newCount,
      effectiveSemesterId,
    };
  }, [parsedPreview, modules, autoCreateModules, defaultModuleId, moduleHandbook, targetSemesterId]);

  const handleApplyImport = () => {
    if (parsedPreview.length === 0) return;

    let newlyCreatedSemester: Semester | undefined = undefined;
    let finalSemesterId = targetSemesterId;

    if (targetSemesterId === '__new__' || semesters.length === 0) {
      const nextSemNumber = semesters.length + 1;
      const createdSemId = `sem-${Date.now()}`;
      newlyCreatedSemester = {
        id: createdSemId,
        number: nextSemNumber,
        name: newSemesterName.trim() || `${nextSemNumber}. Semester`,
        termName: newSemesterTermName.trim() || 'WS 2026/2027',
        stageId: newSemesterStageId || studyStages[0]?.id || 'stage-grund',
        status: 'aktiv',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      };
      finalSemesterId = createdSemId;
    }

    const completeEvents: EventCourse[] = previewAnalysis.items.map((entry, idx) => ({
      id: `imported-${Date.now()}-${idx}`,
      moduleId: entry.targetModuleId,
      semesterId: finalSemesterId,
      title: entry.item.title || 'Importierte Veranstaltung',
      type: entry.item.type || 'vorlesung',
      dayOfWeek: entry.item.dayOfWeek || 1,
      startTime: entry.item.startTime || '08:00',
      endTime: entry.item.endTime || '10:00',
      room: entry.item.room || 'Hörsaal',
      lecturer: entry.item.lecturer || '',
      notes: entry.item.notes || '',
      isRecurring: entry.item.isRecurring ?? true,
      startDate: entry.item.startDate,
      endDate: entry.item.endDate,
      date: entry.item.date,
      rrule: entry.item.rrule,
    }));

    // Update newly created modules with final semester ID if a new semester was generated
    const newModulesToCreate = (autoCreateModules ? previewAnalysis.distinctNewModules : []).map((m) => ({
      ...m,
      semesterId: finalSemesterId,
    }));

    onImportEvents(completeEvents, newModulesToCreate, finalSemesterId, newlyCreatedSemester);
    setSuccessCount(completeEvents.length);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const loadSampleIcs = () => {
    const sample = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Universitaet//Stundenplan 1. Semester//DE
BEGIN:VEVENT
SUMMARY:Vorlesung Allgemeine und analytische Chemie I
DTSTART:20261012T081500
DTEND:20261012T100000
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20270206T235959Z
LOCATION:Hörsaal Liebig C101
DESCRIPTION:Allgemeine Chemie und Kationentrennungsgang (findet regelmäßig Mo, Mi und Fr statt)
END:VEVENT
BEGIN:VEVENT
SUMMARY:Blockpraktikum Qualitative Analyse (Mo-Fr Ganztag)
DTSTART:20261019T090000
DTEND:20261023T170000
LOCATION:Analytik-Labor C204
DESCRIPTION:Blockveranstaltung für Kationentrennungsgang (Mo bis Fr ganztägig)
END:VEVENT
BEGIN:VEVENT
SUMMARY:Vorlesung Zellbiologie & Morphologie
DTSTART:20261013T101500
DTEND:20261013T114500
RRULE:FREQ=WEEKLY;UNTIL=20270206T235959Z
LOCATION:Biologie-Hörsaal B02
DESCRIPTION:Zellbiologie, Organellen und Membranaufbau (Dienstags)
END:VEVENT
BEGIN:VEVENT
SUMMARY:Sicherheitsunterweisung Laborchemie (Einmalig)
DTSTART:20261014T140000
DTEND:20261014T160000
LOCATION:Großer Hörsaal Chemie
DESCRIPTION:Pflichttermin zur Arbeitssicherheit vor Praktikumsantritt (nur 14. Okt)
END:VEVENT
BEGIN:VEVENT
SUMMARY:Vorlesung Physikalische Grundlagen & Thermodynamik
DTSTART:20261015T101500
DTEND:20261015T114500
RRULE:FREQ=WEEKLY;UNTIL=20270206T235959Z
LOCATION:Hörsaal Physik P1
DESCRIPTION:Thermodynamik, Kinetik und Wellenlehre (Donnerstags)
END:VEVENT
END:VCALENDAR`;
    setInputText(sample);
    setActiveTab('ics');
    parseContent(sample, 'ics');
  };

  const loadSampleCsv = () => {
    const sample = `Wochentag,Start,Ende,Veranstaltung,Raum,Typ,Dozent
Montag,08:15,10:00,Allgemeine Chemie I,Hörsaal Liebig,Vorlesung,Prof. Liebig
Montag,13:00,17:00,Chemisches Grundpraktikum,Labor C204,Praktikum,Dr. Ehlers
Dienstag,08:30,10:00,Humanbiologie Zytologie,Hörsaal Virchow,Vorlesung,Prof. Virchow
Mittwoch,13:30,16:30,Mikroskopierübungen,Mikroskopiersaal,Praktikum,Prof. Strasburger
Donnerstag,08:15,09:45,Mathematik für Naturwissenschaften,Hörsaal M03,Vorlesung,Dr. Gauß
Freitag,11:15,12:45,Biochemie & Molekularbiologie,Hörsaal B12,Vorlesung,Prof. Krebs`;
    setInputText(sample);
    setActiveTab('csv');
    parseContent(sample, 'csv');
  };

  const loadCampusCourseNumbersCsv = () => {
    const sample = `Wochentag,Start,Ende,Veranstaltung,Raum,Typ,Dozent
Montag,08:15,10:00,165411 Vorlesung Allgemeine und analytische Chemie der Metalle,Hörsaal Liebig,Vorlesung,Prof. Liebig
Montag,13:00,17:00,165412 Chemisches Grundpraktikum (Qualitative Analyse),Labor C204,Praktikum,Dr. Ehlers
Dienstag,08:30,10:00,165430 Zytologische und histologische Grundlagen der Humanbiologie,Hörsaal Virchow,Vorlesung,Prof. Virchow
Mittwoch,10:15,11:45,165420 Zellbiologie und Morphologie: Struktur und Funktion,Hörsaal Strasburger,Vorlesung,Prof. Strasburger
Donnerstag,08:15,09:45,165450 Mathematische Methoden für Naturwissenschaften,Hörsaal Gauß,Vorlesung,Dr. Gauß
Freitag,10:15,11:45,165460 Physik für Naturwissenschaften,Hörsaal Röntgen,Vorlesung,Prof. Röntgen`;
    setInputText(sample);
    setActiveTab('csv');
    parseContent(sample, 'csv');
  };

  const dayNames = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Upload className="w-5 h-5 text-teal-400" />
              Stundenplan importieren (iCal / CSV / Text & PDF)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Übernehme Vorlesungen und Praktika direkt aus Universitätsdateien
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format selection tabs */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-lg border border-slate-700/50">
              <button
                type="button"
                onClick={() => { setActiveTab('ics'); if (inputText) parseContent(inputText, 'ics'); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
                  activeTab === 'ics'
                    ? 'bg-teal-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                iCalendar (.ics)
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('csv'); if (inputText) parseContent(inputText, 'csv'); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
                  activeTab === 'csv'
                    ? 'bg-teal-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Table className="w-4 h-4" />
                CSV-Tabelle
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('text'); if (inputText) parseContent(inputText, 'text'); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
                  activeTab === 'text'
                    ? 'bg-teal-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                Text / PDF-Kopie
              </button>
            </div>

            {/* Quick Demo Templates */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Beispiel laden:</span>
              <button
                type="button"
                onClick={loadSampleIcs}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-md transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                iCal-Muster
              </button>
              <button
                type="button"
                onClick={loadSampleCsv}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-md transition-colors"
              >
                Standard-CSV
              </button>
              <button
                type="button"
                onClick={loadCampusCourseNumbersCsv}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-md transition-colors flex items-center gap-1"
                title="Stundenplan mit Vorlesungsnummern wie 165411 zur Demonstration der automatischen Modulumbenennung"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Campus-Muster (165411...)</span>
              </button>
            </div>
          </div>

          {/* CRITICAL FEATURE: User question about Semester Assignment */}
          <div className="p-4 bg-slate-950/80 border border-teal-500/30 rounded-xl space-y-3">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    Semester-Zuordnung für den Stundenplan
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Welchem Semester sollen die Termine und neu erstellten Module zugeordnet werden?
                  </p>
                </div>
              </div>
            </div>

            {/* Semester Select or Auto Creation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Ziel-Semester auswählen:
                </label>
                <select
                  value={targetSemesterId}
                  onChange={(e) => setTargetSemesterId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.termName ? `(${s.termName})` : ''} {s.status === 'aktiv' ? '· [Aktiv]' : ''}
                    </option>
                  ))}
                  <option value="__new__">+ Neues Semester für diesen Stundenplan anlegen...</option>
                </select>
              </div>

              {targetSemesterId === '__new__' && (
                <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-semibold text-teal-300 block">
                    Neues Semester konfigurieren:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Bezeichnung</label>
                      <input
                        type="text"
                        value={newSemesterName}
                        onChange={(e) => setNewSemesterName(e.target.value)}
                        placeholder="z.B. 1. Fachsemester"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Semesterturnus (z.B. WS 2026/27)</label>
                      <input
                        type="text"
                        value={newSemesterTermName}
                        onChange={(e) => setNewSemesterTermName(e.target.value)}
                        placeholder="z.B. WS 2026/2027"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                  {studyStages.length > 0 && (
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Studienabschnitt / Grundform</label>
                      <select
                        value={newSemesterStageId}
                        onChange={(e) => setNewSemesterStageId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      >
                        {studyStages.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} {st.targetDegree ? `(${st.targetDegree})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {semesters.length === 0 && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300">
                Es ist aktuell noch kein Semester vorhanden. Die App legt automatisch ein neues Semester mit dem Plan an!
              </div>
            )}
          </div>

          {/* CRITICAL FEATURE: User question about automatic module creation */}
          <div className="p-4 bg-slate-950/80 border border-teal-500/30 rounded-xl space-y-3">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    Automatische Modul-Erstellung für importierte Fächer
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Soll gleichzeitig für jeden Eintrag automatisch ein Modul angelegt werden?
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoCreateModules}
                  onChange={(e) => setAutoCreateModules(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>

            {/* Intelligent Duplication Protection Info */}
            <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-teal-300 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Intelligenter Duplikatsschutz aktiv:</span>
              </div>
              <div>
                {autoCreateModules ? (
                  <span>
                    Ist ein passendes Modul (z. B. nach Fachbegriff oder Modulname) bereits in deiner Datenbank hinterlegt, wird <strong className="text-slate-200">kein neues Modul angelegt</strong>, sondern der Eintrag direkt dem bestehenden Modul zugeordnet. Für neue Fächer wird automatisch ein Modul erstellt.
                  </span>
                ) : (
                  <span>
                    Deaktiviert: Alle importierten Veranstaltungen werden dem unten gewählten Standard-Modul zugewiesen.
                  </span>
                )}
              </div>
            </div>

            {/* Fallback default module selector (if autoCreate is off or no match) */}
            {!autoCreateModules && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="text-xs text-slate-300">
                  Standard-Modul für alle Einträge:
                </label>
                <select
                  value={defaultModuleId}
                  onChange={(e) => setDefaultModuleId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500 max-w-xs"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.shortName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Upload or Text Paste Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Datei hochladen oder Inhalt einfügen:
              </label>
              {fileName && <span className="text-xs text-teal-400 font-mono">{fileName}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* File Dropzone */}
              <label className="md:col-span-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-xl cursor-pointer bg-slate-800/20 hover:bg-slate-800/40 transition-colors text-center group relative">
                {isExtractingPdf ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                    <span className="text-xs font-semibold text-teal-300">
                      PDF wird eingelesen...
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-teal-400 transition-colors mb-2" />
                    <span className="text-xs font-medium text-slate-200">Datei auswählen</span>
                    <span className="text-[11px] text-teal-400 font-mono mt-1">.pdf, .ics, .csv, .txt</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".ics,.csv,.txt,.pdf,application/pdf"
                  onChange={handleFileUpload}
                  disabled={isExtractingPdf}
                  className="hidden"
                />
              </label>

              {/* Text Area */}
              <div className="md:col-span-2">
                <textarea
                  rows={5}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    parseContent(e.target.value, activeTab);
                  }}
                  placeholder={
                    activeTab === 'ics'
                      ? 'Füge hier den Inhalt einer .ics-Datei ein (BEGIN:VCALENDAR...)'
                      : activeTab === 'csv'
                      ? 'Wochentag,Start,Ende,Titel,Raum,Dozent\nMontag,08:15,10:00,Allgemeine Chemie,Liebig C101,Prof. Liebig'
                      : 'Kopierter Text aus PDF oder LSF/Campus-Plan:\nMontag 08:15 - 10:00 Vorlesung Chemie, Hörsaal 1\nDienstag 13:00 - 17:00 Chemisches Grundpraktikum'
                  }
                  className="w-full h-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Status / Errors */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="flex items-center gap-2 p-3 bg-teal-950/40 border border-teal-800/50 rounded-lg text-xs text-teal-300">
              <Check className="w-4 h-4 shrink-0 text-teal-400" />
              <span>
                {successCount} Veranstaltungen erfolgreich in den Stundenplan übernommen!
                {previewAnalysis.distinctNewModules.length > 0 &&
                  ` (${previewAnalysis.distinctNewModules.length} neue Module erstellt)`}
              </span>
            </div>
          )}

          {/* Parsed Preview Table with Module Matching Status */}
          {parsedPreview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="font-semibold text-slate-200">
                  Vorschau der erkannten Termine ({parsedPreview.length}):
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-teal-400">
                    {previewAnalysis.matchedCount} vorhandene Module
                  </span>
                  {autoCreateModules && previewAnalysis.distinctNewModules.length > 0 && (
                    <span className="text-amber-400 font-medium">
                      + {previewAnalysis.distinctNewModules.length} neue Module werden angelegt
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto overflow-x-auto border border-slate-800 rounded-lg bg-slate-950 scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px] sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Tag</th>
                      <th className="py-2 px-3">Zeit</th>
                      <th className="py-2 px-3">Veranstaltung</th>
                      <th className="py-2 px-3">Gültigkeit / Zeitraum</th>
                      <th className="py-2 px-3">Raum</th>
                      <th className="py-2 px-3">Modul-Zuordnung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {previewAnalysis.items.map((entry, i) => (
                      <tr key={i} className="hover:bg-slate-900/60">
                        <td className="py-2 px-3 font-medium text-teal-400">
                          {dayNames[entry.item.dayOfWeek || 1]}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-300">
                          {entry.item.startTime} - {entry.item.endTime}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-200">
                          {entry.item.title}
                        </td>
                        <td className="py-2 px-3 text-[11px] font-mono text-slate-400">
                          {entry.item.date ? (
                            <span className="text-amber-400">📅 Einzeltermin ({entry.item.date})</span>
                          ) : entry.item.startDate || entry.item.endDate ? (
                            <span className="text-teal-400">
                              {entry.item.startDate || '—'} bis {entry.item.endDate || '—'}
                            </span>
                          ) : (
                            <span className="text-slate-500">Wöchentlich</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-400 truncate max-w-[120px]">
                          {entry.item.room || '-'}
                        </td>
                        <td className="py-2 px-3">
                          {entry.isNewModule ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                              <Plus className="w-3 h-3 text-amber-400" />
                              {entry.moduleLabel}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                              <Check className="w-3 h-3 text-teal-400" />
                              {entry.moduleLabel}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4 bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleApplyImport}
            disabled={parsedPreview.length === 0}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${
              parsedPreview.length > 0
                ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>
              {parsedPreview.length} Termine
              {autoCreateModules && previewAnalysis.distinctNewModules.length > 0
                ? ` & ${previewAnalysis.distinctNewModules.length} neue Module`
                : ''}{' '}
              übernehmen
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
