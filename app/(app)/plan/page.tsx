import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { money, pct, stampLabel } from "@/lib/format";
import { Page, ProgressTicks } from "@/components/ui";
import { SealPlan } from "@/components/plan/SealPlan";

const VAULT_LABEL: Record<string, string> = { open: "Open", frozen: "Paused", released: "Released" };

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
        {s.vault ? (
          <span className="pill badge-lime self-start">Vault {s.vault.ref}</span>
        ) : (
          <Link href="/plan/start" className="btn btn-primary self-start">
            {s.steps.every((step) => step.done) ? "Review my plan" : "Continue my plan"} <span aria-hidden>→</span>
          </Link>
        )}
      </header>

      <section className="card-lime mb-5 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-7">
        <div>
          <h2 className="h2 text-[1.35rem] text-[var(--color-forest)]">A considered plan. At your pace.</h2>
          <p className="mt-1 text-[12.5px] text-[#42603f]">
            {done} of {s.steps.length} complete ·{" "}
            {s.plan.sealedAt ? `Sealed ${stampLabel(s.plan.sealedAt)}` : `Saved ${stampLabel(s.plan.updatedAt)}`}
          </p>
        </div>
        <div className="w-full sm:w-[220px]">
          <ProgressTicks steps={s.steps} />
          <Link
            href={s.vault ? "/dashboard" : "/plan/start"}
            className="btn btn-primary btn-sm mt-3 w-full"
          >
            {(s.vault || s.steps.some((step) => step.done)) ? "View my dashboard" : "Start my plan"} <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <section className="card mb-5 p-6 md:p-7" id="vault">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">The vault</p>
            <h2 className="h2 mt-2">
              {s.vault ? "Money with one door" : "No vault yet"}
            </h2>
          </div>
          <span className={`pill ${s.vault?.status === "released" ? "badge-lime" : "badge-neutral"}`}>
            {s.vault ? VAULT_LABEL[s.vault.status] ?? "Open" : "Not started"}
          </span>
        </div>

        {s.vault ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[14px] border border-[var(--color-line)] p-4">
                <p className="label">Reference</p>
                <p className="mt-1.5 text-[13.5px] font-semibold text-[var(--color-ink)]">{s.vault.ref}</p>
              </div>
              <div className="rounded-[14px] border border-[var(--color-line)] p-4">
                <p className="label">Key sent to</p>
                <p className="mt-1.5 truncate text-[13.5px] font-semibold text-[var(--color-ink)]">
                  {s.vault.keyTo ?? "—"}
                </p>
              </div>
              <div className="rounded-[14px] border border-[var(--color-line)] p-4">
                <p className="label">Opened</p>
                <p className="mt-1.5 text-[13.5px] font-semibold text-[var(--color-ink)]">
                  {stampLabel(s.vault.openedAt)}
                </p>
              </div>
            </div>

            <p className="t-small mt-4 max-w-[64ch]">
              The vault can only open one way: an operator researches the death documentation, approves the release,
              and the money is paid to the people this plan names. PayHalo staff cannot withdraw it, change the payees
              or open it without that approval — and the key is required to ask.
            </p>
            <p className="t-meta mt-2 max-w-[64ch]">
              When a release is confirmed, the money is paid to the people you named — and to no one else.
            </p>

            {s.releaseRequests.length > 0 && (
              <ul className="mt-4 divide-y divide-[var(--color-line)]">
                {s.releaseRequests.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[var(--color-ink)]">
                        {r.ref} · {r.status}
                      </span>
                      <span className="t-meta block truncate">
                        {r.requesterName} · {stampLabel(r.createdAt)}
                        {r.adminNote ? ` · ${r.adminNote}` : ""}
                      </span>
                    </span>
                    <span className="pill badge-neutral">{r.status === "pending" ? "with the operator" : r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="mt-3">
            <p className="t-small max-w-[60ch]">
              Starting the plan creates the vault and sends a key to the first person you name. Until a vault exists
              there is nowhere for money to go, so nothing can be transferred in.
            </p>
            <Link href="/plan/start" className="btn btn-primary btn-sm mt-4">
              Start a plan <span aria-hidden>→</span>
            </Link>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <section className="card p-6 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">What you own</p>
              <Link href="/assets" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
                Edit →
              </Link>
            </div>
            <h2 className="h2 mt-2">What you&apos;re passing on</h2>
            <p className="mt-2 text-[13px] font-medium text-[var(--color-brand)]">
              {s.assets.length} account{s.assets.length === 1 ? "" : "s"} · {money(s.totalCents)} combined
            </p>
            <p className="t-small mt-1">
              {s.assets.length ? s.assets.map((a) => a.label).join(" · ") : "No assets added yet."}
            </p>
          </section>

          <section className="card p-6 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">The people</p>
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
              <p className="eyebrow">The final cause</p>
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
              <p className="eyebrow">The keyholder</p>
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
              Setup is optional. Leave anytime and pick it up where you left off. Nothing moves while you are here.
            </p>
            <Link href="/dashboard" className="btn btn-secondary btn-sm mt-4">
              Back to dashboard
            </Link>
          </section>

          <section className="card p-6">
            <h2 className="h3">Guidance, not secrets.</h2>
            <p className="t-small mt-2">
              PayHalo never asks for a password, private key or recovery phrase. A keyholder can start a claim and
              nothing more.
            </p>

          </section>
        </aside>
      </div>
    </Page>
  );
}
