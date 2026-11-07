/**
 * Renders the shareable Hack1 demo cards from hand-authored SVG.
 *
 *   node scripts/make-demo-image.mjs
 *
 * Output: docs/demo/hack1-card-1200x630.png  (OG / GitHub social preview / slide)
 *         docs/demo/hack1-card-1080x1080.png (square post)
 *
 * Uses the same palette and type as the app (Instrument Serif + Inter, taken
 * from the fonts Next already downloaded) so the card looks like the product.
 *
 * `scripts/brandfonts/*.ttf` are those fonts decompressed (resvg can't read
 * woff2). Both faces are SIL Open Font License, so shipping them here is fine.
 */
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const C = {
  ink: "#07070a",
  ink2: "#0b0b10",
  panel: "#101016",
  line: "#24242e",
  ivory: "#f3efe6",
  muted: "#948f87",
  brass: "#d9b070",
  brassDeep: "#a97f35",
  sage: "#8fbf9f",
  ember: "#e0815f",
};

const FONTS = {
  serif: "Instrument Serif",
  serifItalic: "Instrument Serif",
  sans: "Inter",
};

const textRich = (parts, { x, y, size, fill = C.ivory, font = FONTS.sans, weight = 400, ls = 0, anchor = "start" }) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" letter-spacing="${ls}" text-anchor="${anchor}">${parts
    .map((p) => `<tspan fill="${p.fill ?? fill}">${esc(p.t)}</tspan>`)
    .join("")}</text>`;

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const text = (s, { x, y, size, fill = C.ivory, font = FONTS.sans, weight = 400, ls = 0, anchor = "start", opacity = 1 }) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" letter-spacing="${ls}" text-anchor="${anchor}" opacity="${opacity}">${esc(s)}</text>`;

const asset = (label, value, x, y, w, dot) =>
  `<circle cx="${x + 4}" cy="${y - 4}" r="3.5" fill="${dot}"/>
   <text x="${x + 18}" y="${y}" font-family="${FONTS.sans}" font-size="13" fill="${C.muted}">${esc(label)}</text>
   <text x="${x + w}" y="${y}" text-anchor="end" font-family="${FONTS.sans}" font-size="13.5" fill="${C.ivory}">${esc(value)}</text>
   <line x1="${x + 18}" y1="${y + 15}" x2="${x + w}" y2="${y + 15}" stroke="${C.line}" stroke-width="1" opacity="0.55"/>`;

const pill = (label, x, y, h, state = "idle") => {
  const w = Math.round(label.length * 6.35) + 34 + (state === "done" ? 16 : 0);
  const stroke = state === "done" ? C.sage : C.line;
  const fill = state === "done" ? "rgba(143,191,159,0.10)" : "rgba(255,255,255,0.02)";
  const ink = state === "done" ? C.sage : C.muted;
  return {
    svg: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>
    ${state === "done" ? `<path d="M${x + 16} ${y + h / 2} l4 4.2 l7.5 -8.5" stroke="${C.sage}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    <text x="${x + (state === "done" ? 33 : 17)}" y="${y + h / 2 + 4}" font-family="${FONTS.sans}" font-size="12.5" fill="${ink}" letter-spacing="0.2">${esc(label)}</text>`,
    w,
  };
};

const arrow = (x, y, color = C.brassDeep) =>
  `<path d="M${x} ${y} h14 m-5 -4 l5 4 l-5 4" stroke="${color}" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>`;

/* ------------------------------------------------------------- landscape -- */

function landscape() {
  const W = 1200;
  const H = 630;
  const cx = 680; // card left
  const cw = 456;

  const flow = [];
  let fx = 64;
  const fy = 512;
  const items = [
    ["Real document checks", "done"],
    ["72-hour registry review", "idle"],
    ["14-day safety window", "idle"],
    ["Release, in plan order", "idle"],
  ];
  items.forEach(([label, state], i) => {
    const p = pill(label, fx, fy, 34, state);
    flow.push(p.svg);
    fx += p.w;
    if (i < items.length - 1) {
      flow.push(arrow(fx + 12, fy + 18));
      fx += 40;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="0.78" cy="-0.15" r="0.85">
      <stop offset="0%" stop-color="${C.brass}" stop-opacity="0.16"/>
      <stop offset="55%" stop-color="${C.brass}" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="${C.brass}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.08" cy="1.1" r="0.7">
      <stop offset="0%" stop-color="${C.brassDeep}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${C.brassDeep}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cardFill" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#13131a"/>
      <stop offset="100%" stop-color="#0d0d13"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.brassDeep}"/>
      <stop offset="100%" stop-color="${C.brass}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${C.ink}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#glow2)"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${C.line}" stroke-opacity="0.55"/>

  <!-- masthead -->
  <g transform="translate(64,58)">
    <rect x="0" y="0" width="13" height="13" rx="3" fill="${C.brass}" transform="rotate(45 6.5 6.5)"/>
    <text x="26" y="13" font-family="${FONTS.serif}" font-size="30" fill="${C.ivory}">Hack1</text>
  </g>
  ${text("DAWNIK LAB · TEAM 1", { x: W - 64, y: 71, size: 11.5, fill: C.muted, ls: 2.6, anchor: "end" })}
  <line x1="64" y1="104" x2="${W - 64}" y2="104" stroke="${C.line}" stroke-opacity="0.8"/>

  <!-- headline -->
  ${text("A PLAN FOR YOUR DIGITAL LIFE", { x: 64, y: 168, size: 12, fill: C.brass, ls: 3.1 })}
  ${text("Your money should", { x: 64, y: 240, size: 66, font: FONTS.serif })}
  ${text("know where to go.", { x: 64, y: 308, size: 66, font: FONTS.serif })}
  ${text("An inheritance plan for the accounts your family", { x: 64, y: 358, size: 17.5, fill: C.muted })}
  ${text("can't find — and a handover they can follow.", { x: 64, y: 384, size: 17.5, fill: C.muted })}

  ${text("The keyholder files a death certificate.", { x: 64, y: 440, size: 14, fill: "#c9c3b8" })}
  ${textRich([{ t: "We read it. Then " }, { t: "72 hours", fill: C.brass }, { t: " of registry review" }], { x: 64, y: 462, size: 14, fill: "#c9c3b8" })}
  ${text("before the owner is even told.", { x: 64, y: 484, size: 14, fill: "#c9c3b8" })}

  <!-- product card -->
  <g>
    <rect x="${cx}" y="140" width="${cw}" height="336" rx="20" fill="url(#cardFill)" stroke="${C.line}"/>
    <rect x="${cx}" y="140" width="${cw}" height="336" rx="20" fill="none" stroke="${C.brass}" stroke-opacity="0.12"/>

    ${text("ESTATE IN YOUR PLAN", { x: cx + 28, y: 180, size: 10.5, fill: C.muted, ls: 2.2 })}
    ${text("$26,330.70", { x: cx + 28, y: 226, size: 40, font: FONTS.serif, fill: C.ivory })}
    ${text("3 accounts · 4 recipients", { x: cx + cw - 28, y: 180, size: 11, fill: C.muted, anchor: "end" })}

    <line x1="${cx + 28}" y1="248" x2="${cx + cw - 28}" y2="248" stroke="${C.line}"/>

    ${asset("PayPal Business", "$8,420.50", cx + 28, 278, cw - 56, C.brass)}
    ${asset("Self-custody wallet", "$5,610.20", cx + 28, 320, cw - 56, C.sage)}
    ${asset("Ada's Studio storefront", "$12,300.00", cx + 28, 362, cw - 56, C.ember)}

    ${text("HOW IT DIVIDES", { x: cx + 28, y: 408, size: 10.5, fill: C.muted, ls: 2.2 })}
    <rect x="${cx + 28}" y="420" width="${cw - 56}" height="7" rx="3.5" fill="url(#bar)"/>
    ${text("Chidi Okafor · first choice · 100%", { x: cx + 28, y: 452, size: 12.5, fill: C.ivory })}

    <g opacity="0.9">
      <rect x="${cx + 28}" y="${448 - 0}" width="0" height="0"/>
    </g>
  </g>

  <!-- flow rail -->
  ${flow.join("\n  ")}

  <!-- footer -->
  <line x1="64" y1="572" x2="${W - 64}" y2="572" stroke="${C.line}" stroke-opacity="0.7"/>
  ${text("hack1-weld.vercel.app", { x: 64, y: 600, size: 13, fill: C.brass, ls: 0.4 })}
  ${text("Every balance, certificate and transfer is simulated.", { x: W - 64, y: 600, size: 11.5, fill: C.muted, anchor: "end" })}
</svg>`;
}

/* ---------------------------------------------------------------- square -- */

function square() {
  const W = 1080;
  const H = 1080;
  const cx = 96;
  const cw = W - 192;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="0.72" cy="0.02" r="0.8">
      <stop offset="0%" stop-color="${C.brass}" stop-opacity="0.17"/>
      <stop offset="60%" stop-color="${C.brass}" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="${C.brass}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cardFill" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#13131a"/>
      <stop offset="100%" stop-color="#0d0d13"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.brassDeep}"/>
      <stop offset="100%" stop-color="${C.brass}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${C.ink}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${C.line}" stroke-opacity="0.55"/>

  <g transform="translate(96,88)">
    <rect x="0" y="0" width="14" height="14" rx="3" fill="${C.brass}" transform="rotate(45 7 7)"/>
    <text x="28" y="14" font-family="${FONTS.serif}" font-size="34" fill="${C.ivory}">Hack1</text>
  </g>
  ${text("DAWNIK LAB · TEAM 1", { x: W - 96, y: 102, size: 12, fill: C.muted, ls: 2.6, anchor: "end" })}
  <line x1="96" y1="140" x2="${W - 96}" y2="140" stroke="${C.line}" stroke-opacity="0.8"/>

  ${text("A PLAN FOR YOUR DIGITAL LIFE", { x: 96, y: 214, size: 12.5, fill: C.brass, ls: 3.1 })}
  ${text("Your money should", { x: 96, y: 300, size: 78, font: FONTS.serif })}
  ${text("know where to go.", { x: 96, y: 380, size: 78, font: FONTS.serif })}
  ${text("An inheritance plan for the accounts your family can't find,", { x: 96, y: 436, size: 19, fill: C.muted })}
  ${text("and a handover they can actually follow.", { x: 96, y: 466, size: 19, fill: C.muted })}

  <rect x="${cx}" y="520" width="${cw}" height="352" rx="22" fill="url(#cardFill)" stroke="${C.line}"/>
  <rect x="${cx}" y="520" width="${cw}" height="352" rx="22" fill="none" stroke="${C.brass}" stroke-opacity="0.12"/>

  ${text("ESTATE IN YOUR PLAN", { x: cx + 32, y: 564, size: 11, fill: C.muted, ls: 2.2 })}
  ${text("$26,330.70", { x: cx + 32, y: 616, size: 52, font: FONTS.serif })}
  ${text("1. The keyholder files a death certificate", { x: cx + 32, y: 668, size: 14.5, fill: "#c9c3b8" })}
  ${text("2. It is read — format, text, name, registrar, dates", { x: cx + 32, y: 696, size: 14.5, fill: "#c9c3b8" })}
  ${textRich([{ t: "3. " }, { t: "72 hours", fill: C.brass }, { t: " of registry review — owner not yet told" }], { x: cx + 32, y: 724, size: 14.5, fill: "#c9c3b8" })}
  ${text("4. A 14-day safety window, then the release", { x: cx + 32, y: 752, size: 14.5, fill: "#c9c3b8" })}

  <line x1="${cx + 32}" y1="784" x2="${cx + cw - 32}" y2="784" stroke="${C.line}"/>
  ${text("HOW IT DIVIDES", { x: cx + 32, y: 812, size: 10.5, fill: C.muted, ls: 2.2 })}
  <rect x="${cx + 32}" y="824" width="${cw - 64}" height="8" rx="4" fill="url(#bar)"/>
  ${text("Chidi Okafor · first choice · 100% · $26,330.70", { x: cx + 32, y: 858, size: 13, fill: C.ivory })}

  <line x1="96" y1="960" x2="${W - 96}" y2="960" stroke="${C.line}" stroke-opacity="0.7"/>
  ${text("hack1-weld.vercel.app", { x: 96, y: 996, size: 15, fill: C.brass })}
  ${text("Every balance, certificate and transfer is simulated.", { x: W - 96, y: 996, size: 12.5, fill: C.muted, anchor: "end" })}
</svg>`;
}

/* ---------------------------------------------------------------- render -- */

const fonts = [
  "scripts/brandfonts/InstrumentSerif-Regular.ttf",
  "scripts/brandfonts/InstrumentSerif-Italic.ttf",
  "scripts/brandfonts/Inter.ttf",
].filter((f) => fs.existsSync(f));

if (fonts.length < 2) {
  console.error("Missing scripts/brandfonts/*.ttf — see the note at the top of this file.");
  process.exit(1);
}

const out = path.join(process.cwd(), "docs", "demo");
fs.mkdirSync(out, { recursive: true });

for (const [name, svg] of [
  ["hack1-card-1200x630", landscape()],
  ["hack1-card-1080x1080", square()],
]) {
  const png = new Resvg(svg, {
    font: { fontFiles: fonts, loadSystemFonts: true, defaultFontFamily: "Inter" },
    fitTo: { mode: "width", value: name.includes("1200") ? 2400 : 2160 }, // 2× for crisp slides
  })
    .render()
    .asPng();
  fs.writeFileSync(path.join(out, `${name}.png`), png);
  console.log(`${name}.png`, Math.round(png.length / 1024), "KB");
}
