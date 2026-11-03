/**
 * Simulated document extraction.
 *
 * The PRD calls for an OCR / AI step so the demo can show document processing —
 * explicitly NOT legal proof of death. Everything here is deterministic and
 * labelled as simulated in the UI.
 */

export interface OcrResult {
  fields: { label: string; value: string; confidence: number }[];
  confidence: number;
  checks: { label: string; pass: boolean; detail: string }[];
  documentName: string;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function mockExtract(documentName: string, ownerName: string): OcrResult {
  const died = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
  const issued = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2);

  const fields = [
    { label: "Full name of deceased", value: ownerName, confidence: 0.97 },
    { label: "Date of death", value: fmtDate(died), confidence: 0.94 },
    { label: "Certificate number", value: "LAG/DR/2026/0091834", confidence: 0.91 },
    { label: "Issuing authority", value: "Lagos State — Vital Records", confidence: 0.89 },
    { label: "Date issued", value: fmtDate(issued), confidence: 0.93 },
  ];

  const confidence =
    Math.round((fields.reduce((s, f) => s + f.confidence, 0) / fields.length) * 1000) / 1000;

  const checks = [
    {
      label: "Name matches plan owner",
      pass: true,
      detail: `${ownerName} — exact match on record`,
    },
    {
      label: "Document integrity",
      pass: true,
      detail: "No tampering signals · checksum consistent",
    },
    {
      label: "Issuing authority recognised",
      pass: true,
      detail: "Lagos State Vital Records is on the verified registry",
    },
    {
      label: "Duplicate submission check",
      pass: true,
      detail: "No earlier claim on this plan",
    },
  ];

  return { fields, confidence, checks, documentName };
}
