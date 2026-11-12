"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Cookie choice.
 *
 * The banner is deliberately quiet — a card in the corner, not a wall across the
 * page — and the preference is a real one: essential cookies are named, and the
 * two optional categories start off. The choice is written to localStorage and
 * to a first-party cookie so the server could honour it later.
 */
const KEY = "payhalo.cookie.consent.v1";
const OPEN_EVENT = "payhalo:cookies:open";

type Consent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  at: string;
};

function read(): Consent | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      at: String(parsed.at ?? ""),
    };
  } catch {
    return null;
  }
}

function write(next: Omit<Consent, "essential" | "at">) {
  const consent: Consent = { essential: true, ...next, at: new Date().toISOString() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(consent));
  } catch {
    /* private mode: the banner simply returns next time */
  }
  const level = next.analytics || next.marketing ? "custom" : "essential";
  document.cookie = `payhalo_consent=${level}; path=/; max-age=31536000; SameSite=Lax`;
}

export function CookieConsent({ lift = false }: { lift?: boolean }) {
  const [decided, setDecided] = useState<boolean | null>(null);
  const [show, setShow] = useState(false);
  const [panel, setPanel] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = read();
    setDecided(Boolean(existing));
    if (existing) {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
    const t = window.setTimeout(() => setShow(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const open = () => {
      setPanel(true);
      setShow(true);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  function decide(next: { analytics: boolean; marketing: boolean }) {
    write(next);
    setAnalytics(next.analytics);
    setMarketing(next.marketing);
    setDecided(true);
    setPanel(false);
  }

  if (decided === null) return null;

  return (
    <>
      {(show && !decided) || panel ? (
        <div
          role={panel ? "dialog" : undefined}
          aria-modal={panel ? true : undefined}
          aria-label="Cookie preferences"
          className={`fixed inset-x-3 z-[80] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px] ${
            lift ? "bottom-[86px] lg:bottom-5" : "bottom-3"
          }`}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="rounded-[20px] border border-[var(--color-line)] bg-white/97 p-4 shadow-[0_28px_60px_-30px_rgba(10,15,13,0.45)] backdrop-blur-xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label-caps text-[var(--color-brand)]">Cookies</p>
                <h2 className="mt-1.5 font-[var(--font-display)] text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[var(--color-ink)]">
                  {panel ? "Choose what PayHalo may keep." : "Your choice, before anything is stored."}
                </h2>
              </div>
              {panel && (
                <button
                  type="button"
                  onClick={() => setPanel(false)}
                  className="shrink-0 rounded-full px-2 py-1 text-[11.5px] font-semibold text-[var(--color-muted)] hover:bg-[#f2f8f5]"
                >
                  Close
                </button>
              )}
            </div>

            {panel ? (
              <ul className="mt-3 space-y-2">
                {[
                  {
                    title: "Essential",
                    body: "Signing in, keeping you signed in, and remembering this choice.",
                    on: true,
                    locked: true,
                  },
                  {
                    title: "Analytics",
                    body: "Anonymous page counts, so we know which parts are read.",
                    on: analytics,
                    locked: false,
                    set: setAnalytics,
                  },
                  {
                    title: "Marketing",
                    body: "Would let us measure a campaign. Not used today.",
                    on: marketing,
                    locked: false,
                    set: setMarketing,
                  },
                ].map((row) => (
                  <li
                    key={row.title}
                    className="flex items-start justify-between gap-3 rounded-[14px] border border-[var(--color-line)] px-3 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-[var(--color-ink)]">{row.title}</span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--color-muted)]">{row.body}</span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={row.on}
                      aria-label={row.title}
                      disabled={row.locked}
                      onClick={() => row.set?.(!row.on)}
                      className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
                        row.on ? "bg-[var(--color-forest)]" : "bg-[#d8e5de]"
                      } ${row.locked ? "opacity-70" : ""}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                          row.on ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-muted)]">
                Essential cookies keep you signed in. Analytics and marketing stay off unless you turn them on — nothing
                beyond essentials is active on this deployment.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => decide({ analytics, marketing })}
                className="btn btn-primary btn-sm flex-1 sm:flex-none"
              >
                {panel ? "Save preferences" : "Accept all"}
              </button>
              <button
                type="button"
                onClick={() => decide({ analytics: false, marketing: false })}
                className="btn btn-secondary btn-sm flex-1 sm:flex-none"
              >
                Essential only
              </button>
              {!panel && (
                <button
                  type="button"
                  onClick={() => setPanel(true)}
                  className="px-1 text-[11.5px] font-semibold text-[var(--color-brand)] underline-offset-4 hover:underline"
                >
                  Preferences
                </button>
              )}
            </div>

            <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--color-muted)]">
              Details in our{" "}
              <Link href="/legal#privacy" className="font-semibold text-[var(--color-brand)] hover:underline">
                privacy policy
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** The footer line that reopens the panel, after a choice has been made. */
export function CookiePreferencesLink({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className={className || "text-[12.5px] text-[var(--color-ink)] hover:text-[var(--color-brand)]"}
    >
      Cookie preferences
    </button>
  );
}
