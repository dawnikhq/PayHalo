"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The support desk: Halo first, a person second.
 *
 * Halo answers from the state behind the page — she is the live model, not a
 * suggestion box — and when her answer is not enough the same panel hands the
 * conversation to the form. The form posts to /api/support, which stores the
 * request against the account and returns the reference printed below it.
 */

interface Turn {
  role: "person" | "halo";
  text: string;
  topic?: string;
}

const TOPICS = [
  "A plan or asset",
  "Handover and claims",
  "Money and PayPal",
  "Keys and access",
  "Something is broken",
  "Something else",
];

export function SupportDesk({
  role,
  defaultName,
  defaultEmail,
  headline = "Talk to Halo, or to us.",
}: {
  role: "owner" | "keyholder" | "beneficiary";
  defaultName: string;
  defaultEmail: string;
  headline?: string;
}) {
  const router = useRouter();

  /* ------------------------------------------------------------- Halo chat */
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [thinking, setThinking] = useState(true);
  const [haloError, setHaloError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setThinking(true);
    fetch("/api/halo", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(async (res) => {
        const data = (await res.json()) as { text?: string; suggestions?: string[]; error?: string };
        if (cancelled) return;
        if (data.text) {
          setTurns([{ role: "halo", text: data.text }]);
          setSuggestions((data.suggestions ?? []).slice(0, 3));
        } else {
          setHaloError(data.error ?? "Halo could not start just now.");
        }
      })
      .catch(() => !cancelled && setHaloError("Halo could not start just now."))
      .finally(() => !cancelled && setThinking(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || thinking) return;
    setDraft("");
    setHaloError(null);
    setTurns((prev) => [...prev, { role: "person", text }]);
    setThinking(true);
    try {
      const res = await fetch("/api/halo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as {
        text?: string;
        topic?: string;
        suggestions?: string[];
        error?: string;
      };
      if (!res.ok || !data.text) throw new Error(data.error ?? "Halo could not answer just now.");
      setTurns((prev) => [...prev, { role: "halo", text: data.text as string, topic: data.topic }]);
      setSuggestions((data.suggestions ?? []).slice(0, 3));
    } catch (error) {
      setHaloError(error instanceof Error ? error.message : "Halo could not answer just now.");
    } finally {
      setThinking(false);
    }
  }

  /* ------------------------------------------------------------ the form */
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ ref: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const lastPerson = [...turns].reverse().find((t) => t.role === "person");
  const lastHalo = [...turns].reverse().find((t) => t.role === "halo");

  function handOver() {
    const asked = lastPerson?.text ?? "";
    setMessage((current) =>
      current.trim()
        ? current
        : asked
          ? `Halo could not settle this: “${asked}”\n\nWhat I need: `
          : "What I need: ",
    );
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    formRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          topic,
          message,
          role,
          haloQuestion: lastPerson?.text ?? "",
          haloAnswer: lastHalo?.text ?? "",
          haloTopic: lastHalo?.topic ?? "",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; ref?: string; error?: string };
      if (!res.ok || !data.ok || !data.ref) throw new Error(data.error ?? "The request could not be sent.");
      setReceipt({ ref: data.ref });
      setMessage("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The request could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      {/* ---------------------------------------------------------- Halo */}
      <section className="card flex min-h-[420px] flex-col overflow-hidden p-0">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative grid h-8 w-8 place-items-center rounded-full bg-[var(--color-mint)] text-[11px] font-bold text-[var(--color-forest)]">
              H
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--color-brand)] ring-2 ring-white" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-ink)]">Halo</p>
              <p className="text-[11px] text-[var(--color-muted)]">PayHalo&apos;s assistant · live</p>
            </div>
          </div>
          <span className="rounded-full border border-[var(--color-line)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
            Reads only
          </span>
        </header>

        <div ref={scrollRef} className="scroll-slim flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {turns.map((turn, i) => (
            <div key={i} className={turn.role === "person" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  turn.role === "person"
                    ? "max-w-[85%] rounded-[14px] rounded-br-[4px] bg-[var(--color-forest)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white"
                    : "max-w-[92%] rounded-[14px] rounded-bl-[4px] border border-[var(--color-line)] bg-[#f7faf6] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--color-ink)] whitespace-pre-line"
                }
              >
                {turn.text}
              </div>
            </div>
          ))}

          {thinking ? (
            <div className="flex items-center gap-1.5 px-1 py-1" aria-label="Halo is thinking">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)]"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          ) : null}

          {haloError ? (
            <p className="rounded-[10px] bg-[#fdf3ee] px-3 py-2 text-[12px] text-[#8a4a2c]">
              {haloError} You can still send the request below.
            </p>
          ) : null}
        </div>

        {suggestions.length && !thinking ? (
          <div className="flex flex-wrap gap-1.5 px-5 pb-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-[var(--color-line)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink)] transition hover:border-[var(--color-line-strong)] hover:bg-[#f4f8f2]"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="border-t border-[var(--color-line)] p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(draft);
          }}
        >
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask Halo anything about your plan…"
              className="input h-10 flex-1 text-[12.5px]"
              aria-label="Ask Halo"
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={thinking || !draft.trim()}>
              Ask
            </button>
          </div>
          <button
            type="button"
            onClick={handOver}
            className="mt-2 text-[11px] font-semibold text-[var(--color-brand)] underline decoration-[rgba(14,111,86,0.3)] underline-offset-4"
          >
            Not answered? Send this to a person
          </button>
        </form>
      </section>

      {/* --------------------------------------------------------- the form */}
      <section ref={formRef} id="support-form" className="card scroll-mt-6 p-5 sm:p-6">
        <p className="eyebrow">A person reads these</p>
        <h2 className="h2 mt-2">{headline}</h2>
        <p className="t-meta mt-1.5">
          Tell us what is happening. You get a reference by email, and the request lands in the operator&apos;s inbox
          with anything Halo already said.
        </p>

        {receipt ? (
          <div className="mt-5 rounded-[16px] border border-[rgba(14,111,86,0.22)] bg-[var(--color-wash,#f2f9f5)] p-4">
            <p className="text-[13px] font-semibold text-[var(--color-forest)]">Your request is logged.</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              Keep this reference: it is how we find it. A copy is on its way to {email || "your inbox"}.
            </p>
            <p className="mt-3 rounded-[10px] border border-dashed border-[rgba(14,111,86,0.35)] bg-white px-3 py-2 font-[var(--font-display)] text-[15px] font-semibold tracking-[0.06em] text-[var(--color-forest)]">
              {receipt.ref}
            </p>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="mt-3 text-[11.5px] font-semibold text-[var(--color-brand)] underline underline-offset-4"
            >
              Send another request
            </button>
          </div>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                  Your name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="input h-10 w-full text-[12.5px]"
                  autoComplete="name"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                  Email
                </span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="input h-10 w-full text-[12.5px]"
                  autoComplete="email"
                  required
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                What is this about?
              </span>
              <select
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="input h-10 w-full text-[12.5px]"
              >
                {TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                What happened?
              </span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                className="input w-full resize-y text-[12.5px] leading-relaxed"
                placeholder="A sentence or two is plenty. No passwords or keys, please."
                minLength={15}
                maxLength={4000}
                required
              />
              <span className="mt-1 block text-[10.5px] text-[var(--color-muted)]">
                {message.length}/4000 · never include a password, a private key or a recovery phrase
              </span>
            </label>

            {error ? (
              <p className="rounded-[10px] bg-[#fdf3ee] px-3 py-2 text-[12px] text-[#8a4a2c]">{error}</p>
            ) : null}

            <button type="submit" className="btn btn-primary w-full" disabled={sending}>
              {sending ? "Sending…" : "Send the request"}
            </button>
            <p className="text-center text-[10.5px] text-[var(--color-muted)]">
              Stored against your account and readable by the operator only.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
