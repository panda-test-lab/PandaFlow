import { ModuleOverviewDocument } from '../types';
import { createSamplePdfDataUrl } from './pdfViewerHelper';

export const sampleCurriculumCsv = `Kürzel;Modulname;Kurzname;Semester;ECTS;Prüfungsform;Dozent
MOD-101;Grundlagen der Allgemeinen und Anorganischen Chemie;Allgemeine Chemie;1;9;Klausur + Praktikumsschein;Prof. Dr. H. Schmidt
MOD-102;Grundlagen der Zellbiologie und Morphologie;Zellbiologie;1;7;Klausur + Testat;Prof. Dr. M. Weber
MOD-103;Anatomische und Histologische Grundlagen;Anatomie I;1;5;Klausur;Prof. Dr. K. Fischer
MOD-104;Wissenschaftliche Terminologie und Nomenklatur;Terminologie;1;2;Klausur;Dr. E. Richter
MOD-105;Mathematische und Statistische Methoden;Mathematik & Statistik;1;3;Klausur;Prof. Dr. T. Becker
MOD-106;Physikalische Grundlagen und Messtechnik;Physik;1;4;Klausur + Schein;Prof. Dr. A. Braun
MOD-201;Organische Chemie und Reaktionsmechanismen;Organische Chemie I;2;9;Klausur + Laborpraktikum;Prof. Dr. L. Wagner
MOD-202;Quantitative Analytik und Sensorik;Quantitative Analytik;2;8;Klausur + Praktikum;Prof. Dr. H. Schmidt
MOD-203;Physikalische Chemie und Spektroskopie;Physikalische Chemie;2;6;Klausur + Praktikum;Prof. Dr. S. Koch
MOD-204;Strukturbiologie und Systematik;Strukturbiologie;2;4;Klausur;Prof. Dr. M. Weber
MOD-205;Physiologie und funktionelle Zellmechanik;Physiologie;2;3;Klausur;Prof. Dr. K. Fischer
MOD-301;Grundlagen der Verfahrenstechnik und Technologie;Technologie I;3;8;Klausur + Praktikum;Prof. Dr. B. Lehmann
MOD-302;Biochemie und Molekularbiologie;Biochemie & Molekularbio;3;8;Klausur + Praktikum;Prof. Dr. N. Bauer
MOD-303;Mikrobiologie und Hygiene;Mikrobiologie & Hygiene;3;5;Klausur + Praktikum;Prof. Dr. C. Wolf
MOD-401;Fortgeschrittene Instrumentelle Analytik;Instrumentelle Analytik;4;9;Klausur + Praktikum;Prof. Dr. H. Schmidt
MOD-501;Molekulare Wirkmechanismen und Toxikologie;Wirkmechanismen & Toxikologie;5;8;Klausur;Prof. Dr. J. Hartmann
MOD-601;Wissenschaftliche Projektarbeit und Abschlussmodul;Abschlussmodul;6;12;Thesis + Kolloquium;Prof. Dr. S. Krause`;

export const standardModuleOverview: ModuleOverviewDocument = {
  id: 'overview-standard',
  title: 'Curriculum- & Modulübersicht (1.–6. Semester)',
  universityName: 'Universität / Hochschule',
  versionOrYear: 'Studienplan 2026/27',
  description: 'Vollständige Modul- und Fächerübersicht nach Fachsemestern mitsamt offiziellen Kürzeln, ECTS-Punkten, Dozenten und Prüfungsformen.',
  url: 'https://www.universitaet.de/studium/curriculum.html',
  fileType: 'csv',
  fileName: 'Moduluebersicht_Curriculum.csv',
  fileSize: '4.2 KB',
  csvData: sampleCurriculumCsv,
  pdfData: createSamplePdfDataUrl('Moduluebersicht Curriculum', 'Curriculum & Modulkatalog Bachelor/Master'),
  uploadedAt: new Date().toISOString(),
};

export const standardPharmacyOverview = standardModuleOverview;

export interface ParsedCsvTable {
  headers: string[];
  rows: string[][];
}

export function parseCsvToTable(csvText: string): ParsedCsvTable {
  if (!csvText || !csvText.trim()) {
    return { headers: [], rows: [] };
  }

  // Detect delimiter: semicolon or comma
  const firstLine = csvText.trim().split('\n')[0] || '';
  const delimiter = firstLine.includes(';') ? ';' : (firstLine.includes('\t') ? '\t' : ',');

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(delimiter).map((cell) => cell.trim()));

  return { headers, rows };
}
