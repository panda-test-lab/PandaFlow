import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Award, 
  Inbox, 
  BookOpen, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Sparkles, 
  Network, 
  FileText,
  Send,
  Check,
  HelpCircle
} from 'lucide-react';
import { 
  AppDatabase, 
  EventCourse, 
  Exam, 
  DeadlineItem, 
  LearningTopic, 
  AnkiCard 
} from '../types';

interface DashboardProps {
  data: AppDatabase;
  userName?: string;
  onNavigate: (tabId: string, params?: any) => void;
  onAdvanceTopicMastery: (topic: LearningTopic) => void;
  onOpenReviewModal?: (topic: LearningTopic) => void;
  onAddAnkiCard: (card: AnkiCard) => void;
  onUpdateAnkiStatus: (id: string, status: AnkiCard['status']) => void;
  onToggleDeadline: (deadline: DeadlineItem) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  userName,
  onNavigate,
  onAdvanceTopicMastery,
  onOpenReviewModal,
  onAddAnkiCard,
  onUpdateAnkiStatus,
  onToggleDeadline,
}) => {
  // Quick Anki Card input from Dashboard
  const [quickFront, setQuickFront] = useState('');
  const [quickBack, setQuickBack] = useState('');
  const [quickModuleId, setQuickModuleId] = useState(data.modules[0]?.id || '');
  const [quickAddedSuccess, setQuickAddedSuccess] = useState(false);

  const getModule = (modId?: string) => data.modules.find((m) => m.id === modId);

  // Today's day of week (1=Mon ... 7=Sun)
  const today = new Date();
  const rawDay = today.getDay();
  const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;

  // If today has no classes (e.g. weekend), preview Monday
  const dayToDisplay = currentDayOfWeek >= 1 && currentDayOfWeek <= 5 ? currentDayOfWeek : 1;
  const dayNames = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  const todayEvents = data.events
    .filter((e) => e.dayOfWeek === dayToDisplay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Upcoming Exams (next 90 days)
  const upcomingExams = data.exams
    .filter((e) => e.status !== 'bestanden')
    .sort((a, b) => a.date.localeCompare(b.date));

  // Pending Deadlines
  const pendingDeadlines = data.deadlines
    .filter((d) => !d.isCompleted)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Due, High Learning Need, or Exam-Relevant Learning Topics
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTime = new Date().setHours(0, 0, 0, 0);

  const dueTopics = data.topics.filter((t) => {
    const isDue = t.understanding === 'Nicht verstanden' || t.nextReviewDate <= todayStr;
    if (isDue) return true;

    const isHighNeed = (t.relevance && (t.relevance.includes('Hoch') || t.relevance.includes('⭐⭐'))) || t.difficulty === 'anspruchsvoll';
    if (isHighNeed) return true;

    const linkedExams = data.exams.filter(
      (e) => (e.linkedTopicIds?.includes(t.id) || e.moduleId === t.moduleId) && e.status !== 'bestanden'
    );
    const hasUpcomingExamSoon = linkedExams.some((e) => {
      const days = Math.ceil((new Date(e.date).getTime() - nowTime) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    });
    if (hasUpcomingExamSoon) return true;

    return false;
  });

  // Unprocessed Anki Inbox Cards
  const inboxCards = data.ankiInbox.filter((c) => c.status === 'inbox');

  // Notes with open questions
  const openQuestionsNotes = data.notes.filter((n) => {
    const hasText = !!(n.openQuestions && n.openQuestions.trim().length > 0);
    const hasList = !!(n.openQuestionsList && n.openQuestionsList.length > 0);
    return hasText || hasList;
  });

  const calculateDaysLeft = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  };

  const handleQuickAddAnki = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFront.trim() || !quickBack.trim()) return;

    const mod = getModule(quickModuleId);
    const newCard: AnkiCard = {
      id: `anki-${Date.now()}`,
      front: quickFront.trim(),
      back: quickBack.trim(),
      moduleId: quickModuleId,
      tags: ['Dashboard-Quick', mod?.shortName || 'Studium'],
      status: 'inbox',
      createdAt: new Date().toISOString(),
      deckName: `Studium::1_Semester::${mod?.shortName?.replace(/\s+/g, '_') || 'Allgemein'}`,
    };

    onAddAnkiCard(newCard);
    setQuickFront('');
    setQuickBack('');
    setQuickAddedSuccess(true);
    setTimeout(() => setQuickAddedSuccess(false), 2000);
  };

  const currentSemester = data.semesters.find((s) => s.id === data.settings.currentSemesterId) || data.semesters[0];
  const semesterModules = data.modules.filter((m) => m.semesterId === currentSemester?.id);
  const totalEcts = semesterModules.reduce((acc, m) => acc + (m.credits || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-teal-400 uppercase tracking-wider truncate">
                {currentSemester?.name || '1. Fachsemester'}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">WS 2026/2027</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight break-words">
              {(() => {
                const hour = new Date().getHours();
                let timeGreeting = 'Guten Tag';
                if (hour >= 5 && hour < 11) {
                  timeGreeting = 'Guten Morgen';
                } else if (hour >= 11 && hour < 15) {
                  timeGreeting = 'Guten Mittag';
                } else if (hour >= 15 && hour < 18) {
                  timeGreeting = 'Guten Tag';
                } else {
                  timeGreeting = 'Guten Abend';
                }
                return userName ? `${timeGreeting}, ${userName}!` : `${timeGreeting}!`;
              })()} Dein Studien- & Lernüberblick
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Alles bereit für Vorlesungen, Seminare und Prüfungsvorbereitung.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 shrink-0 w-full sm:w-auto">
            <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
              <span className="block text-[11px] sm:text-xs text-slate-400">Semesterleistung</span>
              <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-teal-400">
                {totalEcts} ECTS
              </span>
            </div>
            <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
              <span className="block text-[11px] sm:text-xs text-slate-400">Anki-Inbox</span>
              <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-amber-400">
                {inboxCards.length} neu
              </span>
            </div>
          </div>
        </div>

        {/* Decorative subtle background grid */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-teal-500/5 to-transparent pointer-events-none" />
      </div>

      {/* Grid: Main Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Timetable Today + Deadlines & Exams */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* Widget 1: Timetable for Today */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400 shrink-0">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-100 truncate">
                    Stundenplan {dayNames[dayToDisplay]}
                  </h3>
                  <span className="text-[11px] text-slate-400 truncate block">
                    {currentDayOfWeek >= 1 && currentDayOfWeek <= 5
                      ? 'Heutige Veranstaltungen'
                      : 'Vorschau für den nächsten Studientag (Montag)'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('stundenplan')}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition-colors shrink-0"
              >
                <span>Wochenplan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {todayEvents.map((evt) => {
                const mod = getModule(evt.moduleId);
                return (
                  <div
                    key={evt.id}
                    className="p-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors overflow-hidden min-w-0"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="text-center min-w-[65px] pt-0.5 shrink-0">
                        <span className="block font-mono tabular-nums text-xs font-semibold text-slate-200">
                          {evt.startTime}
                        </span>
                        <span className="block font-mono tabular-nums text-[10px] text-slate-500">
                          bis {evt.endTime}
                        </span>
                      </div>

                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span
                            style={{ color: mod?.color || '#06b6d4' }}
                            className="text-[10px] font-mono font-semibold uppercase shrink-0"
                          >
                            {mod?.code || 'MODUL'}
                          </span>
                          <span className="text-xs font-semibold text-slate-100 truncate max-w-full block">
                            {evt.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                          {evt.room && (
                            <span className="flex items-center gap-1 truncate max-w-full">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{evt.room}</span>
                            </span>
                          )}
                          {evt.type === 'praktikum' && (
                            <span className="text-amber-400 font-medium text-[10px] shrink-0">
                              Laborpraktikum
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate('mitschriften', { moduleId: evt.moduleId, courseId: evt.id, courseTitle: evt.title })}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors self-end md:self-center shrink-0 whitespace-nowrap"
                    >
                      <FileText className="w-3 h-3 shrink-0" />
                      <span>Mitschriften</span>
                    </button>
                  </div>
                );
              })}

              {todayEvents.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Keine Veranstaltungen für diesen Tag eingetragen.
                </div>
              )}
            </div>
          </div>

          {/* Widget 2: Upcoming Deadlines & Exams */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Urgent Deadlines */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-400" />
                  <h3 className="text-xs font-semibold text-slate-200">
                    Anstehende Fristen ({pendingDeadlines.length})
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('pruefungen')}
                  className="text-[11px] text-teal-400 hover:text-teal-300"
                >
                  Alle Fristen
                </button>
              </div>

              <div className="space-y-2">
                {pendingDeadlines.slice(0, 3).map((dl) => {
                  const daysLeft = calculateDaysLeft(dl.dueDate);
                  const isUrgent = daysLeft <= 3;

                  return (
                    <div
                      key={dl.id}
                      className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between gap-2 min-w-0"
                    >
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <button
                          onClick={() => onToggleDeadline(dl)}
                          className="mt-0.5 w-4 h-4 rounded border border-slate-700 hover:border-teal-500 flex items-center justify-center text-slate-400 shrink-0"
                        >
                          {dl.isCompleted && <Check className="w-3 h-3 text-teal-400" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-200 truncate">
                            {dl.title}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Fällig: {dl.dueDate}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold shrink-0 ${
                          isUrgent
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {daysLeft > 0 ? `noch ${daysLeft} T.` : daysLeft === 0 ? 'Heute!' : 'Fällig'}
                      </span>
                    </div>
                  );
                })}

                {pendingDeadlines.length === 0 && (
                  <p className="text-xs text-slate-500 italic p-3 text-center">
                    Keine offenen Fristen vorhanden.
                  </p>
                )}
              </div>
            </div>

            {/* Upcoming Exams Countdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-semibold text-slate-200">
                    Prüfungen ({upcomingExams.length})
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('pruefungen')}
                  className="text-[11px] text-amber-400 hover:text-amber-300"
                >
                  Prüfungsplan
                </button>
              </div>

              <div className="space-y-2">
                {upcomingExams.slice(0, 3).map((ex) => {
                  const daysLeft = calculateDaysLeft(ex.date);
                  const mod = getModule(ex.moduleId);

                  return (
                    <div
                      key={ex.id}
                      className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between gap-2 min-w-0"
                    >
                      <div className="min-w-0 space-y-0.5 flex-1">
                        <span
                          style={{ color: mod?.color || '#06b6d4' }}
                          className="text-[10px] font-mono font-semibold"
                        >
                          {mod?.code || 'MODUL'}
                        </span>
                        <p className="text-xs font-medium text-slate-200 truncate">
                          {ex.title}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {ex.date} ({ex.time} Uhr)
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-amber-400 block">
                          In {daysLeft} Tagen
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {ex.weightEcts} ECTS
                        </span>
                      </div>
                    </div>
                  );
                })}

                {upcomingExams.length === 0 && (
                  <p className="text-xs text-slate-500 italic p-3 text-center">
                    Keine bevorstehenden Prüfungen eingetragen.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Widget: Open Questions from Lecture Notes */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold text-slate-200">
                  Offene Fragen in Mitschriften ({openQuestionsNotes.length})
                </h3>
              </div>
              <button
                onClick={() => onNavigate('mitschriften')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                Alle Mitschriften
              </button>
            </div>

            <div className="space-y-2">
              {openQuestionsNotes.slice(0, 4).map((note) => {
                const mod = getModule(note.moduleId);
                const questionText = note.openQuestions || (note.openQuestionsList && note.openQuestionsList[0]) || 'Offene Frage in Mitschrift';

                return (
                  <div
                    key={note.id}
                    onClick={() => onNavigate('mitschriften', { noteId: note.id })}
                    className="p-2.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 rounded-lg flex items-center justify-between gap-2 min-w-0 cursor-pointer transition-all group"
                  >
                    <div className="min-w-0 space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          style={{ color: mod?.color || '#06b6d4' }}
                          className="text-[10px] font-mono font-semibold"
                        >
                          {mod?.code || 'MODUL'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {note.lectureDate}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                        {note.title}
                      </p>
                      <p className="text-[11px] text-cyan-300/90 truncate font-mono">
                        ? {questionText}
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 shrink-0 transition-colors" />
                  </div>
                );
              })}

              {openQuestionsNotes.length === 0 && (
                <p className="text-xs text-slate-500 italic p-3 text-center">
                  Keine offenen Fragen in Mitschriften hinterlegt. Super!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Due Learning Topics & Anki Inbox Quick Action */}
        <div className="lg:col-span-4 space-y-6">
          {/* Widget 3: Due Learning Topics (Spaced Repetition) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-slate-200">
                  Wichtige &amp; fällige Lerninhalte ({dueTopics.length})
                </h3>
              </div>
              <button
                onClick={() => onNavigate('lerninhalte')}
                className="text-[11px] text-emerald-400 hover:text-emerald-300"
              >
                Katalog
              </button>
            </div>

            <div className="space-y-2">
              {dueTopics.slice(0, 3).map((topic) => {
                const mod = getModule(topic.moduleId);
                return (
                  <div
                    key={topic.id}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span
                        style={{ color: mod?.color || '#06b6d4' }}
                        className="font-mono font-semibold"
                      >
                        {mod?.shortName}
                      </span>
                      <span className="text-amber-400 font-mono">Prüfen &amp; lernen</span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 leading-snug">
                      {topic.title}
                    </h4>

                    {topic.keyFormulas && topic.keyFormulas[0] && (
                      <p className="text-[10px] font-mono text-teal-300 truncate">
                        {topic.keyFormulas[0]}
                      </p>
                    )}

                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => (onOpenReviewModal ? onOpenReviewModal(topic) : onAdvanceTopicMastery(topic))}
                        className="px-2 py-0.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Gelernt</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {dueTopics.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">
                  Alle Lerninhalte sind aktuell auf Stand!
                </div>
              )}
            </div>
          </div>

          {/* Widget 4: Anki Inbox & Quick Flashcard Capture */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-teal-400" />
                <h3 className="text-xs font-semibold text-slate-200">
                  Anki-Inbox ({inboxCards.length} ungeprüft)
                </h3>
              </div>
              <button
                onClick={() => onNavigate('anki-inbox')}
                className="text-[11px] text-teal-400 hover:text-teal-300"
              >
                Zur Inbox
              </button>
            </div>

            {/* Quick Card Form */}
            <form onSubmit={handleQuickAddAnki} className="space-y-2.5">
              <select
                value={quickModuleId}
                onChange={(e) => setQuickModuleId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-teal-500"
              >
                {data.modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} - {m.shortName}
                  </option>
                ))}
              </select>

              <input
                type="text"
                required
                value={quickFront}
                onChange={(e) => setQuickFront(e.target.value)}
                placeholder="Vorderseite / Prüfungsfrage..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />

              <textarea
                rows={2}
                required
                value={quickBack}
                onChange={(e) => setQuickBack(e.target.value)}
                placeholder="Rückseite / Antwort & Erklärung..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 resize-none font-mono"
              />

              {quickAddedSuccess && (
                <div className="text-[11px] text-teal-300 flex items-center gap-1">
                  <Check className="w-3 h-3 text-teal-400" />
                  <span>In Anki-Inbox gespeichert!</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Karte in Inbox ablegen</span>
              </button>
            </form>
          </div>

          {/* Quick Hub: Knowledge Graph Shortcut */}
          <div
            onClick={() => onNavigate('wissensgraph')}
            className="p-4 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500/50 rounded-xl cursor-pointer transition-all shadow-lg flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-500/10 rounded-lg text-teal-400 group-hover:scale-110 transition-transform">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200 group-hover:text-teal-300 transition-colors">
                  Wissensgraph öffnen
                </h4>
                <p className="text-[11px] text-slate-400">
                  Vernetzte Mind-Map aller Studienfächer & Module
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
};
