/**
 * Builds the two sample documents the demo ships with.
 *
 *   public/documents/ada-okafor-death-certificate.pdf   → should verify
 *   public/documents/gumroad-payout-receipt.pdf         → should be rejected
 *
 * Both are hand-written PDFs (uncompressed text streams) so the text layer is
 * real and the verification engine in lib/certs.ts has something honest to
 * read. They are synthetic documents for a prototype — not real records.
 *
 *   node scripts/make-sample-certificates.mjs
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "documents");

const esc = ($) => $.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

/** A line of text: absolute position, font, size, colour and content. */
function t(text, { x = 56, y = 0, size = 11, font = "F2", gray = 0 } = {}) {
  return `BT /${font} ${size} Tf ${gray} ${gray} ${gray} rg 1 0 0 1 ${x} ${y} Tm (${esc(text)}) Tj ET\n`;
}

function rule(y, { x = 56, w = 483, h = 1, gray = 0.8 } = {}) {
  return `${gray} ${gray} ${gray} rg ${x} ${y} ${w} ${h} re f\n`;
}

function box(x, y, w, h, gray = 0.85) {
  return `${gray} ${gray} ${gray} RG 0.8 w ${x} ${y} ${w} ${h} re S\n`;
}

function pdf({ content, info }) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`,
    `<< /Title (${esc(info.title)}) /Author (${esc(info.author)}) /Creator (${esc(info.creator)}) /Producer (${esc(info.producer)}) /CreationDate (D:${info.date}) >>`,
  ];

  let out = "%PDF-1.7\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/* ------------------------------------------------------- the certificate -- */

function deathCertificate() {
  let c = "";
  // letterhead
  c += "0.06 0.09 0.16 rg 0 782 595 60 re f\n";
  c += t("LAGOS STATE GOVERNMENT", { y: 812, size: 13, font: "F1", gray: 1 });
  c += t("Ministry of Health  ·  Directorate of Vital Records", { y: 796, size: 9, gray: 0.72 });
  c += box(40, 96, 515, 660, 0.82);

  c += t("CERTIFICATE OF DEATH", { x: 56, y: 726, size: 21, font: "F1" });
  c += t("Issued under the Births, Deaths and Marriages Registration Act", {
    x: 56,
    y: 706,
    size: 9,
    gray: 0.4,
  });
  c += rule(696, { gray: 0.75 });

  const rows = [
    ["Certificate No.", "LAG/DR/2026/0091834", "Registry District", "Ikeja District"],
    ["Full name of deceased", "ADA OKAFOR", "Sex", "Female"],
    ["Date of death", "03 November 2026", "Time of death", "22:10"],
    ["Place of death", "LUTH, Idi-Araba, Lagos", "Age at death", "29 years"],
    ["Cause of death", "Sudden cardiac arrest", "Nationality", "Nigerian"],
    ["Occupation", "Software developer", "Residence", "Yaba, Lagos"],
    ["Date issued", "04 November 2026", "Registrar", "Dr. B. Adeyemi"],
  ];

  let y = 664;
  for (const [l1, v1, l2, v2] of rows) {
    c += t(l1.toUpperCase(), { x: 60, y, size: 7.5, gray: 0.45 });
    c += t(v1, { x: 60, y: y - 15, size: 11.5, font: "F1" });
    c += t(l2.toUpperCase(), { x: 320, y, size: 7.5, gray: 0.45 });
    c += t(v2, { x: 320, y: y - 15, size: 11.5, font: "F1" });
    y -= 48;
  }

  c += rule(300, { gray: 0.85 });
  c += t(
    "I hereby certify that the particulars above were extracted from the register of deaths kept",
    { x: 56, y: 278, size: 9, gray: 0.3 },
  );
  c += t("in this district, and that the death was registered in accordance with the Act.", {
    x: 56,
    y: 265,
    size: 9,
    gray: 0.3,
  });

  // registrar signature block + seal
  c += "0.75 0.75 0.78 RG 1 w 56 220 m 240 220 l S\n";
  c += t("Dr. B. Adeyemi", { x: 56, y: 205, size: 10.5, font: "F1" });
  c += t("Registrar of Births and Deaths", { x: 56, y: 192, size: 9, gray: 0.4 });

  c += "0.55 0.45 0.2 RG 1.2 w 400 205 74 74 re S\n";
  c += "0.55 0.45 0.2 RG 0.8 w 412 217 50 50 re S\n";
  c += t("SEAL", { x: 425, y: 245, size: 9, font: "F1", gray: 0.42 });
  c += t("OFFICIAL", { x: 417, y: 232, size: 7, gray: 0.42 });
  c += t("LAGOS STATE", { x: 416, y: 222, size: 6.5, gray: 0.42 });

  c += rule(150, { gray: 0.85 });
  c += t("Certificate number LAG/DR/2026/0091834  ·  Verify at vitalrecords.lagosstate.gov.ng", {
    x: 56,
    y: 132,
    size: 8,
    gray: 0.45,
  });
  c += t("Any alteration renders this certificate invalid. Photocopies are not accepted.", {
    x: 56,
    y: 118,
    size: 8,
    font: "F3",
    gray: 0.45,
  });

  return pdf({
    content: c,
    info: {
      title: "Certificate of Death — Ada Okafor",
      author: "Lagos State Directorate of Vital Records",
      creator: "Vital Records Registration System v4.2",
      producer: "Lagos State Civil Registry Print Service",
      date: "20261104101500Z",
    },
  });
}

/* ------------------------------------------------------------- the decoy -- */

function payoutReceipt() {
  let c = "";
  c += "0.06 0.06 0.06 rg 0 792 595 50 re f\n";
  c += t("GUMROAD", { y: 812, size: 16, font: "F1", gray: 1 });
  c += t("Payout receipt", { x: 400, y: 812, size: 10, gray: 0.7 });

  c += t("PAYOUT RECEIPT", { x: 56, y: 736, size: 20, font: "F1" });
  c += t("Receipt no. GR-88213-2026", { x: 56, y: 714, size: 10, gray: 0.45 });
  c += rule(700, { gray: 0.8 });

  const rows = [
    ["Account holder", "Ada Okafor"],
    ["Store", "Ada's Studio"],
    ["Payout period", "01 Oct 2026 – 31 Oct 2026"],
    ["Amount", "$4,100.00"],
    ["Method", "Bank transfer · GTBank ****4412"],
    ["Status", "Paid"],
    ["Invoice reference", "INV-2026-10-991"],
  ];
  let y = 662;
  for (const [l, v] of rows) {
    c += t(l.toUpperCase(), { x: 56, y, size: 8, gray: 0.45 });
    c += t(v, { x: 230, y, size: 11.5, font: "F1" });
    c += rule(y - 8, { x: 56, w: 483, gray: 0.92 });
    y -= 34;
  }

  c += t("Total paid this period", { x: 56, y: 340, size: 10, gray: 0.45 });
  c += t("$4,100.00", { x: 400, y: 340, size: 16, font: "F1" });
  c += t(
    "This receipt confirms a creator payout. It is not a certificate of any kind and it says",
    { x: 56, y: 300, size: 9, gray: 0.3 },
  );
  c += t("nothing about a person's death or about any inheritance instruction.", {
    x: 56,
    y: 287,
    size: 9,
    gray: 0.3,
  });

  return pdf({
    content: c,
    info: {
      title: "Gumroad payout receipt GR-88213-2026",
      author: "Gumroad, Inc.",
      creator: "gumroad-web",
      producer: "Skia/PDF m120",
      date: "20261101143000Z",
    },
  });
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "ada-okafor-death-certificate.pdf"), deathCertificate());
fs.writeFileSync(path.join(OUT, "gumroad-payout-receipt.pdf"), payoutReceipt());
for (const f of fs.readdirSync(OUT)) {
  console.log(f, fs.statSync(path.join(OUT, f)).size, "bytes");
}
