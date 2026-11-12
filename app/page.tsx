import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "PayHalo — your wealth deserves more than a forgotten password.",
  description:
    "PayHalo is a digital inheritance platform that helps you document what you own, decide who inherits it and leave instructions for how your wealth should be handled.",
};

const STATS = [
  ["4", "decisions to a finished plan"],
  ["14", "days to cancel a wrong request"],
  ["0", "passwords or private keys stored"],
  ["1", "Trusted Key to start the process"],
];

const FEATURES = [
  {
    eyebrow: "Asset records",
    title: "Give every account a place in your inheritance records.",
    body: "Document your digital payment accounts, cryptocurrency wallets and online businesses, so important parts of your financial life don't disappear from the picture simply because they exist on different platforms.",
    cta: "Record my assets",
    href: "/assets",
    tone: "photo",
  },
  {
    eyebrow: "Beneficiaries",
    title: "Put names and percentages behind your intentions.",
    body: "Choose who should inherit from you and assign each person a share, so the distribution is based on decisions you've made rather than assumptions someone else has to make.",
    cta: "Choose my beneficiaries",
    href: "/beneficiaries",
    tone: "plain",
  },
  {
    eyebrow: "Backup beneficiaries",
    title: "Keep your arrangements useful when your first choice cannot inherit.",
    body: "Name alternative beneficiaries and decide how their shares should be distributed, giving your inheritance plan another route if your primary beneficiaries are unable to receive it.",
    cta: "Set my alternatives",
    href: "/beneficiaries",
    tone: "plain",
  },
  {
    eyebrow: "Trusted Key",
    title: "Give someone the responsibility to start the process, without giving them control today.",
    body: "Appoint a Trusted Key to submit the required proof of death and initiate the handover process, while keeping your assets and inheritance instructions inaccessible to them during your lifetime.",
    cta: "Appoint my Trusted Key",
    href: "/plan/start",
    tone: "dark",
  },
  {
    eyebrow: "The safety window",
    title: "An incorrect request shouldn't be enough to set an inheritance in motion.",
    body: "Every handover request includes a 14-day response window for the account holder to receive notification and cancel a request made in error before the process proceeds.",
    cta: null,
    href: null,
    tone: "lime",
  },
  {
    eyebrow: "Final beneficiary",
    title: "Give your inheritance somewhere to go if none of your chosen people can receive it.",
    body: "Nominate a charity or nonprofit as your final beneficiary, so your recorded intentions can still support a cause you believe in if none of your primary or backup beneficiaries can inherit.",
    cta: "Choose a final beneficiary",
    href: "/beneficiaries",
    tone: "photo",
  },
];

const HOW = [
  {
    n: "01",
    title: "Record what you own",
    lead: "Bring your digital accounts into one record.",
    body: "Add the payment platforms, wallets, businesses and other digital assets you want included, with enough identifying information to help your beneficiaries understand what exists.",
  },
  {
    n: "02",
    title: "Decide who inherits",
    lead: "Give every beneficiary a defined place in your arrangements.",
    body: "Choose your primary beneficiaries, assign their shares and name alternatives in case your first choices cannot inherit.",
  },
  {
    n: "03",
    title: "Appoint a Trusted Key",
    lead: "Choose the person who can initiate the process.",
    body: "Your Trusted Key submits the required proof of death when necessary, without receiving access to your accounts or permission to change your inheritance instructions.",
  },
  {
    n: "04",
    title: "Allow the handover process to proceed",
    lead: "Give your instructions a process to follow.",
    body: "After the required verification and 14-day safety window, the handover can proceed according to your recorded arrangements and the requirements of the relevant platforms and institutions.",
  },
];

const FAQ = [
  {
    q: "What is PayHalo?",
    a: "PayHalo is a digital inheritance platform that helps people record their digital assets, select beneficiaries, assign inheritance shares and appoint a Trusted Key to initiate the handover process if they pass away.",
  },
  {
    q: "What makes digital inheritance different?",
    a: "A growing part of personal wealth exists across digital platforms. Unlike physical property that may be visible or documented through familiar channels, digital assets can be difficult for family members to discover, identify and claim. PayHalo helps address the information and instruction gaps by giving owners a place to record what exists and what they want done with it.",
  },
  {
    q: "Does PayHalo hold my money or cryptocurrency?",
    a: "No. PayHalo is not a wallet, bank or custodian. It records information about your digital assets and your inheritance instructions. Actual access and transfer depend on the provider holding each asset and its applicable procedures.",
  },
  {
    q: "Does PayHalo need my passwords or private keys?",
    a: "No. You should never provide your account passwords, cryptocurrency private keys or recovery phrases. PayHalo is designed to record asset information and inheritance preferences, not collect credentials that grant direct access to your accounts.",
  },
  {
    q: "Can I leave different amounts to different people?",
    a: "Yes. You can name multiple beneficiaries and assign percentages according to your intentions. Your distribution should account for the full inheritance allocation.",
  },
  {
    q: "What happens if a beneficiary passes away before me or cannot inherit?",
    a: "You can specify backup beneficiaries who may be considered if your primary beneficiary cannot inherit. You can also record how their shares should be distributed.",
  },
  {
    q: "Why can I nominate a charity?",
    a: "A charity or nonprofit can serve as your final beneficiary if none of your primary or backup beneficiaries can inherit. This gives you an alternative destination for your inheritance under that specific circumstance.",
  },
  {
    q: "What can my Trusted Key do?",
    a: "Your Trusted Key can initiate a handover request by submitting the required proof of death. They cannot access your assets or change your inheritance instructions while you're alive.",
  },
  {
    q: "Why is there a 14-day safety window?",
    a: "It provides the account holder with an opportunity to respond if a handover request is submitted incorrectly. The account holder is notified and has 14 days to cancel the request before the process can proceed, provided the required verification has been completed.",
  },
  {
    q: "Does PayHalo automatically transfer my assets?",
    a: "PayHalo records your instructions and supports the handover process, but it cannot guarantee automatic access to or transfer of every asset. Each provider may have its own inheritance, verification and documentation requirements, and transfers remain subject to applicable laws and platform procedures.",
  },
  {
    q: "Can I change my arrangements?",
    a: "Yes. You can update your recorded assets, beneficiaries, distribution preferences, final beneficiary and Trusted Key as your circumstances change.",
  },
  {
    q: "Does PayHalo replace a will?",
    a: "No. PayHalo focuses on digital inheritance records and instructions. It does not replace a legally valid will, estate plan or professional legal advice where these are required.",
  },
  {
    q: "What happens if an asset cannot be transferred?",
    a: "The ability to access or transfer an asset depends on the provider, applicable laws and the documentation available. PayHalo can help your beneficiaries identify the asset and understand your recorded intentions, but it cannot override a provider's requirements or guarantee recovery.",
  },
];

const NAV = [
  ["#how", "How it works"],
  ["/about", "About PayHalo"],
  ["#arrangements", "Your arrangements"],
  ["#faq", "FAQ"],
];

function PlanCard() {
  /* Inside the frame, never overhanging it: a still, readable summary of a plan,
     the way a reference site floats its product screens inside the photograph. */
  return (
    <div className="glass absolute bottom-6 right-6 hidden w-[300px] p-5 lg:block xl:bottom-8 xl:right-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label">An example plan</p>
          <p className="mt-1 text-[15px] font-semibold text-[var(--color-ink)]">PH-2-KBVLVK</p>
        </div>
        <span className="pill badge-lime h-[22px] px-2 text-[10px]">recorded</span>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-[var(--color-line)] pt-3">
        {[
          ["Chidi", "first beneficiary", "60%"],
          ["Tunde", "backup", "30%"],
          ["The Foundation", "final beneficiary", "10%"],
        ].map(([who, role, share]) => (
          <div key={who} className="flex items-center justify-between gap-2">
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-medium text-[var(--color-ink)]">{who}</span>
              <span className="block text-[10px] text-[var(--color-muted)]">{role}</span>
            </span>
            <span className="t-num text-[12px] text-[var(--color-brand)]">{share}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-line)] pt-3">
        <span className="text-[10.5px] text-[var(--color-muted)]">Trusted Key</span>
        <span className="text-[11px] font-semibold text-[var(--color-ink)]">Amara O.</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="paper min-h-screen">
      <header className="sticky top-0 z-30 bg-[#fcfbf7]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/" className="flex items-baseline gap-2" aria-label="PayHalo home">
            <span className="font-[var(--font-display)] text-[21px] font-extrabold tracking-[-0.05em] text-[var(--color-forest)]">
              PayHalo
            </span>
          </Link>

          <nav
            aria-label="Sections"
            className="hidden items-center gap-1 rounded-full border border-[rgba(21,63,53,0.10)] bg-white/70 px-1.5 py-1.5 backdrop-blur lg:flex"
          >
            {NAV.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--color-muted)] transition hover:bg-white hover:text-[var(--color-ink)]"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/signin" className="hidden text-[12.5px] font-medium text-[var(--color-ink)] sm:block">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-ink btn-sm">
              Create my plan
            </Link>
            <details className="relative lg:hidden">
              <summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full border border-[rgba(21,63,53,0.14)] bg-white/70">
                <span aria-hidden className="text-[15px] leading-none">
                  ≡
                </span>
                <span className="sr-only">Menu</span>
              </summary>
              <div className="absolute right-0 mt-2 w-[220px] rounded-[16px] border border-[rgba(21,63,53,0.10)] bg-white p-2 shadow-xl">
                {NAV.map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="block rounded-[10px] px-3 py-2 text-[13px] text-[var(--color-ink)] hover:bg-[#f6f7f2]"
                  >
                    {label}
                  </Link>
                ))}
                <Link href="/signin" className="block rounded-[10px] px-3 py-2 text-[13px] font-semibold text-[var(--color-brand)]">
                  Sign in
                </Link>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ---------------------------------------------------------- hero */}
        <section className="mx-auto w-full max-w-[1000px] px-4 pt-12 text-center sm:px-8 sm:pt-20">
          <span className="eyebrow-pill">Digital inheritance, in writing</span>
          <h1 className="display mx-auto mt-6 text-[var(--color-ink)]">
            Your wealth deserves more than
            <br className="hidden sm:block" /> <span className="italic text-[var(--color-forest)]">a forgotten password and a hopeful guess.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[62ch] text-[14.5px] leading-relaxed text-[var(--color-muted)] sm:text-[15.5px]">
            PayHalo is a digital inheritance platform that helps you document what you own, decide who inherits it and
            leave instructions for how your wealth should be handled.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3">
            <Link href="/signup" className="btn btn-ink w-full sm:w-auto">
              Create my inheritance plan <span aria-hidden>→</span>
            </Link>
            <Link href="#how" className="btn btn-secondary w-full sm:w-auto">
              See how PayHalo works
            </Link>
          </div>
        </section>

        {/* -------------------------------------------------- hero photo band */}
        <section className="mx-auto mt-10 w-full max-w-[1200px] px-4 sm:mt-14 sm:px-8">
          <div className="relative">
            <div className="photo-frame relative h-[280px] sm:h-[420px] lg:h-[520px]">
              <Image
                src="/hero-lands.jpg"
                alt="A misty forested valley at dawn"
                fill
                priority
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d2a24]/70 via-[#0d2a24]/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                <p className="max-w-[44ch] text-[13px] leading-relaxed text-white/90 sm:text-[14px]">
                  Money can sit in payment accounts, cryptocurrency wallets and online businesses for years, yet remain
                  unknown or difficult to claim because the person who owned them never recorded where they were or
                  what should happen to them.
                </p>
              </div>
            </div>
            <PlanCard />
          </div>
        </section>

        {/* ------------------------------------------------------- stat band */}
        <section className="mx-auto mt-16 w-full max-w-[1200px] px-4 sm:mt-24 sm:px-8">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-y border-[rgba(21,63,53,0.10)] py-8 sm:grid-cols-4 sm:py-10">
            {STATS.map(([value, label]) => (
              <div key={label}>
                <dt className="display-sm text-[var(--color-forest)]">{value}</dt>
                <dd className="mt-2 max-w-[22ch] text-[12px] leading-snug text-[var(--color-muted)]">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* --------------------------------------------------- investigators */}
        <section className="mx-auto mt-20 w-full max-w-[1200px] px-4 sm:mt-28 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <h2 className="display-sm text-[var(--color-ink)]">
              Your family shouldn&rsquo;t have to become investigators to find what you&rsquo;ve left behind.
            </h2>
            <div className="flex flex-col justify-center gap-4">
              <p className="text-[14px] leading-relaxed text-[var(--color-muted)] sm:text-[15px]">
                Make your financial life easier to account for. PayHalo brings your asset records, inheritance
                decisions and handover arrangements into one place, giving your chosen beneficiaries a starting point
                instead of a trail of unanswered questions.
              </p>
              <Link href="/assets" className="text-[13px] font-semibold text-[var(--color-brand)]">
                Start with my assets <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- features */}
        <section id="arrangements" className="mx-auto mt-16 w-full max-w-[1200px] scroll-mt-24 px-4 sm:mt-20 sm:px-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const dark = f.tone === "dark";
              const lime = f.tone === "lime";
              const photo = f.tone === "photo";
              return (
                <section
                  key={f.title}
                  className={[
                    "relative flex flex-col overflow-hidden rounded-[20px] p-6 sm:p-7",
                    dark
                      ? "bg-[linear-gradient(160deg,#17453a,#12362d)] text-[#eaf3ea]"
                      : lime
                        ? "bg-[var(--color-lime)] text-[var(--color-forest)]"
                        : "border border-[rgba(21,63,53,0.10)] bg-white/75 backdrop-blur",
                    photo && (i === 0 ? "md:col-span-2 lg:col-span-1" : ""),
                  ].join(" ")}
                >
                  <p
                    className={[
                      "text-[10px] font-semibold uppercase tracking-[0.16em]",
                      dark ? "text-[var(--color-lime)]" : lime ? "text-[#4d6b2a]" : "text-[var(--color-brand)]",
                    ].join(" ")}
                  >
                    {f.eyebrow}
                  </p>
                  <h3
                    className={[
                      "display-xs mt-3",
                      dark ? "text-white" : lime ? "text-[var(--color-forest)]" : "text-[var(--color-ink)]",
                    ].join(" ")}
                  >
                    {f.title}
                  </h3>
                  <p
                    className={[
                      "mt-3 flex-1 text-[12.5px] leading-relaxed",
                      dark ? "text-[#b9d2c0]" : lime ? "text-[#3f5b3a]" : "text-[var(--color-muted)]",
                    ].join(" ")}
                  >
                    {f.body}
                  </p>
                  {f.cta && f.href && (
                    <Link
                      href={f.href}
                      className={[
                        "mt-5 inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-semibold transition",
                        dark
                          ? "bg-white/12 text-white hover:bg-white/20"
                          : lime
                            ? "bg-[var(--color-forest)] text-[#f2f7e8] hover:bg-[#0f2f28]"
                            : "border border-[rgba(21,63,53,0.14)] text-[var(--color-ink)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]",
                      ].join(" ")}
                    >
                      {f.cta} <span aria-hidden>→</span>
                    </Link>
                  )}
                </section>
              );
            })}
          </div>
        </section>

        {/* ------------------------------------------------------------- how */}
        <section id="how" className="mt-20 scroll-mt-24 bg-[#f4f6ef] py-16 sm:mt-28 sm:py-24">
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
            <div className="max-w-[760px]">
              <span className="eyebrow-pill">How PayHalo works</span>
              <h2 className="display mt-5 text-[var(--color-ink)]">
                From knowing what you own to <span className="italic text-[var(--color-forest)]">deciding where it goes.</span>
              </h2>
              <p className="mt-5 max-w-[62ch] text-[14px] leading-relaxed text-[var(--color-muted)] sm:text-[15px]">
                PayHalo gives you a straightforward way to record your digital assets, establish your inheritance
                preferences and nominate someone to initiate the handover process.
              </p>
            </div>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {HOW.map((step) => (
                <li key={step.n} className="rounded-[18px] border border-[rgba(21,63,53,0.10)] bg-white/80 p-5">
                  <span className="font-[var(--font-serif)] text-[26px] leading-none text-[var(--color-brand)]">
                    {step.n}
                  </span>
                  <h3 className="mt-3 text-[14px] font-semibold text-[var(--color-ink)]">{step.title}</h3>
                  <p className="mt-1 text-[12.5px] font-medium text-[var(--color-forest)]">{step.lead}</p>
                  <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-muted)]">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" className="btn btn-ink">
                Create my plan <span aria-hidden>→</span>
              </Link>
              <p className="text-[12.5px] text-[var(--color-muted)]">
                Four decisions can make a difficult responsibility easier to navigate.
              </p>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- about */}
        <section className="mx-auto mt-20 w-full max-w-[1200px] px-4 sm:mt-28 sm:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
            <div className="photo-frame relative h-[300px] sm:h-[400px]">
              <Image
                src="/about-light.jpg"
                alt="Light falling through green foliage"
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
            </div>
            <div>
              <span className="eyebrow-pill">About PayHalo</span>
              <h2 className="display-sm mt-5 text-[var(--color-ink)]">
                We have changed where we keep our wealth, but not how we <span className="italic">prepare to pass it on.</span>
              </h2>
              <p className="mt-5 text-[14px] leading-relaxed text-[var(--color-muted)]">
                PayHalo is building a simpler way for people to prepare their inheritance, from identifying what they
                own to recording who should receive it.
              </p>
              <Link href="/about" className="mt-6 inline-flex text-[13px] font-semibold text-[var(--color-brand)]">
                Read our story <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- faq */}
        <section id="faq" className="mx-auto mt-20 w-full max-w-[1200px] scroll-mt-24 px-4 sm:mt-28 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="display-sm max-w-[20ch] text-[var(--color-ink)]">Questions, answered plainly.</h2>
            <p className="max-w-[38ch] text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              What PayHalo is, what it is not, and what happens to your records when someone needs them.
            </p>
          </div>

          <div className="mt-8 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-[16px] border border-[rgba(21,63,53,0.10)] bg-white/75 p-4 backdrop-blur sm:p-5"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-[13px] font-semibold text-[var(--color-ink)]">
                  {item.q}
                  <span aria-hidden className="mt-[1px] shrink-0 text-[var(--color-brand)] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--color-muted)]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* --------------------------------------------------------- closing */}
        <section className="mx-auto mt-20 w-full max-w-[1200px] px-4 sm:mt-28 sm:px-8">
          <div className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(160deg,#17453a,#0f2f28)] px-6 py-14 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(217,244,165,0.30),transparent_65%)]"
            />
            <h2 className="display mx-auto max-w-[22ch] text-[#f4f8f2]">
              You&rsquo;ve made the effort to build something, <span className="italic text-[var(--color-lime)]">give those efforts a considered future.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-[52ch] text-[13.5px] leading-relaxed text-[#b9d2c0]">
              Record what you own, decide who benefits and put the arrangements in place with PayHalo.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3">
              <Link
                href="/signup"
                className="btn w-full border-transparent bg-[var(--color-lime)] text-[var(--color-forest)] hover:bg-[#cdee93] sm:w-auto"
              >
                Create my plan <span aria-hidden>→</span>
              </Link>
              <Link href="/signin" className="btn btn-secondary w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-20 border-t border-[rgba(21,63,53,0.10)] sm:mt-28">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-12 sm:px-8 sm:py-16 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <p className="font-[var(--font-display)] text-[20px] font-extrabold tracking-[-0.05em] text-[var(--color-forest)]">
              PayHalo
            </p>
            <p className="mt-2 max-w-[34ch] text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              A place to record your digital wealth and decide how it should be passed on.
            </p>
          </div>

          {[
            {
              head: "Platform",
              links: [
                ["#how", "How it works"],
                ["/plan", "My inheritance plan"],
                ["/signin", "Sign in"],
              ],
            },
            {
              head: "Company",
              links: [
                ["/about", "About PayHalo"],
                ["/help", "Contact"],
              ],
            },
            {
              head: "Legal",
              links: [
                ["/legal#privacy", "Privacy Policy"],
                ["/legal#terms", "Terms of Service"],
              ],
            },
          ].map((col) => (
            <div key={col.head}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">{col.head}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="text-[12.5px] text-[var(--color-ink)] hover:text-[var(--color-brand)]">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto w-full max-w-[1200px] border-t border-[rgba(21,63,53,0.08)] px-4 py-5 sm:px-8">
          <p className="font-[var(--font-serif)] text-[15px] italic text-[var(--color-forest)]">
            Make your decisions while you can still make them.
          </p>
        </div>
      </footer>
    </div>
  );
}
