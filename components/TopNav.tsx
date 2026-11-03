"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/keyholder", label: "Keyholder" },
  { href: "/beneficiary", label: "Beneficiary" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/6 bg-ink/70 backdrop-blur-xl">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Hack1 home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/[0.02] p-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-1.5 text-[12.5px] transition ${
                  active
                    ? "bg-white/8 text-ivory"
                    : "text-muted hover:text-ivory"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/beneficiary" className="btn btn-ghost !px-4 !py-2 text-[12px] md:hidden">
            Portal
          </Link>
          <Link href="/onboarding" className="btn btn-brass !px-4 !py-2 text-[12.5px]">
            Start a plan
          </Link>
        </div>
      </div>
    </header>
  );
}
