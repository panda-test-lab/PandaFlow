import React, { useState } from 'react';
import { Module, LearningTopic, LectureNote, Exam } from '../types';
import { WikiLinkBadge, WikiLinkDatabase, WikiLinkNavigationHandlers, resolveWikiLink } from './wikiLinks';
import { FormattedFormulaView } from './formulaFormatter';
import { Copy, Check, ExternalLink, CheckSquare, Square } from 'lucide-react';

interface MarkdownProps {
  content: string;
  db?: WikiLinkDatabase;
  handlers?: WikiLinkNavigationHandlers;
  className?: string;
}

/**
 * Replaces arrows and basic chemistry/physics shorthand symbols in plain text.
 */
function cleanPlainTextSymbols(text: string): string {
  return text
    .replace(/\\rightarrow|-->/g, '→')
    .replace(/\\leftarrow|<--/g, '←')
    .replace(/\\rightleftharpoons|<=>/g, '⇄')
    .replace(/\\downarrow/g, '↓')
    .replace(/\\uparrow/g, '↑')
    .replace(/\\approx/g, '≈')
    .replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\pm/g, '±')
    .replace(/\\times/g, '×')
    .replace(/\\infty/g, '∞');
}

/**
 * Combined regular expression for all inline tokens.
 * Priority order:
 * 1. WikiLinks: [[Target]] or [[Target|Alias]]
 * 2. Enclosed formulas: ($...$)
 * 3. Display formulas: $$...$$ or \[...\]
 * 4. Inline formulas: $...$ or \(...\)
 * 5. Code: `code`
 * 6. Bold+Italic: ***text***
 * 7. Bold: ++text++, **text** or __text__
 * 8. Strikethrough: ~~text~~
 * 9. Markdown links: [text](url)
 * 10. Italic: *text* or _text_
 */
/**
 * Regular expression pattern for all inline tokens.
 * Priority order:
 * 1. Double bracket WikiLinks: [[Target]] or [[Target|Alias]]
 * 2. Enclosed formulas: ($...$)
 * 3. Display formulas: $$...$$ or \[...\]
 * 4. Inline formulas: $...$ or \(...\)
 * 5. Code: `code`
 * 6. Bold+Italic: ***text***
 * 7. Bold: ++text++, **text** or __text__
 * 8. Strikethrough: ~~text~~
 * 9. Markdown links: [text](url)
 * 10. Single bracket WikiLinks: [Target] or [Target|Alias] (when not a markdown link)
 * 11. Italic: *text* or _text_
 */
const INLINE_REGEX_SOURCE =
  '(?:\\[\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\]\\])|' + // 1, 2: [[[target|alias]]]
  '(?:\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\])|' + // 3, 4: [[target|alias]]
  '(?:\\(\\$(.+?)\\$\\))|' + // 5: ($formula$)
  '(?:\\$\\$(.+?)\\$\\$)|' + // 6: $$formula$$
  '(?:\\$(.+?)\\$)|' + // 7: $formula$
  '(?:\\\\\\((.+?)\\\\\\))|' + // 8: \(formula\)
  '(?:\\\\\\[(.+?)\\\\\\])|' + // 9: \[formula\]
  '(?:`([^`\\n]+)`)|' + // 10: `code`
  '(?:\\*\\*\\*([^*]+)\\*\\*\\*)|' + // 11: ***bi***
  '(?:\\*\\*([^*]+)\\*\\*)|(?:__([^_]+)__)|' + // 12, 13: **b** or __b__
  '(?:~~([^~]+)~~)|' + // 14: ~~del~~
  '(?:\\[([^\\]]+)\\]\\(([^)\\s]+)\\))|' + // 15, 16: [text](url)
  '(?:\\*([^*]+)\\*)|(?:(?<!\\w)_([^_]+)_(?!\\w))|' + // 17, 18: *i* or _i_
  '(?:\\+\\+([^+]+)\\+\\+)'; // 19: ++b++

/**
 * Parses and renders inline markdown tokens, WikiLinks, and formulas recursively.
 */
export function renderInlineMarkdown(
  text: string,
  db: WikiLinkDatabase = {},
  handlers?: WikiLinkNavigationHandlers,
  keyPrefix = 'inline',
  depth = 0
): React.ReactNode[] {
  if (!text) return [];

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let counter = 0;

  // Fresh regex instance per invocation to prevent shared state corruption during recursion
  const inlineRegex = new RegExp(INLINE_REGEX_SOURCE, 'g');

  while ((match = inlineRegex.exec(text)) !== null) {
    const start = match.index;
    const matchedStr = match[0];

    // Push plain text preceding this match
    if (start > lastIndex) {
      elements.push(
        <React.Fragment key={`${keyPrefix}-txt-${counter++}`}>
          {cleanPlainTextSymbols(text.substring(lastIndex, start))}
        </React.Fragment>
      );
    }

    const itemKey = `${keyPrefix}-m-${start}-${counter++}`;

    // 1. Triple bracket WikiLink: [[[Target|Alias]]] or [[[Target]]]
    if (match[1] !== undefined) {
      const target = match[1].trim();
      const alias = match[2]?.trim();
      elements.push(
        <WikiLinkBadgeWrapper
          key={itemKey}
          target={target}
          alias={alias}
          raw={matchedStr}
          db={db}
          handlers={handlers}
        />
      );
    }
    // 2. Double bracket WikiLink: [[Target|Alias]] or [[Target]]
    else if (match[3] !== undefined) {
      const target = match[3].trim();
      const alias = match[4]?.trim();
      elements.push(
        <WikiLinkBadgeWrapper
          key={itemKey}
          target={target}
          alias={alias}
          raw={matchedStr}
          db={db}
          handlers={handlers}
        />
      );
    }
    // 3. Enclosed formula: ($...$)
    else if (match[5] !== undefined) {
      const inner = match[5];
      elements.push(
        <span key={itemKey} className="inline-flex items-center">
          <span className="text-slate-400 font-sans">(</span>
          <FormattedFormulaView raw={inner} isBlock={false} />
          <span className="text-slate-400 font-sans">)</span>
        </span>
      );
    }
    // 4. Block / Display formula: $$...$$ or \[...\]
    else if (match[6] !== undefined || match[9] !== undefined) {
      const inner = match[6] ?? match[9];
      elements.push(
        <FormattedFormulaView key={itemKey} raw={inner} isBlock={true} />
      );
    }
    // 5. Inline formula: $...$ or \(...\)
    else if (match[7] !== undefined || match[8] !== undefined) {
      const inner = match[7] ?? match[8];
      elements.push(
        <FormattedFormulaView key={itemKey} raw={inner} isBlock={false} />
      );
    }
    // 6. Inline code: `code`
    else if (match[10] !== undefined) {
      elements.push(
        <code
          key={itemKey}
          className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-teal-300 font-medium select-all"
        >
          {match[10]}
        </code>
      );
    }
    // 7. Bold + Italic: ***text***
    else if (match[11] !== undefined) {
      const inner = depth < 3 ? renderInlineMarkdown(match[11], db, handlers, `${itemKey}-bi`, depth + 1) : match[11];
      elements.push(
        <strong key={itemKey} className="font-bold italic text-slate-100">
          {inner}
        </strong>
      );
    }
    // 8. Bold: **text** or __text__
    else if (match[12] !== undefined || match[13] !== undefined) {
      const innerText = match[12] ?? match[13];
      const inner = depth < 3 ? renderInlineMarkdown(innerText, db, handlers, `${itemKey}-b`, depth + 1) : innerText;
      elements.push(
        <strong key={itemKey} className="font-bold text-slate-100">
          {inner}
        </strong>
      );
    }
    // 9. Strikethrough: ~~text~~
    else if (match[14] !== undefined) {
      const inner = depth < 3 ? renderInlineMarkdown(match[14], db, handlers, `${itemKey}-del`, depth + 1) : match[14];
      elements.push(
        <del key={itemKey} className="line-through text-slate-500">
          {inner}
        </del>
      );
    }
    // 10. Markdown link: [text](url)
    else if (match[15] !== undefined && match[16] !== undefined) {
      let href = match[16].trim();
      const linkText = match[15];
      // Normalize external url
      const isInternal = href.startsWith('/') || href.startsWith('#') || href.startsWith('mailto:');
      if (!isInternal && !/^https?:\/\//i.test(href)) {
        href = `https://${href}`;
      }

      elements.push(
        <a
          key={itemKey}
          href={href}
          target={isInternal ? undefined : '_blank'}
          rel={isInternal ? undefined : 'noopener noreferrer'}
          className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 underline underline-offset-2 decoration-teal-500/50 hover:decoration-teal-400 transition-colors font-medium cursor-pointer"
        >
          <span>{linkText}</span>
          {!isInternal && <ExternalLink className="w-2.5 h-2.5 inline opacity-70 shrink-0" />}
        </a>
      );
    }
    // 10. Single bracket WikiLink: [Target|Alias] or [Target]
    else if (match[15] !== undefined) {
      const target = match[15].trim();
      const alias = match[16]?.trim();
      // Ensure target is not a simple checkbox [x], [ ], footnote [1], or pure punctuation
      if (
        target.length >= 2 &&
        !/^(x|v|\s|\d+|true|false|-)$/i.test(target) &&
        /[a-zA-ZäöüÄÖÜß]/.test(target)
      ) {
        elements.push(
          <WikiLinkBadgeWrapper
            key={itemKey}
            target={target}
            alias={alias}
            raw={matchedStr}
            db={db}
            handlers={handlers}
          />
        );
      } else {
        elements.push(<React.Fragment key={itemKey}>{matchedStr}</React.Fragment>);
      }
    }
    // 11. Italic: *text* or _text_
    else if (match[17] !== undefined || match[18] !== undefined) {
      const innerText = match[17] ?? match[18];
      const inner = depth < 3 ? renderInlineMarkdown(innerText, db, handlers, `${itemKey}-i`, depth + 1) : innerText;
      elements.push(
        <em key={itemKey} className="italic text-slate-200">
          {inner}
        </em>
      );
    }
    // 12. Alternative bold syntax that does not conflict with ## headings
    else if (match[19] !== undefined) {
      const inner = depth < 3 ? renderInlineMarkdown(match[19], db, handlers, `${itemKey}-b`, depth + 1) : match[19];
      elements.push(
        <strong key={itemKey} className="font-bold text-slate-100">
          {inner}
        </strong>
      );
    }

    lastIndex = start + matchedStr.length;
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    elements.push(
      <React.Fragment key={`${keyPrefix}-tail`}>
        {cleanPlainTextSymbols(text.substring(lastIndex))}
      </React.Fragment>
    );
  }

  return elements;
}

/**
 * Helper to resolve and render a WikiLink with WikiLinkBadge
 */
const WikiLinkBadgeWrapper: React.FC<{
  target: string;
  alias?: string;
  raw: string;
  db: WikiLinkDatabase;
  handlers?: WikiLinkNavigationHandlers;
}> = ({ target, alias, db, handlers }) => {
  const resolved = resolveWikiLink(target, alias, db);
  return <WikiLinkBadge resolved={resolved} handlers={handlers} />;
};

/**
 * Interactive CodeBlock component with copy functionality.
 */
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 text-[11px] text-slate-400">
        <span className="font-mono text-teal-400 font-semibold lowercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] hover:text-slate-200 transition-colors cursor-pointer px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50"
          title="Code in Zwischenablage kopieren"
        >
          {copied ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
          <span>{copied ? 'Kopiert!' : 'Kopieren'}</span>
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono text-teal-200/95 overflow-x-auto leading-relaxed select-all">
        <code>{code}</code>
      </pre>
    </div>
  );
};

/**
 * Types of parsed block elements
 */
type BlockNode =
  | { type: 'heading'; level: number; text: string }
  | { type: 'codeblock'; language: string; code: string }
  | { type: 'blockformula'; formula: string }
  | { type: 'hr' }
  | { type: 'blockquote'; lines: string[] }
  | {
      type: 'list';
      ordered: boolean;
      items: { indent: number; text: string; task?: { checked: boolean } }[];
    }
  | {
      type: 'table';
      headers: string[];
      alignments: ('left' | 'center' | 'right')[];
      rows: string[][];
    }
  | { type: 'paragraph'; lines: string[] };

/**
 * Parses markdown into block nodes.
 */
function parseMarkdownBlocks(rawText: string): BlockNode[] {
  if (!rawText) return [];

  const lines = rawText.split(/\r?\n/);
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line -> skip
    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Fenced Code Block: ```lang
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip ending ```
      blocks.push({
        type: 'codeblock',
        language: lang,
        code: codeLines.join('\n'),
      });
      continue;
    }

    // 2. Multiline Block Formula: $$ or \[
    if (trimmed === '$$' || trimmed === '\\[') {
      const formulaLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '$$' && lines[i].trim() !== '\\]') {
        formulaLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip ending $$ or \]
      blocks.push({
        type: 'blockformula',
        formula: formulaLines.join('\n').trim(),
      });
      continue;
    }

    // Single-line block formula: $$...$$ or \[...\]
    if (
      (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 3) ||
      (trimmed.startsWith('\\[') && trimmed.endsWith('\\]') && trimmed.length > 3)
    ) {
      const formula = trimmed.slice(2, -2).trim();
      blocks.push({ type: 'blockformula', formula });
      i++;
      continue;
    }

    // 3. Headings: #, ##, ###, ####, #####, ######
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // 4. Horizontal Rule: ---, ***, ___
    if (/^(?:---|\*\*\*|___)\s*$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 5. Blockquote: > text
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({
        type: 'blockquote',
        lines: quoteLines,
      });
      continue;
    }

    // 6. Table: | Col 1 | Col 2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && lines[i + 1]?.trim().match(/^\|(?:\s*:?-+:?\s*\|)+$/)) {
      const parseRow = (r: string) =>
        r
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

      const headers = parseRow(trimmed);
      const delimiterRow = lines[i + 1].trim();
      const alignments = parseRow(delimiterRow).map((cell) => {
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center' as const;
        if (cell.endsWith(':')) return 'right' as const;
        return 'left' as const;
      });

      i += 2; // skip header and delimiter
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        rows.push(parseRow(lines[i].trim()));
        i++;
      }

      blocks.push({
        type: 'table',
        headers,
        alignments,
        rows,
      });
      continue;
    }

    // 7. Lists (unordered, ordered, task list)
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const isOrdered = /^\d+\./.test(listMatch[2]);
      const items: { indent: number; text: string; task?: { checked: boolean } }[] = [];

      while (i < lines.length) {
        const curLine = lines[i];
        const m = curLine.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (!m) {
          // Check if continuation indented line
          if (curLine.trim() && items.length > 0 && /^\s{2,}/.test(curLine)) {
            items[items.length - 1].text += ' ' + curLine.trim();
            i++;
            continue;
          }
          break;
        }

        const indentSpaces = m[1].length;
        let itemText = m[3];
        let task: { checked: boolean } | undefined = undefined;

        // Task check: [ ] or [x]
        const taskMatch = itemText.match(/^\[([ xX])\]\s+(.*)$/);
        if (taskMatch) {
          task = { checked: taskMatch[1].toLowerCase() === 'x' };
          itemText = taskMatch[2];
        }

        items.push({
          indent: Math.floor(indentSpaces / 2),
          text: itemText,
          task,
        });
        i++;
      }

      blocks.push({
        type: 'list',
        ordered: isOrdered,
        items,
      });
      continue;
    }

    // 8. Regular Paragraph (group contiguous non-blank lines that aren't other blocks)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !/^(?:---|\*\*\*|___)\s*$/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) &&
      !lines[i].match(/^(\s*)([-*+]|\d+\.)\s+/) &&
      lines[i].trim() !== '$$' &&
      lines[i].trim() !== '\\['
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        lines: paraLines,
      });
    } else {
      // Keep malformed or incomplete block markers (for example a bare "##")
      // as text, and guarantee that every parser iteration consumes a line.
      blocks.push({ type: 'paragraph', lines: [line] });
      i++;
    }
  }

  return blocks;
}

/**
 * Main Markdown Component that renders structured markdown with full support
 * for headings, lists, bold/italic, tables, code blocks, blockquotes,
 * plus WikiLinks and scientific formulas.
 */
export const MarkdownRenderer: React.FC<MarkdownProps> = ({
  content,
  db = {},
  handlers,
  className = '',
}) => {
  if (!content) return null;

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`space-y-3 leading-relaxed ${className}`}>
      {blocks.map((block, bIdx) => {
        const bKey = `b-${bIdx}`;

        switch (block.type) {
          case 'heading': {
            const inline = renderInlineMarkdown(block.text, db, handlers, `${bKey}-h`);
            switch (block.level) {
              case 1:
                return (
                  <h1
                    key={bKey}
                    className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-5 mb-2.5 pb-2 border-b border-slate-800 flex items-center gap-2"
                  >
                    <span className="w-2 h-6 bg-teal-400 rounded-full inline-block shrink-0" />
                    <span>{inline}</span>
                  </h1>
                );
              case 2:
                return (
                  <h2
                    key={bKey}
                    className="text-lg font-bold text-teal-300 tracking-tight mt-4 mb-2 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-4.5 bg-teal-500 rounded-full inline-block shrink-0" />
                    <span>{inline}</span>
                  </h2>
                );
              case 3:
                return (
                  <h3
                    key={bKey}
                    className="text-sm sm:text-base font-semibold text-slate-100 mt-3 mb-1.5 flex items-center gap-2"
                  >
                    <span className="w-1 h-3.5 bg-teal-400/70 rounded-full inline-block shrink-0" />
                    <span>{inline}</span>
                  </h3>
                );
              case 4:
                return (
                  <h4
                    key={bKey}
                    className="text-xs font-bold uppercase tracking-wider text-teal-400/90 mt-2.5 mb-1"
                  >
                    {inline}
                  </h4>
                );
              default:
                return (
                  <h5
                    key={bKey}
                    className="text-xs font-semibold text-slate-300 mt-2 mb-1"
                  >
                    {inline}
                  </h5>
                );
            }
          }

          case 'codeblock':
            return (
              <CodeBlock
                key={bKey}
                code={block.code}
                language={block.language}
              />
            );

          case 'blockformula':
            return (
              <FormattedFormulaView
                key={bKey}
                raw={block.formula}
                isBlock={true}
              />
            );

          case 'hr':
            return <hr key={bKey} className="my-4 border-slate-800" />;

          case 'blockquote':
            return (
              <blockquote
                key={bKey}
                className="my-2.5 border-l-3 border-teal-500 bg-teal-950/20 px-3.5 py-2 rounded-r-xl text-slate-300 text-xs italic space-y-1"
              >
                {block.lines.map((qLine, qIdx) => (
                  <div key={`${bKey}-q-${qIdx}`}>
                    {renderInlineMarkdown(qLine, db, handlers, `${bKey}-q-${qIdx}`)}
                  </div>
                ))}
              </blockquote>
            );

          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul';
            return (
              <ListTag
                key={bKey}
                className={`my-2 space-y-1.5 text-xs text-slate-300 ${
                  block.ordered ? 'list-none' : 'list-none'
                }`}
              >
                {block.items.map((item, iIdx) => {
                  const inline = renderInlineMarkdown(item.text, db, handlers, `${bKey}-li-${iIdx}`);
                  const indentClass = item.indent > 0 ? `ml-${Math.min(item.indent * 4, 12)}` : '';

                  if (item.task) {
                    return (
                      <li
                        key={`${bKey}-li-${iIdx}`}
                        className={`flex items-start gap-2 ${indentClass}`}
                      >
                        <span className="shrink-0 mt-0.5 text-teal-400">
                          {item.task.checked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-teal-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </span>
                        <div
                          className={`flex-1 ${
                            item.task.checked ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {inline}
                        </div>
                      </li>
                    );
                  }

                  if (block.ordered) {
                    return (
                      <li
                        key={`${bKey}-li-${iIdx}`}
                        className={`flex items-start gap-2 ${indentClass}`}
                      >
                        <span className="font-mono font-bold text-teal-400 shrink-0 select-none text-[11px] min-w-4">
                          {iIdx + 1}.
                        </span>
                        <div className="flex-1">{inline}</div>
                      </li>
                    );
                  }

                  return (
                    <li
                      key={`${bKey}-li-${iIdx}`}
                      className={`flex items-start gap-2.5 ${indentClass}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 mt-1.5 shadow-2xs" />
                      <div className="flex-1">{inline}</div>
                    </li>
                  );
                })}
              </ListTag>
            );
          }

          case 'table':
            return (
              <div
                key={bKey}
                className="overflow-x-auto my-3 rounded-xl border border-slate-800 bg-slate-950/60 shadow-inner"
              >
                <table className="w-full text-left text-xs divide-y divide-slate-800">
                  <thead className="bg-slate-900/90 text-teal-300 font-bold uppercase tracking-wider text-[10.5px]">
                    <tr>
                      {block.headers.map((h, hIdx) => {
                        const align = block.alignments[hIdx] || 'left';
                        return (
                          <th
                            key={`${bKey}-th-${hIdx}`}
                            className={`px-3.5 py-2.5 text-${align}`}
                          >
                            {renderInlineMarkdown(h, db, handlers, `${bKey}-th-${hIdx}`)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={`${bKey}-tr-${rIdx}`}
                        className="hover:bg-slate-900/40 transition-colors"
                      >
                        {row.map((cell, cIdx) => {
                          const align = block.alignments[cIdx] || 'left';
                          return (
                            <td
                              key={`${bKey}-td-${rIdx}-${cIdx}`}
                              className={`px-3.5 py-2 text-${align}`}
                            >
                              {renderInlineMarkdown(cell, db, handlers, `${bKey}-td-${rIdx}-${cIdx}`)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'paragraph':
          default:
            return (
              <div
                key={bKey}
                className="text-xs text-slate-300 leading-relaxed space-y-1"
              >
                {block.lines.map((pLine, pIdx) => (
                  <div key={`${bKey}-p-${pIdx}`}>
                    {renderInlineMarkdown(pLine, db, handlers, `${bKey}-p-${pIdx}`)}
                  </div>
                ))}
              </div>
            );
        }
      })}
    </div>
  );
};

/**
 * Checks if a string contains Markdown block structures (headers, lists, tables, etc.)
 * or newlines that need block rendering rather than inline-only rendering.
 */
export function isMarkdownBlockText(text: string): boolean {
  if (!text) return false;
  if (text.includes('\n')) return true;
  return /^(?:#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|\||\$\$|\\\[|---|\*\*\*|___)/m.test(text);
}
