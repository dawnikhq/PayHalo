import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { money, pct, shortDate, stampLabel } from "@/lib/format";
import { SafetyWindowBanner } from "@/components/SafetyWindowBanner";
import { StatusPill } from "@/components/StatusPill";
import { Page, ProgressTicks } from "@/components/ui";
import { MoneyActions } from "@/components/money/MoneyActions";

export const dynamic = "force-dynamic";

const SEGMENT = ["#d9f4a5", "#5fb7a9", "#a9bfb0"];

function greeting(hourUtc: number) {
  if (hourUtc < 12) return "Good morning";
  if (hourUtc < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sealed?: string }>;
}) {
  const { sealed } = await searchParams;
  const s = await getSnapshot();
  const firstName = s.user.name.split(" ")[0];

  const claim = s.claim;
  const isWindow = claim?.status === "window";
  const isDistributed = claim?.status === "distributed";
  const claimAnnounced = isWindow || isDistributed;

  const done = s.steps.filter((step) => step.done).length;
  const remaining = s.steps.length - done;
  const primary = s.beneficiaries.find((b) => b.role === "primary");
  const backups = s.beneficiaries.filter((b) => b.role === "backup");
  const charity = s.beneficiaries.find((b) => b.role === "charity");
  const nextStep = s.steps.find((step) => !step.done);

  return (
    <Page>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Your legacy, at a glance</p>
          <h1 className="h1 mt-2.5">
            {greeting(new Date().getUTCHours() + 1)}, {firstName}.
          </h1>
          <p className="t-body mt-2">A little more clarity. A lot more peace of mind.</p>
        </div>
        <Link href="/assets" className="btn btn-primary self-start">
          Manage assets <span aria-hidden>→</span>
        </Link>
      </header>

      {sealed && (
        <div className="card-mint mb-5 flex items-start gap-3 p-5">
          <span aria-hidden className="text-[15px] text-[var(--color-brand)]">✓</span>
          <p className="t-body text-[var(--color-forest)]">
            Your plan is sealed. {s.beneficiaries.length} recipient
            {s.beneficiaries.length === 1 ? "" : "s"} on file and {s.keyholder?.name ?? "your keyholder"} can
            start a handover whenever it&apos;s needed.
          </p>
        </div>
      )}

      {isWindow && claim && (
        <div className="mb-5">
          <SafetyWindowBanner
            seconds={s.secondsToWindowEnd ?? 0}
            claimId={claim.id}
            initiatedAt={claim.initiatedAt}
          />
        </div>
      )}

      {isDistributed && claim && (
        <div className="card-lime mb-5 p-6">
          <p className="label text-[#4d6b2a]">Handover complete</p>
          <p className="h2 mt-1.5 text-[var(--color-forest)]">The window closed with no response.</p>
          <p className="t-body mt-1.5 text-[#3f5b3a]">
            {money(s.totalCents)} was allocated across {s.distributions.length} recipient
            {s.distributions.length === 1 ? "" : "s"} on {shortDate(claim.distributedAt)}. Every step is on
            the activity trail.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link href="/beneficiary" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
              See the beneficiary view →
            </Link>
            <Link href="/activity" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
              Review the trail →
            </Link>
          </div>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
        {/* estate */}
        <section className="card-forest p-6 md:p-7">
          <p className="label">Assets</p>
          <p className="t-num mt-2.5 text-[clamp(2.1rem,4.2vw,2.9rem)] leading-none text-white">
            {money(s.totalCents)}
          </p>
          <p className="mt-2 text-[12.5px] text-[#b7cfbd]">
            {s.assets.length} account{s.assets.length === 1 ? "" : "s"} · USD equivalent · as you recorded them
          </p>

          <div className="mt-7 flex h-2.5 gap-[3px]" role="img" aria-label="Asset share of the estate">
            {s.assets.length ? (
              s.assets.map((a, i) => (
                <span
                  key={a.id}
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, (a.balanceCents / (s.totalCents || 1)) * 100)}%`,
                    background: SEGMENT[i % SEGMENT.length],
                  }}
                />
              ))
            ) : (
              <span className="h-full w-full rounded-full bg-white/15" />
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            {s.assets.map((a, i) => (
              <span key={a.id} className="flex items-center gap-1.5 text-[11.5px] text-[#b7cfbd]">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: SEGMENT[i % SEGMENT.length] }}
                  aria-hidden
                />
                {a.label.split(" ")[0]} {pct(s.totalCents ? (a.balanceCents / s.totalCents) * 100 : 0)}
              </span>
            ))}
            <span className="t-meta ml-auto text-white/35">Your record</span>
          </div>
        </section>

        {/* money — directly under the asset card */}
        <MoneyActions flush />

        {/* the vault the money belongs to */}
        <section className="card p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="label">The vault</p>
              <p className="mt-2 text-[13.5px] font-semibold text-[var(--color-ink)]">
                {s.vault ? s.vault.ref : "No vault yet"}
              </p>
            </div>
            <span className="pill badge-neutral">{s.vault ? { open: "Open", frozen: "Paused", released: "Released" }[s.vault.status] ?? "Open" : "Not started"}</span>
          </div>

          {s.vault ? (
            <>
              <p className="t-num mt-4 text-[clamp(1.6rem,3vw,2rem)] leading-none text-[var(--color-forest)]">
                {money(s.stashCents + s.pots.reduce((n, pot) => n + pot.allocatedCents, 0) + s.totalCents)}
              </p>
              <p className="t-meta mt-1.5">held for this plan · pays {s.beneficiaries.length} named people</p>
              <p className="t-small mt-3">
                {s.vault.keyTo ? `Key sent to ${s.vault.keyTo}.` : "No key delivered yet."} Only an operator-approved
                release opens this vault, and it pays the people your plan names — nobody else.
              </p>
              {s.releaseRequests.length > 0 && (
                <p className="t-meta mt-2">
                  Release {s.releaseRequests[0].ref} · {s.releaseRequests[0].status}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Link href="/plan#vault" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
                  See the vault on My Plan →
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="t-small mt-3 max-w-[52ch]">
                Money has nowhere to sit until the vault exists. Starting the plan opens it and sends the key to the
                first person you name.
              </p>
              <Link href="/plan/start" className="btn btn-primary btn-sm mt-4">
                Start a plan <span aria-hidden>→</span>
              </Link>
            </>
          )}
        </section>
        </div>

        {/* plan progress */}
        <section className="card-lime flex flex-col p-6 md:p-7">
          <p className="label text-[#4d6b2a]">Your plan / {s.plan.sealedAt ? "sealed" : "in progress"}</p>
          <p className="h2 mt-2 text-[1.35rem] text-[var(--color-forest)]">
            {remaining === 0
              ? "Every step is in place."
              : remaining === 1
                ? "One review to go."
                : `${remaining} steps to go.`}
          </p>
          <p className="mt-1 text-[12.5px] text-[#42603f]">
            {done} of {s.steps.length} steps complete
          </p>

          <div className="mt-5">
            <ProgressTicks steps={s.steps} />
          </div>

          <p className="mt-4 flex-1 text-[12.5px] leading-relaxed text-[#3f5b3a]">
            {nextStep ? `Next: ${nextStep.label.toLowerCase()}.` : "Review anything you like, any time."}
            <br />
            Saved {stampLabel(s.plan.updatedAt)}.
          </p>

          <Link href="/plan" className="btn btn-primary mt-5 w-full">
            {nextStep ? "Resume review" : "Review plan"} <span aria-hidden>→</span>
          </Link>
        </section>
      </div>


      <div className="mt-5 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        {/* assets table */}
        <section className="card p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <h2 className="h2">Everything in one place</h2>
            <Link href="/assets" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
              Manage →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--color-line)] pb-2">
            <p className="label">Account</p>
            <p className="label">Value</p>
          </div>
          <ul className="divide-y divide-[var(--color-line)]">
            {s.assets.map((a) => (
              <li key={a.id}>
                <Link href={`/assets/${a.id}`} className="row-link -mx-2 flex items-center justify-between gap-4 rounded-[10px] px-2 py-4">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-[var(--color-ink)]">{a.label}</span>
                    <span className="t-small block truncate">{a.detail}</span>
                  </span>
                  <span className="t-num shrink-0 text-[13.5px] text-[var(--color-ink)]">
                    {money(a.balanceCents)}
                  </span>
                </Link>
              </li>
            ))}
            {!s.assets.length && (
              <li className="py-6">
                <p className="t-small">
                  Nothing added yet.{" "}
                  <Link href="/assets/new" className="font-semibold text-[var(--color-brand)]">
                    Add your first asset
                  </Link>
                  .
                </p>
              </li>
            )}
          </ul>
        </section>

        {/* safety window */}
        <section className="card p-6 md:p-7">
          <h2 className="h2">Protected by time.</h2>
          <div className="mt-5 flex items-end gap-3">
            <p className="t-num text-[46px] leading-none text-[var(--color-forest)]">14</p>
            <p className="pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Day safety window
            </p>
          </div>
          <p className="t-body mt-4">
            A verified claim sends you a notice first. No assets are released before 14 full days.
          </p>
          <div className="mt-4 border-t border-[var(--color-line)] pt-4">
            <p className="text-[12.5px] font-medium text-[var(--color-ink)]">Your response stops the handover.</p>
            <div className="mt-3">
              <StatusPill status={claimAnnounced && claim ? claim.status : s.plan.status} />
            </div>
          </div>
        </section>
      </div>

      <section className="card mt-5 p-6 md:p-7">
        <h2 className="h2">A plan for the people who matter.</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="label">01 First choice</p>
            <p className="mt-2 text-[13.5px] font-medium text-[var(--color-ink)]">
              {primary ? `${primary.name} · ${pct(primary.share)}` : "Not named yet"}
            </p>
            <p className="t-small mt-0.5">{primary?.relationship ?? "Add a primary beneficiary"}</p>
          </div>
          <div>
            <p className="label">02 Family backups</p>
            <p className="mt-2 text-[13.5px] font-medium text-[var(--color-ink)]">
              {backups.length
                ? `${backups.map((b) => b.name.split(" ")[0]).join(" & ")} · ${
                    backups.every((b) => b.share === backups[0].share)
                      ? `${pct(backups[0].share)} each`
                      : backups.map((b) => pct(b.share)).join(" / ")
                  }`
                : "None yet"}
            </p>
            <p className="t-small mt-0.5">Only used if the first choice can&apos;t inherit.</p>
          </div>
          <div>
            <p className="label">03 Final cause</p>
            <p className="mt-2 text-[13.5px] font-medium text-[var(--color-ink)]">
              {charity ? `${charity.name} · 100%` : "None yet"}
            </p>
            <p className="t-small mt-0.5">Only if no named person can inherit.</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
          <p className="t-meta">Everyone is notified in the order written here, and only they see their own share.</p>
          <Link href="/beneficiaries" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
            Manage beneficiaries →
          </Link>
        </div>
      </section>
    </Page>
  );
}
