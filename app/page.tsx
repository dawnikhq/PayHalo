import Link from "next/link";
import { footerNote } from "@/lib/paypal";

export const metadata = {
  title: "PayHalo — Your legacy, considered.",
};

const PILLARS = [
  {
    n: "01 / Organise",
    title: "Gather what matters.",
    body: "Add accounts, digital assets and practical recovery instructions — in one private place.",
  },
  {
    n: "02 / Care",
    title: "Choose your people.",
    body: "Name a primary beneficiary, family backups and a final cause. A clear order, written down.",
  },
  {
    n: "03 / Protect",
    title: "Leave clear instructions.",
    body: "Choose a trusted keyholder, then review and seal your plan when you are ready.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-[68px] w-full max-w-[1180px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="flex items-baseline gap-2" aria-label="PayHalo home">
            <span className="font-[var(--font-display)] text-[26px] font-extrabold tracking-[-0.055em] text-[var(--color-brand)]">
              payhalo
            </span>
            <span className="hidden text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#94a29a] sm:block">
              Your legacy, considered
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Sections">
            <a href="#how" className="text-[12.5px] font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              How it works
            </a>
            <Link href="/keyholder" className="text-[12.5px] font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              For keyholders
            </Link>
            <Link href="/beneficiary" className="text-[12.5px] font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              For beneficiaries
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="btn btn-secondary btn-sm hidden sm:inline-flex">
              Open your dashboard
            </Link>
            <Link href="/onboarding" className="btn btn-primary btn-sm">
              Start a plan
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <section className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="eyebrow">Welcome to PayHalo</p>
            <h1 className="mt-3 font-[var(--font-display)] text-[clamp(2.3rem,5vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.03em] text-[var(--color-ink)]">
              Your life, thoughtfully passed on.
            </h1>
            <p className="t-body mt-4 max-w-[52ch] text-[15px]">
              Bring your digital assets and the people you care about into one clear, considered plan. No
              passwords ever leave your hands, and nothing transfers while you are alive.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/onboarding" className="btn btn-primary">
                Start my plan <span aria-hidden>→</span>
              </Link>
              <Link href="/dashboard" className="btn btn-secondary">
                Explore dashboard
              </Link>
            </div>
            <p className="t-meta mt-3">Optional. Save as you go. Nothing is sealed without you.</p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3" id="how">
              {PILLARS.map((p) => (
                <div key={p.n}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--color-brand)]">{p.n}</p>
                  <p className="mt-2 text-[14px] font-semibold text-[var(--color-ink)]">{p.title}</p>
                  <p className="t-small mt-1">{p.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-forest p-6 md:p-8">
            <p className="label">For everything that matters</p>
            <div className="mt-5 space-y-4">
              <p className="font-[var(--font-display)] text-[22px] font-medium leading-tight text-white">
                Your choices.
              </p>
              <p className="font-[var(--font-display)] text-[22px] font-medium leading-tight text-white">
                Your people.
              </p>
              <p className="font-[var(--font-display)] text-[22px] font-medium leading-tight text-[var(--color-lime)]">
                Your pace.
              </p>
            </div>
            <p className="mt-6 text-[12px] text-[#8fb098]">Always in your control.</p>

            <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
              <div>
                <p className="t-num text-[24px] leading-none text-white">0</p>
                <p className="mt-1.5 text-[11px] text-[#8fb098]">Passwords PayHalo ever asks for</p>
              </div>
              <div>
                <p className="t-num text-[24px] leading-none text-[var(--color-lime)]">14</p>
                <p className="mt-1.5 text-[11px] text-[#8fb098]">Days of safety, always</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Account holder",
              body: "Owns and edits the plan. Can stop a handover at any time.",
              href: "/dashboard",
              cta: "Open the dashboard",
            },
            {
              title: "Keyholder",
              body: "Can start a claim and submit evidence. Cannot see balances or move assets.",
              href: "/keyholder",
              cta: "Open the keyholder portal",
            },
            {
              title: "Beneficiary",
              body: "Sees only their own entitlement, and only after the full safety window.",
              href: "/beneficiary",
              cta: "Open the beneficiary view",
            },
          ].map((role) => (
            <section key={role.title} className="card surface-hover flex flex-col p-6">
              <h2 className="h2">{role.title}</h2>
              <p className="t-body mt-2 flex-1">{role.body}</p>
              <Link href={role.href} className="mt-4 text-[12.5px] font-semibold text-[var(--color-brand)]">
                {role.cta} →
              </Link>
            </section>
          ))}
        </section>

        <section className="card-mint mt-4 p-6 md:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-[62ch]">
              <h2 className="h2 text-[var(--color-forest)]">Protected by time.</h2>
              <p className="t-body mt-1.5 text-[#3c5a4e]">
                A verified claim sends the account holder a notice first. No assets are released before 14
                full days, and a response stops the handover.
              </p>
            </div>
            <Link href="/help" className="btn btn-secondary btn-sm shrink-0">
              Read the safety notice
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-2 px-5 pb-24 pt-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:pb-20">
          <p className="t-meta">{footerNote()}</p>
          <p className="font-[var(--font-display)] text-[12.5px] font-semibold tracking-[0.02em] text-[var(--color-forest)]">
            PayHalo / Your legacy, considered.
          </p>
        </div>
      </footer>
    </div>
  );
}
