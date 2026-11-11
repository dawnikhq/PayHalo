import Link from "next/link";

export const metadata = {
  title: "PayHalo — leave money well.",
  description:
    "PayHalo is a calm, verified handover for the money you keep in PayPal, in wallets and in your business. Name your people, finish six short steps, and leave a plan instead of a puzzle.",
};

const STEPS = [
  {
    n: "01",
    title: "Your first choice",
    body: "The person who should have it first. One name, an email, and how much of it is theirs.",
  },
  {
    n: "02",
    title: "What you own",
    body: "Your PayPal balance, a wallet, a small business. Rough figures are fine — this is a plan, not an audit.",
  },
  {
    n: "03",
    title: "Family backups",
    body: "Who stands in if your first choice cannot. The order matters more than the amounts.",
  },
  {
    n: "04",
    title: "A final cause",
    body: "The last name on the list. A cause that carries on when nobody in the family can.",
  },
  {
    n: "05",
    title: "Someone you trust",
    body: "A keyholder. They can tell us something has happened — and nothing else.",
  },
  {
    n: "06",
    title: "Review and seal",
    body: "Read it once, in plain words. Sealing opens the vault and sends the key to your first choice.",
  },
];

const ROLES = [
  {
    title: "You",
    body: "Own the plan. Change a name, an amount or a step whenever you like. Nothing moves while you are here.",
    href: "/signup",
    cta: "Start a plan",
  },
  {
    title: "Someone you trust",
    body: "Your keyholder can say that something has happened. They never see balances, names or amounts.",
    href: "/keyholder",
    cta: "The keyholder view",
  },
  {
    title: "The people you name",
    body: "Each person sees their own share and nothing else — and can ask for it to be opened.",
    href: "/beneficiary",
    cta: "The beneficiary view",
  },
];

const BELIEFS = [
  {
    title: "Money should not wait for paperwork",
    body: "An estate can spend months in a queue of forms. A plan that already names people skips that queue, because the decision was made while you were here to make it.",
  },
  {
    title: "The owner always has the last word",
    body: "Every claim is checked, then you are told. Fourteen full days pass before anything moves. One click from you stops it.",
  },
  {
    title: "Trust is a person, not a password",
    body: "We never ask for your PayPal password, a private key or a recovery phrase. The key goes to a human you named, and it proves only that they are that person.",
  },
];

const FAQ = [
  {
    q: "Does my money sit with PayHalo?",
    a: "No. Your money stays in your own PayPal account. When a plan is released, PayPal pays the people you named — we never hold the balance and cannot withdraw it.",
  },
  {
    q: "What happens if I change my mind?",
    a: "You edit the plan. Rename a beneficiary, change a share, replace your keyholder — right up until a release is approved. Nothing is frozen while you are alive and answering.",
  },
  {
    q: "How long does it take?",
    a: "About ten minutes, in as many sittings as you like. Six short steps, saved as you go. You can leave at step two and come back next month.",
  },
  {
    q: "What does it cost?",
    a: "Nothing to start, and nothing to keep a plan. You only ever pay the ordinary PayPal fee on a transfer, exactly as you would sending money from the app.",
  },
  {
    q: "Who can see my plan?",
    a: "You. Your keyholder sees only that a plan exists and can start a claim. A beneficiary sees their own share, after the window closes. Nobody sees the whole picture.",
  },
];

const TRUST = [
  ["Free to start", "No card, no trial, no charge for keeping a plan."],
  ["Ten minutes", "Six steps, saved as you go. Leave and return whenever."],
  ["No passwords", "We never ask for one. The key goes to a person."],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[62px] w-full max-w-[1180px] items-center justify-between gap-3 px-4 sm:h-[70px] sm:gap-4 sm:px-8">
          <Link href="/" className="flex items-baseline gap-2" aria-label="PayHalo home">
            <span className="font-[var(--font-display)] text-[23px] font-extrabold tracking-[-0.055em] text-[var(--color-brand)] sm:text-[25px]">
              payhalo
            </span>
            <span className="hidden text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#94a29a] lg:block">
              what you leave, clearly said
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
            {[
              ["#how", "How it works"],
              ["#about", "About us"],
              ["#roles", "For your people"],
              ["#safety", "Safety"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-[12.5px] font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/signin" className="btn btn-secondary btn-sm hidden sm:inline-flex">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm">
              Sign up
            </Link>
            <details className="relative md:hidden">
              <summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full border border-white/70 bg-white/70 text-[var(--color-ink)] backdrop-blur">
                <span aria-hidden className="text-[15px] leading-none">
                  ≡
                </span>
                <span className="sr-only">Menu</span>
              </summary>
              <div className="glass absolute right-0 mt-2 w-[210px] p-2">
                {[
                  ["#how", "How it works"],
                  ["#about", "About us"],
                  ["#roles", "For your people"],
                  ["#safety", "Safety"],
                ].map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    className="block rounded-[10px] px-3 py-2 text-[13px] text-[var(--color-ink)] hover:bg-white/70"
                  >
                    {label}
                  </a>
                ))}
                <Link
                  href="/signin"
                  className="block rounded-[10px] px-3 py-2 text-[13px] font-semibold text-[var(--color-brand)] hover:bg-white/70"
                >
                  Sign in
                </Link>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-10 sm:px-8 sm:pt-16">
        {/* hero */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.04fr_0.96fr]">
          <div>
            <span className="pill badge-neutral">A plan, not a puzzle</span>
            <h1 className="mt-5 font-[var(--font-display)] text-[clamp(2.3rem,7vw,4rem)] font-medium leading-[1.0] tracking-[-0.04em] text-[var(--color-ink)]">
              Money, left
              <br />
              <span className="text-[var(--color-brand)]">in good hands.</span>
            </h1>
            <p className="t-body mt-5 max-w-[52ch] text-[15px] sm:text-[15.5px]">
              Your PayPal balance, your wallets, your little business — and the people who should have them. Six short
              steps put names, shares and instructions in one place, and a key in the hands of someone you trust.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
              <Link href="/signup" className="btn btn-primary w-full sm:w-auto">
                Create a free account <span aria-hidden>→</span>
              </Link>
              <Link href="#how" className="btn btn-secondary w-full sm:w-auto">
                See how it works
              </Link>
            </div>
            <p className="t-meta mt-4">Free to start · Nothing is ever released while you are here.</p>

            <dl className="mt-8 grid grid-cols-1 gap-3 border-t border-[var(--color-line)] pt-6 sm:grid-cols-3">
              {TRUST.map(([title, body]) => (
                <div key={title}>
                  <dt className="text-[12.5px] font-semibold text-[var(--color-ink)]">{title}</dt>
                  <dd className="t-meta mt-1">{body}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mt-2 lg:mt-0">
            <div className="glass-dark p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label text-white/50">An example plan</p>
                  <p className="mt-1.5 font-[var(--font-display)] text-[18px] font-semibold tracking-[0.01em] text-white sm:text-[19px]">
                    PH-2-KBVLVK
                  </p>
                </div>
                <span className="pill border-white/20 bg-white/12 text-[var(--color-lime)]">sealed</span>
              </div>

              <p className="t-num mt-6 text-[clamp(1.9rem,7vw,2.6rem)] leading-none text-white">$138,000</p>
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

              <div className="mt-5 border-t border-white/12 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10.5px] text-[#8fb098]">The key</span>
                  <span className="font-[var(--font-mono,monospace)] text-[11px] tracking-[0.05em] text-white">
                    PH-2-KBVLVK-5LFF-Q78XT
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-[#8fb098]">
                  One door: confirmed, then paid to these people only.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* the problem */}
        <section className="mt-20 sm:mt-28">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="eyebrow">Why now</p>
              <h2 className="h1 mt-2">
                A folder of passwords
                <br />
                is not a plan.
              </h2>
              <div className="mt-4 max-w-[56ch] space-y-3">
                <p className="t-body">
                  When someone dies, the money is rarely the hard part. The hard part is knowing where it is, who was
                  meant to have it, and who is allowed to say so — while the family is grieving and every account is
                  asking for a password nobody has.
                </p>
                <p className="t-body">
                  PayHalo asks the questions while you can still answer them. Not a will in a drawer: a short,
                  specific plan that names people, shares and a cause, and keeps them somewhere the right person can
                  reach.
                </p>
              </div>
            </div>

            <div className="card-forest p-6 sm:p-8">
              <p className="label">What people actually leave behind</p>
              <ul className="mt-4 space-y-3.5">
                {[
                  ["A PayPal balance", "that nobody knows the login for"],
                  ["A small business", "whose payouts stop when the owner does"],
                  ["A cause they cared about", "with nothing written down"],
                  ["Three people who each think", "they were the first choice"],
                ].map(([lead, rest]) => (
                  <li key={lead} className="flex gap-3 text-[13px] leading-snug text-[#e7f2e9]">
                    <span aria-hidden className="mt-[3px] text-[var(--color-lime)]">
                      —
                    </span>
                    <span>
                      <span className="font-semibold text-white">{lead}</span> {rest}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-white/12 pt-4 text-[12px] leading-relaxed text-[#a9c4b0]">
                Every one of those is a decision, not a document. Decisions are what a plan is for.
              </p>
            </div>
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="mt-20 scroll-mt-24 sm:mt-28">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">How it works</p>
              <h2 className="h1 mt-2">Six steps, in the order you think.</h2>
            </div>
            <p className="t-small max-w-[40ch]">
              About ten minutes, in as many sittings as you like. Leave at any step and come back to it — the plan
              waits exactly where you left it.
            </p>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s) => (
              <section key={s.n} className="card surface-hover p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">{s.n}</p>
                <h3 className="h3 mt-2.5">{s.title}</h3>
                <p className="t-body mt-2">{s.body}</p>
              </section>
            ))}
          </div>

          <div className="card-mint mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <p className="text-[13px] leading-relaxed text-[#3c5a4e]">
              The vault only opens when all six are done — and then the key goes to the first person you named.
            </p>
            <Link href="/signup" className="btn btn-primary btn-sm self-start whitespace-nowrap sm:self-auto">
              Start step one <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        {/* about us */}
        <section id="about" className="mt-20 scroll-mt-24 sm:mt-28">
          <div className="glass grid gap-8 p-6 sm:p-9 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="eyebrow">About us</p>
              <h2 className="h1 mt-2">Built for the family that has to find it.</h2>
              <p className="t-body mt-4 max-w-[46ch]">
                PayHalo started in Lagos, with a question that would not go away: what happens to the PayPal balance of
                someone who dies on a Tuesday, when the people who need it live in three different cities and nobody
                has the login?
              </p>
              <p className="t-body mt-3 max-w-[46ch]">
                We are not a law firm and we do not replace a will. We are the plain, specific instruction that sits
                alongside one — who gets what, in which order, and who gets to say that something has happened.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="pill badge-mint">Works with your PayPal balance</span>
                <span className="pill badge-mint">Built on PayPal</span>
                <span className="pill badge-mint">No passwords stored</span>
              </div>
            </div>

            <div className="space-y-3">
              {BELIEFS.map((b, i) => (
                <div key={b.title} className="rounded-[16px] border border-[var(--color-line)] bg-white/70 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-[2px] grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-mint)] text-[10.5px] font-bold text-[var(--color-forest)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-[13.5px] font-semibold text-[var(--color-ink)]">{b.title}</h3>
                      <p className="t-small mt-1">{b.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* roles */}
        <section id="roles" className="mt-20 scroll-mt-24 sm:mt-28">
          <p className="eyebrow">For your people</p>
          <h2 className="h1 mt-2">Everyone sees only their part.</h2>
          <p className="t-body mt-3 max-w-[52ch]">
            A plan is shared in pieces, on purpose. Nobody gets the whole picture — not the keyholder, not a
            beneficiary, not us.
          </p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {ROLES.map((role) => (
              <section key={role.title} className="card surface-hover flex flex-col p-5 sm:p-6">
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
        <section id="safety" className="mt-20 scroll-mt-24 sm:mt-28">
          <div className="glass-lime grid gap-6 p-6 sm:p-9 md:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="label text-[#4d6b2a]">Safety</p>
              <h2 className="mt-2 font-[var(--font-display)] text-[clamp(1.5rem,4.4vw,2rem)] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-forest)]">
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

        {/* faq */}
        <section className="mt-20 sm:mt-28">
          <p className="eyebrow">Straight answers</p>
          <h2 className="h1 mt-2">The questions people ask first.</h2>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2 sm:gap-4">
            {FAQ.map((item) => (
              <details key={item.q} className="card group p-4 sm:p-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-[13.5px] font-semibold text-[var(--color-ink)]">
                  {item.q}
                  <span
                    aria-hidden
                    className="mt-[1px] text-[var(--color-brand)] transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="t-small mt-2.5">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* closing */}
        <section className="mt-20 text-center sm:mt-28">
          <p className="eyebrow">Start somewhere</p>
          <h2 className="mt-2 font-[var(--font-display)] text-[clamp(1.6rem,5.4vw,2.4rem)] font-medium leading-tight tracking-[-0.03em] text-[var(--color-ink)]">
            Start with one name.
          </h2>
          <p className="t-body mx-auto mt-3 max-w-[46ch]">
            The rest can wait until you have ten minutes. Not a folder of passwords — a plan someone can actually
            follow.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row sm:gap-3">
            <Link href="/signup" className="btn btn-primary">
              Create a free account <span aria-hidden>→</span>
            </Link>
            <Link href="/signin" className="btn btn-secondary">
              I already have a plan
            </Link>
          </div>
          <p className="t-meta mt-4">No card required · Your plan stays yours until you choose to share it.</p>
        </section>
      </main>

      <footer className="border-t border-white/70 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 pb-24 pt-8 sm:px-8 sm:pb-16 sm:pt-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-[var(--font-display)] text-[20px] font-extrabold tracking-[-0.05em] text-[var(--color-brand)]">
              payhalo
            </p>
            <p className="t-small mt-2 max-w-[34ch]">
              What you leave, clearly said. A plan for the money in PayPal, in wallets and in your business — and the
              people who should have it.
            </p>
          </div>

          <div>
            <p className="label">Product</p>
            <ul className="mt-2.5 space-y-1.5">
              {[
                ["#how", "How it works"],
                ["#safety", "Safety"],
                ["/help", "Help"],
                ["/signup", "Create an account"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="label">For your people</p>
            <ul className="mt-2.5 space-y-1.5">
              {[
                ["/signin", "Sign in"],
                ["/keyholder", "Keyholders"],
                ["/beneficiary", "Beneficiaries"],
                ["#about", "About us"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1180px] border-t border-[var(--color-line)] px-4 py-4 sm:px-8">
          <p className="t-meta">
            PayHalo does not hold your money. Transfers are made by PayPal to the people your plan names.
          </p>
        </div>
      </footer>
    </div>
  );
}
