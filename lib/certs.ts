import { createHash } from "node:crypto";

/**
 * Certificate verification engine.
 *
 * This is the honest part of the demo: it really reads the uploaded bytes. It
 * checks the file's structure, extracts the text layer, and scores what it
 * finds against what a death certificate has to contain — a title, a
 * decedent whose name matches the plan owner, a certificate number, an issuing
 * registrar, and dates that make sense.
 *
 * Three outcomes:
 *   verified      every automated check passed   → goes to the 72-hour registry review
 *   needs_review  soft signals only              → goes to human review (the 72 hours)
 *   rejected      a critical check failed        → the claim cannot be filed
 *
 * It never claims to establish legal proof of death. It answers one narrow
 * question: "does this document look like this person's death certificate?"
 */

export type CheckStatus = "pass" | "warn" | "fail";

export interface CertCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface CertField {
  label: string;
  value: string;
  confidence: number;
}

export type CertVerdict = "verified" | "needs_review" | "rejected";

export interface CertReport {
  verdict: CertVerdict;
  score: number;
  fileName: string;
  kind: "pdf" | "png" | "jpeg" | "unknown";
  mime: string;
  sizeBytes: number;
  sha256: string;
  pages: number | null;
  textChars: number;
  fields: CertField[];
  checks: CertCheck[];
  textPreview: string;
  summary: string;
  checkedAt: string;
}

export const MAX_BYTES = 4 * 1024 * 1024;

/* ------------------------------------------------------------- helpers -- */

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const upper = (s: string) => norm(s).toUpperCase();

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

/** Parses 03 November 2026 · 3 Nov 2026 · 2026-11-03 · 03/11/2026 (day first). */
export function parseDocDate(raw: string): Date | null {
  const s = norm(raw).replace(/(\d)(st|nd|rd|th)\b/gi, "$1").replace(/[,]/g, "");
  let m = s.match(/^(?<d>\d{1,2})\s+(?<mon>[A-Za-z]{3,9})\s+(?<y>\d{4})$/);
  if (m?.groups) {
    const mon = MONTHS[m.groups.mon.toLowerCase()];
    if (mon !== undefined) return new Date(Date.UTC(+m.groups.y, mon, +m.groups.d));
  }
  m = s.match(/^(?<mon>[A-Za-z]{3,9})\s+(?<d>\d{1,2}),?\s+(?<y>\d{4})$/);
  if (m?.groups) {
    const mon = MONTHS[m.groups.mon.toLowerCase()];
    if (mon !== undefined) return new Date(Date.UTC(+m.groups.y, mon, +m.groups.d));
  }
  m = s.match(/^(?<y>\d{4})-(?<mo>\d{2})-(?<d>\d{2})$/);
  if (m?.groups) return new Date(Date.UTC(+m.groups.y, +m.groups.mo - 1, +m.groups.d));
  m = s.match(/^(?<d>\d{1,2})[/.-](?<mo>\d{1,2})[/.-](?<y>\d{4})$/);
  if (m?.groups) return new Date(Date.UTC(+m.groups.y, +m.groups.mo - 1, +m.groups.d));
  const guess = new Date(s);
  return Number.isNaN(guess.getTime()) ? null : guess;
}

const days = (ms: number) => Math.round(ms / 86_400_000);

function looksLike(b: Uint8Array, sig: number[]): boolean {
  if (b.length < sig.length) return false;
  return sig.every((v, i) => b[i] === v);
}

/** Reads the pixel size out of PNG/JPEG headers — cheap proof it is a real image. */
function imageSize(b: Uint8Array, kind: "png" | "jpeg"): { w: number; h: number } | null {
  try {
    if (kind === "png" && b.length > 24) {
      const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
      return { w: view.getUint32(16), h: view.getUint32(20) };
    }
    if (kind === "jpeg") {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) {
          i += 1;
          continue;
        }
        const marker = b[i + 1];
        const len = (b[i + 2] << 8) | b[i + 3];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { w: (b[i + 7] << 8) | b[i + 8], h: (b[i + 5] << 8) | b[i + 6] };
        }
        i += 2 + len;
      }
    }
  } catch {
    /* header unreadable — treated as suspicious by the caller */
  }
  return null;
}

/* ---------------------------------------------------------------- text -- */

interface DocText {
  pages: number | null;
  text: string;
  producer: string;
}

async function readPdf(bytes: Uint8Array): Promise<DocText> {
  // Producer/creator strings are useful tamper signals and cheap to read.
  const raw = Buffer.from(bytes).toString("latin1");
  const producerMatch = raw.match(/\/Producer\s*\(([^)]{0,120})\)/);
  const creatorMatch = raw.match(/\/Creator\s*\(([^)]{0,120})\)/);
  const producer = [producerMatch?.[1], creatorMatch?.[1]].filter(Boolean).join(" · ");

  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    return { pages: totalPages, text: String(text ?? ""), producer };
  } catch {
    return { pages: null, text: "", producer };
  }
}

/**
 * The vocabulary that identifies a line as a field label rather than a value.
 * Kept deliberately broad — it only decides how the document is split up.
 */
const LABEL_WORDS =
  /\b(NAME|DECEASED|DECEDENT|DATE|CERTIFICATE|CERT|NUMBER|NO\.?|REGISTRAR|REGISTRY|DISTRICT|ISSUED|ISSUING|CAUSE|PLACE|SEX|GENDER|AGE|NATIONALITY|OCCUPATION|RESIDENCE|TIME|AUTHORITY|ENTRY|SERIAL|HOSPITAL|PHYSICIAN)\b/;

/** Turns "LABEL \n value" and "Label: value" into canonical fields. */
function pairsFromText(text: string): { label: string; value: string }[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => norm(l))
    .filter(Boolean);
  const out: { label: string; value: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inline = line.match(/^([A-Za-z][A-Za-z /.'-]{2,40})\s*:\s*(.+)$/);
    if (inline && !/^https?:/i.test(line)) {
      out.push({ label: inline[1], value: inline[2] });
      continue;
    }
    // A standalone label followed by its value (typical of a printed form).
    // Only recognised label vocabulary counts, otherwise a name printed in
    // capitals ("ADA OKAFOR") would be read as the label of the next line.
    const next = lines[i + 1];
    const isLabel =
      line.length <= 40 &&
      line === line.toUpperCase() &&
      LABEL_WORDS.test(line) &&
      Boolean(next) &&
      !LABEL_WORDS.test(next) === true;
    if (isLabel) {
      out.push({ label: line, value: next });
      i += 1;
    }
  }
  return out;
}

const LABELS = {
  name: [/deceased/i, /name of (the )?(deceased|decedent)/i, /full name/i, /name/i],
  deathDate: [/date of death/i, /date of demise/i, /died on/i],
  issuedDate: [/date issued/i, /date of issue/i, /issued on/i],
  certNumber: [/certificate (no|number)/i, /cert(ificate)? ?#/i, /entry (no|number)/i],
  registrar: [/registrar/i, /issued by/i, /issuing authority/i, /registry/i, /district/i],
  cause: [/cause of death/i],
};

function pick(pairs: { label: string; value: string }[], patterns: RegExp[]) {
  for (const p of patterns) {
    const hit = pairs.find((x) => p.test(x.label));
    if (hit?.value) return hit.value;
  }
  return null;
}

const TRAP_DOCUMENTS: { re: RegExp; what: string }[] = [
  { re: /\bPAYOUT RECEIPT\b|\bRECEIPT\b/, what: "a receipt" },
  { re: /\bINVOICE\b/, what: "an invoice" },
  { re: /\bBANK STATEMENT\b|\bSTATEMENT OF ACCOUNT\b/, what: "a bank statement" },
  { re: /\bPAYSLIP\b|\bPAY STUB\b/, what: "a payslip" },
  { re: /\bBOARDING PASS\b/, what: "a boarding pass" },
  { re: /\bPRESCRIPTION\b/, what: "a prescription" },
  { re: /\bBIRTH CERTIFICATE\b/, what: "a birth certificate" },
  { re: /\bMARRIAGE CERTIFICATE\b/, what: "a marriage certificate" },
  { re: /\bTAX RETURN\b/, what: "a tax return" },
  { re: /\bSPECIMEN\b|\bTEMPLATE\b|\bSAMPLE ONLY\b|\bVOID\b|\bDRAFT ONLY\b/, what: "a specimen or template" },
  { re: /\bCERTIFICATE OF INCORPORATION\b|\bSCHOOL CERTIFICATE\b|\bDEGREE CERTIFICATE\b/, what: "another kind of certificate" },
];

const REGISTRIES: { re: RegExp; name: string }[] = [
  { re: /LAGOS STATE/, name: "Lagos State Vital Records" },
  { re: /ENUGU STATE/, name: "Enugu State Civil Registry" },
  { re: /ABUJA|FCT/, name: "FCT Civil Registration" },
  { re: /VITAL RECORDS|CIVIL REGISTR|CIVIL REGISTRY/, name: "Civil registry (vital records)" },
  { re: /REGISTRAR OF BIRTHS AND DEATHS|REGISTRAR GENERAL/, name: "Registrar of Births and Deaths" },
  { re: /MINISTRY OF HEALTH/, name: "Ministry of Health" },
];

const EDITORS = /photoshop|canva|gimp|paint\.net|mspaint|microsoft word|publisher|illustrator|figma|scribus|inkscape|libreoffice/i;

/* ------------------------------------------------------------- engine -- */

export interface VerifyInput {
  bytes: Uint8Array;
  fileName: string;
  ownerName: string;
  /** sha-256 hashes already used on this plan — duplicates are rejected. */
  usedHashes?: string[];
}

export async function verifyCertificate(input: VerifyInput): Promise<CertReport> {
  const { bytes, fileName, ownerName } = input;
  const usedHashes = input.usedHashes ?? [];
  const checks: CertCheck[] = [];
  const fields: CertField[] = [];

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const sizeBytes = bytes.length;
  const add = (id: string, label: string, status: CheckStatus, detail: string) =>
    checks.push({ id, label, status, detail });

  /* 1 — what kind of file is this, really? */
  const isPdf = looksLike(bytes, [0x25, 0x50, 0x44, 0x46]); // %PDF
  const isPng = looksLike(bytes, [0x89, 0x50, 0x4e, 0x47]);
  const isJpeg = looksLike(bytes, [0xff, 0xd8, 0xff]);
  const kind: CertReport["kind"] = isPdf ? "pdf" : isPng ? "png" : isJpeg ? "jpeg" : "unknown";
  const mime =
    kind === "pdf"
      ? "application/pdf"
      : kind === "png"
        ? "image/png"
        : kind === "jpeg"
          ? "image/jpeg"
          : "application/octet-stream";

  if (kind === "unknown") {
    add("file.type", "File format", "fail", "Not a PDF, PNG or JPEG — the file signature doesn't match any accepted format.");
  } else {
    const extOk = new RegExp(`\\.${kind === "jpeg" ? "jpe?g" : kind}$`, "i").test(fileName);
    add(
      "file.type",
      "File format",
      extOk ? "pass" : "warn",
      `${kind.toUpperCase()} detected from the file signature${extOk ? " and the extension agrees" : `, but the name says “${fileName.split(".").pop()}”`}.`,
    );
  }

  if (sizeBytes === 0) add("file.size", "File size", "fail", "The file is empty.");
  else if (sizeBytes > MAX_BYTES)
    add("file.size", "File size", "fail", `${(sizeBytes / 1024 / 1024).toFixed(1)} MB — over the 4 MB limit.`);
  else if (sizeBytes < 1200)
    add("file.size", "File size", "fail", `${sizeBytes} bytes — too small to be a certificate.`);
  else add("file.size", "File size", "pass", `${(sizeBytes / 1024).toFixed(0)} KB`);

  /* 2 — read the document */
  let text = "";
  let pages: number | null = null;
  let producer = "";

  if (isPdf) {
    const head = Buffer.from(bytes.slice(0, 8)).toString("latin1");
    const tail = Buffer.from(bytes.slice(-2048)).toString("latin1");
    const complete = head.startsWith("%PDF-") && tail.includes("%%EOF");
    add(
      "pdf.structure",
      "PDF structure",
      complete ? "pass" : "fail",
      complete ? "Header and trailer intact — the file isn't truncated." : "Missing PDF header or end-of-file marker — the file looks truncated or malformed.",
    );

    const read = await readPdf(bytes);
    text = read.text;
    pages = read.pages;
    producer = read.producer;

    if (text.replace(/\s+/g, "").length < 80) {
      add(
        "doc.textLayer",
        "Machine-readable text",
        "warn",
        "This PDF has no text layer (a scan or a photo). It can only be read by a human reviewer during the 72-hour check.",
      );
    } else {
      add("doc.textLayer", "Machine-readable text", "pass", `${text.replace(/\s+/g, "").length} characters extracted from ${pages ?? 1} page${pages === 1 ? "" : "s"}.`);
    }
  } else if (kind === "png" || kind === "jpeg") {
    const dims = imageSize(bytes, kind);
    if (!dims) {
      add("img.integrity", "Image integrity", "fail", "The image header is unreadable — this file is corrupt or mislabelled.");
    } else {
      add(
        "img.integrity",
        "Image integrity",
        "pass",
        `${kind.toUpperCase()} header intact — a real image, ${(sizeBytes / 1024).toFixed(0)} KB.`,
      );
      add(
        "doc.textLayer",
        "Machine-readable text",
        "warn",
        `Photo/scan (${dims.w}×${dims.h}). It carries no text layer, so it goes to a human reviewer for the 72-hour check.`,
      );
    }
  }

  const T = upper(text);
  const pairs = pairsFromText(text);
  const flat = ` ${T.replace(/\s+/g, " ")} `;

  /* 3 — is it a death certificate at all? */
  if (kind === "unknown") {
    add("doc.class", "Document type", "fail", "Could not identify a document type.");
  } else if (kind === "png" || kind === "jpeg") {
    add(
      "doc.class",
      "Document type",
      "warn",
      "A photo or scan carries no text layer, so the document type can only be confirmed by a human reviewer.",
    );
  } else if (T.trim().length < 40) {
    add("doc.class", "Document type", "warn", "No readable text, so the document type can't be confirmed automatically.");
  } else {
    const trap = TRAP_DOCUMENTS.find((t) => t.re.test(T) && !/DEATH CERTIFICATE|CERTIFICATE OF DEATH/.test(T));
    const saysDeath =
      /DEATH CERTIFICATE|CERTIFICATE OF DEATH|CERTIFICATE OF DEATH REGISTRATION|DEATH REGISTRATION CERTIFICATE/.test(T);

    if (trap) {
      add("doc.class", "Document type", "fail", `This reads like ${trap.what}, not a death certificate.`);
    } else if (saysDeath) {
      add("doc.class", "Document type", "pass", "Titled as a certificate of death.");
    } else {
      add("doc.class", "Document type", "fail", "No death-certificate title found — this isn't a certificate of death.");
    }
  }

  /* 4 — the fields a certificate has to carry */
  const name = pick(pairs, LABELS.name) ?? "";
  const deathDateRaw = pick(pairs, LABELS.deathDate);
  const issuedDateRaw = pick(pairs, LABELS.issuedDate);
  const certNumber =
    pick(pairs, LABELS.certNumber) ??
    (T.match(/\b[A-Z]{2,6}\/[A-Z]{2,6}\/\d{4}\/\d{4,10}\b/)?.[0] ?? null);
  const registrar = pick(pairs, LABELS.registrar) ?? "";
  const cause = pick(pairs, LABELS.cause) ?? "";

  const present = [
    { ok: Boolean(name), what: "name of deceased" },
    { ok: Boolean(deathDateRaw), what: "date of death" },
    { ok: Boolean(certNumber), what: "certificate number" },
    { ok: Boolean(registrar), what: "issuing registrar" },
  ];
  const missing = present.filter((p) => !p.ok).map((p) => p.what);
  const noTextLayer = kind !== "pdf" || text.replace(/\s+/g, "").length < 80;
  add(
    "doc.fields",
    "Required fields",
    missing.length === 0 ? "pass" : noTextLayer ? "warn" : missing.length <= 1 ? "warn" : "fail",
    missing.length === 0
      ? "Name, date of death, certificate number and registrar are all present."
      : `Missing: ${missing.join(", ")}.`,
  );

  /* 5 — is it *this* person's certificate? */
  const ownerTokens = upper(ownerName)
    .split(" ")
    .filter((t) => t.length > 1);
  const subjectTokens = upper(name || text).split(/[^A-Z]+/).filter(Boolean);
  const matched = ownerTokens.filter((t) => subjectTokens.includes(t));
  const ratio = ownerTokens.length ? matched.length / ownerTokens.length : 0;

  const firstNameOnly = !name && ownerTokens.length > 0 && ownerTokens.every((t) => subjectTokens.includes(t));

  if (!name && !text) {
    add("name.match", "Name on the certificate", "warn", "No text to compare with the plan owner.");
  } else if (firstNameOnly) {
    add(
      "name.match",
      "Name on the certificate",
      "warn",
      `“${ownerName}” appears in this document, but nothing identifies them as the deceased.`,
    );
  } else if (ratio === 1) {
    add("name.match", "Name on the certificate", "pass", `${name || ownerName} matches the plan owner exactly.`);
  } else if (matched.length > 0 && ratio >= 0.5) {
    add("name.match", "Name on the certificate", "warn", `Partial match (${matched.join(", ")}) — a reviewer will confirm spelling.`);
  } else {
    add("name.match", "Name on the certificate", "fail", `The certificate names “${name || "someone else"}”, not ${ownerName}.`);
  }

  /* 6 — certificate number shape */
  if (!certNumber) {
    add("cert.number", "Certificate number", "warn", "No registry-style certificate number recognised.");
  } else if (/^[A-Z]{2,6}\/[A-Z]{2,6}\/\d{4}\/\d{4,}$|^[A-Z0-9]{2,6}[-/][A-Z0-9-]{4,}$/i.test(certNumber.trim())) {
    add("cert.number", "Certificate number", "pass", `${certNumber.trim()} — matches the registry format.`);
  } else {
    add("cert.number", "Certificate number", "warn", `“${certNumber.trim()}” doesn't follow a known registry format.`);
  }

  /* 7 — dates */
  const deathDate = deathDateRaw ? parseDocDate(deathDateRaw) : null;
  const issuedDate = issuedDateRaw ? parseDocDate(issuedDateRaw) : null;
  const now = Date.now();

  if (!deathDateRaw) {
    add("date.logic", "Date of death", "warn", "No date of death found on the document.");
  } else if (!deathDate) {
    add("date.logic", "Date of death", "warn", `Couldn't parse “${deathDateRaw}”.`);
  } else {
    const age = days(now - deathDate.getTime());
    if (age < -1) {
      add("date.logic", "Date of death", "fail", `The date of death (${deathDateRaw}) is in the future.`);
    } else if (age > 730) {
      add("date.logic", "Date of death", "warn", `Recorded ${Math.round(age / 365)} years ago — a reviewer will check the claim is still current.`);
    } else if (issuedDate && issuedDate < deathDate) {
      add("date.logic", "Date of death", "warn", `Issued (${issuedDateRaw}) before the death was registered — dates don't line up.`);
    } else {
      add("date.logic", "Date of death", "pass", `${deathDateRaw} · ${age} day${age === 1 ? "" : "s"} ago${issuedDate ? ` · issued ${issuedDateRaw}` : ""}.`);
    }
  }

  /* 8 — do we know the issuing authority? */
  if (!text) {
    add("issuer.registry", "Issuing authority", "warn", "No text to check against the registry list.");
  } else {
    const hit = REGISTRIES.find((r) => r.re.test(T));
    add(
      "issuer.registry",
      "Issuing authority",
      hit ? "pass" : "warn",
      hit
        ? `${hit.name} — on the recognised registry list.`
        : "Issuing authority isn't on the recognised list; a reviewer will verify it directly.",
    );
  }

  /* 9 — tamper signals */
  if (kind === "pdf") {
    if (EDITORS.test(producer)) {
      add("meta.tamper", "Tamper signals", "warn", `Produced with “${producer}” — a design tool rather than a registry printer.`);
    } else if (producer) {
      add("meta.tamper", "Tamper signals", "pass", `Producer: ${producer}.`);
    } else {
      add("meta.tamper", "Tamper signals", "warn", "No producer metadata — the document's origin can't be confirmed.");
    }
  }

  /* 10 — duplicate submission */
  if (usedHashes.includes(sha256)) {
    add("duplicate.hash", "Duplicate check", "fail", "This exact file has already been submitted on this plan.");
  } else {
    add("duplicate.hash", "Duplicate check", "pass", `SHA-256 ${sha256.slice(0, 16)}… not seen before on this plan.`);
  }

  /* ------------------------------------------------------------ verdict */
  if (name) fields.push({ label: "Full name of deceased", value: name, confidence: ratio === 1 ? 0.99 : 0.8 });
  if (deathDateRaw) fields.push({ label: "Date of death", value: deathDateRaw, confidence: 0.94 });
  if (certNumber) fields.push({ label: "Certificate number", value: certNumber.trim(), confidence: 0.92 });
  if (registrar) fields.push({ label: "Issuing registrar", value: registrar, confidence: 0.88 });
  if (issuedDateRaw) fields.push({ label: "Date issued", value: issuedDateRaw, confidence: 0.9 });
  if (cause) fields.push({ label: "Cause of death", value: cause, confidence: 0.83 });

  const fails = checks.filter((c) => c.status === "fail");
  const warns = checks.filter((c) => c.status === "warn");
  const verdict: CertVerdict = fails.length ? "rejected" : warns.length ? "needs_review" : "verified";

  const score = Math.max(
    0,
    Math.min(100, 100 - fails.length * 34 - warns.length * 9 - (missing.length ? missing.length * 4 : 0)),
  );

  const summary =
    verdict === "rejected"
      ? `Rejected: ${fails[0].detail}`
      : verdict === "needs_review"
        ? `Needs review: ${warns[0].detail}`
        : "Automated checks passed — every field lines up with this plan.";

  return {
    verdict,
    score,
    fileName,
    kind,
    mime,
    sizeBytes,
    sha256,
    pages,
    textChars: text.replace(/\s+/g, "").length,
    fields,
    checks,
    textPreview: text.replace(/\s+\n/g, "\n").trim().slice(0, 700),
    summary,
    checkedAt: new Date().toISOString(),
  };
}

/** The subset stored on a claim — everything the UI needs, nothing bulky. */
export type StoredReport = Omit<CertReport, "textPreview"> & { textPreview?: string };

/**
 * Health probe for the API: can this runtime actually load the PDF reader?
 * Cheap way to catch a bundling problem on a serverless platform before a
 * keyholder discovers it with a certificate in hand.
 */
export async function verifierStatus(): Promise<{
  ok: boolean;
  pdfTextLayer: boolean;
  maxBytes: number;
  checks: number;
}> {
  let pdfTextLayer = false;
  try {
    const { extractText } = await import("unpdf");
    pdfTextLayer = typeof extractText === "function";
  } catch {
    pdfTextLayer = false;
  }
  return { ok: pdfTextLayer, pdfTextLayer, maxBytes: MAX_BYTES, checks: 12 };
}
