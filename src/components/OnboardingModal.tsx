import React, { useState } from 'react';
import { 
  Sparkles, 
  User, 
  LayoutDashboard, 
  Calendar, 
  BookMarked, 
  FileText, 
  BookOpen, 
  Inbox, 
  ShieldCheck, 
  Heart, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  X, 
  ExternalLink 
} from 'lucide-react';
import { KofiWidget } from './KofiWidget';

interface OnboardingModalProps {
  initialName?: string;
  onComplete: (name: string, settings: { ectsScoringMode: 'modules' | 'exams' | 'both' }) => void;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  initialName = '',
  onComplete,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [name, setName] = useState<string>(initialName);
  const [nameError, setNameError] = useState<string>('');

  const [ectsScoringMode, setEctsScoringMode] = useState<'modules' | 'exams' | 'both'>('modules');

  const steps = [
    {
      id: 'welcome',
      badge: 'Willkommen',
      title: 'Dein persönlicher Studienbegleiter',
      icon: Sparkles,
      iconColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    },
    {
      id: 'semester-ects',
      badge: 'Studienstruktur',
      title: 'Semester, Module und ECTS einrichten',
      icon: BookMarked,
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      id: 'dashboard',
      badge: 'Dashboard',
      title: 'Tagesüberblick und Lernprioritäten',
      icon: LayoutDashboard,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'timetable',
      badge: 'Stundenplan',
      title: 'Vorlesungen, Räume und Termine im Blick',
      icon: Calendar,
      iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      id: 'modules',
      badge: 'Module',
      title: 'Module, Dozenten und Prüfungsplanung',
      icon: BookMarked,
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      id: 'learning',
      badge: 'Lernen',
      title: 'Mitschriften, Themen und Wissensgraph',
      icon: FileText,
      iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'privacy',
      badge: 'Datenschutz',
      title: 'Sichere Speicherung deiner Lernstände',
      icon: ShieldCheck,
      iconColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    },
    {
      id: 'support',
      badge: 'Support',
      title: 'PandaFlow weiterentwickeln',
      icon: Heart,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  ];

  const handleNext = () => {
    if (currentStep === 0) {
      const trimmed = name.trim();
      if (!trimmed) {
        setNameError('Bitte gib kurz deinen Namen oder Spitznamen ein.');
        return;
      }
      setNameError('');
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete(name.trim() || 'Student', { ectsScoringMode });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete(name.trim() || 'Student', { ectsScoringMode });
  };

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Progress Bar Header */}
        <div className="w-full bg-slate-950/80 border-b border-slate-800 px-6 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-teal-400 font-semibold">
              Schritt {currentStep + 1} von {steps.length}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">
              {currentStepData.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer text-[11px] font-medium"
          >
            Überspringen
          </button>
        </div>

        {/* Top Progress indicator line */}
        <div className="w-full h-1 bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-amber-400 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 min-h-0">
          {/* Header with Icon */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl border ${currentStepData.iconColor} shrink-0`}>
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-teal-400 font-bold block mb-0.5">
                {currentStepData.badge}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 leading-snug">
                {currentStepData.title}
              </h2>
            </div>
          </div>

          {/* Step 0: Name Input */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Willkommen bei <strong>PandaFlow</strong> – dein digitaler Studienraum. Wie möchtest du in der App genannt werden?
              </p>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-200 block">
                  Dein Name oder Spitzname:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNext();
                    }}
                    placeholder="z. B. Alex"
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-700 focus:border-teal-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
                {nameError && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">{nameError}</p>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  Dieser Name erscheint auf dem Dashboard mit einer persönlichen Begrüßung je nach Tageszeit.
                </p>
              </div>
            </div>
          )}

          {/* Step 1: ECTS Settings */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1.5">
                  Wie möchtest du ECTS in deinem Studiengang bewerten?
                </label>
                <select
                  value={ectsScoringMode}
                  onChange={(e) => setEctsScoringMode(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-400 cursor-pointer"
                >
                  <option value="modules">1) Nur Module zählen für ECTS</option>
                  <option value="exams">2) Nur Prüfungen zählen für ECTS</option>
                  <option value="both">3) Module und Prüfungen zählen gemeinsam</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Dashboard */}
          {currentStep === 2 && (
            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                Das <strong>Dashboard</strong> ist dein täglicher Fokusbereich:
              </p>
              <ul className="space-y-2.5 pt-1">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Priorisierte Lernarbeit:</strong> Du siehst sofort, was gerade wichtig, überfällig oder prüfungsnah ist.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Lernfortschritt mit Struktur:</strong> Wiederholungen, Verständnis und nächste Lernschritte bleiben klar organisiert.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Einstieg ohne Reibung:</strong> Prüfungen, Deadlines und Anki-Inbox stehen dir direkt zur Verfügung.
                  </div>
                </li>
              </ul>
            </div>
          )}

          {/* Step 3: Timetable */}
          {currentStep === 3 && (
            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                Der <strong>Stundenplan</strong> macht deinen Studienalltag sichtbar und planbar:
              </p>
              <ul className="space-y-2.5 pt-1">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Wochenüberblick:</strong> Vorlesungen, Praktika, Räume und Uhrzeiten bleiben übersichtlich im Blick.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Flexible Anpassung:</strong> Termine lassen sich leicht ergänzen, importieren und mit Modulen verknüpfen.
                  </div>
                </li>
              </ul>
            </div>
          )}

          {/* Step 4: Modules & Lecturers */}
          {currentStep === 4 && (
            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                Unter <strong>Module &amp; Semester</strong> organisierst du dein Studium mit Klarheit:
              </p>
              <ul className="space-y-2.5 pt-1">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">ECTS &amp; Module:</strong> Du hast alle Leistungen, Fächer und Credits auf einen Blick.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Dozenten-Details:</strong> Kontakte, Sprechzeiten und persönliche Notizen lassen sich direkt mit dem Modul verknüpfen.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Studienstruktur:</strong> Semester, Fachverläufe und Lernphasen bleiben klar gegliedert.
                  </div>
                </li>
              </ul>
            </div>
          )}

          {/* Step 5: Learning & knowledge */}
          {currentStep === 5 && (
            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                In <strong>Mitschriften</strong>, <strong>Lerninhalten</strong> und dem <strong>Wissensgraph</strong> verknüpfst du dein Wissen systematisch:
              </p>
              <ul className="space-y-2.5 pt-1">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Mitschriften:</strong> Notizen, Fragen und Prüfungs-Hinweise bleiben mit dem passenden Thema verbunden.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Lerninhalte:</strong> Verständnis, Wiederholung und Lernpriorität werden sichtbar und nachvollziehbar.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Wissensgraph:</strong> Zusammenhänge zwischen Themen und Modulen werden auf einen Blick verständlich.
                  </div>
                </li>
              </ul>
            </div>
          )}

          {/* Step 6: Privacy & Storage */}
          {currentStep === 6 && (
            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                Deine Daten bleiben bei dir – und sind geschützt:
              </p>
              <ul className="space-y-2.5 pt-1">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Sichere lokale Speicherung:</strong> Lernstände werden geschützt im Anwendungsverzeichnis gespeichert.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Backup &amp; Export:</strong> Du kannst deine Daten jederzeit sichern und wiederherstellen.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-100">Kontrolle statt Abhängigkeit:</strong> Keine unnötige Cloud-Schicht – deine Informationen bleiben in deiner Hand.
                  </div>
                </li>
              </ul>
            </div>
          )}

          {/* Step 7: Support on Ko-Fi */}
          {currentStep === 7 && (
            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Heart className="w-4 h-4 fill-amber-400 text-amber-400" />
                  PandaFlow wird weiterentwickelt – für den echten Studienalltag
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  PandaFlow entsteht aus einem echten Bedürfnis: mehr Klarheit, weniger Chaos und ein sinnvolleres Lernen im Studium.
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Wenn dir diese App hilft, deinen Studienalltag klarer, fokussierter und entspannter zu gestalten, dann ist eine Unterstützung auf Ko-fi eine wertvolle Möglichkeit, die Weiterentwicklung langfristig zu stärken.
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Jeder Beitrag hilft dabei, neue Funktionen zu entwickeln, bestehende Ideen zu verfeinern und PandaFlow so weiterzubauen, dass es noch besser für den realen Uni-Alltag funktioniert.
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Vielen Dank für dein Interesse und deine Unterstützung – sie macht den Unterschied.
                </p>
              </div>

              <div className="py-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <KofiWidget text="Unterstütze meine Arbeit" color="#ffaa00" id="H0G826CZMP" />
                <a
                  href="https://ko-fi.com/H0G826CZMP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1 font-mono"
                >
                  <span>ko-fi.com/H0G826CZMP</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-950/80 border-t border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-3">
          {/* Stepper Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (currentStep === 0 && !name.trim()) {
                    setNameError('Bitte gib kurz deinen Namen ein.');
                    return;
                  }
                  setCurrentStep(idx);
                }}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? 'w-6 bg-teal-400'
                    : idx < currentStep
                    ? 'w-2 bg-teal-600'
                    : 'w-2 bg-slate-800 hover:bg-slate-700'
                }`}
                title={s.badge}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Zurück</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20 cursor-pointer"
            >
              <span>
                {currentStep === steps.length - 1
                  ? 'Los geht’s!'
                  : currentStep === 0
                  ? 'Weiter zum Rundgang'
                  : 'Nächster Schritt'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
