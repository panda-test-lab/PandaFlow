import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft,
  ChevronRight,
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  Trash2, 
  Filter, 
  Edit3,
  FileText,
  Plus,
  Upload,
  CalendarDays,
  Sparkles,
  Info,
  CalendarCheck2
} from 'lucide-react';
import { EventCourse, Module, EventType, ModuleHandbook, Semester, StudyStage } from '../types';
import { TimetableImporter } from './TimetableImporter';
import { isEventScheduledOnDate } from '../utils/schedule';

interface TimetableProps {
  events: EventCourse[];
  modules: Module[];
  semesters?: Semester[];
  studyStages?: StudyStage[];
  moduleHandbook?: ModuleHandbook;
  onAddEvent: (event: EventCourse) => void;
  onUpdateEvent: (event: EventCourse) => void;
  onDeleteEvent: (id: string) => void;
  onImportEvents: (
    newEvents: EventCourse[], 
    newModules?: Module[], 
    assignedSemesterId?: string, 
    newlyCreatedSemester?: Semester
  ) => void;
  onNavigateToNotes: (moduleId: string, courseId?: string, courseTitle?: string) => void;
}

// Utility functions for dates and calendar calculations
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // Monday is 1, Sunday is 0
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getIsoWeekNumber(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function formatGermanDate(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function formatGermanDateFull(d: Date): string {
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export const Timetable: React.FC<TimetableProps> = ({
  events,
  modules,
  semesters = [],
  studyStages = [],
  moduleHandbook,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onImportEvents,
  onNavigateToNotes,
}) => {
  // Active semester
  const activeSemester = useMemo(() => {
    return semesters.find((s) => s.status === 'aktiv') || semesters[0];
  }, [semesters]);

  // Relevant modules for the timetable:
  // ONLY modules of the active semester + non-completed modules from prior semesters scheduled to be retaken in this semester
  const relevantModules = useMemo(() => {
    if (!activeSemester) return modules;
    return modules.filter((m) => {
      // 1. Modul gehört regulär zum aktiven Semester
      if (m.semesterId === activeSemester.id) return true;
      // 2. Modul aus einem anderen Semester ist noch nicht abgeschlossen und soll im aktiven Semester nachgeholt/wiederholt werden
      if (!m.isCompleted && m.retakeSemesterId === activeSemester.id) return true;
      return false;
    });
  }, [modules, activeSemester]);

  const relevantModuleIds = useMemo(() => {
    return new Set(relevantModules.map((m) => m.id));
  }, [relevantModules]);

  // Determine initial date
  // If current date is within activeSemester, use today; otherwise default to semester start
  const initialDate = useMemo(() => {
    const today = new Date();
    const todayIso = formatDateIso(today);
    if (activeSemester?.startDate && activeSemester?.endDate) {
      if (todayIso >= activeSemester.startDate && todayIso <= activeSemester.endDate) {
        return today;
      }
      // If today is outside semester bounds, default to semester start date or mid-October 2026
      const semStart = new Date(activeSemester.startDate);
      if (!isNaN(semStart.getTime())) {
        return semStart;
      }
    }
    return today;
  }, [activeSemester]);

  // Current selected week Monday
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(initialDate));

  // View mode: 'week' = specific week with actual dates; 'generic' = standard repeating weekly plan
  const [viewMode, setViewMode] = useState<'week' | 'generic'>('week');
  const [showWeekend, setShowWeekend] = useState<boolean>(false);

  // Filters
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  // Modals
  const [showImporter, setShowImporter] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<EventCourse | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventCourse | null>(null);

  // Event form state (used for both Add and Edit)
  const [formData, setFormData] = useState<Partial<EventCourse> & { selectedDays?: number[]; eventBlocks?: Array<{ dayOfWeek: number; startTime: string; endTime: string; room?: string }> }>({
    title: '',
    moduleId: modules[0]?.id || '',
    semesterId: activeSemester?.id || '',
    type: 'vorlesung',
    dayOfWeek: 1,
    selectedDays: [1],
    startTime: '08:15',
    endTime: '10:00',
    eventBlocks: [{ dayOfWeek: 1, startTime: '08:15', endTime: '10:00' }],
    room: 'Hörsaal A101',
    lecturer: '',
    notes: '',
    isRecurring: true,
    startDate: activeSemester?.startDate || formatDateIso(new Date()),
    endDate: activeSemester?.endDate || '',
    date: '',
  });

  // Calculate the 7 days of the selected week
  const weekDays = useMemo(() => {
    const todayIso = formatDateIso(new Date());
    const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const shortNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      const isoDate = formatDateIso(d);
      return {
        num: i + 1, // 1=Mo..7=So
        date: d,
        isoDate,
        name: dayNames[i],
        short: shortNames[i],
        formatted: formatGermanDate(d),
        isToday: isoDate === todayIso,
      };
    });
  }, [currentMonday]);

  const currentKw = useMemo(() => getIsoWeekNumber(currentMonday), [currentMonday]);
  const sundayOfWeek = useMemo(() => {
    const sun = new Date(currentMonday);
    sun.setDate(currentMonday.getDate() + 6);
    return sun;
  }, [currentMonday]);

  // Check which semester this week falls into
  const weekSemester = useMemo(() => {
    const mondayIso = formatDateIso(currentMonday);
    const sunIso = formatDateIso(sundayOfWeek);
    return semesters.find((s) => {
      if (!s.startDate || !s.endDate) return false;
      return (mondayIso >= s.startDate && mondayIso <= s.endDate) ||
             (sunIso >= s.startDate && sunIso <= s.endDate);
    }) || activeSemester;
  }, [currentMonday, sundayOfWeek, semesters, activeSemester]);

  // Calculate lecture week number relative to semester start
  const semesterWeekNumber = useMemo(() => {
    if (!weekSemester?.startDate) return null;
    const semStartMon = getMonday(new Date(weekSemester.startDate));
    const diffTime = currentMonday.getTime() - semStartMon.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 86400000)) + 1;
    return diffWeeks > 0 && diffWeeks <= 25 ? diffWeeks : null;
  }, [currentMonday, weekSemester]);

  // Week-navigation handlers
  const handlePrevWeek = () => {
    setCurrentMonday((prev) => {
      const prevMon = new Date(prev);
      prevMon.setDate(prev.getDate() - 7);
      return prevMon;
    });
  };

  const handleNextWeek = () => {
    setCurrentMonday((prev) => {
      const nextMon = new Date(prev);
      nextMon.setDate(prev.getDate() + 7);
      return nextMon;
    });
  };

  const handleGoToToday = () => {
    setCurrentMonday(getMonday(new Date()));
  };

  const handleDateJump = (targetDateStr: string) => {
    if (!targetDateStr) return;
    const target = new Date(targetDateStr);
    if (!isNaN(target.getTime())) {
      setCurrentMonday(getMonday(target));
    }
  };

  // Check if an event takes place on a specific day of the week
  const isEventScheduledOnDay = (event: EventCourse, dayNum: number, dayIsoDate: string): boolean => {
    // In generic mode, show all recurring events
    if (viewMode === 'generic') {
      return event.dayOfWeek === dayNum && event.isRecurring !== false;
    }
    return isEventScheduledOnDate(event, dayIsoDate, semesters);
  };

  // Filter events based on active dropdowns and current week
  const filteredEventsForWeek = useMemo(() => {
    return events.filter((e) => {
      // Must belong to a relevant module of the active semester or scheduled retake
      if (!relevantModuleIds.has(e.moduleId)) return false;

      if (selectedModuleFilter !== 'all' && e.moduleId !== selectedModuleFilter) return false;
      if (selectedTypeFilter !== 'all' && e.type !== selectedTypeFilter) return false;

      // Check if event occurs on at least one day in the currently displayed week
      return weekDays.some((day) => isEventScheduledOnDay(e, day.num, day.isoDate));
    });
  }, [events, relevantModuleIds, selectedModuleFilter, selectedTypeFilter, weekDays, viewMode]);

  // Determine whether Saturday/Sunday have events in this week
  const hasSaturdayEvents = useMemo(() => {
    const sat = weekDays[5];
    return events.some((e) => relevantModuleIds.has(e.moduleId) && isEventScheduledOnDay(e, 6, sat.isoDate));
  }, [events, relevantModuleIds, weekDays, viewMode]);

  const hasSundayEvents = useMemo(() => {
    const sun = weekDays[6];
    return events.some((e) => relevantModuleIds.has(e.moduleId) && isEventScheduledOnDay(e, 7, sun.isoDate));
  }, [events, relevantModuleIds, weekDays, viewMode]);

  // Displayed days
  const visibleDays = useMemo(() => {
    const base = weekDays.slice(0, 5); // Mo-Fr
    if (showWeekend || hasSaturdayEvents) {
      base.push(weekDays[5]); // Sa
    }
    if (showWeekend || hasSundayEvents) {
      base.push(weekDays[6]); // So
    }
    return base;
  }, [weekDays, showWeekend, hasSaturdayEvents, hasSundayEvents]);

  // Calculate position in hours (from 08:00 to 19:00 = 11 hours)
  const startHourMin = 8;
  const endHourMax = 19;
  const totalHours = endHourMax - startHourMin;

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const getEventStyle = (startTime: string, endTime: string) => {
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const baseMins = startHourMin * 60;
    const totalMins = totalHours * 60;

    const topPercent = Math.max(0, ((startMins - baseMins) / totalMins) * 100);
    const heightPercent = Math.max(4, Math.min(100 - topPercent, ((endMins - startMins) / totalMins) * 100));

    return {
      top: `${topPercent}%`,
      height: `${heightPercent}%`,
    };
  };

  const hoursList = Array.from({ length: totalHours + 1 }, (_, i) => startHourMin + i);

  const getModule = (modId: string) => modules.find((m) => m.id === modId);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingEvent(null);
    setFormData({
      title: '',
      moduleId: modules[0]?.id || '',
      semesterId: activeSemester?.id || '',
      type: 'vorlesung',
      dayOfWeek: 1,
      startTime: '08:15',
      endTime: '10:00',
      room: 'Hörsaal A101',
      eventBlocks: [{ dayOfWeek: 1, startTime: '08:15', endTime: '10:00', room: 'Hörsaal A101' }],
      lecturer: '',
      notes: '',
      isRecurring: true,
      startDate: activeSemester?.startDate || formatDateIso(new Date()),
      endDate: activeSemester?.endDate || '',
      date: '',
    });
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (evt: EventCourse) => {
    setEditingEvent(evt);
    setFormData({
      ...evt,
      eventBlocks: [{ dayOfWeek: evt.dayOfWeek || 1, startTime: evt.startTime || '08:15', endTime: evt.endTime || '10:00', room: evt.room || 'Hörsaal A101' }],
    });
    setSelectedEvent(null);
    setShowAddModal(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.moduleId) return;

    const blocks = formData.eventBlocks && formData.eventBlocks.length > 0
      ? formData.eventBlocks
      : [{ dayOfWeek: formData.dayOfWeek || 1, startTime: formData.startTime || '08:15', endTime: formData.endTime || '10:00', room: formData.room || '' }];

    if (editingEvent) {
      const updated: EventCourse = {
        ...editingEvent,
        title: formData.title.trim(),
        moduleId: formData.moduleId,
        semesterId: formData.semesterId,
        type: (formData.type as EventType) || 'vorlesung',
        dayOfWeek: blocks[0].dayOfWeek,
        startTime: blocks[0].startTime,
        endTime: blocks[0].endTime,
        room: blocks[0].room?.trim() || formData.room?.trim() || '',
        lecturer: formData.lecturer?.trim() || '',
        notes: formData.notes?.trim() || '',
        isRecurring: formData.isRecurring ?? true,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        date: formData.date || undefined,
      };
      onUpdateEvent(updated);

      if (blocks.length > 1 && onAddEvent) {
        blocks.slice(1).forEach((b, index) => {
          onAddEvent({
            id: `evt-${Date.now()}-${index}`,
            title: formData.title!.trim(),
            moduleId: formData.moduleId!,
            semesterId: formData.semesterId,
            type: (formData.type as EventType) || 'vorlesung',
            dayOfWeek: b.dayOfWeek,
            startTime: b.startTime,
            endTime: b.endTime,
            room: b.room?.trim() || formData.room?.trim() || '',
            lecturer: formData.lecturer?.trim() || '',
            notes: formData.notes?.trim() || '',
            isRecurring: formData.isRecurring ?? true,
            startDate: formData.startDate || undefined,
            endDate: formData.endDate || undefined,
            date: formData.date || undefined,
          });
        });
      }
    } else {
      blocks.forEach((block, index) => {
        const newEvt: EventCourse = {
          id: `evt-${Date.now()}-${index}`,
          title: formData.title!.trim(),
          moduleId: formData.moduleId!,
          semesterId: formData.semesterId,
          type: (formData.type as EventType) || 'vorlesung',
          dayOfWeek: block.dayOfWeek,
          startTime: block.startTime,
          endTime: block.endTime,
          room: block.room?.trim() || formData.room?.trim() || '',
          lecturer: formData.lecturer?.trim() || '',
          notes: formData.notes?.trim() || '',
          isRecurring: formData.isRecurring ?? true,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          date: formData.date || undefined,
        };
        onAddEvent(newEvt);
      });
    }

    setShowAddModal(false);
  };

  const eventTypeLabels: Record<EventType, string> = {
    vorlesung: 'Vorlesung',
    praktikum: 'Praktikum / Labor',
    seminar: 'Seminar',
    uebung: 'Übung',
    tutorium: 'Tutorium',
  };

  // Pre-calculated list of weeks for quick jump within the active semester
  const semesterWeeksList = useMemo(() => {
    if (!weekSemester?.startDate || !weekSemester?.endDate) return [];
    const startMon = getMonday(new Date(weekSemester.startDate));
    const end = new Date(weekSemester.endDate);
    const weeks: { weekNum: number; kw: number; monday: Date; label: string }[] = [];
    let cur = new Date(startMon);
    let count = 1;

    while (cur <= end && count <= 24) {
      const sun = new Date(cur);
      sun.setDate(cur.getDate() + 6);
      const kw = getIsoWeekNumber(cur);
      weeks.push({
        weekNum: count,
        kw,
        monday: new Date(cur),
        label: `Woche ${count} (KW ${kw}): ${formatGermanDate(cur)} – ${formatGermanDate(sun)}`,
      });
      cur.setDate(cur.getDate() + 7);
      count++;
    }
    return weeks;
  }, [weekSemester]);

  return (
    <div className="space-y-5">
      {/* Top Banner & Control Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
        {/* Main Title Row */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-teal-500/20 to-teal-500/5 border border-teal-500/30 rounded-xl text-teal-400 shadow-sm">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  Wochenstundenplan
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  KW {currentKw}
                </span>
                {semesterWeekNumber && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {semesterWeekNumber}. Vorlesungswoche
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{weekSemester?.name || 'Wintersemester 2026/27'}</span>
                <span>·</span>
                <span className="text-slate-300 font-mono">
                  {formatGermanDate(currentMonday)} – {formatGermanDate(sundayOfWeek)} {sundayOfWeek.getFullYear()}
                </span>
                <span>·</span>
                <span className="text-teal-400 font-mono font-semibold">
                  {filteredEventsForWeek.length} Termine diese Woche
                </span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* View Mode Toggle: Specific Week vs Generic Weekly Schema */}
            <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === 'week'
                    ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Wochenweise mit konkretem Datum und iCal-Anfangs/Endterminen"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Wochenansicht (mit Datum)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('generic')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === 'generic'
                    ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Zeigt das allgemeine Standard-Wochenschema aller wiederkehrenden Veranstaltungen"
              >
                <CalendarCheck2 className="w-3.5 h-3.5" />
                <span>Standard-Wochenraster</span>
              </button>
            </div>

            {/* Importer Button */}
            <button
              onClick={() => setShowImporter(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importieren (iCal / CSV)</span>
            </button>

            {/* New Event Button */}
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-teal-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Termin anlegen</span>
            </button>
          </div>
        </div>

        {/* Week Paging & Quick Selector Bar */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          {/* Week Switcher Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Vorherige Woche"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline pr-1">Vorherige</span>
            </button>

            <button
              onClick={handleGoToToday}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-teal-300 border border-slate-800 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5"
              title="Zur aktuellen Kalenderwoche springen"
            >
              <span>Heute</span>
            </button>

            <button
              onClick={handleNextWeek}
              className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Nächste Woche"
            >
              <span className="hidden sm:inline pl-1">Nächste</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Selected Week Indicator Pill */}
            <div className="ml-1 sm:ml-2 px-3 py-1.5 bg-slate-950/80 border border-teal-500/30 rounded-lg text-xs flex items-center gap-2">
              <span className="font-semibold text-teal-400 font-mono">KW {currentKw}</span>
              <span className="text-slate-400 hidden sm:inline">|</span>
              <span className="text-slate-200 font-medium truncate">
                {formatGermanDate(currentMonday)} – {formatGermanDate(sundayOfWeek)}
              </span>
            </div>
          </div>

          {/* Quick jump dropdown and Date Picker */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Semester Week Jump Dropdown */}
            {semesterWeeksList.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 max-w-[200px] sm:max-w-[240px]">
                <span className="text-slate-500 text-[11px] shrink-0">Woche:</span>
                <select
                  value={semesterWeekNumber || ''}
                  onChange={(e) => {
                    const selNum = Number(e.target.value);
                    const found = semesterWeeksList.find((w) => w.weekNum === selNum);
                    if (found) setCurrentMonday(found.monday);
                  }}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer w-full truncate"
                >
                  <option value="" disabled>Woche auswählen...</option>
                  {semesterWeeksList.map((w) => (
                    <option key={w.weekNum} value={w.weekNum}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Direct Date Picker Jump */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 shrink-0" title="Zu beliebigem Datum springen">
              <input
                type="date"
                value={formatDateIso(currentMonday)}
                onChange={(e) => handleDateJump(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs font-mono"
              />
            </div>

            {/* Weekend Toggle */}
            <button
              onClick={() => setShowWeekend(!showWeekend)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
                showWeekend || hasSaturdayEvents
                  ? 'bg-slate-800 text-teal-300 border-teal-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300'
              }`}
              title="Wochenende (Samstag / Sonntag) ein- oder ausblenden"
            >
              Sa/So {showWeekend || hasSaturdayEvents ? 'aktiv' : 'verbergen'}
            </button>
          </div>
        </div>

        {/* Filter bar for Modules & Types */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            {/* Module Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedModuleFilter}
                onChange={(e) => setSelectedModuleFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                <option value="all">Module des aktuellen Semesters ({relevantModules.length})</option>
                {relevantModules.map((m) => {
                  const isRetake = m.semesterId !== activeSemester?.id;
                  return (
                    <option key={m.id} value={m.id}>
                      {m.code ? `${m.code} · ` : ''}{m.shortName} {isRetake ? '(Wiederholung/Nachholfach)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">Alle Veranstaltungsarten</option>
                <option value="vorlesung">Vorlesungen</option>
                <option value="praktikum">Praktika / Labor</option>
                <option value="seminar">Seminare</option>
                <option value="uebung">Übungen</option>
                <option value="tutorium">Tutorien</option>
              </select>
            </div>
          </div>

          {/* Quick Notice Info about start/end dates from iCal */}
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>
              Veranstaltungen werden exakt nach hinterlegtem Anfangs- & Enddatum wochenweise gefiltert.
            </span>
          </div>
        </div>
      </div>

      {/* Timetable Grid View with Horizontal Scroll Protection for Tablets */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto pb-1 scrollbar-thin">
          <div className="min-w-[660px]">
            {/* Days Header */}
            <div 
              style={{ gridTemplateColumns: `60px repeat(${visibleDays.length}, minmax(105px, 1fr))` }}
              className="grid border-b border-slate-800 bg-slate-950/80 text-xs font-semibold text-slate-300"
            >
              <div className="p-3 text-center border-r border-slate-800 text-slate-500 font-mono text-[11px] flex items-center justify-center">
                Zeit
              </div>
              {visibleDays.map((day) => {
                const dayEventsCount = filteredEventsForWeek.filter((e) =>
                  isEventScheduledOnDay(e, day.num, day.isoDate)
                ).length;

                return (
                  <div 
                    key={day.num} 
                    className={`p-3 text-center border-r border-slate-800 last:border-r-0 transition-colors ${
                      day.isToday ? 'bg-teal-950/30 border-b-2 border-b-teal-400' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`font-semibold ${day.isToday ? 'text-teal-300' : 'text-slate-100'}`}>
                        {day.name}
                      </span>
                      {day.isToday && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider font-bold bg-teal-500 text-slate-950">
                          Heute
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center justify-center gap-2 text-[11px]">
                      <span className={`font-mono ${day.isToday ? 'text-teal-400 font-semibold' : 'text-slate-400'}`}>
                        {day.formatted}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dayEventsCount} {dayEventsCount === 1 ? 'Termin' : 'Termine'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timetable Body with hourly ruler */}
            <div 
              style={{ gridTemplateColumns: `60px repeat(${visibleDays.length}, minmax(105px, 1fr))` }}
              className="relative min-h-[680px] grid divide-x divide-slate-800 bg-slate-950/40"
            >
              {/* Time ruler column */}
              <div className="relative border-r border-slate-800 bg-slate-950/70 select-none">
                {hoursList.map((hour, idx) => (
                  <div
                    key={hour}
                    style={{ top: `${(idx / totalHours) * 100}%` }}
                    className="absolute w-full px-1.5 -translate-y-2 text-[11px] font-mono text-slate-500 text-right pr-2"
                  >
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Days Columns */}
              {visibleDays.map((day) => {
                const dayEvents = filteredEventsForWeek.filter((e) =>
                  isEventScheduledOnDay(e, day.num, day.isoDate)
                );

                return (
                  <div 
                    key={day.num} 
                    className={`relative h-full ${day.isToday ? 'bg-teal-500/[0.02]' : ''}`}
                  >
                    {/* Horizontal hour lines */}
                    {hoursList.map((hour, idx) => (
                      <div
                        key={hour}
                        style={{ top: `${(idx / totalHours) * 100}%` }}
                        className="absolute w-full border-t border-slate-800/40 pointer-events-none"
                      />
                    ))}

                    {/* Empty State indicator for day */}
                    {dayEvents.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">
                          Frei
                        </span>
                      </div>
                    )}

                    {/* Event blocks */}
                    {dayEvents.map((evt) => {
                      const mod = getModule(evt.moduleId);
                      const color = mod?.color || '#06b6d4';
                      const style = getEventStyle(evt.startTime, evt.endTime);
                      const isSingleDate = Boolean(evt.date);
                      const isBlockCourse = Boolean(evt.startDate && evt.endDate && evt.isRecurring);

                      return (
                        <div
                          key={`${evt.id}-${day.isoDate}`}
                          onClick={() => setSelectedEvent(evt)}
                          style={{
                            ...style,
                            borderLeftColor: color,
                          }}
                          className="absolute left-1 right-1 p-2 rounded-lg bg-slate-900/95 border border-slate-700/60 border-l-4 shadow-md hover:shadow-xl hover:border-slate-500 cursor-pointer transition-all duration-150 overflow-hidden group z-10 hover:z-20 flex flex-col justify-between"
                        >
                          <div>
                            {/* Top tag & time */}
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                              <span
                                style={{ color }}
                                className="text-[10px] font-mono font-bold tracking-wider uppercase truncate max-w-[55%]"
                              >
                                {mod?.code || mod?.shortName || 'PHARM'}
                              </span>
                              <span className="text-[9px] font-mono tabular-nums text-slate-300 font-medium bg-slate-950/70 px-1 py-0.5 rounded truncate">
                                {evt.startTime} - {evt.endTime}
                              </span>
                            </div>

                            {/* Event Title */}
                            <h4 className="text-xs font-semibold text-slate-100 line-clamp-2 leading-tight break-words group-hover:text-teal-300 transition-colors">
                              {evt.title}
                            </h4>

                            {/* Room & Location */}
                            {evt.room && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 truncate">
                                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate">{evt.room}</span>
                              </div>
                            )}
                          </div>

                          {/* Badges for Event Type, Block or Single Appointment */}
                          <div className="mt-1 flex flex-wrap items-center gap-1 overflow-hidden">
                            {evt.type === 'praktikum' && (
                              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20 truncate max-w-full">
                                Labor
                              </span>
                            )}
                            {evt.type === 'seminar' && (
                              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-semibold border border-purple-500/20 truncate max-w-full">
                                Seminar
                              </span>
                            )}
                            {evt.type === 'uebung' && (
                              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-semibold border border-blue-500/20 truncate max-w-full">
                                Übung
                              </span>
                            )}

                            {isSingleDate && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 font-medium border border-rose-500/25 truncate max-w-full">
                                📌 Einmalig
                              </span>
                            )}

                            {isBlockCourse && evt.endDate && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 font-mono border border-teal-500/25 truncate max-w-full">
                                ⏱️ bis {evt.endDate.split('-').slice(1).reverse().join('.')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span
                  style={{ color: getModule(selectedEvent.moduleId)?.color || '#06b6d4' }}
                  className="text-xs font-mono font-bold uppercase tracking-wider"
                >
                  {getModule(selectedEvent.moduleId)?.code} · {getModule(selectedEvent.moduleId)?.name || 'Modul'}
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-200 text-sm p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="font-medium">
                  {visibleDays.find((d) => d.num === selectedEvent.dayOfWeek)?.name || 'Wochentag'},{' '}
                  <span className="font-mono tabular-nums text-teal-300">
                    {selectedEvent.startTime} - {selectedEvent.endTime} Uhr
                  </span>
                </span>
              </div>

              {/* Exact validity dates from iCal */}
              <div className="flex items-start gap-2 text-slate-300">
                <CalendarIcon className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-200">Gültigkeitszeitraum: </span>
                  {selectedEvent.date ? (
                    <span className="text-amber-400 font-mono">
                      Einzeltermin am {selectedEvent.date.split('-').reverse().join('.')}
                    </span>
                  ) : selectedEvent.startDate || selectedEvent.endDate ? (
                    <span className="font-mono text-cyan-300">
                      {selectedEvent.startDate ? selectedEvent.startDate.split('-').reverse().join('.') : 'Semesterstart'} bis{' '}
                      {selectedEvent.endDate ? selectedEvent.endDate.split('-').reverse().join('.') : 'Semesterende'}
                      {selectedEvent.isRecurring && ' (wöchentlich)'}
                    </span>
                  ) : (
                    <span className="text-slate-400">Regulär das gesamte Vorlesungssemester</span>
                  )}
                </div>
              </div>

              {selectedEvent.room && (
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Raum: {selectedEvent.room}</span>
                </div>
              )}

              {selectedEvent.lecturer && (
                <div className="flex items-center gap-2 text-slate-300">
                  <User className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Dozent/in: {selectedEvent.lecturer}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-300">
                <BookOpen className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Format: {eventTypeLabels[selectedEvent.type]}</span>
              </div>

              {selectedEvent.notes && (
                <div className="pt-2 border-t border-slate-800 text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg">
                  „{selectedEvent.notes}“
                </div>
              )}
            </div>

            {/* Actions for this event */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteEvent(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                  className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Löschen</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedEvent)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Bearbeiten</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const modId = selectedEvent.moduleId;
                  const cId = selectedEvent.id;
                  const cTitle = selectedEvent.title;
                  setSelectedEvent(null);
                  onNavigateToNotes(modId, cId, cTitle);
                }}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Vorlesungsmitschrift öffnen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                {editingEvent ? <Edit3 className="w-4 h-4 text-teal-400" /> : <Plus className="w-4 h-4 text-teal-400" />}
                {editingEvent ? 'Veranstaltung bearbeiten' : 'Veranstaltung eintragen'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Titel der Veranstaltung
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="z.B. Vorlesung Anorganische Chemie I"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Zugeordnetes Modul
                  </label>
                  <select
                    value={formData.moduleId}
                    onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    {relevantModules.map((m) => {
                      const isRetake = m.semesterId !== activeSemester?.id;
                      return (
                        <option key={m.id} value={m.id}>
                          {m.code ? `${m.code} · ` : ''}{m.shortName} {isRetake ? '(Wiederholung/Nachholfach)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Semester
                  </label>
                  <select
                    value={formData.semesterId || ''}
                    onChange={(e) => setFormData({ ...formData, semesterId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Keine Zuordnung</option>
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.termName || 'Semester'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Raum / Hörsaal
                  </label>
                  <input
                    type="text"
                    value={formData.room || ''}
                    onChange={(e) => {
                      const newRoom = e.target.value;
                      const updatedBlocks = (formData.eventBlocks || []).map(b => ({ ...b, room: b.room === formData.room ? newRoom : b.room }));
                      setFormData({ ...formData, room: newRoom, eventBlocks: updatedBlocks.length ? updatedBlocks : formData.eventBlocks });
                    }}
                    placeholder="z.B. Hörsaal Liebig C101"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Dozent / Dozentin
                  </label>
                  <input
                    type="text"
                    value={formData.lecturer || ''}
                    onChange={(e) => setFormData({ ...formData, lecturer: e.target.value })}
                    placeholder="z.B. Prof. Liebig"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Veranstaltungsart
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="vorlesung">Vorlesung</option>
                  <option value="praktikum">Praktikum / Labor</option>
                  <option value="seminar">Seminar</option>
                  <option value="uebung">Übung</option>
                  <option value="tutorium">Tutorium</option>
                </select>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-teal-400" />
                    Termine
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const blocks = formData.eventBlocks || [{ dayOfWeek: formData.dayOfWeek || 1, startTime: formData.startTime || '08:15', endTime: formData.endTime || '10:00', room: formData.room || '' }];
                      setFormData({
                        ...formData,
                        eventBlocks: [...blocks, { dayOfWeek: 2, startTime: '10:15', endTime: '11:45', room: formData.room || '' }]
                      });
                    }}
                    className="text-[11px] text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Block hinzufügen
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Füge beliebig viele Blöcke hinzu, falls die Veranstaltung an verschiedenen Tagen zu unterschiedlichen Zeiten oder in anderen Räumen stattfindet.
                </span>
                {(formData.eventBlocks || [{ dayOfWeek: formData.dayOfWeek || 1, startTime: formData.startTime || '08:15', endTime: formData.endTime || '10:00', room: formData.room || '' }]).map((block, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 pt-1 pb-1 border-b border-slate-900 last:border-b-0">
                    <select
                      value={block.dayOfWeek}
                      onChange={(e) => {
                        const blocks = [...(formData.eventBlocks || [])];
                        blocks[idx].dayOfWeek = Number(e.target.value);
                        setFormData({ ...formData, eventBlocks: blocks, dayOfWeek: blocks[0].dayOfWeek });
                      }}
                      className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 w-full sm:w-auto"
                    >
                      <option value={1}>Montag</option>
                      <option value={2}>Dienstag</option>
                      <option value={3}>Mittwoch</option>
                      <option value={4}>Donnerstag</option>
                      <option value={5}>Freitag</option>
                      <option value={6}>Samstag</option>
                      <option value={7}>Sonntag</option>
                    </select>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <input
                        type="time"
                        value={block.startTime}
                        onChange={(e) => {
                          const blocks = [...(formData.eventBlocks || [])];
                          blocks[idx].startTime = e.target.value;
                          setFormData({ ...formData, eventBlocks: blocks, startTime: blocks[0].startTime });
                        }}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 font-mono w-24"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="time"
                        value={block.endTime}
                        onChange={(e) => {
                          const blocks = [...(formData.eventBlocks || [])];
                          blocks[idx].endTime = e.target.value;
                          setFormData({ ...formData, eventBlocks: blocks, endTime: blocks[0].endTime });
                        }}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 font-mono w-24"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Hörsaal"
                      value={block.room !== undefined ? block.room : (formData.room || '')}
                      onChange={(e) => {
                        const blocks = [...(formData.eventBlocks || [])];
                        blocks[idx].room = e.target.value;
                        setFormData({ ...formData, eventBlocks: blocks });
                      }}
                      className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 w-full sm:w-auto sm:flex-1 box-border min-w-0"
                    />
                    {(formData.eventBlocks || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const blocks = (formData.eventBlocks || []).filter((_, i) => i !== idx);
                          setFormData({ ...formData, eventBlocks: blocks });
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 self-center"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Date & Period Controls (Anfang / Ende / Einzeltermin) */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-teal-400" />
                    Gültigkeitszeitraum (iCal-Zeitspanne)
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.isRecurring ?? true}
                      onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                      className="rounded border-slate-700 text-teal-500 focus:ring-teal-500 bg-slate-900"
                    />
                    <span>Wiederkehrend</span>
                  </label>
                </div>

                {formData.isRecurring ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Gültig ab (Startdatum)
                      </label>
                      <input
                        type="date"
                        value={formData.startDate || ''}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Gültig bis (Enddatum)
                      </label>
                      <input
                        type="date"
                        value={formData.endDate || ''}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Konkretes Datum des Einzeltermins
                    </label>
                    <input
                      type="date"
                      value={formData.date || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const d = new Date(val);
                          const dayNr = d.getDay() === 0 ? 7 : d.getDay();
                          setFormData({ ...formData, date: val, dayOfWeek: dayNr, startDate: val, endDate: val });
                        } else {
                          setFormData({ ...formData, date: '' });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                )}
              </div>



              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Hinweise / Notizen
                </label>
                <input
                  type="text"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="z.B. Kittel und Schutzbrille erforderlich"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
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
                  {editingEvent ? 'Änderungen speichern' : 'Veranstaltung anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Importer Modal */}
      {showImporter && (
        <TimetableImporter
          modules={modules}
          semesters={semesters}
          studyStages={studyStages}
          moduleHandbook={moduleHandbook}
          onImportEvents={(newEvts, newMods, assignedSemesterId, newlyCreatedSemester) => {
            onImportEvents(newEvts, newMods, assignedSemesterId, newlyCreatedSemester);
            setShowImporter(false);
          }}
          onClose={() => setShowImporter(false)}
        />
      )}
    </div>
  );
};
