"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  IconActivity,
  IconAssets,
  IconBeneficiaries,
  IconClose,
  IconDashboard,
  IconHelp,
  IconMenu,
  IconPlan,
  IconShield,
} from "./icons";

export type Role = "owner" | "keyholder" | "beneficiary";

type NavItem = { href: string; label: string; icon: ReactNode; exact?: boolean };

const NAV: Record<Role, { primary: NavItem[]; secondary: NavItem[]; promo: { title: string; body: string; href: string; cta: string } }> = {
  owner: {
    primary: [
      { href: "/dashboard", label: "Overview", icon: <IconDashboard /> },
      { href: "/assets", label: "My assets", icon: <IconAssets /> },
      { href: "/beneficiaries", label: "Beneficiaries", icon: <IconBeneficiaries /> },
      { href: "/plan", label: "My instructions", icon: <IconPlan /> },
      { href: "/activity", label: "Activity", icon: <IconActivity /> },
    ],
    secondary: [
      { href: "/settings", label: "Account settings", icon: <IconShield /> },
      { href: "/help", label: "Help & support", icon: <IconHelp /> },
    ],
    promo: {
      title: "On your terms.",
      body: "Start small. Save as you go. Your arrangements are always yours.",
      href: "/plan",
      cta: "Review my arrangements",
    },
  },
  keyholder: {
    primary: [{ href: "/keyholder", label: "Trusted Key home", icon: <IconDashboard />, exact: true }],
    secondary: [
      { href: "/keyholder#role", label: "Your role & permissions", icon: <IconShield /> },
      { href: "/keyholder/support", label: "Help & support", icon: <IconHelp /> },
    ],
    promo: {
      title: "Trust, with limits.",
      body: "Your access is limited to the role you have been given.",
      href: "/help",
      cta: "Get support",
    },
  },
  beneficiary: {
    primary: [{ href: "/beneficiary", label: "Beneficiary home", icon: <IconDashboard />, exact: true }],
    secondary: [
      { href: "/beneficiary#role", label: "Your role & permissions", icon: <IconShield /> },
      { href: "/beneficiary/support", label: "Help & support", icon: <IconHelp /> },
    ],
    promo: {
      title: "Trust, with limits.",
      body: "Your access is limited to the role you have been given.",
      href: "/help",
      cta: "Get support",
    },
  },
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function isActive(pathname: string, item: NavItem) {
  const [path] = item.href.split("#");
  if (item.exact) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavList({
  items,
  pathname,
  onNavigate,
  bare = false,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  bare?: boolean;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] transition ${
                bare ? "" : "gap-3"
              } ${
                active
                  ? "bg-[var(--color-mint)] font-semibold text-[var(--color-forest)]"
                  : "font-medium text-[#5c6b63] hover:bg-[#f5f9f5] hover:text-[var(--color-ink)]"
              }`}
            >
              {!bare && (
                <span className={active ? "text-[var(--color-forest)]" : "text-[#93a199]"}>{item.icon}</span>
              )}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const ROLE_LABEL: Record<Role, string> = {
  owner: "Account holder",
  keyholder: "Trusted Key",
  beneficiary: "Beneficiary",
};

/**
 * The shell is mounted by the role's own layout, so a portal only ever receives
 * the identity it is entitled to.
 */
export function AppShell({
  children,
  role,
  name,
}: {
  children: ReactNode;
  role: Role;
  name: string;
}) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const nav = NAV[role];

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const person = { name, role: ROLE_LABEL[role] };

  const sidebar = (
    <div className="flex min-h-full flex-col gap-6 px-4 py-6">
      <Link href="/dashboard" className="flex px-1" onClick={() => setOpen(false)} aria-label="PayHalo home">
        <Wordmark />
      </Link>

      <div className="-mt-2 px-2">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#94a29a]">
          {role === "owner"
            ? "Your inheritance arrangements"
            : role === "keyholder"
              ? "Your Trusted Key role"
              : "Your beneficiary role"}
        </p>
      </div>

      <nav aria-label="Primary" className="space-y-1">
        <NavList items={nav.primary} pathname={pathname} onNavigate={() => setOpen(false)} />
      </nav>

      <div className="hairline" />

      <nav aria-label="Secondary" className="space-y-1">
        <NavList items={nav.secondary} pathname={pathname} onNavigate={() => setOpen(false)} bare />
      </nav>

      <div className="mt-auto space-y-4">
        <div className="rounded-[18px] bg-[var(--color-forest)] p-5 text-[#eef5ee]">
          <p className="font-[var(--font-display)] text-[15px] font-bold tracking-[-0.01em]">{nav.promo.title}</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#c9dccd]">{nav.promo.body}</p>
          <Link
            href={nav.promo.href}
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-lime)] transition hover:gap-2.5"
          >
            {nav.promo.cta} <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 px-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-mint)] text-[11.5px] font-bold text-[var(--color-forest)]">
            {initials(person.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[var(--color-ink)]">{person.name}</p>
            <p className="truncate text-[11.5px] text-[var(--color-muted)]">{person.role}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] overflow-y-auto overscroll-contain border-r border-white/70 bg-white/65 backdrop-blur-xl [scrollbar-width:thin] lg:block">
        {sidebar}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#172d29]/35 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 w-[290px] max-w-[86vw] overflow-y-auto border-r border-white/70 bg-white/85 backdrop-blur-2xl shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-5 grid h-9 w-9 place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-mint)]"
            >
              <IconClose />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 border-b border-white/70 bg-white/60 backdrop-blur-xl">
          <div className="flex h-[64px] items-center gap-3 px-4 sm:px-8">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line)] text-[var(--color-ink)] lg:hidden"
            >
              <IconMenu />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <Wordmark small />
            </div>

            <div className="ml-auto flex items-center gap-3 sm:gap-5">
              {role === "owner" ? (
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="rounded-full border border-[var(--color-line)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--color-muted)] transition hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]"
                  >
                    Sign out
                  </button>
                </form>
              ) : null}
              <Link
                href={role === "owner" ? "/help" : role === "keyholder" ? "/keyholder/support" : "/beneficiary/support"}
                className="hidden items-center gap-1 text-[12.5px] font-semibold text-[var(--color-ink)] transition hover:text-[var(--color-brand)] sm:inline-flex"
              >
                Help <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </header>

        <main id="main">{children}</main>

        <footer className="mt-6 border-t border-[var(--color-line)] px-5 pb-24 pt-5 text-[11.5px] text-[var(--color-muted)] sm:px-8 sm:pb-20">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <p>Help is a click away if anything here is unclear.</p>
            <p className="font-[var(--font-display)] font-semibold tracking-[0.02em] text-[var(--color-forest)]">
              PayHalo / Your arrangements, considered.
            </p>
          </div>
        </footer>
      </div>

      <MobileTabs role={role} />
    </div>
  );
}

/**
 * The phone shell: five thumb-reachable destinations, floating above the page
 * with the canvas showing through. Nothing here duplicates the desktop
 * sidebar's secondary items — those live in the drawer.
 */
function MobileTabs({ role }: { role: Role }) {
  const pathname = usePathname();
  const tabs: NavItem[] =
    role === "owner"
      ? [
          { href: "/dashboard", label: "Home", icon: <IconDashboard /> },
          { href: "/assets", label: "My assets", icon: <IconAssets /> },
          { href: "/plan", label: "Plan", icon: <IconPlan /> },
          { href: "/settings", label: "Profile", icon: <IconShield /> },
        ]
      : role === "keyholder"
        ? [
            { href: "/keyholder", label: "Home", icon: <IconDashboard />, exact: true },
            { href: "/keyholder/support", label: "Support", icon: <IconHelp /> },
          ]
        : [
            { href: "/beneficiary", label: "Home", icon: <IconDashboard />, exact: true },
            { href: "/beneficiary/support", label: "Support", icon: <IconHelp /> },
          ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/80 backdrop-blur-2xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-[560px] items-stretch justify-between px-2">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-[14px] px-1 py-2.5 text-[10.5px] font-semibold transition ${
                  active ? "text-[var(--color-brand)]" : "text-[var(--color-muted)]"
                }`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full transition ${
                    active ? "bg-[var(--color-mint)]" : ""
                  }`}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg width={small ? 22 : 26} height={small ? 22 : 26} viewBox="0 0 32 32" aria-hidden>
        <path
          d="M5 9.5c0 8 4 12.5 9.5 12.5S25 17 26.5 5.5"
          stroke="#008477"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M5.5 9.5C9 9 12 7 13.5 4" stroke="#153f35" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.25" />
      </svg>
      <span
        className={`font-[var(--font-display)] font-extrabold tracking-[-0.055em] text-[var(--color-brand)] ${
          small ? "text-[21px]" : "text-[26px]"
        }`}
        style={{ fontFeatureSettings: '"ss01"' }}
      >
        payhalo
      </span>
    </span>
  );
}
