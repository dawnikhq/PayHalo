import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { money } from "@/lib/format";
import { SplitBar } from "@/components/SplitBar";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

const ASSET_ICON: Record<string, string> = {
  paypal: "P",
  crypto: "₿",
  business: "◫",
};

const MECHANICS = [
  {
    n: "01",
    title: "The Automated Handover List",
    body: "Choose who inherits first, name the family backups, and set a cause for whatever is left. The order is yours — the engine just follows it.",
  },
  {
    n: "02",
    title: "The Trusted Key",
    body: "Your keyholder can start the process when you die. They never see your balances, your split, or your settings while you're alive.",
  },
  {
    n: "03",
    title: "The 14-Day Safety Window",
    body: "The moment a claim is filed, you're notified. You get fourteen days to stop it if the request was a mistake.",
  },
  {
    n: "04",
    title: "The Secure Handover",
    body: "No passwords shared with family. Once verification clears and the window closes, the automation engine releases according to your instructions.",
  },
];

export default async function Home() {
  const s = await getSnapshot();
  const recipients = s.beneficiaries.filter((b) => b.role !== "charity");
  const charity = s.beneficiaries.find((b) => b.role === "charity");

  return (
    <main>
      {/* ---------------------------------------------------------------- hero */}
      <section className="shell relative pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="eyebrow rise">
              <span className="h-px w-8 bg-brass/60" />
              The Dormant Billion problem
            </p>

            <h1 className="display rise d1 mt-6 text-[clamp(2.9rem,6.4vw,4.6rem)]">
              You worked so hard
              <br />
              to build it.
              <br />
              <span className="text-brass italic">Decide where it goes.</span>
            </h1>

            <p className="rise d2 mt-7 max-w-[46ch] text-[15.5px] leading-relaxed text-muted">
              If something happened to you today, would your family know where your money lives — or
              how to get it? Hack1 keeps your digital wealth from becoming a puzzle they have to
              solve while they're grieving.
            </p>

            <div className="rise d3 mt-9 flex flex-wrap items-center gap-3">
              <Link href="/dashboard" className="btn btn-brass">
                Open the live plan
                <span aria-hidden>→</span>
              </Link>
              <Link href="/keyholder" className="btn btn-ghost">
                I&apos;m a keyholder
              </Link>
            </div>

            <div className="rise d4 mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-[11.5px] uppercase tracking-[0.14em] text-muted/70">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                {s.assets.length} accounts connected
              </span>
              <span>{s.beneficiaries.length} recipients named</span>
              <span>14-day safety window</span>
            </div>
          </div>

          {/* live plan card */}
          <div className="rise d3 relative">
            <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-brass/8 blur-3xl" />
            <div className="card overflow-hidden p-6 md:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="label !mb-1.5">Your digital estate</p>
                  <p className="mono text-[34px] leading-none tracking-tight text-ivory">
                    {money(s.totalCents)}
                  </p>
                </div>
                <span className="pill border-sage/30 bg-sage/10 text-[9.5px] text-sage">
                  <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                  Sealed
                </span>
              </div>

              <div className="mt-6">
                <SplitBar beneficiaries={s.beneficiaries} totalCents={s.totalCents} />
              </div>

              <div className="hairline my-5" />

              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {recipients.map((b) => (
                    <span key={b.id} className="rounded-full ring-2 ring-[#101016]">
                      <Avatar name={b.name} size={28} />
                    </span>
                  ))}
                  {charity && (
                    <span className="rounded-full ring-2 ring-[#101016]">
                      <Avatar name={charity.name} size={28} tone="sage" />
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-muted">
                  keyholder <span className="text-ivory">{s.keyholder?.name}</span>
                </p>
              </div>
            </div>
            <p className="mt-3 text-center text-[10.5px] uppercase tracking-[0.18em] text-muted/50">
              Live prototype data · all assets simulated
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- marquee */}
      <div className="relative overflow-hidden border-y border-white/6 bg-white/[0.015] py-3.5">
        <div className="marquee-track gap-10 text-[10.5px] uppercase tracking-[0.28em] text-muted/45">
          {Array.from({ length: 2 }).map((_, dup) => (
            <span key={dup} className="flex shrink-0 items-center gap-10">
              {[
                "PayPal",
                "Bitcoin",
                "Ethereum",
                "Gumroad",
                "Stripe",
                "Wise",
                "Shopify",
                "Binance",
                "Paystack",
                "Upwork",
              ].map((p) => (
                <span key={`${dup}-${p}`} className="flex items-center gap-10">
                  {p}
                  <span className="text-brass/30">◆</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------ the problem */}
      <section className="shell py-24">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="eyebrow">
              <span className="h-px w-8 bg-brass/60" />
              What actually happens
            </p>
            <h2 className="display mt-5 text-[clamp(2rem,4vw,2.9rem)]">
              The money is there.
              <br />
              <span className="text-muted">Reaching it is the problem.</span>
            </h2>
            <p className="mt-6 max-w-[40ch] text-[14.5px] leading-relaxed text-muted">
              Families spend months searching for accounts, contacting platforms and proving
              relationships — while the assets sit unreachable. Most of it never gets claimed at all.
            </p>
          </div>

          <div className="space-y-3">
            {s.assets.map((a, i) => (
              <div
                key={a.id}
                className="card-flat group flex items-center gap-4 p-4 transition hover:border-white/12 hover:bg-white/[0.04]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] font-serif text-[18px] text-brass">
                  {ASSET_ICON[a.kind] ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-ivory">{a.label}</p>
                  <p className="truncate text-[11.5px] text-muted/80">{a.detail}</p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="mono text-[14px] text-ivory">{money(a.balanceCents)}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ember/70">
                    would they find it?
                  </p>
                </div>
              </div>
            ))}
            <p className="pt-2 text-[12px] leading-relaxed text-muted/70">
              Three accounts. No shared password. No instructions. That&apos;s how most digital
              estates look today — and it&apos;s exactly what a plan fixes.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- mechanics */}
      <section className="border-y border-white/6 bg-white/[0.012] py-24">
        <div className="shell">
          <div className="max-w-2xl">
            <p className="eyebrow">
              <span className="h-px w-8 bg-brass/60" />
              Four moving parts
            </p>
            <h2 className="display mt-5 text-[clamp(2rem,4vw,2.9rem)]">
              Simple on the surface.
              <span className="text-muted"> Deliberate underneath.</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {MECHANICS.map((m) => (
              <div key={m.n} className="card group p-6 transition hover:border-brass/25">
                <div className="flex items-baseline justify-between">
                  <p className="mono text-[11px] tracking-[0.2em] text-brass/70">{m.n}</p>
                  <span className="h-px w-10 bg-white/10 transition group-hover:bg-brass/40" />
                </div>
                <h3 className="mt-6 font-serif text-[24px] leading-tight text-ivory">{m.title}</h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- paths */}
      <section className="shell py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">
              <span className="h-px w-8 bg-brass/60" />
              Walk the prototype
            </p>
            <h2 className="display mt-5 text-[clamp(1.9rem,3.6vw,2.6rem)]">
              Three doors into the same story.
            </h2>
          </div>
          <p className="max-w-[36ch] text-[13px] leading-relaxed text-muted">
            Every screen is wired to a real database and a real rule engine. Nothing is a static
            mock-up.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              href: "/dashboard",
              k: "Owner",
              t: "Build & watch your plan",
              d: "Connect accounts, set the split, name a keyholder, and see the safety window from the inside.",
            },
            {
              href: "/keyholder",
              k: "Keyholder",
              t: "Submit a certificate",
              d: "Simulated OCR reads the document, verification clears, and the 14-day clock starts ticking.",
            },
            {
              href: "/beneficiary",
              k: "Beneficiary",
              t: "See what was left for you",
              d: "The read-only view: your allocation, the assets released, and the handover trail.",
            },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="card group flex flex-col justify-between p-6 transition hover:border-brass/30"
            >
              <div>
                <span className="pill border-brass/25 bg-brass/8 text-[9.5px] text-brass">{c.k}</span>
                <h3 className="mt-5 font-serif text-[23px] leading-snug text-ivory">{c.t}</h3>
                <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{c.d}</p>
              </div>
              <p className="mt-7 flex items-center gap-2 text-[12px] text-brass/80 transition group-hover:gap-3">
                Enter <span aria-hidden>→</span>
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- quote */}
      <section className="relative overflow-hidden border-y border-white/6 py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass/6 blur-[90px]" />
        <div className="shell max-w-3xl text-center">
          <p className="font-serif text-[clamp(1.7rem,3.6vw,2.6rem)] leading-[1.25] text-ivory">
            “You worked so freaking hard to build your life.
            <span className="text-brass italic"> You should have a say</span> in what happens to it
            after you&apos;re gone.”
          </p>
          <p className="mt-8 text-[11px] uppercase tracking-[0.24em] text-muted/60">
            Hack1 · Team 1 · the Dormant Billion
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="shell py-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
              A plan for your digital life. Built as a hackathon prototype — accounts, balances,
              documents and transfers are all simulated. Nothing here is legal advice, and no
              platform rules or inheritance laws are bypassed.
            </p>
          </div>
          <div className="flex gap-14 text-[12.5px]">
            <div className="space-y-2.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted/60">Product</p>
              <Link href="/dashboard" className="block text-muted transition hover:text-ivory">Owner dashboard</Link>
              <Link href="/keyholder" className="block text-muted transition hover:text-ivory">Keyholder portal</Link>
              <Link href="/beneficiary" className="block text-muted transition hover:text-ivory">Beneficiary view</Link>
            </div>
            <div className="space-y-2.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted/60">Build</p>
              <Link href="/onboarding" className="block text-muted transition hover:text-ivory">Start a plan</Link>
              <a href="/api/state" className="block text-muted transition hover:text-ivory">State API</a>
            </div>
          </div>
        </div>
        <div className="hairline mt-12" />
        <p className="mt-6 text-[10.5px] uppercase tracking-[0.18em] text-muted/40">
          © {new Date().getFullYear()} Hack1 — prototype
        </p>
      </footer>
    </main>
  );
}
