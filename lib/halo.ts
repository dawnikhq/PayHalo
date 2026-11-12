import { aiProvider, groqAttemptOrder, groqChat, nextGroqModel } from "./ai";
import { PAYHALO_KNOWLEDGE } from "./halo-knowledge";
import { allocate } from "./engine";
import type { Snapshot } from "./types";

/**
 * Halo.
 *
 * She is PayHalo's own assistant: support for the person holding the plan, a
 * second pair of eyes for the operator checking a death certificate, and a
 * plain-English voice for the parts that confuse everyone — keys, vault locks,
 * the fourteen-day window and release.
 *
 * Three rules, all load-bearing:
 *
 *   1. Halo reads facts, she does not invent them. Answers are assembled from
 *      the person's own state and from how the product actually works. When she
 *      has no fact, she says so and points at the page that does.
 *   2. Halo never acts. No approving a release, opening a vault, moving money or
 *      changing a beneficiary. She explains; for an operator she advises. The
 *      decision stays human and the signature still carries no amount.
 *   3. A model may phrase the answer, but the facts come from here. If Groq is
 *      unreachable the deterministic engine answers instead, so the demo never
 *      depends on an API being up.
 */

export type HaloAudience = "owner" | "keyholder" | "beneficiary" | "operator";

export interface HaloFacts {
  audience: HaloAudience;
  name: string;
  /** The arrangement on screen — its name is its purpose ("Family", "The studio"). */
  planName: string | null;
  planStatus: string;
  sealedAt: string | null;
  planConfirmed: boolean;
  steps: { label: string; done: boolean }[];
  nextStep: string | null;
  assets: number;
  assetLines: { label: string; provider: string; kind: string; valueCents: number }[];
  totalCents: number;
  people: { name: string; role: string; share: number; amountCents: number }[];
  trustedKey: { name: string; relationship: string } | null;
  vault: { ref: string; status: string; keySent: boolean } | null;
  claim: { status: string; daysLeft: number | null } | null;
  distributions: number;
  openRequests: number;
}

export interface HaloAnswer {
  text: string;
  source: "model" | "engine";
  /** Which Groq model phrased the answer, when a model did. */
  model?: string;
  topic: string;
  suggestions: string[];
}

const ROLE_WORD: Record<string, string> = {
  primary: "primary beneficiary",
  backup: "backup beneficiary",
  charity: "final beneficiary",
};

export function factsFromSnapshot(s: Snapshot, audience: HaloAudience = "owner"): HaloFacts {
  const next = s.steps.find((step) => !step.done);
  const seconds = s.secondsToWindowEnd;
  return {
    audience,
    name: s.user.name.split(" ")[0] || "there",
    planName: s.plan.name?.trim() || null,
    planStatus: s.plan.status,
    sealedAt: s.plan.sealedAt,
    planConfirmed: Boolean(s.plan.sealedAt),
    steps: s.steps.map((step) => ({ label: step.label, done: step.done })),
    nextStep: next?.label ?? null,
    assets: s.assets.length,
    assetLines: s.assets.map((a) => ({
      label: a.label,
      provider: a.provider,
      kind: a.kind,
      valueCents: a.balanceCents,
    })),
    totalCents: s.totalCents,
    people: (() => {
      const money = allocate(s.beneficiaries, s.totalCents);
      return s.beneficiaries.map((b) => {
        const row = money.find((m) => m.beneficiaryId === b.id);
        return {
          name: b.name,
          role: ROLE_WORD[b.role] ?? b.role,
          share: row?.share ?? b.share,
          amountCents: row?.amountCents ?? 0,
        };
      });
    })(),
    trustedKey: s.keyholder ? { name: s.keyholder.name, relationship: s.keyholder.relationship } : null,
    vault: s.vault ? { ref: s.vault.ref, status: s.vault.status, keySent: Boolean(s.vault.keySentAt) } : null,
    claim: s.claim
      ? {
          status: s.claim.status,
          daysLeft: typeof seconds === "number" && seconds > 0 ? Math.ceil(seconds / 86400) : null,
        }
      : null,
    distributions: s.distributions.length,
    openRequests: s.releaseRequests.filter((r) => r.status !== "approved").length,
  };
}

/* ------------------------------------------------------------------ engine -- */

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Rule = { topic: string; keys: RegExp; answer: (f: HaloFacts) => string };

const RULES: Rule[] = [
  {
    topic: "next",
    keys: /what (do|should) i do|next step|where do i start|get started|start\b|finish|complete|remaining/i,
    answer: (f) => {
      const done = f.steps.filter((s) => s.done).length;
      const open = f.steps.filter((s) => !s.done).map((s) => s.label);
      if (!open.length)
        return `Everything is recorded, ${f.name} — all ${f.steps.length} steps. Confirming the arrangement is the last move, and it does not lock anything: you can still change what you own, who inherits and who holds your Trusted Key.`;
      return `${done} of ${f.steps.length} steps are recorded, ${f.name}. Still open: ${open.join(", ")}. The next one is ${open[0]}.`;
    },
  },
  {
    topic: "vault",
    keys: /vault|lock|locked|freeze|frozen|paused|released|the money|hold/i,
    answer: (f) => {
      if (!f.vault)
        return "There is no vault yet. A vault opens only after the arrangement is confirmed, and it has exactly one door. Until then there is nothing to release — and nothing to lose.";
      const state: Record<string, string> = {
        open: `Vault ${f.vault.ref} is open and locked to you alone. Nothing leaves it while you are here.`,
        frozen: `Vault ${f.vault.ref} is paused: payments are held and nothing moves out until it is unfrozen.`,
        released: `Vault ${f.vault.ref} has been released to your beneficiaries, after the full process and the window closing with no response.`,
      };
      return (
        state[f.vault.status] ??
        `Vault ${f.vault.ref} is ${f.vault.status}. Nothing moves without a verified handover request.`
      );
    },
  },
  {
    topic: "key",
    keys: /trusted key|keyholder|\bkey\b|who starts|access code|appoint|alternate/i,
    answer: (f) => {
      if (!f.trustedKey)
        return "No Trusted Key is appointed yet. That is the person who can start a handover request — and nothing else. They never see balances, shares or anyone's details, and they cannot change your instructions. You name them in your arrangements.";
      return `Your Trusted Key is ${f.trustedKey.name} (${f.trustedKey.relationship}). They hold an access code that can start a handover request. That code is not a password: it opens no door by itself, shows no balances and cannot touch your assets.${
        f.vault?.keySent ? " Your vault key has already gone to your first beneficiary." : ""
      }`;
    },
  },
  {
    topic: "death",
    keys: /death|died|passed away|certificate|document|evidence|proof|verif|burial|obituary/i,
    answer: (f) => {
      if (f.audience === "operator")
        return "On this desk, Halo's read sits beside each request: whether a certificate is attached, what kind of document it is, the automated confidence, whether the 72-hour registry check has cleared, and whether the owner has actually been notified. It is advice. You decide, and your decision is what unlocks a vault.";
      if (f.audience === "keyholder")
        return "You file the handover request with the death documentation through the link you were given. The document is read, then a 72-hour registry check runs before the owner is told. Nothing is released in that time — and nothing is released by you at all. Only PayHalo's release desk can approve, and only after the 14-day window.";
      return "If someone starts a handover request they must submit death documentation. It is read, held for a 72-hour registry check, and only then are you notified. Nothing is released before that, and nothing before 14 full days from your notice. You can stop the whole thing during the window.";
    },
  },
  {
    topic: "window",
    keys: /14|fourteen|window|cancel|stop|dispute|mistake|still alive|respond/i,
    answer: (f) => {
      if (f.claim?.status === "window" && typeof f.claim.daysLeft === "number")
        return `A handover request is inside your safety window right now — about ${plural(f.claim.daysLeft, "day", "days")} left. Open your plan and cancel it if it is wrong: cancelling costs nothing and stops the release permanently. A new request would have to start from the beginning.`;
      if (f.claim?.status === "review")
        return "A handover request is inside its 72-hour registry check, which is why you have not been told. If it clears, you are notified and the 14-day window starts. It appears on your dashboard the moment it does.";
      return "The window is 14 full days from the notice you receive once a request is verified. Nothing can be released before it ends. If you are alive and well, cancel it from your plan and the release stops.";
    },
  },
  {
    topic: "people",
    keys: /beneficiary|beneficiaries|inherit|who gets|shares?\b|split|backup|charity/i,
    answer: (f) => {
      if (!f.people.length)
        return "No beneficiaries are named yet. You decide who inherits, in what shares, and who steps in if they cannot. A backup beneficiary and a final beneficiary are what stop a plan from having a dead end.";
      const lines = f.people.map((p) => `${p.name} — ${p.role}, ${p.share}%`).join("; ");
      return `${plural(f.people.length, "person is", "people are")} named: ${lines}. Shares must add to 100% before the arrangement can be confirmed.`;
    },
  },
  {
    topic: "assets",
    keys: /asset|what i own|account|wallet|paypal|business|balance|worth|total/i,
    answer: (f) =>
      f.assets
        ? `${plural(f.assets, "asset is", "assets are")} recorded, totalling about ${money(f.totalCents)}. These are the figures you enter, not live balances — PayHalo never reads an account or moves money. A rough number is fine; the point is that your family knows what exists and where.`
        : "No assets are recorded yet. Start with the things nobody would find on their own: a payment account, a wallet, an online business. A rough figure is plenty.",
  },
  {
    topic: "security",
    keys: /password|private key|seed|recovery phrase|secure|safe|hack|encrypt/i,
    answer: () =>
      "Your sign-in is a password you choose plus a six-digit code by email. A record should hold the account, where it lives and who should receive it — not the password, private key or recovery phrase that opens it. A Trusted Key holds an access code that can only start a request.",
  },
  {
    topic: "legal",
    keys: /will|lawyer|legal|probate|estate|solicitor/i,
    answer: () =>
      "PayHalo is not a will and does not replace one. It records what you own, who should inherit, and who can start the process — so your family has a starting point instead of a puzzle. Where the law requires a will or probate, that still applies.",
  },
  {
    topic: "plans",
    keys: /another plan|second plan|several plans|multiple plans|my arrangements|different plan|purpose|separate plan/i,
    answer: (f) =>
      `One account can hold several arrangements — family, a business, a property — and each one is complete on its own: its own asset records, people, Trusted Key and vault. Nothing is copied between them. You are in ${f.planName ? `"${f.planName}"` : "one of them"} now; the My arrangements page lists the rest, and switching plans changes the record you are editing rather than filtering a view.`,
  },
  {
    topic: "move",
    keys: /move (an )?asset|transfer (an )?asset|into (another|the) plan|belongs to another plan/i,
    answer: () =>
      "Open the asset record and use Move to another plan. The record leaves one plan and joins the other with its label, provider and figure intact, and both plans get a dated line in their trail. If the plan you move it into is sealed and has a vault, the asset belongs to that vault and to that plan's people — one vault per plan.",
  },
  {
    topic: "editing",
    keys: /remove (a )?beneficiar|delete (a )?beneficiar|change (my )?beneficiar|edit.*(plan|beneficiar|share)|start (over|again|from scratch)/i,
    answer: (f) =>
      `Nothing here means starting again. On the Beneficiaries page you can add someone, edit anyone, change a backup's share or remove a person — including the first choice — and the plan keeps everything else. ${
        f.people.length ? `Right now ${plural(f.people.length, "person is", "people are")} named, and the shares are measured against ${money(f.totalCents)} recorded in this plan.` : "No one is named yet."
      } A sealed plan is not frozen: edits are allowed and each one is dated on your trail.`,
  },
  {
    topic: "me",
    keys: /who are you|your name|halo|are you (a )?(bot|human|real)|what can you do/i,
    answer: () =>
      "I'm Halo, PayHalo's assistant. I can explain what your plan needs next, what a Trusted Key can and cannot do, what state your vault is in, what the 14-day window means, and what happens when a death certificate is submitted. I read your own plan to answer — and I cannot approve a release, open a vault or change anything. That is deliberate.",
  },
];

const SUGGESTIONS = [
  "What should I do next?",
  "What can my Trusted Key do?",
  "What happens when someone dies?",
  "Why is there a 14-day window?",
  "What state is my vault in?",
];

export function haloOpening(f: HaloFacts): HaloAnswer {
  const lead = f.nextStep
    ? `The next thing on your plan is ${f.nextStep.toLowerCase()}.`
    : f.planConfirmed
      ? "Your arrangements are confirmed — everything is recorded."
      : "Every step is recorded. Confirming the arrangement is all that is left.";
  return {
    text: `Hello ${f.name}. I'm Halo. ${lead} Ask me anything about your keys, your vault or what happens later — I read your plan, not a script.`,
    source: "engine",
    topic: "opening",
    suggestions: SUGGESTIONS,
  };
}

function score(rule: Rule, question: string) {
  const match = question.match(rule.keys);
  return match ? match[0].length : 0;
}

export function answerWithoutModel(question: string, f: HaloFacts): HaloAnswer {
  const ranked = RULES.map((rule) => ({ rule, score: score(rule, question) })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score === 0) {
    return {
      text: `I don't have a fact for that one, ${f.name}, and I'd rather say so than guess. I can explain your next step, your Trusted Key, your vault and its lock, what death documentation triggers, the 14-day window, or who inherits what. For anything about your account itself, the Help page has the full answers.`,
      source: "engine",
      topic: "unknown",
      suggestions: SUGGESTIONS,
    };
  }
  return { text: best.rule.answer(f), source: "engine", topic: best.rule.topic, suggestions: SUGGESTIONS };
}

/* ------------------------------------------------------------------- model -- */

export const HALO_SYSTEM = `You are Halo, the assistant inside PayHalo, a digital inheritance product. You are speaking to a person using the product right now: an owner, a Trusted Key, a beneficiary, or PayHalo's own operator.

You know the whole product. The PRODUCT section below is your source of truth about how PayHalo works; the FACTS block is your only source of truth about this person's own plan. Read both before answering, and answer the question that was asked rather than the nearest one you recognise.

How to speak:
- Warm, plain, unhurried. Address the person by first name only if their name is in the facts.
- Answer in 2 to 5 short sentences. No bullet lists unless you are listing three or more concrete things.
- Use PayHalo's own words: arrangements, asset records, beneficiaries (primary, backup, final), Trusted Key, handover request, safety window, vault, release desk. Never "keyholder" and never "claim".
- If the question is about a page or a button, say which page it is on.
- If the answer depends on something you cannot see, say what you would need and where they can find it.

What you must never do:
- Never invent a fact about PayHalo or about this person. If the PRODUCT section does not cover it, say you do not have it and point to the Help page.
- Never approve, promise or predict a release. The release desk is human.
- Never ask for a password, private key, recovery phrase or access code.
- Never state or imply that money moves automatically, or that PayHalo holds anyone's passwords.
- Never tell someone to start their plan again; every part of a plan can be edited in place.
- Never name the model, provider or system behind you, and never describe yourself as an AI model. If asked what you are, you are Halo, PayHalo's assistant. Small talk about that gets one short sentence and then back to their question.

${PAYHALO_KNOWLEDGE}`;

function factsBlock(f: HaloFacts) {
  return `FACTS (the person you are speaking to):\n${JSON.stringify(f, null, 1)}`;
}

/**
 * Ask Groq, starting from whichever model's turn it is.
 *
 * Halo alternates between the pool — Qwen's longer reasoning on one turn, GPT-OSS's
 * tighter answers on the next — and if the chosen model is missing, retired or
 * rate-limited she simply tries the next one. The caller gets the model name for
 * the logs — it is never shown in the interface, because the person is talking
 * to Halo, not to an infrastructure choice.
 */
async function askGroq(question: string, f: HaloFacts): Promise<{ text: string; model: string }> {
  const provider = aiProvider();
  if (provider !== "groq") throw new Error("no groq");

  const { turn } = nextGroqModel();
  let lastError = "";

  for (const model of groqAttemptOrder(turn)) {
    try {
      const answer = await groqChat({
        model,
        messages: [
          { role: "system", content: `${HALO_SYSTEM}\n\n${factsBlock(f)}` },
          { role: "user", content: question },
        ],
        temperature: 0.3,
        maxTokens: 600,
      });
      return answer;
    } catch (e) {
      lastError = e instanceof Error ? e.message : `${model} failed`;
    }
  }

  throw new Error(lastError || "groq unavailable");
}

/**
 * Answer a question. Groq phrases it when the key is present and reachable; the
 * deterministic engine answers otherwise, and also supplies the topic and the
 * follow-up suggestions either way.
 */
export async function haloReply(question: string, f: HaloFacts): Promise<HaloAnswer> {
  const engine = answerWithoutModel(question, f);
  if (aiProvider() !== "groq") return engine;

  try {
    const { text, model } = await askGroq(question, f);
    return { ...engine, text, source: "model", model };
  } catch {
    return engine;
  }
}

/* ------------------------------------------------------- the operator's read -- */

export interface EvidenceCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export interface HaloReview {
  verdict: string;
  tone: "clear" | "hold" | "stop";
  line: string;
  checks: EvidenceCheck[];
}

const DOC_KINDS = new Set(["pdf", "png", "jpeg", "jpg"]);

/**
 * Halo's read on one release request.
 *
 * She is asked a narrow, checkable question — is the evidence complete and is it
 * too early to decide? — and answers it in checks, so an operator can see what
 * she saw. She never approves; the strongest thing she can say is "no objection".
 */
export function reviewRelease(input: {
  requestRef: string;
  status: string;
  createdAt: string;
  requesterName: string;
  requesterEmail: string;
  note: string;
  valueCents: number;
  beneficiaries: { name: string; email: string; share: number }[];
  vault: { ref: string; status: string } | null;
  evidence: {
    documentName: string;
    kind: string;
    confidence: number;
    verifiedAt: string | null;
    reviewEndsAt: string | null;
    ownerNotified: boolean;
    windowClosed: boolean;
  } | null;
}): HaloReview {
  const checks: EvidenceCheck[] = [];
  const e = input.evidence;

  checks.push({
    label: "Death documentation attached",
    ok: Boolean(e?.documentName),
    detail: e?.documentName ? `${e.documentName} (${e.kind.toUpperCase()})` : "Nothing on file for this request.",
  });

  checks.push({
    label: "Usable document type",
    ok: Boolean(e && DOC_KINDS.has(e.kind.toLowerCase())),
    detail: e ? `${e.kind.toUpperCase()} — a scan or photo is expected.` : "No document to type-check.",
  });

  checks.push({
    label: "Automated reading",
    ok: Boolean(e && e.confidence >= 0.6),
    detail: e ? `${Math.round(e.confidence * 100)}% confidence that this is a death certificate.` : "No reading yet.",
  });

  checks.push({
    label: "72-hour registry check cleared",
    ok: Boolean(e?.verifiedAt),
    detail: e?.verifiedAt
      ? `Cleared ${e.verifiedAt.slice(0, 10)}.`
      : e?.reviewEndsAt
        ? `Runs until ${e.reviewEndsAt.slice(0, 10)}.`
        : "Not started.",
  });

  checks.push({
    label: "Account holder notified",
    ok: Boolean(e?.ownerNotified),
    detail: e?.ownerNotified ? "Notice issued; the safety window has started." : "The owner has not been told yet.",
  });

  checks.push({
    label: "14-day safety window served",
    ok: Boolean(e?.windowClosed),
    detail: e?.windowClosed ? "Window closed with no cancellation." : "Still inside the window — nothing may move.",
  });

  checks.push({
    label: "Beneficiaries on the plan",
    ok: input.beneficiaries.length > 0,
    detail: input.beneficiaries.length
      ? `${input.beneficiaries.map((b) => `${b.name} (${b.share}%)`).join(", ")}`
      : "No one is named — approval would pay nobody.",
  });

  checks.push({
    label: "Vault locked and not released",
    ok: Boolean(input.vault && input.vault.status !== "released"),
    detail: input.vault ? `${input.vault.ref} is ${input.vault.status}.` : "No vault on this plan.",
  });

  const failed = checks.filter((c) => !c.ok);
  const early = failed.filter((c) => /window|notified|registry/i.test(c.label));
  const missing = failed.filter((c) => /document|reading|beneficiar|vault/i.test(c.label));

  if (!failed.length) {
    return {
      verdict: "No objection",
      tone: "clear",
      line: `Everything Halo can check is in order: documentation read, registry cleared, owner notified, window served. The decision is yours, and approval pays only ${input.beneficiaries[0]?.name ?? "the named beneficiaries"}'s plan shares.`,
      checks,
    };
  }

  if (early.length) {
    return {
      verdict: "Too early",
      tone: "hold",
      line: `Not yet decidable: ${early.map((c) => c.label.toLowerCase()).join(", ")}. Releasing now would break the order the window exists to protect.`,
      checks,
    };
  }

  return {
    verdict: missing.length > 2 ? "Incomplete evidence" : "Hold for review",
    tone: "stop",
    line: `Halo would not decide this yet: ${failed.map((c) => c.label.toLowerCase()).join(", ")}. Ask the requester for the missing document before anything else.`,
    checks,
  };
}
