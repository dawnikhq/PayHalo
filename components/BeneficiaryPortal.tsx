"use client";

import Link from "next/link";
import type { BeneficiaryView } from "@/lib/store";
import { clockLabel, money, shortDate } from "@/lib/format";
import { Countdown } from "./Countdown";
import { Badge } from "./ui";

const KIND: Record<string, string> = {
  paypal: "Payment account",
  crypto: "Crypto wallet",
  business: "Digital business",
};

export function BeneficiaryPortal({ view }: { view: BeneficiaryView }) {
  const { phase, entitlement } = view;

  const header =
    phase === "released"
      ? {
          eyebrow: "Beneficiary / Completed handover",
          title: "What was left for you.",
          body: "Verified · the full safety window has closed.",
        }
      : phase === "window"
        ? {
            eyebrow: "Beneficiary / Safety window",
            title: "A careful step, at a time.",
            body: `${view.person.name.split(" ")[0]}, this page opens only when the safety window closes without a response.`,
          }
        : {
            eyebrow: "Beneficiary",
            title: "Nothing to collect yet.",
            body: "This page stays quiet while the plan is active — no balances, no shares, no other recipients.",
          };

  return (
    <>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">{header.eyebrow}</p>
          <h1 className="h1 mt-2.5">{header.title}</h1>
          <p className="t-body mt-2 max-w-[62ch]">{header.body}</p>
        </div>
        {phase === "released" ? (
          <Badge tone="lime" dot>
            Release complete
          </Badge>
        ) : (
          <Badge tone="warn">Private</Badge>
        )}
      </header>

      {phase === "idle" && (
        <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <section className="card p-6 md:p-8">
            <h2 className="h2">You&apos;re named on {view.ownerName}&apos;s plan.</h2>
            <p className="t-body mt-3 max-w-[56ch]">
              While the account holder is alive, this page shows nothing about their estate. Not the balances,
              not the other people named, not your share — by design, so nobody can be pressured.
            </p>
            <p className="t-body mt-3 max-w-[56ch]">
              If a verified handover ever completes, your own entitlement and the instructions left for you
              appear here.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["01", "A handover request is filed", "The Trusted Key submits evidence."],
                ["02", "It is verified", "The account holder is notified first."],
                ["03", "14 full days pass", "Only then is anything released."],
              ].map(([n, title, body]) => (
                <div key={n} className="rounded-[12px] bg-[#f7faf7] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand)]">{n}</p>
                  <p className="mt-1.5 text-[12.5px] font-medium text-[var(--color-ink)]">{title}</p>
                  <p className="t-meta mt-0.5">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section id="role" className="card-mint scroll-mt-24 p-6">
              <h2 className="h2 text-[var(--color-forest)]">Your access is private.</h2>
              <p className="t-body mt-3 text-[#3c5a4e]">
                You cannot view the full estate, other beneficiaries or their shares — before or after a
                handover.
              </p>
            </section>
            <section className="card p-6">
              <h2 className="h3">Who you are</h2>
              <p className="mt-2 text-[13px] text-[var(--color-ink)]">{view.person.name}</p>
              <p className="t-meta mt-0.5">
                {view.person.relationship}
                {view.person.email ? ` · ${view.person.email}` : ""}
              </p>
              <p className="t-small mt-3">Named by {view.ownerName}. No action is needed from you.</p>
            </section>
          </aside>
        </div>
      )}

      {phase === "window" && (
        <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <div className="space-y-5">
            <section className="card-forest relative overflow-hidden p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="max-w-[46ch]">
                  <p className="label">Handover for {view.ownerName}</p>
                  <h2 className="h2 mt-3 text-[1.5rem] text-white">Protected until the time is right.</h2>
                  <p className="t-body mt-2 text-[#b7cfbd]">
                    Verification is complete. The 14-day safety window is still open.
                  </p>
                  <p className="t-body mt-2 text-[#b7cfbd]">
                    No assets, balances or entitlement details are available yet.
                  </p>
                </div>
                <div className="text-right">
                  <p className="t-num text-[64px] leading-none text-[var(--color-lime)]">
                    {String(view.daysRemaining ?? 0).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a9c4b0]">
                    Days remaining
                  </p>
                </div>
              </div>
              <p className="mt-6 border-t border-white/10 pt-4 text-[11.5px] text-[#8fb098]">
                Notice issued {clockLabel(view.verifiedAt)} · Earliest eligibility {clockLabel(view.windowEndsAt)}
              </p>
            </section>

            <section className="card p-6 md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="h2">Where things stand</h2>
                <div className="w-full max-w-[220px]">
                  <Countdown seconds={view.secondsToWindowEnd ?? 0} compact />
                </div>
              </div>
              <ol className="mt-5 space-y-5">
                <li>
                  <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                    <span className="mr-2 text-[var(--color-brand)]">✓</span>Handover request verified
                  </p>
                  <p className="t-meta mt-0.5 pl-5">
                    {shortDate(view.verifiedAt)} · account holder notified
                  </p>
                </li>
                <li>
                  <p className="text-[13px] font-semibold text-[var(--color-brand)]">02 Safety window open</p>
                  <p className="t-meta mt-0.5">
                    Ends {shortDate(view.windowEndsAt)} · 14 full days
                  </p>
                </li>
                <li>
                  <p className="text-[13px] font-semibold text-[var(--color-ink)]">03 Release eligibility</p>
                  <p className="t-meta mt-0.5">
                    Only if every safeguard is met and the account holder has not stopped the handover.
                  </p>
                </li>
              </ol>
            </section>
          </div>

          <aside className="space-y-5">
            <section id="role" className="card-mint scroll-mt-24 p-6">
              <h2 className="h2 text-[var(--color-forest)]">Your access is private.</h2>
              <p className="t-body mt-3 text-[#3c5a4e]">
                You cannot view the full estate, other beneficiaries or their shares.
              </p>
              <p className="t-body mt-3 text-[#3c5a4e]">
                After a completed handover, only your own entitlement and the instructions left for you become
                available.
              </p>
            </section>
            <section className="card p-6">
              <h2 className="h3">You do not need to do anything right now.</h2>
              <p className="t-small mt-1.5">
                Nothing is visible here — not the estate, not the other people named, not your share — until the window closes.
              </p>
              <Link href="/help" className="btn btn-secondary btn-sm mt-3">
                Questions? Get support
              </Link>
            </section>
          </aside>
        </div>
      )}

      {phase === "released" && entitlement && (
        <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <div className="space-y-5">
            <section className="card-forest p-6 md:p-8">
              <p className="label">Your entitlement from {view.ownerName}</p>
              <p className="t-num mt-3 text-[clamp(2.2rem,5vw,3rem)] leading-none text-white">
                {money(entitlement.amountCents)}
              </p>
              <p className="mt-3 text-[12.5px] text-[#b7cfbd]">
                {entitlement.share}% share · USD equivalent
              </p>
              <p className="mt-6 border-t border-white/10 pt-4 text-[11.5px] text-[#8fb098]">
                Visible to you only · Other recipients are not shown
              </p>
            </section>

            <section className="card p-6 md:p-7">
              <h2 className="h2">Included in your entitlement</h2>
              <ul className="mt-4 divide-y divide-[var(--color-line)]">
                {entitlement.assets.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">{a.label}</p>
                      <p className="t-meta mt-0.5">{KIND[a.kind] ?? "Asset"}</p>
                    </div>
                    <p className="t-num shrink-0 text-[13px] text-[var(--color-ink)]">{money(a.amountCents)}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section id="instructions" className="card p-6 md:p-7">
              <h2 className="h2">Instructions left for you</h2>
              {entitlement.documents.length ? (
                <ul className="mt-3 divide-y divide-[var(--color-line)]">
                  {entitlement.documents.map((d) => (
                    <li key={d.id} className="py-3 first:pt-0">
                      <p className="text-[13.5px] font-medium text-[var(--color-ink)]">{d.name}</p>
                      <p className="t-meta mt-0.5">
                        {d.kind} · {(d.sizeKb / 1024).toFixed(1)} MB · guidance for {d.relatedTo}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="t-body mt-2">No documents were shared with beneficiaries.</p>
              )}
              <p className="t-meta mt-4 border-t border-[var(--color-line)] pt-3">
                Only the documents the account holder marked for handover appear here — descriptions and papers, never
                passwords, keys or recovery phrases.
              </p>
            </section>

            {entitlement.note && (
              <section className="card-mint p-6">
                <p className="label text-[var(--color-brand)]">A note from {view.ownerFirstName}</p>
                <p className="mt-3 font-[var(--font-display)] text-[18px] leading-relaxed text-[var(--color-forest)]">
                  “{entitlement.note}”
                </p>
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <section className="card-lime p-6">
              <h2 className="h2 text-[var(--color-forest)]">Safeguards complete.</h2>
              <ul className="mt-4 space-y-2.5">
                {["Handover request verified", "14 full days elapsed", "No owner stop recorded"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[12.5px] text-[#35502f]">
                    <span aria-hidden>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-6">
              <h2 className="h2">Your next steps</h2>
              <p className="t-body mt-2">
                Review the recovery instructions for the assets included in your share.
              </p>
              <a href="#instructions" className="btn btn-primary btn-sm mt-4 w-full">
                View instructions
              </a>
              <p className="t-meta mt-3">
                A transfer is only executed when the account holder has connected a payout account and the release has run.
              </p>
            </section>

            <section className="card p-6">
              <h2 className="h3">How this happened</h2>
              <ol className="mt-3 space-y-2">
                <li className="t-small">Verified {clockLabel(view.verifiedAt)}</li>
                <li className="t-small">Safety window: 14 full days</li>
                <li className="t-small">Eligible {clockLabel(view.distributedAt)}</li>
              </ol>
              <p className="t-meta mt-3">
                Handover completed {shortDate(view.distributedAt)}. You are seeing only your own share — never the
                estate, and never anyone else&apos;s.
              </p>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
