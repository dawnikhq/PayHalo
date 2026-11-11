import Link from "next/link";
import { footerNote } from "@/lib/paypal";

export const metadata = {
  title: "PayHalo — what you leave, clearly said.",
  description:
    "PayHalo is a calm, verified handover for the money you keep in PayPal, in wallets and in your business. Name your people, open a vault, and leave instructions instead of a puzzle.",
};

const PILLARS = [
  {
    n: "01",
    title: "Say who matters",
    body: "A first choice, the people who come after them, and a cause at the end. A clear order, in your words.",
  },
  {
    n: "02",
    title: "Gather what you own",
    body: "Balances, wallets, a small business. Rough figures are fine — this is a plan, not an audit.",
  },
  {
    n: "03",
    title: "Open the vault",
    body: "Once the plan is complete, the money gets a home with one door and a key in someone's hands.",
  },
];

const ROLES = [
  {
    title: "You",
    body: "Own the plan. Change it whenever you like. Nothing ever moves while you are here.",
    href: "/signup",
    cta: "Start a plan",
  },
  {
    title: "Someone you trust",
    body: "They can say that something has happened. They never see balances, names or amounts.",
    href: "/keyholder",
    cta: "The keyholder view",
  },
  {
    title: "The people you name",
    body: "They see their own share and nothing else, and they can ask for it to be opened.",
    href: "/beneficiary",
    cta: "The beneficiary view",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] w-full max-w-[1180px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="flex items-baseline gap-2" aria-label="PayHalo home">
            <span className="font-[var(--font-display)] text-[25px] font-extrabold tracking-[-0.055em] text-[var(--color-brand)]">
              payhalo
            </span>
            <span className="hidden text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#94a29a] sm:block">
              what you leave, clearly said
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
            <a href="#how" className="text-[12.5px] font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)]">
              How it works
            </a>
            <a href="#roles" className="text-[12.5px] font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)]">
              For your people
            </a>
            <a href="#safety" className="text-[12.5px] font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)]">
              Safety
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/signin" className="btn btn-secondary btn-sm hidden sm:inline-flex">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm">
              Start a plan
            </Link>
            <details className="relative md:hidden">
              <summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full border border-white/70 bg-white/70 text-[var(--color-ink)] backdrop-blur">
                <span aria-hidden className="text-[15px] leading-none">≡</span>
                <span className="sr-only">Menu</span>
              </summary>
              <div className="glass absolute right-0 mt-2 w-[190px] p-2">
                <a href="#how" className="block rounded-[10px] px-3 py-2 text-[13px] text-[var(--color-ink)] hover:bg-white/70">
                  How it works
                </a>
                <a href="#roles" className="block rounded-[10px] px-3 py-2 text-[13px] text-[var(--color-ink)] hover:bg-white/70">
                  For your people
                </a>
                <a href="#safety" className="block rounded-[10px] px-3 py-2 text-[13px] text-[var(--color-ink)] hover:bg-white/70">
                  Safety
                </a>
                <Link href="/signin" className="block rounded-[10px] px-3 py-2 text-[13px] font-semibold text-[var(--color-brand)] hover:bg-white/70">
                  Sign in
                </Link>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        {/* hero */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.04fr_0.96fr]">
          <div>
            <span className="pill badge-neutral">A plan, not a puzzle</span>
            <h1 className="mt-5 font-[var(--font-display)] text-[clamp(2.4rem,5.4vw,3.9rem)] font-medium leading-[1.02] tracking-[-0.035em] text-[var(--color-ink)]">
              What you leave,
              <br />
              <span className="text-[var(--color-brand)]">clearly said.</span>
            </h1>
            <p className="t-body mt-5 max-w-[50ch] text-[15px]">
              The money in your PayPal, your wallets, your little business — and the people who should have it. One
              considered plan, a vault with one door, and a key in someone&rsquo;s hands.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn btn-primary">
                Start my plan <span aria-hidden>→</span>
              </Link>
              <Link href="#how" className="btn btn-secondary">
                See how it works
              </Link>
            </div>
            <p className="t-meta mt-4">Free to start · Nothing is ever released while you are here.</p>
          </div>

          <div className="relative">
            <div className="glass-dark p-6 md:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label text-white/50">The vault</p>
                  <p className="mt-1.5 font-[var(--font-display)] text-[19px] font-semibold tracking-[0.01em] text-white">
                    PH-2-KBVLVK
                  </p>
                </div>
                <span className="pill border-white/20 bg-white/12 text-[var(--color-lime)]">open</span>
              </div>

              <p className="t-num mt-6 text-[clamp(2rem,4.4vw,2.6rem)] leading-none text-white">$138,000</p>
              <p className="mt-2 text-[11.5px] text-[#a9c4b0]">held for the people named below</p>

              <div className="mt-6 space-y-2.5 border-t border-white/12 pt-5">
                {[
                  ["Chidi", "first choice", "60%"],
                  ["Tunde", "family backup", "30%"],
                  ["The Foundation", "final cause", "10%"],
                ].map(([who, role, share]) => (
                  <div key={who} className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-white">{who}</span>
                      <span className="block text-[10.5px] text-[#8fb098]">{role}</span>
                    </span>
                    <span className="t-num text-[13px] text-[var(--color-lime)]">{share}</span>
                  </div>
                ))}
              </div>

              <p className="mt-5 border-t border-white/12 pt-4 text-[11px] text-[#8fb098]">
                One door: confirmed, then paid to these people only.
              </p>
            </div>

            <div className="glass absolute -bottom-6 -left-4 hidden w-[210px] p-4 sm:block">
              <p className="label">The key</p>
              <p className="mt-1.5 font-[var(--font-mono,monospace)] text-[12px] tracking-[0.06em] text-[var(--color-ink)]">
                PH-2-KBVLVK-5LFF-Q78XT
              </p>
              <p className="t-meta mt-1.5">Sent once, to one person.</p>
            </div>
          </div>
        </section>

        {/* pillars */}
        <section id="how" className="mt-24 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">How it works</p>
              <h2 className="h1 mt-2">Three things, in order.</h2>
            </div>
            <p className="t-small max-w-[38ch]">
              About ten minutes, in as many sittings as you like. Leave at any step and come back to it.
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {PILLARS.map((p) => (
              <section key={p.n} className="card surface-hover p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">{p.n}</p>
                <h3 className="h2 mt-3">{p.title}</h3>
                <p className="t-body mt-2">{p.body}</p>
              </section>
            ))}
          </div>
        </section>

        {/* roles */}
        <section id="roles" className="mt-20 scroll-mt-24">
          <p className="eyebrow">For your people</p>
          <h2 className="h1 mt-2">Everyone sees only their part.</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {ROLES.map((role) => (
              <section key={role.title} className="card surface-hover flex flex-col p-6">
                <h3 className="h2">{role.title}</h3>
                <p className="t-body mt-2 flex-1">{role.body}</p>
                <Link href={role.href} className="mt-4 text-[12.5px] font-semibold text-[var(--color-brand)]">
                  {role.cta} →
                </Link>
              </section>
            ))}
          </div>
        </section>

        {/* safety */}
        <section id="safety" className="mt-20 scroll-mt-24">
          <div className="glass-lime grid gap-6 p-7 md:grid-cols-[1.3fr_1fr] md:p-9">
            <div>
              <p className="label text-[#4d6b2a]">Safety</p>
              <h2 className="mt-2 font-[var(--font-display)] text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-forest)]">
                Protected by time, not by trust.
              </h2>
              <p className="mt-3 max-w-[54ch] text-[13px] leading-relaxed text-[#3f5b3a]">
                A claim is checked, then you are told — and nothing moves for fourteen full days. If you answer, it
                stops. No one at PayHalo can open a vault on their own.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 self-center">
              <div>
                <p className="t-num text-[30px] leading-none text-[var(--color-forest)]">14</p>
                <p className="mt-1.5 text-[11px] text-[#4d6b2a]">days to answer, always</p>
              </div>
              <div>
                <p className="t-num text-[30px] leading-none text-[var(--color-forest)]">0</p>
                <p className="mt-1.5 text-[11px] text-[#4d6b2a]">passwords we ever ask for</p>
              </div>
            </div>
          </div>
        </section>

        {/* closing */}
        <section className="mt-20 text-center">
          <h2 className="font-[var(--font-display)] text-[clamp(1.6rem,3.4vw,2.3rem)] font-medium leading-tight tracking-[-0.03em] text-[var(--color-ink)]">
            The kind thing to leave behind.
          </h2>
          <p className="t-body mx-auto mt-3 max-w-[46ch]">
            Not a folder of passwords. A plan someone can actually follow.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn btn-primary">
              Start my plan <span aria-hidden>→</span>
            </Link>
            <Link href="/signin" className="btn btn-secondary">
              I already have one
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/70 bg-white/50 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-2 px-5 pb-24 pt-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:pb-20">
          <p className="t-meta">{footerNote()}</p>
          <div className="flex items-center gap-5">
            <Link href="/help" className="text-[11.5px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              Help
            </Link>
            <Link href="/keyholder" className="text-[11.5px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              Keyholders
            </Link>
            <Link href="/beneficiary" className="text-[11.5px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              Beneficiaries
            </Link>
            <p className="font-[var(--font-display)] text-[12px] font-semibold tracking-[0.02em] text-[var(--color-forest)]">
              PayHalo
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
