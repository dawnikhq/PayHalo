"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Snapshot } from "@/lib/types";
import { money, shortDate } from "@/lib/format";
import { Avatar } from "./Avatar";
import { Timeline } from "./Timeline";
import { Countdown } from "./Countdown";

const ICON: Record<string, string> = { paypal: "P", crypto: "₿", business: "◫" };

export function BeneficiaryPortal({ snapshot }: { snapshot: Snapshot }) {
  const s = snapshot;
  const released = s.claim?.status === "distributed";
  const inWindow = s.claim?.status === "window";

  const [selected, setSelected] = useState<number | null>(
    s.distributions[0]?.beneficiaryId ?? s.beneficiaries[0]?.id ?? null,
  );
  const [accepted, setAccepted] = useState(false);

  const active = useMemo(() => {
    if (released) {
      const dist = s.distributions.find((d) => d.beneficiaryId === selected) ?? s.distributions[0];
      const person = s.beneficiaries.find((b) => b.id === dist?.beneficiaryId);
      return { dist, person };
    }
    const person = s.beneficiaries.find((b) => b.id === selected) ?? s.beneficiaries[0];
    return { dist: undefined, person };
  }, [released, selected, s.distributions, s.beneficiaries]);

  return (
    <main className="shell py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">
            <span className="h-px w-8 bg-brass/60" />
            Beneficiary portal
          </p>
          <h1 className="display mt-3 text-[clamp(2rem,4vw,3rem)]">
            {released ? "What was left to you" : "Nothing to collect yet"}
            <span className="text-brass">.</span>
          </h1>
          <p className="mt-3 max-w-[62ch] text-[13px] leading-relaxed text-muted">
            {released
              ? `${s.user.name}'s instructions were carried out on ${shortDate(s.claim?.distributedAt ?? null)}. Your allocation is below — no passwords, no paperwork chase.`
              : `This is the read-only view ${s.user.name} has set up. It stays quiet until a verified handover completes.`}
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-ghost !py-2.5 !text-[12.5px]">
          Owner dashboard
        </Link>
      </div>

      {!released && (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <section className="card p-7">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="breathe absolute inline-flex h-full w-full rounded-full bg-ember" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ember" />
              </span>
              <p className="text-[10.5px] uppercase tracking-[0.2em] text-ember">
                {inWindow ? "Handover in progress" : "Plan sealed · nothing released"}
              </p>
            </div>

            <h2 className="mt-4 font-serif text-[28px] leading-tight">
              {inWindow
                ? "A claim has been filed. The owner has 14 days to respond."
                : "When the time comes, this page becomes your instruction sheet."}
            </h2>
            <p className="mt-3 max-w-[52ch] text-[12.5px] leading-relaxed text-muted">
              {inWindow
                ? "No money moves during the safety window. If the owner is alive and stops the claim, nothing happens at all."
                : "You won't need the owner's logins, a lawyer, or a search through old email. Your share, the accounts it comes from, and the note they left you all appear here the moment the handover clears."}
            </p>

            {inWindow && s.secondsToWindowEnd !== null && (
              <div className="mt-6 max-w-sm">
                <Countdown seconds={s.secondsToWindowEnd} />
              </div>
            )}

            <div className="mt-7 space-y-3">
              {[
                ["1", "Claim filed by keyholder", inWindow],
                ["2", "Document verification", inWindow],
                ["3", "14-day safety window", false],
                ["4", "Assets released to recipients", false],
              ].map(([n, t, done]) => (
                <div key={String(n)} className="flex items-center gap-3.5">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] ${
                      done
                        ? "border-sage/40 bg-sage/15 text-sage"
                        : "border-white/10 text-muted/50"
                    }`}
                  >
                    {done ? "✓" : String(n)}
                  </span>
                  <span className={`text-[12.5px] ${done ? "text-ivory" : "text-muted"}`}>
                    {String(t)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-7">
            <p className="label">Named on this plan</p>
            <ul className="mt-4 space-y-3.5">
              {s.beneficiaries.map((b) => (
                <li key={b.id} className="flex items-center gap-3">
                  <Avatar name={b.name} size={34} tone={b.role === "charity" ? "sage" : selected === b.id ? "brass" : "quiet"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-ivory">{b.name}</p>
                    <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted/70">
                      {b.role === "primary" ? "first choice" : b.role === "charity" ? "final cause" : `backup · ${b.share}%`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-muted/80">
              Previews are hidden from beneficiaries until a handover completes — so nobody can
              pressure the owner while they&apos;re alive.
            </p>
          </section>
        </div>
      )}

      {released && (
        <div className="mt-8 grid gap-5 lg:grid-cols-[0.85fr_1.35fr]">
          {/* selector */}
          <aside className="space-y-3">
            <p className="label">Recipients</p>
            {s.beneficiaries.map((b) => {
              const d = s.distributions.find((x) => x.beneficiaryId === b.id);
              const isActive = active.person?.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelected(b.id);
                    setAccepted(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                    isActive
                      ? "border-brass/35 bg-brass/[0.07]"
                      : "border-white/8 bg-white/[0.015] hover:border-white/16"
                  }`}
                >
                  <Avatar name={b.name} size={34} tone={b.role === "charity" ? "sage" : isActive ? "brass" : "quiet"} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-ivory">{b.name}</span>
                    <span className="block text-[10px] uppercase tracking-[0.1em] text-muted/70">
                      {b.role === "charity" ? "final cause" : b.role}
                    </span>
                  </span>
                  <span className="mono shrink-0 text-[11.5px] text-brass">
                    {d ? money(d.amountCents, false) : "—"}
                  </span>
                </button>
              );
            })}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3.5">
              <p className="text-[10.5px] leading-relaxed text-muted/75">
                Amounts already reflect the engine&apos;s fall-through rules. Toggle reachability on
                the owner dashboard to watch a different path resolve.
              </p>
            </div>
          </aside>

          {/* detail */}
          {active.person && active.dist && (
            <section key={active.person.id} className="rise space-y-5">
              <div className="card relative overflow-hidden p-7">
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brass/10 blur-3xl" />
                <div className="relative">
                  <p className="text-[10.5px] uppercase tracking-[0.2em] text-brass">
                    Your allocation · {active.dist.share}%
                  </p>
                  <p className="mono mt-3 text-[clamp(2.4rem,6vw,3.4rem)] leading-none tracking-tight">
                    {money(active.dist.amountCents)}
                  </p>
                  <p className="mt-3 text-[12.5px] text-muted">
                    from the plan of <span className="text-ivory">{s.user.name}</span> · released{" "}
                    {shortDate(s.claim?.distributedAt ?? null)}
                  </p>

                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {s.assets.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-black/25 px-3 py-2.5"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 font-serif text-[11px] text-brass">
                          {ICON[a.kind] ?? "•"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11.5px] text-ivory">{a.label}</p>
                          <p className="text-[10px] text-muted/70">{a.provider}</p>
                        </div>
                        <p className="mono shrink-0 text-[11px] text-muted">
                          {money(Math.round((a.balanceCents * active.dist!.amountCents) / (s.totalCents || 1)), false)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {accepted ? (
                      <span className="pill border-sage/35 bg-sage/10 text-[10px] text-sage">
                        ✓ Accepted — routed to {active.person.email || "your account"}
                      </span>
                    ) : (
                      <button onClick={() => setAccepted(true)} className="btn btn-brass !py-2.5 !text-[12.5px]">
                        Accept this inheritance
                      </button>
                    )}
                    <span className="text-[10.5px] text-muted/60">
                      Simulated — no real funds move in this prototype.
                    </span>
                  </div>
                </div>
              </div>

              {active.person.note && (
                <div className="card relative overflow-hidden bg-gradient-to-b from-brass/[0.06] to-transparent p-7">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-brass/80">
                    A note from {s.user.name.split(" ")[0]}
                  </p>
                  <p className="mt-4 font-serif text-[22px] leading-[1.5] text-ivory/95">
                    “{active.person.note}”
                  </p>
                  <p className="mt-4 text-[11px] text-muted/60">
                    Written {shortDate(s.plan.sealedAt)} · delivered with the handover
                  </p>
                </div>
              )}

              <div className="card p-6">
                <p className="label">How this was released</p>
                <div className="mt-4">
                  <Timeline events={s.events} dense />
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
