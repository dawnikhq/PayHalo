"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function DemoDock() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [storage, setStorage] = useState<{ label: string; durable: boolean; ok?: boolean } | null>(null);
  const router = useRouter();

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !storage) {
      try {
        const res = await fetch("/api/meta", { cache: "no-store" });
        if (res.ok) setStorage(await res.json());
      } catch {
        /* non-fatal */
      }
    }
  }

  async function reset() {
    setMsg("Rewinding…");
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (!res.ok) throw new Error("failed");
      setMsg("Demo restored");
      startTransition(() => router.refresh());
    } catch {
      setMsg("Couldn't reset");
    }
    setTimeout(() => setMsg(null), 2200);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[80] print:hidden">
      {open && (
        <div className="rise mb-2 w-[262px] rounded-[18px] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-[0_24px_50px_-24px_rgba(23,45,41,0.45)]">
          <p className="label mb-2 px-1">Demo controls</p>
          <button
            onClick={reset}
            disabled={pending}
            className="mb-1.5 w-full rounded-[12px] border border-[var(--color-line)] px-3 py-2 text-left text-[12.5px] font-medium text-[var(--color-ink)] transition hover:border-[var(--color-line-strong)] hover:bg-[#f8fbf8] disabled:opacity-50"
          >
            ↺ Reset demo household
          </button>
          <Link
            href="/keyholder"
            className="mb-1.5 block rounded-[12px] border border-[var(--color-line)] px-3 py-2 text-[12.5px] font-medium text-[var(--color-ink)] transition hover:border-[var(--color-line-strong)] hover:bg-[#f8fbf8]"
          >
            ⚿ Open keyholder portal
          </Link>
          <Link
            href="/onboarding"
            className="block rounded-[12px] border border-[var(--color-line)] px-3 py-2 text-[12.5px] font-medium text-[var(--color-ink)] transition hover:border-[var(--color-line-strong)] hover:bg-[#f8fbf8]"
          >
            ✎ Build a plan from scratch
          </Link>
          <p className="mt-2.5 px-1 text-[10.5px] leading-relaxed text-[var(--color-muted)]">
            All balances, certificates and transfers are simulated.
          </p>
          <p className="mt-2 flex items-start gap-1.5 border-t border-[var(--color-line)] px-1 pt-2 text-[10px] leading-relaxed text-[var(--color-muted)]">
            <span
              className={`mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full ${
                storage?.ok === false || !storage?.durable ? "bg-[var(--color-ember)]" : "bg-[var(--color-sage)]"
              }`}
            />
            <span>
              {storage
                ? `${storage.label}${
                    storage.ok === false
                      ? " — unreachable, running in memory"
                      : storage.durable
                        ? " — durable"
                        : " — state can reset between requests"
                  }`
                : "Checking storage…"}
            </span>
          </p>
        </div>
      )}
      <button
        onClick={toggle}
        className="ml-auto flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2 text-[11.5px] font-semibold text-[var(--color-ink)] shadow-[0_10px_30px_-16px_rgba(23,45,41,0.6)] transition hover:border-[var(--color-line-strong)]"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="breathe absolute inline-flex h-full w-full rounded-full bg-[var(--color-brand)]" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
        </span>
        {msg ?? "Demo"}
      </button>
    </div>
  );
}
