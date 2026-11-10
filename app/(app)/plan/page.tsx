import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { money, pct, stampLabel } from "@/lib/format";
import { Page, ProgressTicks } from "@/components/ui";
import { SealPlan } from "@/components/plan/SealPlan";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const s = await getSnapshot();
  const done = s.steps.filter((step) => step.done).length;
  const primary = s.beneficiaries.find((b) => b.role === "primary");
  const backups = s.beneficiaries.filter((b) => b.role === "backup");
  const charity = s.beneficiaries.find((b) => b.role === "charity");
  const ready = s.steps.filter((step) => step.key !== "review").every((step) => step.done);

  return (
    <Page>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Your instructions</p>
          <h1 className="h1 mt-2.5">My Plan</h1>
          <p className="t-body mt-2">For the people, projects and causes that matter to you.</p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary self-start">
          Save &amp; exit
        </Link>
      </header>

      <section className="card-lime mb-5 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-7">
        <div>
          <h2 className="h2 text-[1.35rem] text-[var(--color-forest)]">A considered plan. At your pace.</h2>
          <p className="mt-1 text-[12.5px] text-[#42603f]">
            {done} of {s.steps.length} complete ·{" "}
            {s.plan.sealedAt ? `Sealed ${stampLabel(s.plan.sealedAt)}` : `Draft saved ${stampLabel(s.plan.updatedAt)}`}
          </p>
        </div>
        <div className="w-full sm:w-[220px]">
          <ProgressTicks steps={s.steps} />
          <Link href="/dashboard" className="btn btn-primary btn-sm mt-3 w-full">
            Resume review <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <section className="card p-6 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">01 / Assets</p>
              <Link href="/assets" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
                Edit →
              </Link>
            </div>
            <h2 className="h2 mt-2">What you&apos;re passing on</h2>
            <p className="mt-2 text-[13px] font-medium text-[var(--color-brand)]">
              {s.assets.length} account{s.assets.length === 1 ? "" : "s"} · {money(s.totalCents)} sample value
            </p>
            <p className="t-small mt-1">
              {s.assets.length ? s.assets.map((a) => a.label).join(" · ") : "No assets added yet."}
            </p>
          </section>

          <section className="card p-6 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">02 / Beneficiaries</p>
              <Link href="/beneficiaries" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
                Edit →
              </Link>
            </div>
            <h2 className="h2 mt-2">Who receives it</h2>
            <p className="mt-2 text-[13px] font-medium text-[var(--color-brand)]">
              {primary ? `${primary.name} · ${pct(primary.share)} primary share` : "No first choice named"}
            </p>
            <p className="t-small mt-1">
              {backups.length
                ? `Backups: ${backups.map((b) => `${b.name} ${pct(b.share)}`).join(" · ")}`
                : "No family backups named yet."}
            </p>
          </section>

          <section className="card p-6 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">03 / Final cause</p>
              <Link href="/beneficiaries" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
                Edit →
              </Link>
            </div>
            <h2 className="h2 mt-2">A purpose that continues</h2>
            <p className="mt-2 text-[13px] font-medium text-[var(--color-brand)]">
              {charity ? `${charity.name} · ${charity.relationship}` : "No final cause named"}
            </p>
            <p className="t-small mt-1">100% only if your primary and all backups cannot inherit.</p>
          </section>

          <section className="card p-6 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">04 / Keyholder</p>
              <Link href="/settings#keyholder" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
                {s.keyholder ? "View →" : "Assign →"}
              </Link>
            </div>
            <h2 className="h2 mt-2">Someone you trust</h2>
            <p className="mt-2 text-[13px] font-medium text-[var(--color-brand)]">
              {s.keyholder ? `${s.keyholder.name} · ${s.keyholder.relationship} · Assigned` : "No keyholder assigned"}
            </p>
            <p className="t-small mt-1">May initiate a claim only. Cannot see balances or move assets.</p>
          </section>

          <section className="card-mint p-6">
            <h2 className="h3 text-[var(--color-forest)]">14 days. Always time to respond.</h2>
            <p className="t-body mt-1.5 text-[#3c5a4e]">
              A verified claim notifies the account holder. Nothing is released before 14 full days. An owner
              response stops the handover.
            </p>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card p-6">
            <h2 className="h2">Your plan checklist</h2>
            <ul className="mt-5 space-y-3.5">
              {s.steps.map((step, i) => (
                <li key={step.key} className="flex items-center gap-2.5">
                  {step.done ? (
                    <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[var(--color-mint)] text-[10px] text-[var(--color-forest)]">
                      ✓
                    </span>
                  ) : (
                    <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-[var(--color-line-strong)] text-[10px] text-[var(--color-muted)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                  <span
                    className={`text-[13px] ${
                      step.done ? "font-medium text-[var(--color-ink)]" : "text-[var(--color-muted)]"
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-[var(--color-line)] pt-4">
              <SealPlan sealed={Boolean(s.plan.sealedAt)} ready={ready} />
            </div>
          </section>

          <section className="card p-6">
            <h2 className="h2">Life happens. Pause here.</h2>
            <p className="t-body mt-2">
              Setup is optional. Leave anytime and resume this saved draft when you are ready. Drafts never
              move assets.
            </p>
            <Link href="/dashboard" className="btn btn-secondary btn-sm mt-4">
              Back to dashboard
            </Link>
          </section>

          <section className="card p-6">
            <h2 className="h3">Guidance, not secrets.</h2>
            <p className="t-small mt-2">
              Documents hold recovery instructions only. VIVO never asks for a password, private key or
              recovery phrase — and a keyholder never sees one.
            </p>
            <Link href="/documents" className="mt-3 inline-block text-[12.5px] font-semibold text-[var(--color-brand)]">
              Open documents →
            </Link>
          </section>
        </aside>
      </div>
    </Page>
  );
}
