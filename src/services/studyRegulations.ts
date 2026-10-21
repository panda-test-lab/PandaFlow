import { StudyRegulations } from '../types';
import { createSamplePdfDataUrl } from './pdfViewerHelper';

export const standardStudyRegulations: StudyRegulations = {
  id: 'spo-standard',
  title: 'Studien- und Prüfungsordnung (SPO)',
  universityName: 'Universität / Hochschule',
  versionOrYear: 'PO Fassung 2026/27',
  description: 'Offizielle Studien- und Prüfungsordnung mit Regelstudienzeit, Modulvoraussetzungen und Prüfungsabschnitten.',
  url: 'https://www.universitaet.de/studium/spo.html',
  fileName: 'Studienordnung_SPO.pdf',
  fileSize: '1.2 MB',
  pdfData: createSamplePdfDataUrl('Studien- und Pruefungsordnung (SPO)', 'Allgemeine Pruefungsbestimmungen'),
  uploadedAt: new Date().toISOString(),
};

export const standardPharmacyRegulations = standardStudyRegulations;
