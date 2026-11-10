import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { money, pct } from "@/lib/format";
import { Page, EmptyState } from "@/components/ui";
import { AllocationEditor } from "@/components/beneficiaries/AllocationEditor";
import { PersonDialog } from "@/components/beneficiaries/PersonDialog";

export const dynamic = "force-dynamic";

export default async function BeneficiariesPage() {
  const s = await getSnapshot();
  const primary = s.beneficiaries.find((b) => b.role === "primary");
  const backups = s.beneficiaries.filter((b) => b.role === "backup");
  const charity = s.beneficiaries.find((b) => b.role === "charity");
  const locked = Boolean(s.claim && s.claim.status !== "cancelled" && s.claim.status !== "distributed");

  return (
    <Page>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">People &amp; purpose</p>
          <h1 className="h1 mt-2.5">Beneficiaries</h1>
          <p className="t-body mt-2">A clear order of care. No ambiguity about who comes next.</p>
        </div>
        <PersonDialog label="+ Add beneficiary" className="self-start" />
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          {/* primary */}
          <section className="card-forest p-6 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <p className="label">01 / First choice</p>
              {primary && (
                <PersonDialog
                  person={primary}
                  label="Edit"
                  variant="quiet"
                  className="!text-[var(--color-lime)]"
                />
              )}
            </div>
            {primary ? (
              <>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-[var(--font-display)] text-[26px] font-semibold leading-tight text-white">
                      {primary.name}
                    </h2>
                    <p className="mt-1 text-[12.5px] text-[#b7cfbd]">
                      {primary.relationship}
                      {primary.email ? ` · ${primary.email}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="t-num text-[30px] leading-none text-[var(--color-lime)]">{pct(primary.share)}</p>
                    <p className="mt-1 text-[11.5px] text-[#a9c4b0]">of your legacy</p>
                  </div>
                </div>
                <p className="mt-5 border-t border-white/10 pt-4 text-[12px] text-[#b7cfbd]">
                  Primary beneficiary receives the full share if able to inherit, worth{" "}
                  {money(Math.round((s.totalCents * primary.share) / 100))} in this simulation.
                </p>
              </>
            ) : (
              <div className="mt-4">
                <h2 className="h2 text-white">No first choice yet.</h2>
                <p className="t-body mt-2 text-[#b7cfbd]">
                  Name the person who should receive your estate first.
                </p>
              </div>
            )}
          </section>

          {/* backups */}
          <section className="card p-6 md:p-7">
            <AllocationEditor backups={backups} locked={locked} />
          </section>

          {/* final cause */}
          <section className="card p-6 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">03 / Final cause</p>
              {charity && <PersonDialog person={charity} label="Edit" variant="quiet" />}
            </div>
            {charity ? (
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="h2">{charity.name}</h2>
                  <p className="t-small mt-1">
                    {charity.relationship}
                    {charity.email ? ` · ${charity.email}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="t-num text-[24px] leading-none text-[var(--color-ink)]">100%</p>
                  <p className="t-meta mt-1">final fallback</p>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No final cause yet"
                body="A charity or cause means the plan still lands somewhere if no named person can inherit."
              />
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="t-meta">Changes saved to draft · Only you can edit or seal.</p>
            <Link href="/plan" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
              Review the plan →
            </Link>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="card p-6">
            <h2 className="h2">How the order works</h2>
            <dl className="mt-5 space-y-5">
              <div>
                <dt className="text-[13px] font-semibold text-[var(--color-ink)]">Primary comes first.</dt>
                <dd className="t-small mt-1">
                  {primary ? `${primary.name.split(" ")[0]} receives ${pct(primary.share)} if able to inherit.` : "No primary named."}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] font-semibold text-[var(--color-ink)]">Backups, only if needed.</dt>
                <dd className="t-small mt-1">
                  {backups.length
                    ? `If the first choice can't inherit, ${backups.map((b) => b.name.split(" ")[0]).join(" and ")} share the estate ${backups.map((b) => pct(b.share)).join(" / ")}.`
                    : "Add family backups so the plan has a second circle of care."}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] font-semibold text-[var(--color-ink)]">A final cause.</dt>
                <dd className="t-small mt-1">
                  {charity
                    ? `${charity.name} receives 100% only if no named person can inherit.`
                    : "A final cause receives 100% only if no named person can inherit."}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card-mint p-6">
            <h2 className="h2 text-[var(--color-forest)]">Private, by design.</h2>
            <p className="t-body mt-3 text-[#3c5a4e]">
              Beneficiaries do not see your accounts, balances or other recipients while you are alive.
            </p>
            <p className="t-body mt-3 text-[#3c5a4e]">
              After a verified handover and the full safety window, each person sees only their own
              entitlement.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="h3">A record, not a transfer.</h2>
            <p className="t-small mt-2">
              Naming someone here does not give them access. It records your intention, and the handover
              only runs after verification and 14 full days.
            </p>
          </section>
        </aside>
      </div>
    </Page>
  );
}
