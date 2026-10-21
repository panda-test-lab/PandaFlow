import React from 'react';
import { Module, LearningTopic, LectureNote, Exam, GraphEdge } from '../types';
import { Link2, ExternalLink, Bookmark, BookOpen, FileText, Award } from 'lucide-react';
import { renderFormulasInText } from './formulaFormatter';
import { MarkdownRenderer, renderInlineMarkdown, isMarkdownBlockText } from './markdownRenderer';

export interface WikiLinkDatabase {
  modules?: Module[];
  topics?: LearningTopic[];
  notes?: LectureNote[];
  exams?: Exam[];
}

export interface WikiLinkMatch {
  raw: string;
  target: string;
  alias?: string;
  index: number;
}

export type WikiLinkTargetType = 'topic' | 'module' | 'note' | 'exam' | 'unresolved';

export interface ResolvedWikiLink {
  raw: string;
  target: string;
  displayText: string;
  type: WikiLinkTargetType;
  id?: string;
  item?: any;
}

// Matches triple brackets [[[target|alias]]] and double brackets [[target|alias]]
const WIKILINK_TRIPLE_REGEX = /\[\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\]/g;
const WIKILINK_DOUBLE_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Extracts all WikiLink occurrences ([[[target]]] and [[target]]) from a text string.
 */
export function extractWikiLinks(
  text: string,
  db?: {
    modules?: Module[];
    topics?: LearningTopic[];
    notes?: LectureNote[];
    exams?: Exam[];
  }
): WikiLinkMatch[] {
  if (!text) return [];
  const matches: WikiLinkMatch[] = [];
  const coveredRanges: [number, number][] = [];

  // 1. Triple brackets [[[...]]] have highest priority
  const tripleRegex = new RegExp(WIKILINK_TRIPLE_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = tripleRegex.exec(text)) !== null) {
    const raw = match[0];
    const target = match[1]?.trim();
    if (target) {
      matches.push({
        raw,
        target,
        alias: match[2]?.trim(),
        index: match.index,
      });
      coveredRanges.push([match.index, match.index + raw.length]);
    }
  }

  // 2. Double brackets [[...]]
  const doubleRegex = new RegExp(WIKILINK_DOUBLE_REGEX.source, 'g');
  while ((match = doubleRegex.exec(text)) !== null) {
    const startIdx = match.index;
    const endIdx = startIdx + match[0].length;

    // Check if overlap with triple bracket
    const overlaps = coveredRanges.some(([s, e]) => (startIdx >= s && startIdx < e) || (endIdx > s && endIdx <= e));
    if (overlaps) continue;

    const raw = match[0];
    const target = match[1]?.trim();
    if (target) {
      matches.push({
        raw,
        target,
        alias: match[2]?.trim(),
        index: startIdx,
      });
      coveredRanges.push([startIdx, endIdx]);
    }
  }

  return matches.sort((a, b) => a.index - b.index);
}

/**
 * Resolves a WikiLink target string against current database modules, topics, notes and exams.
 */
export function resolveWikiLink(
  target: string,
  alias?: string,
  db?: {
    modules?: Module[];
    topics?: LearningTopic[];
    notes?: LectureNote[];
    exams?: Exam[];
  }
): ResolvedWikiLink {
  const rawTarget = target.trim();
  const cleanTarget = rawTarget.replace(/^["'„“«»`]+|["'„“«»`]+$/g, '').trim();
  const normalizedTarget = cleanTarget.replace(/[.,;:!?]+$/, '').trim();
  const lowerTarget = cleanTarget.toLowerCase();
  const lowerNorm = normalizedTarget.toLowerCase();
  const displayText = alias?.trim() || cleanTarget;

  if (!db) {
    return {
      raw: `[[${target}${alias ? `|${alias}` : ''}]]`,
      target: cleanTarget,
      displayText,
      type: 'unresolved',
    };
  }

  const { modules = [], topics = [], notes = [], exams = [] } = db;
  const strippedLower = lowerNorm.replace(/^(thema|modul|mitschrift|vorlesung|prüfung|klausur):\s*/i, '').trim();

  // 1. Check Topics (by exact title, id, prefix or substring)
  const matchedTopic = topics.find(
    (t) => {
      const tLower = t.title.toLowerCase();
      const tId = t.id.toLowerCase();
      return (
        tLower === lowerTarget ||
        tLower === lowerNorm ||
        tLower === strippedLower ||
        tId === lowerTarget ||
        tId === lowerNorm ||
        tLower.startsWith(lowerNorm) ||
        (lowerNorm.length >= 3 && tLower.includes(lowerNorm)) ||
        (strippedLower.length >= 3 && tLower.includes(strippedLower)) ||
        (tLower.length >= 3 && lowerNorm.includes(tLower))
      );
    }
  );
  if (matchedTopic) {
    return {
      raw: `[[${target}${alias ? `|${alias}` : ''}]]`,
      target: cleanTarget,
      displayText: alias || matchedTopic.title,
      type: 'topic',
      id: matchedTopic.id,
      item: matchedTopic,
    };
  }

  // 2. Check Modules (by code, shortName, name or id)
  const matchedModule = modules.find(
    (m) => {
      const mCode = m.code.toLowerCase();
      const mShort = (m.shortName || '').toLowerCase();
      const mName = m.name.toLowerCase();
      const mId = m.id.toLowerCase();
      return (
        mCode === lowerTarget ||
        mCode === lowerNorm ||
        mCode === strippedLower ||
        mId === lowerTarget ||
        mId === lowerNorm ||
        mShort === lowerTarget ||
        mShort === lowerNorm ||
        mShort === strippedLower ||
        mName === lowerTarget ||
        mName === lowerNorm ||
        mName === strippedLower ||
        (lowerNorm.length >= 2 && mCode.includes(lowerNorm)) ||
        (lowerNorm.length >= 3 && mShort.includes(lowerNorm)) ||
        (lowerNorm.length >= 3 && mName.includes(lowerNorm)) ||
        (mName.length >= 4 && lowerNorm.includes(mName)) ||
        (mShort.length >= 3 && lowerNorm.includes(mShort))
      );
    }
  );
  if (matchedModule) {
    return {
      raw: `[[${target}${alias ? `|${alias}` : ''}]]`,
      target: cleanTarget,
      displayText: alias || matchedModule.code || matchedModule.shortName || matchedModule.name,
      type: 'module',
      id: matchedModule.id,
      item: matchedModule,
    };
  }

  // 3. Check Notes (by title or id)
  const matchedNote = notes.find(
    (n) => {
      const nTitle = n.title.toLowerCase();
      const nId = n.id.toLowerCase();
      return (
        nTitle === lowerTarget ||
        nTitle === lowerNorm ||
        nTitle === strippedLower ||
        nId === lowerTarget ||
        nId === lowerNorm ||
        (lowerNorm.length >= 3 && nTitle.includes(lowerNorm)) ||
        (strippedLower.length >= 3 && nTitle.includes(strippedLower)) ||
        (nTitle.length >= 4 && lowerNorm.includes(nTitle))
      );
    }
  );
  if (matchedNote) {
    return {
      raw: `[[${target}${alias ? `|${alias}` : ''}]]`,
      target: cleanTarget,
      displayText: alias || matchedNote.title,
      type: 'note',
      id: matchedNote.id,
      item: matchedNote,
    };
  }

  // 4. Check Exams
  const matchedExam = exams.find(
    (e) => {
      const eTitle = e.title.toLowerCase();
      const eId = e.id.toLowerCase();
      return (
        eTitle === lowerTarget ||
        eTitle === lowerNorm ||
        eTitle === strippedLower ||
        eId === lowerTarget ||
        eId === lowerNorm ||
        (lowerNorm.length >= 3 && eTitle.includes(lowerNorm)) ||
        (strippedLower.length >= 3 && eTitle.includes(strippedLower)) ||
        (eTitle.length >= 4 && lowerNorm.includes(eTitle))
      );
    }
  );
  if (matchedExam) {
    return {
      raw: `[[${target}${alias ? `|${alias}` : ''}]]`,
      target: cleanTarget,
      displayText: alias || matchedExam.title,
      type: 'exam',
      id: matchedExam.id,
      item: matchedExam,
    };
  }

  return {
    raw: `[[${target}${alias ? `|${alias}` : ''}]]`,
    target: cleanTarget,
    displayText,
    type: 'unresolved',
  };
}

export interface WikiLinkNavigationHandlers {
  onNavigateToTopic?: (topicId: string) => void;
  onNavigateToModule?: (moduleId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
  onNavigateToExam?: (examId: string) => void;
}

/**
 * Renders text with full support for Markdown formatting (headings, lists, bold, italic,
 * tables, code blocks, blockquotes), [[WikiLinks]], and scientific formulas.
 */
export function renderTextWithWikiLinks(
  text: string,
  db: WikiLinkDatabase = {},
  handlers?: WikiLinkNavigationHandlers,
  forceInline = false
): React.ReactNode {
  if (!text) return null;

  if (!forceInline && isMarkdownBlockText(text)) {
    return <MarkdownRenderer content={text} db={db} handlers={handlers} />;
  }

  return <>{renderInlineMarkdown(text, db, handlers)}</>;
}

export { MarkdownRenderer, renderInlineMarkdown, isMarkdownBlockText };

/**
 * Interactive badge for a WikiLink.
 */
export const WikiLinkBadge: React.FC<{
  resolved: ResolvedWikiLink;
  handlers?: WikiLinkNavigationHandlers;
  className?: string;
}> = ({ resolved, handlers, className = '' }) => {
  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!resolved.id) return;

    if (resolved.type === 'topic' && handlers?.onNavigateToTopic) {
      handlers.onNavigateToTopic(resolved.id);
    } else if (resolved.type === 'module' && handlers?.onNavigateToModule) {
      handlers.onNavigateToModule(resolved.id);
    } else if (resolved.type === 'note' && handlers?.onNavigateToNote) {
      handlers.onNavigateToNote(resolved.id);
    } else if (resolved.type === 'exam' && handlers?.onNavigateToExam) {
      handlers.onNavigateToExam(resolved.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick(e);
    }
  };

  const isClickable = Boolean(
    resolved.id &&
      ((resolved.type === 'topic' && handlers?.onNavigateToTopic) ||
        (resolved.type === 'module' && handlers?.onNavigateToModule) ||
        (resolved.type === 'note' && handlers?.onNavigateToNote) ||
        (resolved.type === 'exam' && handlers?.onNavigateToExam))
  );

  if (resolved.type === 'topic') {
    return (
      <span
        onClick={isClickable ? handleClick : undefined}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-medium text-xs bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-900/60 transition-all select-none ${
          isClickable ? 'cursor-pointer hover:shadow-xs group hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-1 focus:ring-emerald-400' : ''
        } ${className}`}
        title={`Lernthema: "${resolved.displayText}" (Klicken zum Aufrufen)`}
      >
        <Bookmark className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
        <span className="font-semibold underline decoration-emerald-500/50 underline-offset-2">{resolved.displayText}</span>
        {isClickable && <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 shrink-0" />}
      </span>
    );
  }

  if (resolved.type === 'module') {
    return (
      <span
        onClick={isClickable ? handleClick : undefined}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-medium text-xs bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-900/60 transition-all select-none ${
          isClickable ? 'cursor-pointer hover:shadow-xs group hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-1 focus:ring-cyan-400' : ''
        } ${className}`}
        title={`Modul: "${resolved.displayText}" (Klicken zum Aufrufen)`}
      >
        <BookOpen className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
        <span className="font-semibold underline decoration-cyan-500/50 underline-offset-2">{resolved.displayText}</span>
        {isClickable && <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 shrink-0" />}
      </span>
    );
  }

  if (resolved.type === 'note') {
    return (
      <span
        onClick={isClickable ? handleClick : undefined}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-medium text-xs bg-purple-950/70 text-purple-300 border border-purple-500/40 hover:border-purple-400 hover:bg-purple-900/60 transition-all select-none ${
          isClickable ? 'cursor-pointer hover:shadow-xs group hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-1 focus:ring-purple-400' : ''
        } ${className}`}
        title={`Mitschrift: "${resolved.displayText}" (Klicken zum Aufrufen)`}
      >
        <FileText className="w-3 h-3 text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
        <span className="font-semibold underline decoration-purple-500/50 underline-offset-2">{resolved.displayText}</span>
        {isClickable && <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 shrink-0" />}
      </span>
    );
  }

  if (resolved.type === 'exam') {
    return (
      <span
        onClick={isClickable ? handleClick : undefined}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-medium text-xs bg-amber-950/70 text-amber-300 border border-amber-500/40 hover:border-amber-400 hover:bg-amber-900/60 transition-all select-none ${
          isClickable ? 'cursor-pointer hover:shadow-xs group hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-1 focus:ring-amber-400' : ''
        } ${className}`}
        title={`Prüfung: "${resolved.displayText}" (Klicken zum Aufrufen)`}
      >
        <Award className="w-3 h-3 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
        <span className="font-semibold underline decoration-amber-500/50 underline-offset-2">{resolved.displayText}</span>
        {isClickable && <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 shrink-0" />}
      </span>
    );
  }

  // Unresolved WikiLink
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] bg-slate-900/80 text-slate-400 border border-dashed border-slate-700 hover:border-slate-500 transition-colors ${className}`}
      title={`WikiLink: [[${resolved.target}]] (Noch kein entsprechendes Element in der Datenbank vorhanden)`}
    >
      <Link2 className="w-3 h-3 text-slate-500 shrink-0" />
      <span>{resolved.displayText}</span>
      <span className="text-[10px] text-slate-600 font-sans italic">(offen)</span>
    </span>
  );
};

/**
 * Extracts all textual WikiLinks across the whole database and returns Knowledge Graph Edges.
 */
export function extractAllWikiLinkEdges(
  notes: LectureNote[],
  topics: LearningTopic[],
  modules: Module[],
  exams: Exam[]
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  const db = { modules, topics, notes, exams };

  // Helper to add edge
  const addEdge = (sourceNodeId: string, resolved: ResolvedWikiLink, labelText: string) => {
    let targetNodeId: string | null = null;
    if (resolved.type === 'topic' && resolved.id) targetNodeId = `top-${resolved.id}`;
    else if (resolved.type === 'module' && resolved.id) targetNodeId = `mod-${resolved.id}`;
    else if (resolved.type === 'note' && resolved.id) targetNodeId = `note-${resolved.id}`;
    else if (resolved.type === 'exam' && resolved.id) targetNodeId = `exam-${resolved.id}`;

    if (!targetNodeId || sourceNodeId === targetNodeId) return;

    const edgeKey = `${sourceNodeId}->${targetNodeId}`;
    if (edgeSet.has(edgeKey)) return;
    edgeSet.add(edgeKey);

    edges.push({
      id: `edge-wiki-${sourceNodeId}-${targetNodeId}`,
      source: sourceNodeId,
      target: targetNodeId,
      label: labelText,
      dashed: false,
      edgeType: 'wikilink',
      color: '#a855f7', // Vivid Purple
    });
  };

  // 1. Scan Lecture Notes
  notes.forEach((note) => {
    const textCorpus = [
      note.content,
      note.summary,
      ...(note.connectionsList || []),
      ...(note.keyTakeaways || []),
      ...(note.insightsList || []),
      ...(note.examHintsList || []),
      ...(note.openQuestionsList || []),
    ].join('\n');

    const matches = extractWikiLinks(textCorpus, db);
    matches.forEach((m) => {
      const resolved = resolveWikiLink(m.target, m.alias, db);
      addEdge(`note-${note.id}`, resolved, `[[${m.target}]]`);
    });
  });

  // 2. Scan Learning Topics
  topics.forEach((topic) => {
    const textCorpus = [
      topic.description,
      ...(topic.keyFormulas || []),
    ].join('\n');

    const matches = extractWikiLinks(textCorpus, db);
    matches.forEach((m) => {
      const resolved = resolveWikiLink(m.target, m.alias, db);
      addEdge(`top-${topic.id}`, resolved, `[[${m.target}]]`);
    });
  });

  // 3. Scan Modules
  modules.forEach((mod) => {
    if (!mod.description) return;
    const matches = extractWikiLinks(mod.description, db);
    matches.forEach((m) => {
      const resolved = resolveWikiLink(m.target, m.alias, db);
      addEdge(`mod-${mod.id}`, resolved, `[[${m.target}]]`);
    });
  });

  return edges;
}

/**
 * Finds all backlinks targeting a specific entity ID.
 */
export function findBacklinks(
  targetId: string,
  targetType: 'topic' | 'module' | 'note' | 'exam',
  notes: LectureNote[],
  topics: LearningTopic[],
  modules: Module[],
  exams: Exam[]
): Array<{ sourceNote?: LectureNote; sourceTopic?: LearningTopic; matchedLink: string }> {
  const backlinks: Array<{ sourceNote?: LectureNote; sourceTopic?: LearningTopic; matchedLink: string }> = [];
  const db = { modules, topics, notes, exams };

  // Search Notes
  notes.forEach((note) => {
    if (targetType === 'note' && note.id === targetId) return;

    const textCorpus = [
      note.content,
      note.summary,
      ...(note.connectionsList || []),
      ...(note.keyTakeaways || []),
      ...(note.insightsList || []),
      ...(note.examHintsList || []),
      ...(note.openQuestionsList || []),
    ].join('\n');

    const matches = extractWikiLinks(textCorpus, db);
    matches.forEach((m) => {
      const resolved = resolveWikiLink(m.target, m.alias, db);
      if (resolved.type === targetType && resolved.id === targetId) {
        backlinks.push({
          sourceNote: note,
          matchedLink: m.raw,
        });
      }
    });
  });

  // Search Topics
  topics.forEach((topic) => {
    if (targetType === 'topic' && topic.id === targetId) return;

    const textCorpus = [
      topic.description || '',
      ...(topic.keyFormulas || []),
    ].join('\n');
    const matches = extractWikiLinks(textCorpus, db);
    matches.forEach((m) => {
      const resolved = resolveWikiLink(m.target, m.alias, db);
      if (resolved.type === targetType && resolved.id === targetId) {
        backlinks.push({
          sourceTopic: topic,
          matchedLink: m.raw,
        });
      }
    });
  });

  return backlinks;
}
