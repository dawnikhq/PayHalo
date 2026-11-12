"use client";

import { useEffect, useRef, useState } from "react";

interface Turn {
  role: "person" | "halo";
  text: string;
}

/**
 * Halo, in the corner of the screen.
 *
 * A real conversation with the state behind the page, not a canned FAQ. She
 * cannot change anything, and the panel says so once, quietly, at the top.
 */
export function HaloLauncher({ role }: { role: "owner" | "keyholder" | "beneficiary" }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBusy(true);
    fetch("/api/halo", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(async (res) => {
        const data = (await res.json()) as { text?: string; suggestions?: string[]; error?: string };
        if (cancelled) return;
        if (data.text) {
          setTurns([{ role: "halo", text: data.text }]);
          setSuggestions(data.suggestions ?? []);
        } else {
          setError(data.error ?? "Halo could not start just now.");
        }
      })
      .catch(() => !cancelled && setError("Halo could not start just now."))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setDraft("");
    setError(null);
    setTurns((prev) => [...prev, { role: "person", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/halo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as { text?: string; suggestions?: string[]; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? "Halo could not answer just now.");
      setTurns((prev) => [...prev, { role: "halo", text: data.text as string }]);
      if (data.suggestions?.length) setSuggestions(data.suggestions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Halo could not answer just now.");
    } finally {
      setBusy(false);
    }
  }

  const supportHref = role === "owner" ? "/help" : role === "keyholder" ? "/keyholder/support" : "/beneficiary/support";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 60);
        }}
        aria-expanded={open}
        aria-label={open ? "Close Halo" : "Ask Halo for help"}
        data-tour="app-halo"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+76px)] right-4 z-40 flex items-center gap-2 rounded-full bg-[var(--color-forest)] px-4 py-3 text-[12.5px] font-semibold text-[#f4f8f0] shadow-[0_16px_36px_-16px_rgba(21,63,53,0.65)] transition active:scale-[0.98] lg:bottom-6 lg:right-6"
      >
        <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-lime)] text-[11px] font-bold text-[var(--color-forest)]">
          H
        </span>
        <span>{open ? "Close" : "Ask Halo"}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Halo"
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+140px)] z-50 flex max-h-[72vh] flex-col overflow-hidden rounded-[20px] border border-[rgba(21,63,53,0.12)] bg-[#fdfcf8] shadow-[0_28px_70px_-30px_rgba(21,63,53,0.55)] sm:inset-x-auto sm:right-6 sm:w-[392px] lg:bottom-24"
        >
          <header className="flex items-start gap-3 border-b border-[rgba(21,63,53,0.08)] px-4 py-3">
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-mint)] text-[12px] font-bold text-[var(--color-forest)]">
              H
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--color-ink)]">Halo</p>
              <p className="text-[11px] leading-snug text-[var(--color-muted)]">
                PayHalo&apos;s assistant. She explains — she never changes your plan.
              </p>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {turns.map((turn, i) => (
              <div
                key={i}
                className={
                  turn.role === "person"
                    ? "ml-auto max-w-[85%] rounded-[14px] rounded-br-[4px] bg-[var(--color-forest)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#eef5ee]"
                    : "mr-auto max-w-[92%] rounded-[14px] rounded-bl-[4px] border border-[rgba(21,63,53,0.08)] bg-white px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--color-ink)]"
                }
              >
                {turn.text}
              </div>
            ))}
            {busy && (
              <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-muted)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-brand)]" />
                Halo is reading your plan…
              </p>
            )}
            {error && <p className="field-error">{error}</p>}
          </div>

          {suggestions.length > 0 && !busy && (
            <div className="flex flex-wrap gap-1.5 border-t border-[rgba(21,63,53,0.08)] px-4 py-2.5">
              {suggestions.slice(0, 3).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-[rgba(21,63,53,0.14)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-ink)]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
            className="flex items-center gap-2 border-t border-[rgba(21,63,53,0.08)] px-3 py-2.5"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about your plan…"
              aria-label="Your question for Halo"
              maxLength={600}
              className="h-9 w-full rounded-[10px] border border-[rgba(21,63,53,0.14)] bg-white px-3 text-[12.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--color-forest)] text-[#eef5ee] disabled:opacity-40"
              aria-label="Send"
            >
              ↑
            </button>
          </form>

          <p className="border-t border-[rgba(21,63,53,0.08)] px-4 py-2 text-[10.5px] text-[var(--color-muted)]">
            Need a person?{" "}
            <a href={supportHref} className="font-semibold text-[var(--color-brand)]">
              Help &amp; support
            </a>
          </p>
        </div>
      )}
    </>
  );
}
