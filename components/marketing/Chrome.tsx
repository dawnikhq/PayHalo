import Link from "next/link";

/**
 * The public shell: one header and one footer for every page a visitor can reach
 * without signing in. The signed-in product has its own shell (AppShell); this
 * one is the front of the building.
 */

const NAV: [string, string][] = [
  ["/#how", "How it works"],
  ["/about", "About PayHalo"],
  ["/#arrangements", "Your arrangements"],
  ["/#faq", "FAQ"],
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 bg-[#fcfbf7]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" aria-label="PayHalo home" className="flex items-baseline gap-2">
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
              <Link
                href="/signin"
                className="block rounded-[10px] px-3 py-2 text-[13px] font-semibold text-[var(--color-brand)]"
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
            <span className="font-[var(--font-display)] text-[20px] font-extrabold tracking-[-0.05em] text-[var(--color-forest)]">
              PayHalo
            </span>
          </Link>
          <p className="mt-2 max-w-[34ch] text-[12.5px] leading-relaxed text-[var(--color-muted)]">
            A place to record your digital wealth and decide how it should be passed on.
          </p>
        </div>

        {COLUMNS.map((col) => (
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
        <p className="font-[var(--font-display)] text-[14px] font-medium tracking-[-0.01em] text-[var(--color-forest)]">
          Make your decisions while you can still make them.
        </p>
      </div>
    </footer>
  );
}
