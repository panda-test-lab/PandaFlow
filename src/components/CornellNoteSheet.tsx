import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Plus,
  Printer,
  Search,
  Trash2,
  ZoomIn,
} from 'lucide-react';
import {
  CornellImage,
  CornellReference,
  LectureNote,
  Module,
  EventCourse,
} from '../types';

interface CornellNoteSheetProps {
  note: Partial<LectureNote>;
  module?: Module;
  course?: EventCourse;
  editing: boolean;
  onChange: (patch: Partial<LectureNote>) => void;
}

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const CornellNoteSheet: React.FC<CornellNoteSheetProps> = ({
  note,
  module,
  course,
  editing,
  onChange,
}) => {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [questionDraft, setQuestionDraft] = useState('');
  const [keywordDraft, setKeywordDraft] = useState('');
  const [zoomImage, setZoomImage] = useState<CornellImage | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const mainTextareaRef = useRef<HTMLTextAreaElement>(null);

  const pages = note.cornellPages?.length
    ? note.cornellPages
    : [{ id: 'cornell-page-1', content: note.content || '' }];
  const activePage = pages[Math.min(activePageIndex, pages.length - 1)] || pages[0];
  const references = note.cornellReferences || [];
  const images = note.cornellImages || [];
  const colors = note.cornellMarkerColors || {};
  const markerEnabled = colors.enabled !== false;

  useEffect(() => {
    if (activePageIndex >= pages.length) setActivePageIndex(pages.length - 1);
  }, [pages.length, activePageIndex]);

  const updateActivePage = (content: string) => {
    let nextPages = pages.map((page, index) =>
      index === activePageIndex ? { ...page, content } : page
    );
    const lines = content.split('\n');
    if (lines.length > 42) {
      const chunk = lines.slice(0, 42).join('\n');
      const remainder = lines.slice(42).join('\n');
      nextPages = nextPages.map((page, index) =>
        index === activePageIndex ? { ...page, content: chunk } : page
      );
      nextPages.splice(activePageIndex + 1, 0, {
        id: makeId('cornell-page'),
        content: remainder,
      });
    }
    onChange({
      content: activePageIndex === 0 ? content : nextPages[0]?.content || '',
      cornellPages: nextPages,
    });
  };

  const addPage = () => {
    const nextPages = [
      ...pages,
      { id: makeId('cornell-page'), content: '' },
    ];
    onChange({ cornellPages: nextPages });
    setActivePageIndex(nextPages.length - 1);
  };

  const removeActivePage = () => {
    if (pages.length === 1) return;
    const nextPages = pages.filter((_, index) => index !== activePageIndex);
    onChange({
      cornellPages: nextPages,
      content: nextPages[0]?.content || '',
    });
    setActivePageIndex(Math.max(0, activePageIndex - 1));
  };

  const updateSummary = (summary: string) => {
    const nextPages = pages.map((page, index) =>
      index === activePageIndex ? { ...page, summary } : page
    );
    onChange({ summary, cornellPages: nextPages });
  };

  const getAutoSummary = () => {
    const parts = [
      ...(note.connectionsList || []),
      ...(note.insightsList || []),
    ].filter(Boolean);
    return activePage.summary || (parts.length ? parts.join(' · ') : note.summary || '');
  };

  const insertAtCursor = (token: string) => {
    const textarea = mainTextareaRef.current;
    const content = activePage.content || '';
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? start;
    const nextContent = content.slice(0, start) + token + content.slice(end);
    updateActivePage(nextContent);
    window.setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const insertReference = (type: 'P' | 'S') => {
    const draft = type === 'P' ? questionDraft : keywordDraft;
    if (!draft.trim()) return;
    const numbers = references.filter((item) => item.type === type).map((item) => item.number);
    const number = numbers.length ? Math.max(...numbers) + 1 : 1;
    const textarea = mainTextareaRef.current;
    const content = activePage.content || '';
    const cursor = textarea?.selectionStart ?? content.length;
    const line = content.slice(0, cursor).split('\n').length - 1;
    const reference: CornellReference = {
      id: makeId(type),
      type,
      number,
      text: draft.trim(),
      line,
      pageId: activePage.id,
    };
    onChange({ cornellReferences: [...references, reference] });
    insertAtCursor(`{{${type}[${number}]}}`);
    if (type === 'P') setQuestionDraft('');
    else setKeywordDraft('');
  };

  const removeReference = (id: string) => {
    const reference = references.find((item) => item.id === id);
    if (!reference) return;
    const token = `{{${reference.type}[${reference.number}]}}`;
    const nextPages = pages.map((page) => ({
      ...page,
      content: page.content.split(token).join(''),
    }));
    onChange({
      cornellReferences: references.filter((item) => item.id !== id),
      cornellPages: nextPages,
      content: nextPages[0]?.content || '',
    });
  };

  const resizeAndStoreImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result || '');
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1800;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) return;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = file.type === 'image/png'
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.92);
        const number = images.length ? Math.max(...images.map((item) => item.number)) + 1 : 1;
        const nextImage: CornellImage = {
          id: makeId('image'),
          number,
          name: file.name || `Bild ${number}`,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
        };
        onChange({ cornellImages: [...images, nextImage] });
        insertAtCursor(`{{B[${number}]}}`);
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!editing) return;
    const handlePaste = (event: ClipboardEvent) => {
      const items = Array.from(event.clipboardData?.items || []);
      const item = items.find((entry) => entry.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) {
        event.preventDefault();
        resizeAndStoreImage(file);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  });

  const renderWithMarkersAndImages = (content: string) => {
    const parts = content.split(/({{(?:P|S|B)\[\d+\]}})/g);
    return parts.map((part, index) => {
      const marker = /^{{(P|S|B)\[(\d+)\]}}$/.exec(part);
      if (!marker) return <React.Fragment key={index}>{part}</React.Fragment>;
      if (marker[1] === 'B') {
        const image = images.find((item) => item.number === Number(marker[2]));
        return image ? (
          <span key={index} className="block my-3">
            <img
              src={image.dataUrl}
              alt={image.name}
              className="max-h-80 max-w-full object-contain rounded border border-slate-700"
            />
            <button
              type="button"
              onClick={() => setZoomImage(image)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-teal-300"
            >
              <ZoomIn className="w-3 h-3" /> Vergrößern
            </button>
          </span>
        ) : <span key={index} className="text-slate-500">{part}</span>;
      }
      const ref = references.find((item) =>
        item.type === marker[1] && item.number === Number(marker[2])
      );
      const color = marker[1] === 'P' ? colors.questions : colors.keywords;
      return (
        <span
          key={index}
          className="rounded px-1 py-0.5 font-semibold"
          style={markerEnabled && color ? { backgroundColor: color, color: '#0f172a' } : undefined}
        >
          {ref ? `${part} ${ref.text}` : part}
        </span>
      );
    });
  };

  const formatDate = (date?: string) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return year && month && day ? `${day}.${month}.${year}` : date;
  };

  const markerRows = references
    .filter((item) => item.pageId ? item.pageId === activePage.id : activePageIndex === 0)
    .map((item) => {
      const line = Number.isFinite(item.line) ? item.line : 0;
      const sameLine = references.filter((other) =>
        other.line === line &&
        (other.pageId ? other.pageId === activePage.id : activePageIndex === 0)
      );
      const slot = sameLine.findIndex((other) => other.id === item.id);
      return { item, top: 18 + line * 26 + slot * 38 };
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <button type="button" onClick={() => setActivePageIndex(Math.max(0, activePageIndex - 1))} disabled={activePageIndex === 0} className="cornell-icon-button" title="Vorherige Seite">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-slate-400">Seite {activePageIndex + 1} / {pages.length}</span>
          <button type="button" onClick={() => setActivePageIndex(Math.min(pages.length - 1, activePageIndex + 1))} disabled={activePageIndex === pages.length - 1} className="cornell-icon-button" title="Nächste Seite">
            <ChevronRight className="w-4 h-4" />
          </button>
          {editing && (
            <>
              <button type="button" onClick={addPage} className="cornell-tool-button"><Plus className="w-3.5 h-3.5" /> Seite</button>
              <button type="button" onClick={removeActivePage} disabled={pages.length === 1} className="cornell-tool-button text-red-300" title="Aktive Seite entfernen"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
          <button type="button" onClick={() => window.print()} className="cornell-tool-button"><Printer className="w-3.5 h-3.5" /> A4/PDF</button>
        </div>

        {editing && (
          <div className="flex items-center gap-2 text-[11px]">
            <label className="flex items-center gap-1 text-slate-400"><input type="checkbox" checked={markerEnabled} onChange={(event) => onChange({ cornellMarkerColors: { ...colors, enabled: event.target.checked } })} /> Markierungen</label>
            <label className="flex items-center gap-1 text-slate-400">P <input type="color" value={colors.questions || '#f59e0b'} onChange={(event) => onChange({ cornellMarkerColors: { ...colors, questions: event.target.value } })} className="cornell-color-input" /></label>
            <label className="flex items-center gap-1 text-slate-400">S <input type="color" value={colors.keywords || '#22d3ee'} onChange={(event) => onChange({ cornellMarkerColors: { ...colors, keywords: event.target.value } })} className="cornell-color-input" /></label>
          </div>
        )}
      </div>

      {editing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="flex gap-1">
            <input value={questionDraft} onChange={(event) => setQuestionDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && insertReference('P')} placeholder="Neue Prüfungsfrage..." className="cornell-draft-input" />
            <button type="button" onClick={() => insertReference('P')} className="cornell-mark-button bg-amber-500/20 text-amber-200 border-amber-500/40">P</button>
          </div>
          <div className="flex gap-1">
            <input value={keywordDraft} onChange={(event) => setKeywordDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && insertReference('S')} placeholder="Neues Stichwort..." className="cornell-draft-input" />
            <button type="button" onClick={() => insertReference('S')} className="cornell-mark-button bg-cyan-500/20 text-cyan-200 border-cyan-500/40">S</button>
          </div>
        </div>
      )}

      <div
        className={`cornell-page ${dragActive ? 'cornell-page-dragging' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (event.currentTarget === event.target) setDragActive(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          const file = Array.from(event.dataTransfer.files).find((entry) => entry.type.startsWith('image/'));
          if (file) resizeAndStoreImage(file);
        }}
      >
        <header className="cornell-header">
          <div>
            <span className="cornell-label">Datum</span>
            <strong>{formatDate(note.lectureDate)}</strong>
          </div>
          <div>
            <span className="cornell-label">Fach / Modul</span>
            <strong>{module?.code || module?.shortName || module?.name || '—'}</strong>
          </div>
          <div>
            <span className="cornell-label">Veranstaltung</span>
            <strong>{course?.title || note.title || '—'}</strong>
          </div>
          <span className="cornell-page-no">{activePageIndex + 1}</span>
        </header>

        <main className="cornell-main">
          <aside className="cornell-cue-column">
            {markerRows.map(({ item, top }) => (
              <div
                key={item.id}
                className="cornell-cue-card"
                style={{
                  top,
                  borderColor: item.type === 'P' ? (colors.questions || '#f59e0b') : (colors.keywords || '#22d3ee'),
                  backgroundColor: markerEnabled
                    ? item.type === 'P' ? `${colors.questions || '#f59e0b'}33` : `${colors.keywords || '#22d3ee'}33`
                    : 'transparent',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className={item.type === 'P' ? 'text-amber-200' : 'text-cyan-200'}>
                    {`{{${item.type}[${item.number}]}}`}
                  </strong>
                  {editing && <button type="button" onClick={() => removeReference(item.id)} className="text-slate-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></button>}
                </div>
                <span>{item.text}</span>
              </div>
            ))}
          </aside>

          <section className="cornell-note-column">
            {editing ? (
              <textarea
                ref={mainTextareaRef}
                value={activePage.content || ''}
                onChange={(event) => updateActivePage(event.target.value)}
                placeholder="Mitschriftentext, Markdown, Formeln und [[WikiLinks]]..."
                className="cornell-textarea"
              />
            ) : (
              <div className="cornell-preview whitespace-pre-wrap">
                {renderWithMarkersAndImages(activePage.content || '')}
              </div>
            )}
          </section>
        </main>

        <footer className="cornell-summary">
          <span className="cornell-label">Zusammenfassung</span>
          {editing ? (
            <textarea
              value={getAutoSummary()}
              onChange={(event) => updateSummary(event.target.value)}
              placeholder="Zusammenfassung aus Zusammenhängen und Erkenntnissen..."
              className="cornell-summary-textarea"
            />
          ) : (
            <div className="cornell-summary-preview">{getAutoSummary() || 'Keine Zusammenfassung erfasst.'}</div>
          )}
        </footer>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {images.map((image) => (
            <button key={image.id} type="button" onClick={() => setZoomImage(image)} className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 p-1 text-left">
              <img src={image.dataUrl} alt={image.name} className="w-full h-24 object-contain" />
              <span className="absolute left-1 bottom-1 rounded bg-slate-950/90 px-1.5 py-0.5 text-[10px] text-teal-300">B[{image.number}]</span>
              <Search className="absolute right-1 bottom-1 w-3.5 h-3.5 text-slate-300" />
            </button>
          ))}
        </div>
      )}

      {zoomImage && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 flex items-center justify-center p-6" onClick={() => setZoomImage(null)}>
          <button type="button" className="absolute top-4 right-4 cornell-icon-button" title="Schließen">×</button>
          <img src={zoomImage.dataUrl} alt={zoomImage.name} className="max-w-full max-h-full object-contain" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
};
