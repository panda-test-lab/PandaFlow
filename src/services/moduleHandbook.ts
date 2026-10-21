import { ModuleHandbook } from '../types';
import { createSamplePdfDataUrl } from './pdfViewerHelper';

export const standardModuleHandbook: ModuleHandbook = {
  id: 'handbook-standard',
  title: 'Universitäts-Modulhandbuch',
  universityName: 'Universität / Hochschule',
  versionOrYear: 'Modulhandbuch Fassung 2026/27',
  description: 'Offizielles Modulhandbuch mit Modulbeschreibungen zu Vorlesungen, Seminaren und Praktika.',
  url: 'https://www.universitaet.de/studium/modulhandbuch.html',
  fileName: 'Modulhandbuch.pdf',
  fileSize: '2.8 MB',
  pdfData: createSamplePdfDataUrl('Universitaets-Modulhandbuch', 'Curriculum Grund- und Hauptstudium'),
  uploadedAt: new Date().toISOString(),
};

export const standardPharmacyHandbook = standardModuleHandbook;
