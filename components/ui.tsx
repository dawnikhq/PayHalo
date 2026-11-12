import type { ReactNode } from "react";
import type { PlanStep } from "@/lib/types";

/* ------------------------------------------------------------------ layout */

export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[1180px] px-5 pb-28 pt-7 sm:px-8 lg:pb-16 ${className}`}>{children}</div>
  );
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
