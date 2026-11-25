import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Bold,
  Check,
  ChevronLeft,
  ChevronRight,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Plus,
  Printer,
  Search,
  Strikethrough,
  Trash2,
  Undo2,
  Underline,
  ZoomIn,
} from 'lucide-react';
import { MarkdownRenderer } from '../utils/markdownRenderer';
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
  summaryTransferHandlerRef: React.MutableRefObject<((
    kind: 'connections' | 'insights',
    text: string,
  ) => void) | null>;
  onChange: (patch: Partial<LectureNote>) => void;
}

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const escapeHtml = (text: string) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const toHexColor = (value: string) => {
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) return `#${hex[1].toLowerCase()}`;
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(value.trim());
  if (!rgb) return undefined;
  return `#${rgb.slice(1).map((part) => Math.min(255, Number(part)).toString(16).padStart(2, '0')).join('')}`;
};

const getReadableTextColor = (hexColor: string) => {
  const rgb = /^#([0-9a-f]{6})$/i.exec(hexColor);
  if (!rgb) return '#0f172a';
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(rgb[1].slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  const darkContrast = (luminance + 0.05) / 0.05;
  const lightContrast = 1.05 / (luminance + 0.05);
  return darkContrast >= lightContrast ? '#0f172a' : '#ffffff';
};

const replaceReferenceTokens = (content: string, references: CornellReference[]) =>
  content.replace(/\{\{([PS])\[(\d+)\]\}\}/g, (_token, type: 'P' | 'S', number: string) => {
    const reference = references.find((item) => item.type === type && item.number === Number(number));
    if (!reference) return _token;
    const title = reference.title || reference.text;
    return [title, reference.title ? reference.text : ''].filter(Boolean).join('\n');
  });

const inlineMarkdownToHtml = (text: string): string => {
  const pattern = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|__([^_]+)__|\+\+([^+]+)\+\+|~~([^~]+)~~|<u>([\s\S]+?)<\/u>|<mark(?: data-color="(#[0-9a-fA-F]{6})")?>([\s\S]+?)<\/mark>|<span style="color:\s*(#[0-9a-fA-F]{6})">([\s\S]+?)<\/span>|\/\/([^/\n]+)\/\/|\*([^*\n]+)\*|(?<!\w)_([^_\n]+)_(?!\w)/g;
  let html = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    html += escapeHtml(text.slice(lastIndex, match.index));
    const inner = (value: string) => inlineMarkdownToHtml(value);
    if (match[1]) html += `<strong><em>${inner(match[1])}</em></strong>`;
    else if (match[2] || match[4]) html += `<strong>${inner(match[2] || match[4])}</strong>`;
    else if (match[3] || match[6]) html += `<u>${inner(match[3] || match[6])}</u>`;
    else if (match[5]) html += `<del>${inner(match[5])}</del>`;
    else if (match[8]) {
      const color = match[7] || '#fde047';
      html += `<mark data-color="${color}" style="background-color:${color};color:${getReadableTextColor(color)}">${inner(match[8])}</mark>`;
    }
    else if (match[10]) html += `<span style="color:${match[9]}">${inner(match[10])}</span>`;
    else html += `<em>${inner(match[11] || match[12] || match[13])}</em>`;
    lastIndex = pattern.lastIndex;
  }
  return html + escapeHtml(text.slice(lastIndex));
};

const markdownToEditorHtml = (rawContent: string, references: CornellReference[]) => {
  const content = replaceReferenceTokens(rawContent, references);
  if (!content) return '';
  const lines = content.split('\n');
  const blocks: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push(`<h${heading[1].length}>${inlineMarkdownToHtml(heading[2]) || '<br>'}</h${heading[1].length}>`);
      index++;
      continue;
    }

    const listMatch = /^(\s*)(\/-|\/\d+|[-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (listMatch) {
      const ordered = listMatch[2] !== '/-' && !/^[-*+]$/.test(listMatch[2]);
      const start = /^\/(\d+)$/.exec(listMatch[2]) || /^(\d+)\.$/.exec(listMatch[2]);
      const items: string[] = [];
      while (index < lines.length) {
        const next = /^(\s*)(\/-|\/\d+|[-*+]|\d+\.)\s+(.*)$/.exec(lines[index]);
        if (!next || (next[2] !== '/-' && !/^[-*+]$/.test(next[2])) !== ordered) break;
        const ordinal = /^\/(\d+)$/.exec(next[2]) || /^(\d+)\.$/.exec(next[2]);
        items.push(`<li${ordered && ordinal ? ` value="${Number(ordinal[1])}"` : ''}>${inlineMarkdownToHtml(next[3]) || '<br>'}</li>`);
        index++;
      }
      const listTag = ordered ? 'ol' : 'ul';
      blocks.push(`<${listTag}${ordered && start ? ` start="${Number(start[1] || start[2])}"` : ''}>${items.join('')}</${listTag}>`);
      continue;
    }

    blocks.push(`<div>${inlineMarkdownToHtml(line) || '<br>'}</div>`);
    index++;
  }
  return blocks.join('');
};

const serializeEditorNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (!(node instanceof HTMLElement)) return '';
  const tag = node.tagName.toLowerCase();
  if (tag === 'ul' || tag === 'ol') {
    const items = Array.from(node.children).filter((child) => child.tagName.toLowerCase() === 'li');
    const start = tag === 'ol' ? Number(node.getAttribute('start') || 1) : 1;
    return items.map((item, index) => {
      const text = Array.from(item.childNodes).map(serializeEditorNode).join('').replace(/\n+$/, '');
      const number = Number(item.getAttribute('value') || start + index);
      return `${tag === 'ul' ? '/-' : `/${number}`} ${text}\n`;
    }).join('');
  }
  if (tag === 'li') return Array.from(node.childNodes).map(serializeEditorNode).join('').replace(/\n+$/, '');
  const children = Array.from(node.childNodes).map(serializeEditorNode).join('');
  if (tag === 'br') return '\n';
  if (tag === 'strong' || tag === 'b') return `++${children}++`;
  if (tag === 'em' || tag === 'i') return `//${children}//`;
  if (tag === 'u') return `__${children}__`;
  if (tag === 's' || tag === 'strike' || tag === 'del') return `~~${children}~~`;
  if (tag === 'mark') {
    const color = toHexColor(node.dataset.color || node.style.backgroundColor);
    return `<mark${color ? ` data-color="${color}"` : ''}>${children}</mark>`;
  }
  if (tag === 'span') {
    const backgroundColor = toHexColor(node.style.backgroundColor);
    const color = toHexColor(node.style.color);
    if (backgroundColor) return `<mark data-color="${backgroundColor}">${children}</mark>`;
    if (color) return `<span style="color:${color}">${children}</span>`;
  }
  if (/^h[1-3]$/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${children}\n`;
  if (tag === 'div' || tag === 'p') return `${children}\n`;
  return children;
};

export const CornellNoteSheet: React.FC<CornellNoteSheetProps> = ({
  note,
  module,
  course,
  editing,
  summaryTransferHandlerRef,
  onChange,
}) => {
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [questionTitleDraft, setQuestionTitleDraft] = useState('');
  const [questionTextDraft, setQuestionTextDraft] = useState('');
  const [keywordTitleDraft, setKeywordTitleDraft] = useState('');
  const [keywordTextDraft, setKeywordTextDraft] = useState('');
  const [textColor, setTextColor] = useState('#0f172a');
  const [highlightColor, setHighlightColor] = useState('#fde047');
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [zoomImage, setZoomImage] = useState<CornellImage | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const undoHistoryRef = useRef<string[]>([]);
  const lastEditorHtmlRef = useRef('');
  const skipUndoCaptureRef = useRef(false);

  const pages = note.cornellPages?.length
    ? note.cornellPages
    : [{ id: 'cornell-page-1', content: note.content || '' }];
  const currentPageIndex = Math.max(0, Math.min(activePageIndex, pages.length - 1));
  const activePage = pages[currentPageIndex];
  const references = note.cornellReferences || [];
  const images = note.cornellImages || [];
  const colors = note.cornellMarkerColors || {};
  const markerEnabled = colors.enabled !== false;

  useEffect(() => {
    if (activePageIndex !== currentPageIndex) setActivePageIndex(currentPageIndex);
  }, [activePageIndex, currentPageIndex]);

  useEffect(() => {
    setActivePageIndex(0);
  }, [note.id]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editing || !editor || document.activeElement === editor) return;
    if (editor.dataset.pageId !== activePage.id) {
      editor.innerHTML = markdownToEditorHtml(activePage.content || '', references);
      editor.dataset.pageId = activePage.id;
      undoHistoryRef.current = [];
      lastEditorHtmlRef.current = editor.innerHTML;
      setUndoAvailable(false);
    }
  }, [activePage.id, activePage.content, editing, references]);

  useEffect(() => {
    if (!editing) return;
    const frame = window.requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
      editor.focus({ preventScroll: true });

      const selection = window.getSelection();
      const savedRange = savedSelectionRef.current;
      if (
        selection &&
        savedRange &&
        editor.contains(savedRange.startContainer) &&
        editor.contains(savedRange.endContainer)
      ) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } else {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
        savedSelectionRef.current = range.cloneRange();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editing]);

  const addSummaryItem = useCallback((
    kind: 'connections' | 'insights',
    text: string,
  ) => {
    const field = kind === 'connections'
      ? 'summaryConnections'
      : 'summaryInsights';
    const currentItems = activePage[field] || [];
    if (currentItems.includes(text)) return;

    const updatedPage = {
      ...activePage,
      [field]: [...currentItems, text],
    };
    const nextPages = pages.map((page, index) =>
      index === currentPageIndex ? updatedPage : page
    );
    onChange({ cornellPages: nextPages });
  }, [activePage, currentPageIndex, onChange, pages]);

  const removeSummaryItem = useCallback((
    kind: 'connections' | 'insights',
    itemIndex: number,
  ) => {
    const field = kind === 'connections'
      ? 'summaryConnections'
      : 'summaryInsights';
    const updatedPage = {
      ...activePage,
      [field]: (activePage[field] || []).filter((_, index) => index !== itemIndex),
    };
    const nextPages = pages.map((page, index) =>
      index === currentPageIndex ? updatedPage : page
    );
    onChange({ cornellPages: nextPages });
  }, [activePage, currentPageIndex, onChange, pages]);

  useLayoutEffect(() => {
    summaryTransferHandlerRef.current = addSummaryItem;
    return () => {
      if (summaryTransferHandlerRef.current === addSummaryItem) {
        summaryTransferHandlerRef.current = null;
      }
    };
  }, [addSummaryItem, summaryTransferHandlerRef]);

  const rememberSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (editor && selection?.rangeCount && editor.contains(selection.anchorNode)) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const readEditorContent = () => {
    const editor = editorRef.current;
    return editor ? Array.from(editor.childNodes).map(serializeEditorNode).join('').replace(/\n$/, '') : '';
  };

  const recordInputUndo = () => {
    const editor = editorRef.current;
    if (!editor || skipUndoCaptureRef.current || editor.innerHTML === lastEditorHtmlRef.current) return;
    undoHistoryRef.current.push(lastEditorHtmlRef.current);
    setUndoAvailable(true);
  };

  const recordProgrammaticUndo = (before: string, after: string) => {
    if (before === after) return;
    undoHistoryRef.current.push(before);
    setUndoAvailable(true);
  };

  const handleEditorInput = () => {
    const editor = editorRef.current;
    recordInputUndo();
    const selection = window.getSelection();
    if (editor && selection?.rangeCount && selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      if (range.startContainer.nodeType === Node.TEXT_NODE && editor.contains(range.startContainer)) {
        const textNode = range.startContainer as Text;
        const prefix = textNode.data.slice(0, range.startOffset);
        const match = /(\/\/|\*\*\*|\+\+|\*\*|~~|__|\*|_)(.+?)\1$/.exec(prefix);
        if (match && !(match[1] === '_' && match.index > 0 && /\w/.test(prefix[match.index - 1]))) {
          const beforeText = prefix.slice(0, match.index);
          const afterText = textNode.data.slice(range.startOffset);
          const fragment = document.createRange().createContextualFragment(inlineMarkdownToHtml(match[2]));
          const insertedNodes = Array.from(fragment.childNodes);
          const replacement = document.createDocumentFragment();
          if (beforeText) replacement.appendChild(document.createTextNode(beforeText));
          replacement.appendChild(fragment);
          const afterNode = afterText ? document.createTextNode(afterText) : null;
          if (afterNode) replacement.appendChild(afterNode);
          textNode.replaceWith(replacement);
          const caret = document.createRange();
          if (afterNode) caret.setStart(afterNode, 0);
          else if (insertedNodes.length) caret.setStartAfter(insertedNodes[insertedNodes.length - 1]);
          caret.collapse(true);
          selection.removeAllRanges();
          selection.addRange(caret);
          savedSelectionRef.current = caret.cloneRange();
        }
      }

      const currentRange = selection.rangeCount ? selection.getRangeAt(0) : null;
      if (currentRange?.startContainer.nodeType === Node.TEXT_NODE && editor.contains(currentRange.startContainer)) {
        const textNode = currentRange.startContainer as Text;
        const linePrefix = textNode.data.slice(0, currentRange.startOffset);
        const heading = /^(#{1,3})\s+$/.exec(linePrefix);
        const block = textNode.parentElement?.closest('div, p, h1, h2, h3');
        if (heading && block && editor.contains(block)) {
          const headingElement = document.createElement(`h${heading[1].length}`);
          while (block.firstChild) headingElement.appendChild(block.firstChild);
          block.replaceWith(headingElement);
          const restored = document.createRange();
          restored.setStart(textNode, currentRange.startOffset);
          restored.collapse(true);
          selection.removeAllRanges();
          selection.addRange(restored);
          savedSelectionRef.current = restored.cloneRange();
        } else {
          const listMarker = /^\/(-|\d+)\s+$/.exec(linePrefix);
          if (listMarker && block && editor.contains(block)) {
            textNode.data = textNode.data.slice(listMarker[0].length);
            const ordered = listMarker[1] !== '-';
            const list = document.createElement(ordered ? 'ol' : 'ul');
            if (ordered) list.setAttribute('start', String(Number(listMarker[1])));
            const item = document.createElement('li');
            while (block.firstChild) item.appendChild(block.firstChild);
            list.appendChild(item);
            block.replaceWith(list);
            const restored = document.createRange();
            restored.setStart(textNode, Math.max(0, currentRange.startOffset - listMarker[0].length));
            restored.collapse(true);
            selection.removeAllRanges();
            selection.addRange(restored);
            savedSelectionRef.current = restored.cloneRange();
          }
        }
      }
    }
    rememberSelection();
    if (editor) lastEditorHtmlRef.current = editor.innerHTML;
    updateActivePage(readEditorContent());
  };

  const updateActivePage = (content: string) => {
    let nextPages = pages.map((page, index) =>
      index === currentPageIndex ? { ...page, content } : page
    );
    const lines = content.split('\n');
    if (lines.length > 42) {
      const chunk = lines.slice(0, 42).join('\n');
      const remainder = lines.slice(42).join('\n');
      nextPages = nextPages.map((page, index) =>
        index === currentPageIndex ? { ...page, content: chunk } : page
      );
      nextPages.splice(currentPageIndex + 1, 0, {
        id: makeId('cornell-page'),
        content: remainder,
      });
    }
    onChange({
      content: currentPageIndex === 0 ? content : nextPages[0]?.content || '',
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
    const nextPages = pages.filter((_, index) => index !== currentPageIndex);
    onChange({
      cornellPages: nextPages,
      content: nextPages[0]?.content || '',
    });
    setActivePageIndex(Math.max(0, currentPageIndex - 1));
  };

  const updateSummary = (summary: string) => {
    const nextPages = pages.map((page, index) =>
      index === currentPageIndex ? { ...page, summary } : page
    );
    onChange({ cornellPages: nextPages });
  };

  const getSummary = () =>
    activePage.summary ?? (currentPageIndex === 0 ? note.summary || '' : '');
  const summaryConnections = activePage.summaryConnections || [];
  const summaryInsights = activePage.summaryInsights || [];

  const renderSummaryBlock = (
    kind: 'connections' | 'insights',
    title: string,
    items: string[],
    groupClassName: string,
    titleClassName: string,
  ) => {
    return (
      <section className={`rounded-lg border p-2 space-y-1.5 ${groupClassName}`}>
        <h4 className={`text-[10px] font-bold uppercase tracking-wide ${titleClassName}`}>{title}</h4>
        <ul className="space-y-1">
          {items.map((item, index) => {
            const removeLabel = `Eintrag aus ${title} entfernen: ${item}`;
            return (
              <li key={`${item}-${index}`} className="flex items-start gap-1 rounded-md bg-white/70 px-2 py-1 text-xs text-slate-700">
                <span className="min-w-0 flex-1 break-words">{item}</span>
                {editing && (
                  <button
                    type="button"
                    onClick={() => removeSummaryItem(kind, index)}
                    className="shrink-0 rounded p-1 text-slate-500 hover:bg-red-100 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
                    aria-label={removeLabel}
                    title={removeLabel}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = savedSelectionRef.current;
    if (editor && range && editor.contains(range.startContainer) && editor.contains(range.endContainer)) {
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    editor?.focus();
  };

  const applyEditorCommand = (command: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreSelection();
    const before = editor.innerHTML;
    skipUndoCaptureRef.current = true;
    document.execCommand(command, false, value);
    handleEditorInput();
    skipUndoCaptureRef.current = false;
    recordProgrammaticUndo(before, editor.innerHTML);
  };

  const insertAtCursor = (text: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreSelection();
    const before = editor.innerHTML;
    skipUndoCaptureRef.current = true;
    document.execCommand('insertText', false, text);
    handleEditorInput();
    skipUndoCaptureRef.current = false;
    recordProgrammaticUndo(before, editor.innerHTML);
  };

  const undoLastAction = () => {
    const editor = editorRef.current;
    const previousHtml = undoHistoryRef.current.pop();
    if (!editor || previousHtml === undefined) return;
    skipUndoCaptureRef.current = true;
    editor.innerHTML = previousHtml;
    editor.dataset.pageId = activePage.id;
    handleEditorInput();
    skipUndoCaptureRef.current = false;
    lastEditorHtmlRef.current = editor.innerHTML;
    setUndoAvailable(undoHistoryRef.current.length > 0);
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    rememberSelection();
  };

  const toggleHeading = (level: 1 | 2 | 3) => {
    restoreSelection();
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const block = node instanceof Element
      ? node.closest('h1, h2, h3')
      : node?.parentElement?.closest('h1, h2, h3');
    const requestedTag = `H${level}`;
    applyEditorCommand('formatBlock', block?.tagName === requestedTag ? 'P' : requestedTag);
  };

  const toggleEditorColor = (command: 'foreColor' | 'hiliteColor', color: string) => {
    restoreSelection();
    const currentColor = toHexColor(document.queryCommandValue(command));
    const nextColor = currentColor === color.toLowerCase()
      ? command === 'foreColor' ? '#172033' : '#ffffff'
      : color;
    applyEditorCommand(command, nextColor);
  };

  const insertReference = (type: 'P' | 'S') => {
    const titleDraft = type === 'P' ? questionTitleDraft : keywordTitleDraft;
    const textDraft = type === 'P' ? questionTextDraft : keywordTextDraft;
    if (!titleDraft.trim() || !textDraft.trim()) return;
    const numbers = references.filter((item) => item.type === type).map((item) => item.number);
    const number = numbers.length ? Math.max(...numbers) + 1 : 1;
    const editor = editorRef.current;
    const range = savedSelectionRef.current;
    const line = editor && range && editor.contains(range.startContainer)
      ? (() => {
          const currentBlock = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as Element).closest('div, p, h1, h2, h3, li')
            : range.startContainer.parentElement?.closest('div, p, h1, h2, h3, li');
          const precedingRange = document.createRange();
          precedingRange.selectNodeContents(editor);
          if (currentBlock) precedingRange.setEndBefore(currentBlock);
          else precedingRange.setEnd(range.startContainer, range.startOffset);
          const precedingText = Array.from(precedingRange.cloneContents().childNodes)
            .map(serializeEditorNode).join('');
          if (!currentBlock) return precedingText.split('\n').length - 1;
          const withinRange = document.createRange();
          withinRange.selectNodeContents(currentBlock);
          withinRange.setEnd(range.startContainer, range.startOffset);
          const withinText = Array.from(withinRange.cloneContents().childNodes)
            .map(serializeEditorNode).join('');
          return `${precedingText}${withinText}`.split('\n').length - 1;
        })()
      : (activePage.content || '').split('\n').length - 1;
    const reference: CornellReference = {
      id: makeId(type),
      type,
      number,
      title: titleDraft.trim(),
      text: textDraft.trim(),
      line,
      pageId: activePage.id,
    };
    onChange({ cornellReferences: [...references, reference] });
    if (type === 'P') {
      setQuestionTitleDraft('');
      setQuestionTextDraft('');
    } else {
      setKeywordTitleDraft('');
      setKeywordTextDraft('');
    }
  };

  const removeReference = (id: string) => {
    const reference = references.find((item) => item.id === id);
    if (!reference) return;
    const token = `{{${reference.type}[${reference.number}]}}`;
    const replacement = [reference.title || reference.text, reference.title ? reference.text : ''].filter(Boolean).join('\n');
    const nextPages = pages.map((page) => ({
      ...page,
      content: page.content.split(token).join(replacement),
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

  const renderWithMarkersAndImages = (rawContent: string) => {
    const content = replaceReferenceTokens(rawContent, references);
    const parts = content.split(/({{B\[\d+\]}})/g);
    return parts.map((part, index) => {
      const marker = /^{{B\[(\d+)\]}}$/.exec(part);
      if (!marker) return <MarkdownRenderer key={index} content={part} className="cornell-markdown-preview" />;
      const image = images.find((item) => item.number === Number(marker[1]));
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
    });
  };

  const formatDate = (date?: string) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return year && month && day ? `${day}.${month}.${year}` : date;
  };

  const markerRows = references
    .filter((item) => item.pageId ? item.pageId === activePage.id : currentPageIndex === 0)
    .map((item) => {
      const line = Number.isFinite(item.line) ? item.line : 0;
      const sameLine = references.filter((other) =>
        other.line === line &&
        (other.pageId ? other.pageId === activePage.id : currentPageIndex === 0)
      );
      const slot = sameLine.findIndex((other) => other.id === item.id);
      return { item, top: 18 + line * 26 + slot * 38 };
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <button type="button" onClick={() => setActivePageIndex(Math.max(0, currentPageIndex - 1))} disabled={currentPageIndex === 0} className="cornell-icon-button" title="Vorherige Seite">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-slate-400">Seite {currentPageIndex + 1} / {pages.length}</span>
          <button type="button" onClick={() => setActivePageIndex(Math.min(pages.length - 1, currentPageIndex + 1))} disabled={currentPageIndex === pages.length - 1} className="cornell-icon-button" title="Nächste Seite">
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
          <div className="cornell-reference-draft cornell-question-draft">
            <input value={questionTitleDraft} onChange={(event) => setQuestionTitleDraft(event.target.value)} placeholder="Überschrift der Prüfungsfrage" className="cornell-draft-input" />
            <textarea value={questionTextDraft} onChange={(event) => setQuestionTextDraft(event.target.value)} placeholder="Text der Prüfungsfrage" className="cornell-draft-textarea" />
            <button type="button" onClick={() => insertReference('P')} disabled={!questionTitleDraft.trim() || !questionTextDraft.trim()} className="cornell-mark-button">Potenzielle Prüfungsfrage</button>
          </div>
          <div className="cornell-reference-draft cornell-keyword-draft">
            <input value={keywordTitleDraft} onChange={(event) => setKeywordTitleDraft(event.target.value)} placeholder="Überschrift des Stichworts" className="cornell-draft-input" />
            <textarea value={keywordTextDraft} onChange={(event) => setKeywordTextDraft(event.target.value)} placeholder="Text zum Stichwort" className="cornell-draft-textarea" />
            <button type="button" onClick={() => insertReference('S')} disabled={!keywordTitleDraft.trim() || !keywordTextDraft.trim()} className="cornell-mark-button">Stichwort</button>
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
          <span className="cornell-page-no">{currentPageIndex + 1}</span>
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
                  <strong
                    className="cornell-cue-title"
                    style={{
                      backgroundColor: markerEnabled ? (item.type === 'P' ? (colors.questions || '#f59e0b') : (colors.keywords || '#22d3ee')) : 'transparent',
                      color: markerEnabled
                        ? getReadableTextColor(item.type === 'P' ? (colors.questions || '#f59e0b') : (colors.keywords || '#22d3ee'))
                        : '#334155',
                    }}
                  >
                    {item.title || item.text}
                  </strong>
                  {editing && <button type="button" onClick={() => removeReference(item.id)} className="text-slate-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></button>}
                </div>
                <span>{item.title ? item.text : ''}</span>
              </div>
            ))}
          </aside>

          <section className="cornell-note-column">
            {editing ? (
              <div className="cornell-editor-shell">
                <div className="cornell-editor-toolbar" onMouseDown={(event) => {
                  if ((event.target as HTMLElement).closest('button, input')) rememberSelection();
                }}>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={undoLastAction} disabled={!undoAvailable} aria-label="Letzte Aktion Rückgängig machen" title="Letzte Aktion Rückgängig machen"><Undo2 className="w-3.5 h-3.5" /></button>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyEditorCommand('bold')} title="Fett"><Bold className="w-3.5 h-3.5" /></button>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyEditorCommand('italic')} title="Kursiv"><Italic className="w-3.5 h-3.5" /></button>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyEditorCommand('underline')} title="Unterstrichen"><Underline className="w-3.5 h-3.5" /></button>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyEditorCommand('strikeThrough')} title="Durchgestrichen"><Strikethrough className="w-3.5 h-3.5" /></button>
                  <span className="cornell-toolbar-divider" />
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleHeading(1)} title="Überschrift 1"><Heading1 className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleHeading(2)} title="Überschrift 2"><Heading2 className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleHeading(3)} title="Überschrift 3"><Heading3 className="w-4 h-4" /></button>
                  <span className="cornell-toolbar-divider" />
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyEditorCommand('insertUnorderedList')} title="Ungeordnete Liste"><List className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyEditorCommand('insertOrderedList')} title="Geordnete Liste"><ListOrdered className="w-4 h-4" /></button>
                  <label className="cornell-format-color" title="Textfarbe">
                    A <input type="color" value={textColor} onMouseDown={rememberSelection} onChange={(event) => setTextColor(event.target.value)} />
                  </label>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleEditorColor('foreColor', textColor)} title="Textfarbe anwenden oder zurücksetzen">A</button>
                  <label className="cornell-format-color" title="Hervorhebungsfarbe">
                    <Highlighter className="w-3.5 h-3.5" /> <input type="color" value={highlightColor} onMouseDown={rememberSelection} onChange={(event) => setHighlightColor(event.target.value)} />
                  </label>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleEditorColor('hiliteColor', highlightColor)} title="Hervorhebung anwenden oder zurücksetzen"><Highlighter className="w-3.5 h-3.5" /></button>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="cornell-textarea cornell-rich-editor"
                  data-placeholder="Mitschriftentext, Markdown, Formeln und [[WikiLinks]]..."
                  onInput={handleEditorInput}
                  onKeyUp={rememberSelection}
                  onMouseUp={rememberSelection}
                  onFocus={rememberSelection}
                  onPaste={(event) => {
                    if (Array.from(event.clipboardData.items).some((item) => item.type.startsWith('image/'))) return;
                    event.preventDefault();
                    insertAtCursor(event.clipboardData.getData('text/plain'));
                  }}
                />
              </div>
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
            <div className="space-y-2">
              <textarea
                value={getSummary()}
                onChange={(event) => updateSummary(event.target.value)}
                placeholder="Zusammenfassung frei verfassen..."
                className="cornell-summary-textarea"
              />
            </div>
          ) : (
            <div className="cornell-summary-preview">{getSummary() || 'Keine Zusammenfassung erfasst.'}</div>
          )}
          {(summaryConnections.length > 0 || summaryInsights.length > 0) && (
            <div className="grid gap-2 sm:grid-cols-2">
              {summaryConnections.length > 0 && renderSummaryBlock(
                'connections',
                'Zusammenhänge',
                summaryConnections,
                'border-cyan-700/20 bg-cyan-50',
                'text-cyan-800',
              )}
              {summaryInsights.length > 0 && renderSummaryBlock(
                'insights',
                'Erkenntnisse',
                summaryInsights,
                'border-emerald-700/20 bg-emerald-50',
                'text-emerald-800',
              )}
            </div>
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
