import React, { useState, useRef, useEffect } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, Laptop, HelpCircle, ChevronDown, Check, Calendar, ArrowRight, Layers, AlertTriangle } from 'lucide-react';
import { useTauriApp } from '../hooks/useTauriApp';
import { Semester, Module } from '../types';

interface HeaderProps {
  activeTab?: string;
  onSelectTab: (tab: string) => void;
  onQuickExport?: () => void;
  onOpenOnboarding?: () => void;
  ankiInboxCount?: number;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  currentSemester?: Semester;
  semesters?: Semester[];
  modules?: Module[];
  onSetActiveSemester?: (semesterId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectTab,
  onOpenOnboarding,
  isSidebarCollapsed = false,
  onToggleSidebar,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
  currentSemester,
  semesters = [],
  modules = [],
  onSetActiveSemester,
}) => {
  const { version, isTauri, source } = useTauriApp();
  const [showSemesterDropdown, setShowSemesterDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSemesterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-800 bg-slate-950 shrink-0 z-30 gap-3">
      {/* Top Left: Sidebar Toggle & PandaFlow Logo + Brand + Subtitle */}
      <div className="flex items-center gap-3 sm:gap-3.5 shrink-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-slate-800 transition-colors hidden md:flex items-center justify-center cursor-pointer"
            title={isSidebarCollapsed ? "Seitenleiste ausklappen" : "Seitenleiste minimieren"}
            aria-label="Seitenleiste umschalten"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-teal-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-400" />
            )}
          </button>
        )}

        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-slate-800 transition-colors md:hidden flex items-center justify-center cursor-pointer"
            title="Navigation öffnen"
            aria-label="Navigation öffnen"
          >
            <Menu className="w-4 h-4 text-teal-400" />
          </button>
        )}

        <div 
          onClick={() => onSelectTab('dashboard')}
          className="cursor-pointer group flex items-center gap-2.5 sm:gap-3 select-none"
          title="PandaFlow Dashboard aufrufen"
        >
          {/* PandaFlow App Logo */}
          <div className="relative">
            <img 
              src="/pandaflow-logo.png" 
              alt="PandaFlow Logo" 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover ring-1 ring-teal-500/30 shadow-md shadow-teal-950/50 group-hover:ring-teal-400/60 group-hover:scale-105 transition-all shrink-0"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 border-2 border-slate-950 rounded-full" />
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-100 group-hover:text-teal-400 transition-colors">
                PandaFlow
              </span>
              <span 
                className="font-mono text-[10px] text-teal-400/90 bg-teal-950/60 border border-teal-800/40 px-1.5 py-0.2 rounded group-hover:border-teal-500 transition-colors"
                title={`PandaFlow v${version} (Quelle: ${source === 'tauri.conf.json' ? 'src-tauri/tauri.conf.json' : source})`}
              >
                v{version}
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 group-hover:text-slate-300 transition-colors leading-tight">
              Dein Studium. Zusammen gedacht.
            </span>
          </div>
        </div>
      </div>

      {/* Right area: Semester Schnell-Button & status indication */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {currentSemester && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowSemesterDropdown((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500/50 rounded-xl text-slate-200 transition-all cursor-pointer shadow-sm group"
              title="Aktives Semester wechseln oder verwalten"
            >
              <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              
              <div className="flex items-center gap-1.5 text-left text-xs font-semibold">
                <span className="text-slate-100">
                  {currentSemester.number}. Semester
                </span>
                {currentSemester.termName && (
                  <span className="font-mono text-[11px] text-teal-300 bg-teal-950/60 border border-teal-500/30 px-1.5 py-0.2 rounded font-medium">
                    {currentSemester.termName}
                  </span>
                )}
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform ${showSemesterDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick Semester Dropdown */}
            {showSemesterDropdown && (
              <div className="absolute right-0 mt-2 w-72 sm:w-84 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" />
                    Semester-Schnellauswahl
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {semesters.length} hinterlegt
                  </span>
                </div>

                <div className="p-2 max-h-72 overflow-y-auto space-y-1">
                  {semesters.map((sem) => {
                    const isActive = sem.id === currentSemester.id;
                    const semModules = modules.filter((m) => m.semesterId === sem.id);
                    const curricularModules = semModules.filter((m) => (m.category || 'pflicht') === 'pflicht' || m.category === 'wahlpflicht');
                    const uncompletedCurricular = curricularModules.filter((m) => !m.isCompleted);
                    const isPast = (sem.number ?? 1) < (currentSemester.number ?? 1);

                    return (
                      <div
                        key={sem.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                          isActive
                            ? 'bg-teal-950/40 border-teal-500/40 text-teal-200 shadow-sm'
                            : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-100 truncate">
                              {sem.number}. Semester
                            </span>
                            {sem.termName && (
                              <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700/60">
                                {sem.termName}
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-1.5 py-0.2 rounded border border-teal-500/20">
                                Aktiv
                              </span>
                            )}
                            {!isActive && isPast && (
                              uncompletedCurricular.length === 0 ? (
                                <span className="text-[9px] font-medium text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                  ✓ Abgeschlossen
                                </span>
                              ) : (
                                <span className="text-[9px] font-medium text-amber-400 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-500/30">
                                  ⚠ {uncompletedCurricular.length} offene {uncompletedCurricular.length === 1 ? 'Modul' : 'Module'}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        {isActive ? (
                          <div className="p-1 text-teal-400 shrink-0" title="Aktuell gewählt">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (onSetActiveSemester) {
                                onSetActiveSemester(sem.id);
                              }
                              setShowSemesterDropdown(false);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-slate-200 rounded-lg text-[11px] font-medium transition-colors shrink-0 cursor-pointer border border-slate-700/60 hover:border-transparent"
                          >
                            Aktivieren
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('module');
                      setShowSemesterDropdown(false);
                    }}
                    className="text-[11px] text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>In Module & Semester verwalten</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {onOpenOnboarding && (
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-teal-300 transition-colors cursor-pointer"
            title="Einführungstour & Funktionen ansehen"
          >
            <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Einführung</span>
          </button>
        )}

        <span 
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-400"
          title={`Plattform: ${isTauri ? 'Tauri Desktop App' : 'Web / PWA'} · Version: v${version}`}
        >
          {isTauri ? (
            <>
              <Laptop className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tauri Desktop</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span>Lokal & Sicher</span>
            </>
          )}
        </span>
      </div>
    </header>
  );
};
