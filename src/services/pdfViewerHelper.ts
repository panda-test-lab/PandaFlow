/**
 * Helper utility for reading PDF files as Base64 Data URLs
 */
export function readFileAsPdfDataUrl(file: File): Promise<{ dataUrl: string; sizeFormatted: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      reject(new Error('Es können ausschließlich PDF-Dateien (.pdf) ausgewählt werden.'));
      return;
    }

    const sizeInMB = file.size / (1024 * 1024);
    const sizeFormatted = sizeInMB >= 1 ? `${sizeInMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ dataUrl, sizeFormatted });
    };
    reader.onerror = () => {
      reject(new Error('Fehler beim Laden der PDF-Datei.'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Clean valid sample PDF Data URL for testing the integrated viewer
 */
export function createSamplePdfDataUrl(title: string, subtitle: string): string {
  // Minimal valid PDF string with content
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 190 >>
stream
BT
/F1 20 Tf
50 720 Td
(${title}) Tj
/F1 12 Tf
0 -30 Td
(${subtitle}) Tj
0 -25 Td
(Offizielles Dokument der Hochschule / Universitaet) Tj
0 -20 Td
(Integrierter PDF-Betrachter im PandaFlow Studien-Cockpit.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000236 00000 n 
0000000479 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
556
%%EOF`;

  const base64 = btoa(unescape(encodeURIComponent(pdfString)));
  return `data:application/pdf;base64,${base64}`;
}
