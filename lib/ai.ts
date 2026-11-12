import type { AssetKind } from "./types";

/**
 * The AI half of the app.
 *
 * A person describes their life in a sentence — "my flat is worth about 120k,
 * my daughter Chidi should get it, my son Tunde the savings" — and this turns
 * it into the structured plan the rest of the app already understands:
 * people, shares, assets, amounts.
 *
 * Three rules keep it honest:
 *   1. The model proposes; `lib/model.ts` still validates every write. A bad or
 *      invented answer can be rejected, never half-applied.
 *   2. Nothing about money moves here. Drafting a plan is not a release.
 *   3. If no model key is configured, a deterministic reader answers instead
 *      and says so — the demo never dies because an API was missing.
 */

export interface DraftPerson {
  name: string;
  relationship: string;
  share: number;
}

export interface DraftAsset {
  kind: AssetKind;
  label: string;
  provider: string;
  balanceCents: number;
}

export interface Draft {
  reading: string;
  people: DraftPerson[];
  assets: DraftAsset[];
  source: "model" | "rules";
  model: string | null;
}

const MODEL = {
  openai: () => (process.env.AI_MODEL ?? "gpt-4o-mini").trim(),
  anthropic: () => (process.env.AI_MODEL ?? "claude-3-5-haiku-latest").trim(),
  gemini: () => (process.env.AI_MODEL ?? "gemini-2.0-flash").trim(),
  /** Groq serves open models on an OpenAI-shaped API. Fast, and free at demo scale. */
  groq: () => (process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile").trim(),
};

export type AiProvider = keyof typeof MODEL;

export function aiProvider(): AiProvider | null {
  if ((process.env.GROQ_API_KEY ?? "").trim()) return "groq";
  if ((process.env.OPENAI_API_KEY ?? "").trim()) return "openai";
  if ((process.env.ANTHROPIC_API_KEY ?? "").trim()) return "anthropic";
  if ((process.env.GEMINI_API_KEY ?? "").trim()) return "gemini";
  return null;
}

export function aiConfigured(): boolean {
  return aiProvider() !== null;
}

/** The key for the provider that is configured, and the model string for it. */
export function aiKey(provider: AiProvider): string {
  return provider === "groq"
    ? (process.env.GROQ_API_KEY ?? "").trim()
    : provider === "openai"
      ? (process.env.OPENAI_API_KEY ?? "").trim()
      : provider === "anthropic"
        ? (process.env.ANTHROPIC_API_KEY ?? "").trim()
        : (process.env.GEMINI_API_KEY ?? "").trim();
}

export function aiModel(provider: AiProvider): string {
  return MODEL[provider]();
}

const SCHEMA = `{
  "reading": "one sentence, in the second person, saying what you understood",
  "people": [{ "name": "first name or full name", "relationship": "daughter", "share": 60 }],
  "assets": [{ "kind": "paypal|crypto|business", "label": "Savings", "provider": "Bank", "amountUsd": 12000 }]
}`;

const SYSTEM = `You read a person's plain-language description of what they own and who should get it, and you
return it as structured JSON for a will-preparation app. Reply with JSON only, no prose, matching exactly:
${SCHEMA}

Rules:
- shares are whole numbers and must total exactly 100 across the people you return.
- use only what the text says. Never invent a person, an amount or an account. If no share is stated, split evenly.
- kinds: "paypal" for money held in PayPal or a bank/currency balance, "crypto" for coins or wallets,
  "business" for a shop, storefront or company. If unsure, use "paypal".
- label is short and human ("Flat", "Savings", "Storefront"). provider is an institution if one is named, else "".
- amountUsd is a number in US dollars, no symbols. Omit the asset entirely if no value is stated.
- at most 8 people and 12 assets.`;

/* ------------------------------------------------------------------- model -- */

async function askOpenAI(key: string, text: string): Promise<string> {
  const base = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL.openai(),
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

async function askGroq(key: string, text: string): Promise<string> {
  const base = (process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1").trim().replace(/\/+$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL.groq(),
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 900,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

async function askAnthropic(key: string, text: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL.anthropic(),
      max_tokens: 900,
      system: SYSTEM,
      messages: [{ role: "user", content: text }],
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return data.content?.find((c) => c.type === "text")?.text ?? "";
}

async function askGemini(key: string, text: string): Promise<string> {
  const model = MODEL.gemini();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

/* ----------------------------------------------------------------- shaping -- */

function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

const KINDS: AssetKind[] = ["paypal", "crypto", "business"];

/** Whole-number shares that total 100, or none at all. */
function normaliseShares(people: DraftPerson[]): DraftPerson[] {
  if (!people.length) return [];
  const clean = people.slice(0, 8).map((p) => ({
    ...p,
    share: Math.max(0, Math.round(Number.isFinite(p.share) ? p.share : 0)),
  }));

  const total = clean.reduce((n, p) => n + p.share, 0);
  if (total === 100) return clean;
  if (total <= 0) {
    const even = Math.floor(100 / clean.length);
    clean.forEach((p, i) => {
      p.share = i === clean.length - 1 ? 100 - even * (clean.length - 1) : even;
    });
    return clean;
  }
  let running = 0;
  clean.forEach((p, i) => {
    if (i === clean.length - 1) {
      p.share = Math.max(0, 100 - running);
    } else {
      p.share = Math.round((p.share / total) * 100);
      running += p.share;
    }
  });
  return clean;
}

export function validateDraft(raw: unknown): { reading: string; people: DraftPerson[]; assets: DraftAsset[] } | null {
  return shape(raw);
}

function shape(raw: unknown): { reading: string; people: DraftPerson[]; assets: DraftAsset[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.people) && !Array.isArray(obj.assets)) return null;

  const people: DraftPerson[] = (Array.isArray(obj.people) ? obj.people : [])
    .map((p) => {
      const row = (p ?? {}) as Record<string, unknown>;
      return {
        name: typeof row.name === "string" ? row.name.trim().slice(0, 60) : "",
        relationship: typeof row.relationship === "string" ? row.relationship.trim().slice(0, 40) : "",
        share: Number(row.share),
      };
    })
    .filter((p) => p.name.length > 0);

  const assets: DraftAsset[] = (Array.isArray(obj.assets) ? obj.assets : [])
    .map((a) => {
      const row = (a ?? {}) as Record<string, unknown>;
      const kind = KINDS.includes(row.kind as AssetKind) ? (row.kind as AssetKind) : "paypal";
      const amount = Number(row.amountUsd);
      return {
        kind,
        label: typeof row.label === "string" ? row.label.trim().slice(0, 60) : "",
        provider: typeof row.provider === "string" ? row.provider.trim().slice(0, 60) : "",
        balanceCents: Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0,
      };
    })
    .filter((a) => a.label.length > 0)
    .slice(0, 12);

  return {
    reading: typeof obj.reading === "string" ? obj.reading.trim().slice(0, 240) : "",
    people: normaliseShares(people),
    assets,
  };
}

/* ------------------------------------------------------------------ rules -- */

const RELATIONSHIPS = [
  "daughter",
  "son",
  "wife",
  "husband",
  "partner",
  "mother",
  "father",
  "sister",
  "brother",
  "niece",
  "nephew",
  "granddaughter",
  "grandson",
  "friend",
  "cousin",
  "aunt",
  "uncle",
  "church",
  "charity",
  "foundation",
];

/** Reads money written either as "$12,000", "12000", "120k" or "1.2m". */
function readAmount(text: string): number {
  const match = text.match(/(?:\$|usd\s*)?\b(\d[\d,]*(?:\.\d+)?)\s*(k|m|thousand|million)?\b/i);
  if (!match) return 0;
  const base = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(base)) return 0;
  const suffix = (match[2] ?? "").toLowerCase();
  const scale = suffix === "k" || suffix === "thousand" ? 1_000 : suffix === "m" || suffix === "million" ? 1_000_000 : 1;
  return base * scale;
}

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * The no-key reader. Deliberately simple and predictable: find a relationship
 * word, take the capitalised name that follows it, then look for money nearby.
 * It is not a model and does not pretend to be.
 */
export function draftByRules(text: string): Draft {
  const clean = text.replace(/\s+/g, " ").trim();
  const people: DraftPerson[] = [];
  const seen = new Set<string>();

  const relationPattern = new RegExp(`\\bmy\\s+(${RELATIONSHIPS.join("|")})\\b[^.,;\\n]{0,40}`, "gi");
  for (const match of clean.matchAll(relationPattern)) {
    const relationship = match[1].toLowerCase();
    const tail = match[0].slice(match[0].toLowerCase().indexOf(relationship) + relationship.length);
    const nameMatch =
      tail.match(/^[,:]?\s*(?:called|named)?\s*([A-Z][a-z]{2,})/) ?? match[0].match(/\b([A-Z][a-z]{2,})\b/);
    const name = nameMatch ? nameMatch[1] : "";
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    people.push({ name: titleCase(name), relationship, share: 0 });
  }

  const assets: DraftAsset[] = [];
  const clauses = clean.split(/[.;\n]|\band\b/);

  for (const clause of clauses) {
    const money = clause.match(/(?:\$|usd\s*)?\b\d[\d,]*(?:\.\d+)?\s*(?:k|m|thousand|million)?\b/i);
    if (!money || money.index === undefined) continue;

    const amountText = money[0].trim();
    const amount = readAmount(amountText);
    if (!amount) continue;

    /* A bare number is not an asset. It needs a currency marker, a multiplier,
       or a word that says this is money — otherwise "I am 54" becomes an account. */
    const moneyish =
      /\$|\busd\b|\bk\b|\bm\b|thousand|million/i.test(amountText) ||
      /\b(worth|valued|value|costs?|balance|savings|account|holds?|holding|insurance|policy|flat|house|land|shop|wallet)\b/i.test(
        clause,
      );
    if (!moneyish) continue;

    const label = clause
      .slice(0, money.index)
      .toLowerCase()
      .replace(/\b(my|the|our|a|an|and|of|about|around|roughly|approximately|worth|is|are|was|were|valued|at|holds?|holding|has|have|with|plus|another|i|we)\b/g, " ")
      . replace(/[^a-z\s'-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (label.length < 3 || /^(am|is|are|was|were|it|they|you|he|she)$/.test(label)) continue;

    const low = label;
    const kind: AssetKind = /wallet|coin|btc|bitcoin|eth|crypto/.test(low)
      ? "crypto"
      : /shop|store|business|company|brand/.test(low)
        ? "business"
        : "paypal";

    if (assets.some((a) => a.label.toLowerCase() === label.toLowerCase())) continue;
    assets.push({ kind, label: titleCase(label), provider: "", balanceCents: Math.round(amount * 100) });
    if (assets.length >= 12) break;
  }

  return {
    reading: people.length
      ? `I read ${people.length} ${people.length === 1 ? "person" : "people"} and ${assets.length} ${assets.length === 1 ? "asset" : "assets"} in what you wrote.`
      : "",
    people: normaliseShares(people),
    assets,
    source: "rules",
    model: null,
  };
}

/* ------------------------------------------------------------------- entry -- */

/**
 * Draft a plan from a paragraph. When a model is configured its answer is used
 * and validated; when it is not, or it fails or returns nonsense, the
 * deterministic reader answers instead so the screen always does something.
 */
export async function draftPlan(text: string): Promise<Draft> {
  const provider = aiProvider();
  if (!provider) return draftByRules(text);

  try {
    const key = aiKey(provider);

    const raw =
      provider === "groq"
        ? await askGroq(key, text)
        : provider === "openai"
          ? await askOpenAI(key, text)
          : provider === "anthropic"
            ? await askAnthropic(key, text)
            : await askGemini(key, text);

    const shaped = shape(extractJson(raw));
    if (!shaped || (!shaped.people.length && !shaped.assets.length)) return draftByRules(text);

    return {
      ...shaped,
      reading: shaped.reading || `I read ${shaped.people.length} people and ${shaped.assets.length} assets.`,
      source: "model",
      model: `${provider}:${MODEL[provider]()}`,
    };
  } catch {
    return draftByRules(text);
  }
}
