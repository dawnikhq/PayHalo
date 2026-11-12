"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteTourButton } from "./SiteTour";

/**
 * The opening screen.
 *
 * Motion borrowed from the reference hero: the statement arrives word by word,
 * light drifts behind it, a band of steps runs underneath, and the photographs
 * change on their own. Every one of those is switched off when the visitor has
 * asked their system for less motion — the letters simply are there.
 */

const HEADLINE = ["Your", "wealth", "deserves", "more", "than", "a", "forgotten", "password", "and", "a", "hopeful", "guess."];
const EMPHASIS_FROM = 5;

const FRAMES = [
  {
    src: "/brand/field-ribbon.jpg",
    alt: "A ribbon of mint light curving through deep green",
    focus: "object-center",
  },
  {
    src: "/brand/field-key.jpg",
    alt: "A brass key resting on folded pale mint paper",
    focus: "object-center",
  },
  {
    src: "/brand/field-letter.jpg",
    alt: "A sealed letter and a pen on a dark desk",
    focus: "object-center",
  },
];

const TICKER = [
  "Record what you own",
  "Decide who inherits",
  "Appoint a Trusted Key",
  "Allow the handover process to proceed",
];

export function Hero() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 4600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section data-tour="hero" className="relative isolate overflow-hidden bg-[#0a0f0d] text-white">
      {/* light behind the words — three soft ribbons, drifting at different speeds */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="ribbon ribbon-a" />
        <div className="ribbon ribbon-b" />
        <div className="ribbon ribbon-c" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,transparent_35%,rgba(10,15,13,0.55)_100%)]" />
      </div>

      <div className="section relative grid gap-9 pb-10 pt-11 sm:gap-12 sm:pb-14 sm:pt-20 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-24">
        <div className="min-w-0">
          <h1 className="display-xl max-w-[15ch] text-white">
            {HEADLINE.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className={`hero-word inline-block ${i >= EMPHASIS_FROM ? "text-[var(--color-lime)]" : ""}`}
                style={{ ["--i" as string]: i }}
              >
                {word}
                {i === HEADLINE.length - 1 ? "" : "\u00A0"}
              </span>
            ))}
          </h1>

          <p
            className="hero-fade mt-6 max-w-[52ch] text-[14px] leading-relaxed text-white/70 sm:text-[15.5px]"
            style={{ ["--d" as string]: "620ms" }}
          >
            PayHalo is a digital inheritance platform that helps you document what you own, decide who inherits it and
            leave instructions for how your wealth should be handled.
          </p>

          <div
            className="hero-fade mt-7 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:items-center"
            style={{ ["--d" as string]: "760ms" }}
          >
            <Link href="/signup" className="btn btn-mint w-full sm:w-auto">
              Create my inheritance plan <span aria-hidden>→</span>
            </Link>
            <Link href="#how" className="btn btn-on-dark w-full sm:w-auto">
              See how PayHalo works
            </Link>
          </div>

          <div className="hero-fade mt-4" style={{ ["--d" as string]: "880ms" }}>
            <SiteTourButton className="text-[12px] font-semibold text-[var(--color-lime)] underline decoration-[rgba(167,243,208,0.4)] underline-offset-4 transition hover:text-white">
              Take the one-minute tour
            </SiteTourButton>
          </div>

          <div aria-hidden className="mt-9 hidden items-center gap-3 lg:flex">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-[11px] text-white/70">
              ↓
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Scroll</span>
          </div>
        </div>

        {/* photographs, changing on their own */}
        <div className="hero-float relative mx-auto w-full max-w-[440px] lg:mx-0 lg:max-w-[480px] lg:justify-self-end">
          <div className="relative aspect-[5/4] w-full overflow-hidden rounded-[26px] border border-white/12 shadow-[0_50px_90px_-50px_rgba(0,0,0,0.9)] sm:aspect-[4/5] lg:aspect-[4/5]">
            {FRAMES.map((f, i) => (
              <Image
                key={f.src}
                src={f.src}
                alt={f.alt}
                fill
                priority={i === 0}
                sizes="(max-width: 1024px) 92vw, 520px"
                className={`object-cover ${f.focus} transition-opacity duration-[1400ms] ease-out ${
                  i === frame ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,15,13,0.05),rgba(10,15,13,0.38))]" />

            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-full border border-white/15 bg-[#0a0f0d]/45 px-3.5 py-2 backdrop-blur-md">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
                Your Wealth, left in good hands.
              </span>
              <span className="flex items-center gap-1.5">
                {FRAMES.map((f, i) => (
                  <span
                    key={f.src}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === frame ? "w-5 bg-[var(--color-lime)]" : "w-1.5 bg-white/35"
                    }`}
                  />
                ))}
              </span>
            </div>
          </div>

          {/* one quiet piece of the product, floating beside the photographs */}
          <div className="absolute -left-2 top-4 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/95 px-3 py-2 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)] sm:-left-4 lg:-left-6">
            <span className="relative grid h-7 w-7 place-items-center rounded-full bg-[var(--color-mint)] text-[10px] font-bold text-[var(--color-forest)]">
              AO
              <span className="breathe absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--color-brand)]" />
            </span>
            <span className="leading-tight">
              <span className="block text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--color-muted)]">
                Trusted Key
              </span>
              <span className="block text-[11.5px] font-semibold text-[var(--color-ink)]">Amara O.</span>
            </span>
          </div>
        </div>
      </div>

      {/* the four steps, running past */}
      <div className="relative border-y border-white/10 bg-[#0a0f0d]/80">
        <div className="marquee">
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 items-center gap-7 pr-7" aria-hidden={copy === 1}>
                {TICKER.map((step) => (
                  <li key={step} className="flex items-center gap-7">
                    <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {step}
                    </span>
                    <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--color-lime)]" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
