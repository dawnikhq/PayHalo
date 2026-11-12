"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * One tour engine, used twice: once over the public site and once inside the
 * product. It is deliberately not a library — a spotlight, a card, and the
 * keyboard behaviour a person expects. Every step either points at an element
 * marked with `data-tour="…"`, or floats in the middle of the screen.
 */
export type TourStep = {
  /** `data-tour` value to point at. Omit for a centred step. */
  target?: string;
  kicker?: string;
  title: string;
  body: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 10;

/**
 * The same anchor is often drawn twice — once in the desktop rail, once in the
 * phone tab bar — so pick whichever copy is actually on screen at this width.
 */
function findTarget(target?: string): HTMLElement | null {
  if (!target || typeof document === "undefined") return null;
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
  return all.find((el) => el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0) ?? null;
}

function measure(target?: string): Rect | null {
  const el = findTarget(target);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

export function Tour({
  steps,
  storage,
  auto = false,
  eventName = "payhalo:tour",
  label = "Product tour",
}: {
  steps: TourStep[];
  /** localStorage key. Omit to never remember dismissal. */
  storage?: string;
  auto?: boolean;
  eventName?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const card = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  const step = steps[index];
  const last = index === steps.length - 1;

  const close = useCallback(() => {
    setOpen(false);
    if (storage) {
      try {
        window.localStorage.setItem(storage, "seen");
      } catch {
        /* private mode: the tour simply returns next visit */
      }
    }
  }, [storage]);

  const start = useCallback(() => {
    setIndex(0);
    setOpen(true);
  }, []);

  /* auto-start once, only after the page has settled */
  useEffect(() => {
    if (!auto) return;
    let seen = false;
    try {
      seen = window.localStorage.getItem(storage ?? "") === "seen";
    } catch {
      seen = false;
    }
    if (seen) return;
    const t = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(t);
  }, [auto, storage]);

  /* open me from anywhere: header button, help page, dashboard hint */
  useEffect(() => {
    const handler = () => start();
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [eventName, start]);

  /* follow the target: scroll it into view once, then track scroll + resize */
  useEffect(() => {
    if (!open) return;
    setReady(false);
    const target = steps[index]?.target;
    const el = findTarget(target);

    if (el) {
      const r = el.getBoundingClientRect();
      const offscreen = r.top < 80 || r.bottom > window.innerHeight - 40;
      if (offscreen) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    let raf = 0;
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setRect(measure(target)));
    };
    sync();
    const settle = window.setTimeout(() => {
      sync();
      setReady(true);
    }, 320);

    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.clearTimeout(settle);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [open, index, steps]);

  /* lock the page, keep the keyboard honest */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    card.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setIndex((i) => (i === steps.length - 1 ? i : i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => (i > 0 ? i - 1 : i));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, steps.length]);

  useEffect(() => {
    if (open) card.current?.focus();
  }, [index, open]);

  const placement = useMemo(() => {
    if (typeof window === "undefined" || !rect || window.innerWidth < 700) return "sheet";
    const spaceBelow = window.innerHeight - (rect.top + rect.height);
    return spaceBelow > 260 ? "below" : "above";
  }, [rect]);

  if (!open || !step) return null;

  const style: React.CSSProperties =
    placement === "below"
      ? { top: Math.min(rect!.top + rect!.height + 14, window.innerHeight - 220), left: "50%", transform: "translateX(-50%)" }
      : placement === "above"
        ? { bottom: Math.min(window.innerHeight - rect!.top + 14, window.innerHeight - 220), left: "50%", transform: "translateX(-50%)" }
        : {};

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={label}>
      {/*
        The dimming is drawn as four panels around the element being explained
        rather than a full sheet with a shadow: the cut-out stays at full
        brightness, and the panels still swallow taps meant for the page.
      */}
      {rect ? (
        <>
          <div className="absolute inset-x-0 top-0 bg-[rgba(9,32,27,0.62)]" style={{ height: Math.max(0, rect.top) }} />
          <div
            className="absolute inset-x-0 bottom-0 bg-[rgba(9,32,27,0.62)]"
            style={{ top: rect.top + rect.height }}
          />
          <div
            className="absolute left-0 bg-[rgba(9,32,27,0.62)]"
            style={{ top: rect.top, height: rect.height, width: Math.max(0, rect.left) }}
          />
          <div
            className="absolute right-0 bg-[rgba(9,32,27,0.62)]"
            style={{ top: rect.top, height: rect.height, left: rect.left + rect.width }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-[22px] ring-2 ring-[var(--color-lime)] transition-all duration-300"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-[rgba(9,32,27,0.62)]" />
      )}

      <div
        ref={card}
        tabIndex={-1}
        className={[
          "absolute z-10 w-[calc(100vw-24px)] max-w-[420px] rounded-[22px] border border-[rgba(21,63,53,0.10)] bg-white p-5 shadow-[0_30px_70px_-30px_rgba(9,32,27,0.7)] outline-none sm:w-[420px]",
          placement === "sheet"
            ? "inset-x-3 bottom-3 mx-auto mb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
            : "sm:mx-auto",
          ready ? "opacity-100" : "opacity-0",
          "transition-opacity duration-200",
        ].join(" ")}
        style={placement === "sheet" ? undefined : style}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="label-caps text-[var(--color-brand)]">{step.kicker ?? `Step ${index + 1} of ${steps.length}`}</span>
          <button
            type="button"
            onClick={close}
            className="rounded-full px-2 py-1 text-[11.5px] font-semibold text-[var(--color-muted)] transition hover:bg-[#f2f6f1] hover:text-[var(--color-ink)]"
          >
            Skip
          </button>
        </div>

        <h2 className="mt-2 font-[var(--font-display)] text-[20px] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--color-ink)]">
          {step.title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-muted)]">{step.body}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <span
                key={s.title}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? 18 : 6,
                  background: i === index ? "var(--color-forest)" : "#d7e2d8",
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button type="button" onClick={() => setIndex((i) => i - 1)} className="btn btn-secondary btn-sm">
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? close() : setIndex((i) => i + 1))}
              className="btn btn-primary btn-sm"
            >
              {last ? "Done" : "Next"} <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Any button, anywhere, that starts the tour it lives next to. */
export function TourButton({
  eventName = "payhalo:tour",
  className = "btn btn-secondary btn-sm",
  children = "Take the tour",
}: {
  eventName?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(eventName))}>
      {children}
    </button>
  );
}
