import Image from "next/image";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/Chrome";
import { Hero } from "@/components/marketing/Hero";
import { DeviceStage, ProductMock } from "@/components/marketing/ProductMock";

export const metadata = {
  title: { absolute: "PayHalo — Your Wealth, left in good hands." },
  description:
    "PayHalo is a digital inheritance platform that helps you document what you own, decide who inherits it and leave instructions for how your wealth should be handled.",
};

const STATS = [
  ["4", "decisions to a finished plan"],
  ["14", "days to cancel a wrong request"],
  ["0", "decisions made for you"],
  ["1", "Trusted Key to start the process"],
];

const FEATURES = [
  {
    eyebrow: "Asset records",
    title: "Give every account a place in your inheritance records.",
    body: "Document your digital payment accounts, cryptocurrency wallets and online businesses, so important parts of your financial life don't disappear from the picture simply because they exist on different platforms.",
    cta: "Record my assets",
    href: "/assets",
    tone: "dark",
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

const SHOWCASE = [
  {
    variant: "overview" as const,
    title: "Overview",
    body: "Four decisions, one record, and the next thing worth doing — without a dashboard that has to be decoded first.",
  },
  {
    variant: "assets" as const,
    title: "My assets",
    body: "Payment accounts, wallets and online businesses, each with the notes your beneficiaries would need to find them.",
  },
  {
    variant: "people" as const,
    title: "Beneficiaries",
    body: "Primary beneficiaries, backup beneficiaries and a final beneficiary, with shares that always add up.",
  },
  {
    variant: "handover" as const,
    title: "Handover",
    body: "A handover request moves through verification and the 14-day safety window before anything is released.",
  },
];

export default function LandingPage() {
  return (
    <div className="paper min-h-screen">
      <MarketingHeader />

      <main id="main">
        <Hero />

        {/* --------------------------------------------------- product stage */}
        <section className="section mt-10 sm:mt-16">
          <DeviceStage>
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_340px]">
              <div className="order-2 lg:order-1">
                <p className="max-w-[46ch] text-[13px] leading-relaxed text-[var(--color-muted)] sm:text-[14.5px]">
                  Money can sit in payment accounts, cryptocurrency wallets and online businesses for years, yet remain
                  unknown or difficult to claim because the person who owned them never recorded where they were or
                  what should happen to them.
                </p>

                <dl className="mt-6 grid max-w-[420px] grid-cols-2 gap-2.5">
                  {[
                    ["Plan reference", "PH-2-KBVLVK"],
                    ["Trusted Key", "Amara O."],
                    ["Beneficiaries", "3 named"],
                    ["Vault", "not started"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-[14px] border border-[rgba(21,63,53,0.10)] bg-white/80 px-3 py-2.5">
                      <dt className="text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8b9a92]">{k}</dt>
                      <dd className="mt-0.5 truncate text-[12.5px] font-semibold text-[var(--color-ink)]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="order-1 lg:order-2">
                <ProductMock variant="overview" />
              </div>
            </div>
          </DeviceStage>
        </section>

        {/* ------------------------------------------------------- stat band */}
        <section data-tour="stats" className="section mt-14 sm:mt-24">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-9 border-y border-[rgba(21,63,53,0.10)] py-9 sm:grid-cols-4 sm:py-11">
            {STATS.map(([value, label]) => (
              <div key={label}>
                <dt className="font-[var(--font-display)] text-[clamp(2.6rem,7vw,4.1rem)] font-semibold leading-none tracking-[-0.05em] text-[var(--color-forest)]">
                  {value}
                </dt>
                <dd className="mt-2.5 max-w-[22ch] text-[12px] leading-snug text-[var(--color-muted)] sm:text-[12.5px]">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------------------------------------------------- investigators */}
        <section className="section mt-16 sm:mt-28">
          <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16">
            <h2 className="display-sm max-w-[20ch] text-[var(--color-ink)]">
              Your family shouldn&rsquo;t have to become investigators to find what you&rsquo;ve left behind.
            </h2>
            <div className="flex flex-col justify-center gap-5">
              <p className="text-[14px] leading-relaxed text-[var(--color-muted)] sm:text-[15px]">
                Make your financial life easier to account for. PayHalo brings your asset records, inheritance
                decisions and handover arrangements into one place, giving your chosen beneficiaries a starting point
                instead of a trail of unanswered questions.
              </p>
              <Link
                href="/assets"
                className="inline-flex w-fit items-center gap-2 text-[13px] font-semibold text-[var(--color-brand)]"
              >
                Start with my assets <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <div className="photo-frame relative mt-8 h-[240px] sm:mt-10 sm:h-[380px]">
            <Image
              src="/brand/hands.jpg"
              alt="A brass key passing from one generation to the next"
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d2a24]/55 via-transparent to-transparent" />
          </div>
        </section>

        {/* --------------------------------------------------------- features */}
        <section id="arrangements" data-tour="arrangements" className="section mt-16 scroll-mt-24 sm:mt-28">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow-pill">Your arrangements</span>
              <h2 className="display-sm mt-5 max-w-[22ch] text-[var(--color-ink)]">
                Six decisions, and none of them made by guesswork.
              </h2>
            </div>
            <p className="max-w-[36ch] text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              Everything on this page is yours to change, at any point, without starting over.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const dark = f.tone === "dark";
              const lime = f.tone === "lime";
              const photo = f.tone === "photo";
              return (
                <article
                  key={f.title}
                  className={[
                    "tile flex flex-col transition duration-200 hover:-translate-y-0.5",
                    i === 0 || i === 5 ? "sm:col-span-2 lg:col-span-1" : "",
                    photo ? "min-h-[290px] justify-end border-transparent text-white" : "",
                    dark ? "border-transparent bg-[linear-gradient(155deg,#17453a,#0f2f28)] text-[#eaf3ea]" : "",
                    lime ? "border-[#cbea92] bg-[var(--color-lime)] text-[var(--color-forest)]" : "",
                    !photo && !dark && !lime ? "bg-white" : "",
                  ].join(" ")}
                >
                  {photo && (
                    <>
                      <Image
                        src="/brand/story-wide.jpg"
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 400px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,32,27,0.15),rgba(9,32,27,0.85))]" />
                    </>
                  )}

                  <div className="relative">
                    <p
                      className={[
                        "label-caps",
                        dark ? "text-[var(--color-lime)]" : lime ? "text-[#4d6b2a]" : photo ? "text-white/75" : "text-[var(--color-brand)]",
                      ].join(" ")}
                    >
                      {f.eyebrow}
                    </p>
                    <h3
                      className={[
                        "mt-3 font-[var(--font-display)] text-[19px] font-semibold leading-[1.22] tracking-[-0.025em] sm:text-[21px]",
                        dark ? "text-white" : lime ? "text-[var(--color-forest)]" : photo ? "text-white" : "text-[var(--color-ink)]",
                      ].join(" ")}
                    >
                      {f.title}
                    </h3>
                    <p
                      className={[
                        "mt-2.5 flex-1 text-[12.5px] leading-relaxed",
                        dark ? "text-[#b9d2c0]" : lime ? "text-[#3f5b3a]" : photo ? "text-white/80" : "text-[var(--color-muted)]",
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
                              : photo
                                ? "bg-white text-[var(--color-forest)] hover:bg-[var(--color-lime)]"
                                : "border border-[rgba(21,63,53,0.14)] text-[var(--color-ink)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]",
                        ].join(" ")}
                      >
                        {f.cta} <span aria-hidden>→</span>
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ------------------------------------------------------------- how */}
        <section id="how" data-tour="how" className="mt-16 scroll-mt-24 bg-[#f2f6ee] py-16 sm:mt-28 sm:py-24">
          <div className="section">
            <div className="max-w-[760px]">
              <span className="eyebrow-pill">How PayHalo works</span>
              <h2 className="display mt-5 text-[var(--color-ink)]">
                From knowing what you own to{" "}
                <span className="text-[var(--color-forest)]">deciding where it goes.</span>
              </h2>
              <p className="mt-5 max-w-[62ch] text-[14px] leading-relaxed text-[var(--color-muted)] sm:text-[15px]">
                PayHalo gives you a straightforward way to record your digital assets, establish your inheritance
                preferences and nominate someone to initiate the handover process.
              </p>
            </div>

            <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {HOW.map((step, i) => (
                <li
                  key={step.n}
                  className={[
                    "rounded-[22px] border border-[rgba(21,63,53,0.10)] p-5 sm:p-6",
                    i === 3 ? "bg-[var(--color-forest)] text-[#eaf3ea]" : "bg-white",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "font-[var(--font-display)] text-[26px] font-semibold leading-none tracking-[-0.04em]",
                      i === 3 ? "text-[var(--color-lime)]" : "text-[var(--color-brand)]",
                    ].join(" ")}
                  >
                    {step.n}
                  </span>
                  <h3
                    className={[
                      "mt-4 font-[var(--font-display)] text-[16px] font-semibold leading-snug tracking-[-0.02em]",
                      i === 3 ? "text-white" : "text-[var(--color-ink)]",
                    ].join(" ")}
                  >
                    {step.title}
                  </h3>
                  <p className={["mt-1.5 text-[12.5px] font-semibold", i === 3 ? "text-[var(--color-lime)]" : "text-[var(--color-forest)]"].join(" ")}>
                    {step.lead}
                  </p>
                  <p className={["mt-2 text-[12px] leading-relaxed", i === 3 ? "text-[#b9d2c0]" : "text-[var(--color-muted)]"].join(" ")}>
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" className="btn btn-primary">
                Create my plan <span aria-hidden>→</span>
              </Link>
              <p className="text-[12.5px] text-[var(--color-muted)]">
                Four decisions can make a difficult responsibility easier to navigate.
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- showcase */}
        <section className="section mt-16 sm:mt-28">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="display-sm max-w-[18ch] text-[var(--color-ink)]">
              Four screens, and nothing to decode.
            </h2>
            <p className="max-w-[38ch] text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              Swipe through the parts of PayHalo a person actually meets.
            </p>
          </div>

          <div className="rail mt-7 sm:mt-10 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible lg:grid-cols-4">
            {SHOWCASE.map((s) => (
              <div
                key={s.title}
                className="w-[262px] rounded-[24px] border border-[rgba(21,63,53,0.10)] bg-white p-4 sm:w-auto"
              >
                <div className="rounded-[18px] bg-[#f2f6ee] px-3 py-3">
                  <ProductMock variant={s.variant} label={s.variant} />
                </div>
                <h3 className="mt-4 font-[var(--font-display)] text-[15px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
                  {s.title}
                </h3>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--color-muted)]">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --------------------------------------------------------- security */}
        <section data-tour="safety" className="section mt-16 sm:mt-28">
          <div className="overflow-hidden rounded-[30px] bg-[linear-gradient(160deg,#17453a,#0b241f)] px-6 py-12 text-[#eaf3ea] sm:px-10 sm:py-16">
            <div className="max-w-[720px]">
              <span className="eyebrow-pill border-white/15 bg-white/10 text-[#c9dbcd]">The safety window</span>
              <h2 className="display-sm mt-5 text-white">
                Where security isn&rsquo;t a feature, <span className="text-[var(--color-lime)]">it&rsquo;s the foundation.</span>
              </h2>
            </div>

            <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
              {[
                {
                  title: "Your Trusted Key",
                  lead: "Appoint a Trusted Key to submit the required proof of death and initiate the handover process, while keeping your assets and inheritance instructions inaccessible to them during your lifetime.",
                  points: [
                    "They cannot access your assets or change your inheritance instructions while you're alive",
                    "One Trusted Key starts the process, and only the process",
                  ],
                },
                {
                  title: "Verification first",
                  lead: "Every handover request includes a 14-day response window for the account holder to receive notification and cancel a request made in error before the process proceeds.",
                  points: [
                    "Death documentation is checked before anyone is notified",
                    "The account holder has 14 days to cancel a request made in error",
                  ],
                },
                {
                  title: "A record, not a vault",
                  lead: "PayHalo keeps the map of your wealth — the account, where it lives and who should receive it. The institutions holding each asset answer to their own procedures, and your instructions travel alongside them.",
                  points: [
                    "Every account has a name, a place and a destination",
                    "Your instructions move with the record you wrote",
                  ],
                },
              ].map((col) => (
                <div key={col.title} className="border-t border-white/15 pt-5">
                  <h3 className="font-[var(--font-display)] text-[17px] font-semibold tracking-[-0.02em] text-white">
                    {col.title}
                  </h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#b9d2c0]">{col.lead}</p>
                  <ul className="mt-4 space-y-2">
                    {col.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-[#d7e6da]">
                        <span aria-hidden className="mt-[3px] text-[var(--color-lime)]">
                          ✓
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- about */}
        <section className="section mt-16 sm:mt-28">
          <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
            <div className="photo-frame relative h-[280px] sm:h-[400px]">
              <Image
                src="/brand/field-key.jpg"
                alt="A brass key on folded pale mint paper"
                fill
                sizes="(max-width: 1024px) 100vw, 520px"
                className="object-cover"
              />
            </div>
            <div>
              <span className="eyebrow-pill">About PayHalo</span>
              <h2 className="display-sm mt-5 text-[var(--color-ink)]">
                We have changed where we keep our wealth, but not how we{" "}
                <span className="text-[var(--color-forest)]">prepare to pass it on.</span>
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
        <section id="faq" data-tour="faq" className="section mt-16 scroll-mt-24 sm:mt-28">
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
                className="group rounded-[18px] border border-[rgba(21,63,53,0.10)] bg-white p-4 sm:p-5"
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
        <section data-tour="cta" className="section mt-16 sm:mt-28">
          <div className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(160deg,#17453a,#0f2f28)] px-6 py-14 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(217,244,165,0.30),transparent_65%)]"
            />
            <h2 className="display mx-auto max-w-[22ch] text-[#f4f8f2]">
              You&rsquo;ve made the effort to build something,{" "}
              <span className="text-[var(--color-lime)]">give those efforts a considered future.</span>
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

      <MarketingFooter />
    </div>
  );
}
