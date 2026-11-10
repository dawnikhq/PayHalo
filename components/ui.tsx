import Link from "next/link";
import type { ReactNode } from "react";
import type { PlanStep } from "@/lib/types";

/* ------------------------------------------------------------------ layout */

export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[1180px] px-5 pb-16 pt-7 sm:px-8 ${className}`}>{children}</div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  meta,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
        <h1 className="h1">{title}</h1>
        {description && <p className="t-body mt-2 max-w-[62ch]">{description}</p>}
        {meta && <div className="mt-3">{meta}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="h2">{title}</h2>
        {hint && <p className="t-small mt-1">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`hairline ${className}`} />;
}

export function Badge({
  children,
  tone = "mint",
  dot = false,
}: {
  children: ReactNode;
  tone?: "forest" | "lime" | "mint" | "warn" | "danger" | "neutral";
  dot?: boolean;
}) {
  return (
    <span className={`pill badge-${tone}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="t-small">{children}</p>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[var(--color-line-strong)] bg-[#fbfdfb] px-6 py-12 text-center">
      <p className="h3">{title}</p>
      <p className="t-small mt-1.5 max-w-[42ch]">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------- data bits */

export function Stat({
  label,
  value,
  hint,
  tone = "surface",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "surface" | "forest";
}) {
  const forest = tone === "forest";
  return (
    <div className={forest ? "card-forest p-6" : "card p-6"}>
      <p className={`label ${forest ? "" : "text-[var(--color-muted)]"}`}>{label}</p>
      <p className={`t-num mt-2 text-[28px] leading-none ${forest ? "text-white" : "text-[var(--color-ink)]"}`}>
        {value}
      </p>
      {hint && (
        <p className={`mt-2 text-[12px] ${forest ? "text-[#cfe0d3]" : "text-[var(--color-muted)]"}`}>{hint}</p>
      )}
    </div>
  );
}

export function ProgressTicks({ steps, dark = false }: { steps: PlanStep[]; dark?: boolean }) {
  return (
    <div className="flex gap-1.5" aria-hidden>
      {steps.map((s) => (
        <span
          key={s.key}
          className="h-1.5 flex-1 rounded-full"
          style={{
            background: s.done
              ? dark
                ? "#d9f4a5"
                : "var(--color-forest)"
              : dark
                ? "rgba(255,255,255,0.22)"
                : "#dbe5db",
          }}
        />
      ))}
    </div>
  );
}

export function SafetyNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`card-mint ${compact ? "p-5" : "p-6 md:p-7"}`}>
      <p className="label text-[var(--color-brand)]">Safety window</p>
      <p className="h2 mt-2 text-[var(--color-forest)]">14 days. Always time to respond.</p>
      <p className="t-body mt-2 max-w-[70ch] text-[#3c5a4e]">
        A verified claim notifies the account holder first. Nothing is released before 14 full days
        have passed, and an account-holder response stops the handover.
      </p>
    </div>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-brand)] transition hover:gap-2.5"
    >
      {children}
      <span aria-hidden>→</span>
    </Link>
  );
}

export function Field({
  label,
  htmlFor,
  help,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  help?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-[var(--color-ink)]">
          {label}
        </label>
        {optional && <span className="text-[11px] text-[var(--color-muted)]">Optional</span>}
      </div>
      {children}
      {error ? (
        <p className="field-error mt-1.5">{error}</p>
      ) : help ? (
        <p className="field-help mt-1.5">{help}</p>
      ) : null}
    </div>
  );
}
