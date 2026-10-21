import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Ensure PDF.js worker is properly configured using Vite bundled asset URL
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch (e) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
  }
}

export interface ExtractedPdfResult {
  text: string;
  csvText: string;
  headers: string[];
  rows: string[][];
  pageCount: number;
}

interface PositionedItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

/**
 * Filters out narrative paragraph text, intro notes, headers/footers, and isolates strictly table rows.
 */
export function filterTableRowsOnly(structuredLines: string[][]): {
  headers: string[];
  rows: string[][];
  csvText: string;
} {
  if (!structuredLines || structuredLines.length === 0) {
    return { headers: [], rows: [], csvText: '' };
  }

  // Filter out single-cell paragraph lines, page numbers, and footers
  const tableCandidateLines = structuredLines.filter((row) => {
    const populatedCells = row.filter((c) => c && c.trim().length > 0);
    if (populatedCells.length < 2) {
      // Check if the single cell is a structured code or ECTS pattern
      const single = populatedCells[0] || '';
      const isStructuredData = /[A-Za-z0-9]{2,}\.[0-9]{2,}/.test(single) || /\d+\s*ECTS/i.test(single);
      if (!isStructuredData) return false; // Exclude paragraph headings and intro text
    }

    // Exclude page numbers like "Seite 1 von 5" or "Page 2"
    const fullLine = populatedCells.join(' ').toLowerCase().trim();
    if (/^seite\s+\d+(\s+von\s+\d+)?$/i.test(fullLine) || /^page\s+\d+/i.test(fullLine) || /^\d+\s*\/\s*\d+$/.test(fullLine)) {
      return false;
    }

    return true;
  });

  const linesToUse = tableCandidateLines.length > 0 ? tableCandidateLines : structuredLines;

  // Header Keyword Matching
  const headerKeywords = ['kürzel', 'code', 'modul', 'bezeichnung', 'titel', 'fach', 'kurzname', 'semester', 'ects', 'credits', 'punkte', 'prüfung', 'dozent', 'sws', 'nr'];
  
  let headerIdx = linesToUse.findIndex((row) => {
    const lineText = row.join(' ').toLowerCase();
    return headerKeywords.some((kw) => lineText.includes(kw));
  });

  if (headerIdx === -1) {
    headerIdx = 0;
  }

  const headerRow = linesToUse[headerIdx] || [];
  const headers = headerRow.map((cell, i) => cell.trim() || `Spalte ${i + 1}`);

  const contentRows = linesToUse
    .slice(headerIdx + 1)
    .filter((r) => r.some((c) => c && c.trim().length > 0));

  const csvLines = [headers.join(';'), ...contentRows.map((r) => r.join(';'))];

  return {
    headers,
    rows: contentRows,
    csvText: csvLines.join('\n'),
  };
}

/**
 * Advanced Grid-Based PDF Table Extractor.
 * Isolates ONLY tabular content, stripping narrative text and paragraph intros.
 */
export async function extractTextAndTablesFromPdf(
  input: ArrayBuffer | string | File
): Promise<ExtractedPdfResult> {
  try {
    let pdfData: Uint8Array;

    if (input instanceof File) {
      const buffer = await input.arrayBuffer();
      pdfData = new Uint8Array(buffer);
    } else if (typeof input === 'string') {
      const base64Clean = input.includes('base64,') ? input.split('base64,')[1] : input;
      const binaryStr = window.atob(base64Clean);
      const len = binaryStr.length;
      pdfData = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        pdfData[i] = binaryStr.charCodeAt(i);
      }
    } else {
      pdfData = new Uint8Array(input);
    }

    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages;

    const allPageItems: PositionedItem[][] = [];
    const allXPositions: number[] = [];

    // STEP 1: Parse all pages and collect text items with normalized rotation coordinates
    for (let p = 1; p <= pageCount; p++) {
      const page = await pdfDoc.getPage(p);
      const viewport = page.getViewport({ scale: 1.0 });
      const rotation = (page.rotate + viewport.rotation) % 360;

      const textContent = await page.getTextContent();
      const items = textContent.items as Array<{
        str: string;
        transform: number[];
        width: number;
        height: number;
      }>;

      if (!items || items.length === 0) continue;

      const pageItems: PositionedItem[] = items
        .filter((it) => it.str && it.str.trim().length > 0)
        .map((it) => {
          const rawX = it.transform[4];
          const rawY = it.transform[5];

          let x = rawX;
          let y = rawY;

          if (rotation === 90) {
            x = rawY;
            y = viewport.width - rawX;
          } else if (rotation === 180) {
            x = viewport.width - rawX;
            y = viewport.height - rawY;
          } else if (rotation === 270) {
            x = viewport.height - rawY;
            y = rawX;
          }

          return { str: it.str.trim(), x, y, width: it.width || (it.str.length * 6) };
        });

      pageItems.forEach((it) => allXPositions.push(it.x));
      allPageItems.push(pageItems);
    }

    if (allPageItems.length === 0) {
      return { text: '', csvText: '', headers: [], rows: [], pageCount: 0 };
    }

    // STEP 2: Detect Column Boundaries by Clustering X Positions
    allXPositions.sort((a, b) => a - b);
    const colClusters: number[] = [];
    const clusterGap = 25; // x-gap threshold for new column

    allXPositions.forEach((x) => {
      if (colClusters.length === 0) {
        colClusters.push(x);
      } else {
        const last = colClusters[colClusters.length - 1];
        if (x - last > clusterGap) {
          colClusters.push(x);
        }
      }
    });

    const useColumns = colClusters.length >= 2;

    // STEP 3: Reconstruct lines page by page
    const structuredLines: string[][] = [];
    const rawLinesText: string[] = [];

    allPageItems.forEach((pageItems) => {
      const lineTolerance = 6;
      const linesMap = new Map<number, PositionedItem[]>();

      pageItems.forEach((item) => {
        let matchedKey: number | null = null;
        for (const existingY of linesMap.keys()) {
          if (Math.abs(existingY - item.y) <= lineTolerance) {
            matchedKey = existingY;
            break;
          }
        }

        if (matchedKey !== null) {
          linesMap.get(matchedKey)!.push(item);
        } else {
          linesMap.set(item.y, [item]);
        }
      });

      const sortedYKeys = Array.from(linesMap.keys()).sort((a, b) => b - a);

      sortedYKeys.forEach((yKey) => {
        const lineItems = linesMap.get(yKey)!;
        lineItems.sort((a, b) => a.x - b.x);

        if (useColumns) {
          const colCells = new Array<string>(colClusters.length).fill('');

          lineItems.forEach((item) => {
            let bestColIdx = 0;
            let minDiff = Math.abs(item.x - colClusters[0]);

            for (let c = 1; c < colClusters.length; c++) {
              const diff = Math.abs(item.x - colClusters[c]);
              if (diff < minDiff) {
                minDiff = diff;
                bestColIdx = c;
              }
            }

            colCells[bestColIdx] = colCells[bestColIdx]
              ? `${colCells[bestColIdx]} ${item.str}`
              : item.str;
          });

          const trimmedCells = colCells.map((c) => c.trim());
          if (trimmedCells.some((c) => c.length > 0)) {
            structuredLines.push(trimmedCells);
            rawLinesText.push(trimmedCells.filter(Boolean).join('; '));
          }
        } else {
          const cellParts: string[] = [];
          let currentCell = '';

          for (let i = 0; i < lineItems.length; i++) {
            if (i > 0) {
              const gap = lineItems[i].x - (lineItems[i - 1].x + lineItems[i - 1].width);
              if (gap > 12) {
                cellParts.push(currentCell.trim());
                currentCell = lineItems[i].str;
              } else {
                currentCell += ` ${lineItems[i].str}`;
              }
            } else {
              currentCell = lineItems[i].str;
            }
          }
          if (currentCell.trim()) cellParts.push(currentCell.trim());

          if (cellParts.length > 0) {
            structuredLines.push(cellParts);
            rawLinesText.push(cellParts.join('; '));
          }
        }
      });
    });

    if (structuredLines.length === 0) {
      return { text: '', csvText: '', headers: [], rows: [], pageCount };
    }

    // STEP 4: Filter strictly for table rows, ignoring paragraph intro text & footers
    const filteredTable = filterTableRowsOnly(structuredLines);

    return {
      text: rawLinesText.join('\n'),
      csvText: filteredTable.csvText,
      headers: filteredTable.headers,
      rows: filteredTable.rows,
      pageCount,
    };
  } catch (err) {
    console.error('PDF text extraction error:', err);
    return {
      text: '',
      csvText: '',
      headers: [],
      rows: [],
      pageCount: 0,
    };
  }
}

/**
 * Workaround Utility: Convert raw multiline text into structured table format.
 * Generates headers from 1st line and row content from subsequent lines.
 */
export function convertTextToTableFormat(textInput: string): { csvText: string; headers: string[]; rows: string[][] } {
  if (!textInput || !textInput.trim()) {
    return { csvText: '', headers: [], rows: [] };
  }

  const lines = textInput
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { csvText: '', headers: [], rows: [] };
  }

  // Detect delimiter: semicolon, tab, double space, or comma
  const firstLine = lines[0];
  let delimiter: string | RegExp = ';';
  if (firstLine.includes(';')) delimiter = ';';
  else if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes('  ')) delimiter = /\s{2,}/;
  else if (firstLine.includes(',')) delimiter = ',';

  const rawRows = lines.map((line) => {
    return line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
  });

  const filtered = filterTableRowsOnly(rawRows);
  return filtered;
}

/**
 * Convenience helper returning raw text string for legacy importers
 */
export async function extractTextFromPdf(input: ArrayBuffer | string | File): Promise<string> {
  const res = await extractTextAndTablesFromPdf(input);
  return res.text;
}
