import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  BookMarked, 
  FileText, 
  Network, 
  BookOpen, 
  Award, 
  Paperclip, 
  Inbox, 
  Database,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Laptop
} from 'lucide-react';
import { useTauriApp } from '../hooks/useTauriApp';
import { Semester } from '../types';
import { KofiWidget } from './KofiWidget';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onClearAllDataRequest?: () => void;
  ankiCount: number;
  upcomingExamsCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
  semesters?: Semester[];
  currentSemesterId?: string;
  decoupleSemesters?: boolean;
  onSelectSemester?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onClearAllDataRequest,
  ankiCount,
  upcomingExamsCount,
  isCollapsed = false,
  onToggleCollapse,
  isOpenOnMobile = false,
  onCloseMobile,
  semesters,
  currentSemesterId,
  decoupleSemesters,
  onSelectSemester,
}) => {
  const { version, isTauri, source } = useTauriApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'stundenplan', label: 'Stundenplan', icon: Calendar },
    { id: 'module', label: 'Module & Semester', icon: BookMarked },
    { id: 'mitschriften', label: 'Mitschriften', icon: FileText },
    { id: 'wissensgraph', label: 'Wissensgraph', icon: Network },
    { id: 'lerninhalte', label: 'Lerninhalte', icon: BookOpen },
    { 
      id: 'pruefungen', 
      label: 'Prüfungen & Fristen', 
      icon: Award, 
      badge: upcomingExamsCount > 0 ? upcomingExamsCount : undefined,
      badgeColor: 'text-amber-400 font-mono'
    },
    { id: 'material', label: 'Material & Literatur', icon: Paperclip },
    { 
      id: 'anki-inbox', 
      label: 'Anki-Inbox', 
      icon: Inbox, 
      badge: ankiCount > 0 ? ankiCount : undefined,
      badgeColor: 'text-teal-400 font-mono font-bold'
    },
    { id: 'backup', label: 'Backup & Speicher', icon: Database },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className={`h-full flex flex-col justify-between select-none ${isCollapsed ? 'p-2' : 'p-3 sm:p-4'}`}>
      <div className="space-y-4">
        {/* Mobile Header / Close Button */}
        {isOpenOnMobile && (
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 md:hidden">
            <span className="text-xs font-bold text-slate-200">Navigation</span>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Semester Status Tag & Quick Switcher */}
        {!isCollapsed ? (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-semibold">
                Aktuelles Semester
              </span>
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 cursor-pointer"
                  title="Seitenleiste minimieren"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {(() => {
              const currentSem = semesters?.find((s) => s.id === currentSemesterId) || semesters?.[0];
              const semNum = currentSem?.number ?? 1;
              const termName = currentSem?.termName || (semNum % 2 === 1 ? 'Wintersemester' : 'Sommersemester');

              return (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-200 truncate flex items-center justify-between">
                    <span>{semNum}. Semester</span>
                    {termName && (
                      <span className="text-[10px] font-mono text-teal-400 bg-teal-950/60 border border-teal-500/30 px-1.5 py-0.2 rounded font-medium">
                        {termName}
                      </span>
                    )}
                  </div>

                  {semesters && semesters.length > 1 && onSelectSemester && (
                    <div className="pt-1 border-t border-slate-800">
                      <select
                        value={currentSemesterId || currentSem?.id || ''}
                        onChange={(e) => onSelectSemester(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-teal-300 focus:outline-none focus:border-teal-500 cursor-pointer font-medium"
                        title="Schnellauswahl Semester"
                      >
                        {semesters.map((sem) => (
                          <option key={sem.id} value={sem.id}>
                            {sem.number}. Semester {sem.termName ? `(${sem.termName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex flex-col items-center py-2 space-y-1">
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-slate-900 rounded-lg transition-colors border border-transparent hover:border-slate-800"
              title="Seitenleiste ausklappen"
            >
              <PanelLeftOpen className="w-4 h-4 text-teal-400" />
            </button>
            <div 
              className="w-10 h-6 bg-slate-900 border border-slate-800 rounded-md flex items-center justify-center text-[10px] font-mono text-teal-400 font-bold"
              title="1. Semester (WS 2026/27)"
            >
              S1
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                title={isCollapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
                className={`w-full flex items-center rounded-lg text-xs font-medium transition-all ${
                  isCollapsed
                    ? 'justify-center p-2.5 relative'
                    : 'justify-between px-3 py-2'
                } ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {item.badge !== undefined && (
                  isCollapsed ? (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  ) : (
                    <span className={`text-[10px] shrink-0 ${item.badgeColor || 'text-slate-400'}`}>
                      {item.badge}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className={`border-t border-slate-800/80 text-[11px] text-slate-500 ${isCollapsed ? 'pt-3 pb-2 flex flex-col items-center gap-1.5' : 'p-3 sm:p-4 space-y-2'}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5 truncate">
                <span className={`w-1.5 h-1.5 rounded-full ${isTauri ? 'bg-emerald-400 animate-pulse' : 'bg-teal-500'}`} />
                <span className="truncate">{isTauri ? 'Tauri Desktop' : 'Offline-fähig · DB'}</span>
              </span>
              <span 
                className="font-mono text-teal-400 font-semibold bg-teal-950/70 px-1.5 py-0.5 rounded border border-teal-800/50 text-[10px] tracking-wide hover:border-teal-500 transition-colors cursor-help select-none"
                title={`PandaFlow v${version}\nQuelle: ${source === 'tauri.conf.json' ? 'src-tauri/tauri.conf.json' : source}\nPlattform: ${isTauri ? 'Tauri Desktop Shell' : 'Web / PWA'}`}
              >
                v{version}
              </span>
            </div>

            {/* Ko-Fi Support Button (ersetzt 'Demo: Alle Daten löschen') */}
            <div className="w-full mt-2">
              <KofiWidget 
                text="Unterstütze meine Arbeit" 
                color="#ffaa00" 
                id="H0G826CZMP" 
                fullWidth 
                className="w-full"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <a
              href="https://ko-fi.com/H0G826CZMP"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 transition-all hover:scale-105"
              title="Unterstütze meine Arbeit auf Ko-Fi"
            >
              <img
                src="https://storage.ko-fi.com/cdn/cup-border.png"
                alt="Ko-fi"
                className="w-4 h-4 object-contain"
              />
            </a>
            <div 
              className="text-[10px] font-mono font-medium text-teal-400 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/60 text-center tracking-tight cursor-help"
              title={`PandaFlow v${version}\n(src-tauri/tauri.conf.json)`}
            >
              v{version}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside 
        className={`border-r border-slate-800 bg-slate-950 transition-all duration-200 shrink-0 hidden md:flex flex-col justify-between ${
          isCollapsed ? 'w-16' : 'w-56 lg:w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer with Overlay */}
      {isOpenOnMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
          />
          <div className="relative w-64 max-w-[80vw] bg-slate-950 border-r border-slate-800 z-10 flex flex-col h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
