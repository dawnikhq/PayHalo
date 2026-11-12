"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteTourButton } from "./SiteTour";

/**
 * The opening screen.
 *
 * Arranged like the front of the building: one full-bleed photograph behind a
 * very large statement, the description resting on a bordered panel at the
 * foot of the screen, and a quiet scroll cue in the corner. The photographs
 * change on their own; every motion is switched off when the visitor has asked
 * their system for less.
 *
 * The whole arrangement — statement, description and both buttons — is inside
 * the first screen on a phone and on a laptop, so nobody has to scroll to find
 * out what PayHalo is or to start.
 */

const HEADLINE = ["Your", "wealth", "deserves", "more", "than", "a", "forgotten", "password", "and", "a", "hopeful", "guess."];
const EMPHASIS_FROM = 5;

const FRAMES = [
  {
    src: "/brand/field-ribbon.jpg",
    alt: "",
    focus: "object-center",
  },
  {
    src: "/brand/field-key.jpg",
    alt: "",
    focus: "object-center",
  },
  {
    src: "/brand/field-letter.jpg",
    alt: "",
    focus: "object-center",
  },
];

export function Hero() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 5200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      data-tour="hero"
      className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#0a0f0d] text-white sm:min-h-[calc(100svh-4.5rem)]"
    >
      {/* the photograph, filling the screen behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20">
        {FRAMES.map((f, i) => (
          <Image
            key={f.src}
            src={f.src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className={`object-cover transition-opacity duration-[1600ms] ease-out ${i === frame ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>

      {/* the light behind the words — ribbons, and the scrim that keeps them readable */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="ribbon ribbon-a" />
        <div className="ribbon ribbon-b" />
        {/* the photograph stays visible on the right, and goes dark where the words are */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,15,13,0.62)_0%,rgba(10,15,13,0.24)_42%,rgba(10,15,13,0.74)_84%,rgba(10,15,13,0.94)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,15,13,0.86)_0%,rgba(10,15,13,0.54)_46%,rgba(10,15,13,0.2)_100%)]" />
      </div>

      <div className="section relative flex flex-1 flex-col justify-end gap-7 pb-5 pt-8 sm:justify-between sm:gap-6 sm:pb-6 sm:pt-10">
        <h1 className="display-hero max-w-[16ch] text-white">
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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="hero-fade w-full max-w-[560px] rounded-[18px] border border-white/15 bg-[#0a0f0d]/55 p-5 backdrop-blur-md sm:p-6">
            <p className="max-w-[52ch] text-[13.5px] leading-relaxed text-white/80 sm:text-[15px]">
              PayHalo is a digital inheritance platform that helps you document what you own, decide who inherits it and
              leave instructions for how your wealth should be handled.
            </p>

            <div className="mt-4 flex flex-col gap-2.5 sm:mt-5 sm:flex-row sm:items-center">
              <Link href="/signup" className="btn btn-mint w-full sm:w-auto">
                Create my inheritance plan <span aria-hidden>→</span>
              </Link>
              <Link href="#how" className="btn btn-on-dark w-full sm:w-auto">
                See how PayHalo works
              </Link>
            </div>

            <div className="mt-3">
              <SiteTourButton className="text-[11.5px] font-semibold text-[var(--color-lime)] underline decoration-[rgba(167,243,208,0.4)] underline-offset-4 transition hover:text-white">
                Take the one-minute tour
              </SiteTourButton>
            </div>
          </div>

          <a
            href="#how"
            className="hidden shrink-0 items-center gap-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55 transition hover:text-white sm:flex"
          >
            Scroll
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full border border-white/20 text-[12px]">
              ↓
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
