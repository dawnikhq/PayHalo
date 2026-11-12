import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SiteTourButton } from "./SiteTour";
import { CookieConsent, CookiePreferencesLink } from "@/components/legal/CookieConsent";

/**
 * The public shell: one header and one footer for every page a visitor can reach
 * without signing in. The signed-in product has its own shell (AppShell); this
 * one is the front of the building.
 */

const NAV: [string, string][] = [
  ["/#how", "How it works"],
  ["/#arrangements", "Your arrangements"],
  ["/about", "About PayHalo"],
  ["/#faq", "FAQ"],
];

export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  // the supplied lockup, at the size the header and footer both use
  return (
    <span className={inverse ? "inline-flex brightness-0 invert" : "inline-flex"}>
      <Logo height={27} priority />
    </span>
  );
}

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(21,63,53,0.07)] bg-[#fcfdfa]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] w-full max-w-[1200px] items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-8">
        <Link href="/" aria-label="PayHalo home" className="shrink-0">
          <Wordmark />
        </Link>

        <nav
          aria-label="Sections"
          className="hidden items-center gap-1 rounded-full border border-[rgba(21,63,53,0.10)] bg-white/70 px-1.5 py-1.5 backdrop-blur lg:flex"
        >
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--color-muted)] transition hover:bg-white hover:text-[var(--color-ink)]"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <SiteTourButton className="hidden rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-[var(--color-ink)] transition hover:bg-white/70 md:inline-flex" />
          <Link href="/signin" className="hidden text-[12.5px] font-semibold text-[var(--color-ink)] sm:block">
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary btn-sm">
            <span className="hidden sm:inline">Create my plan</span>
            <span className="sm:hidden">Get started</span>
          </Link>

          <details className="relative lg:hidden">
            <summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full border border-[rgba(21,63,53,0.14)] bg-white/70">
              <span aria-hidden className="text-[15px] leading-none">
                ≡
              </span>
              <span className="sr-only">Menu</span>
            </summary>
            <div className="absolute right-0 top-[calc(100%+8px)] w-[min(260px,calc(100vw-32px))] rounded-[18px] border border-[rgba(21,63,53,0.10)] bg-white p-2 shadow-[0_28px_60px_-30px_rgba(9,32,27,0.45)]">
              {NAV.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="block rounded-[11px] px-3 py-2.5 text-[13px] font-medium text-[var(--color-ink)] hover:bg-[#f4f8f2]"
                >
                  {label}
                </Link>
              ))}
              <SiteTourButton className="block w-full rounded-[11px] px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--color-brand)] hover:bg-[#f4f8f2]">
                Take the tour
              </SiteTourButton>
              <Link
                href="/signin"
                className="block rounded-[11px] px-3 py-2.5 text-[13px] font-semibold text-[var(--color-brand)]"
              >
                Sign in
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

const COLUMNS = [
  {
    head: "Platform",
    links: [
      ["/#how", "How it works"],
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
];

export function MarketingFooter() {
  return (
    <footer className="mt-20 border-t border-[rgba(21,63,53,0.10)] sm:mt-28">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-12 sm:px-8 sm:py-16 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" aria-label="PayHalo home">
            <Wordmark />
          </Link>
          <p className="mt-3 max-w-[32ch] text-[12.5px] leading-relaxed text-[var(--color-muted)]">
            A place to record your digital wealth and decide how it should be passed on.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/signup" className="btn btn-primary btn-sm">
              Create my plan
            </Link>
            <SiteTourButton className="btn btn-secondary btn-sm" />
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.head}>
            <p className="label-caps text-[var(--color-muted)]">{col.head}</p>
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
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 border-t border-[rgba(21,63,53,0.08)] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-[var(--font-display)] text-[14px] font-medium tracking-[-0.01em] text-[var(--color-forest)]">
          Your Wealth, left in good hands.
        </p>
        <div className="flex items-center gap-4">
          <CookiePreferencesLink />
          <Link href="/legal#privacy" className="text-[12.5px] text-[var(--color-ink)] hover:text-[var(--color-brand)]">
            Privacy
          </Link>
        </div>
      </div>
      <CookieConsent />
    </footer>
  );
}
