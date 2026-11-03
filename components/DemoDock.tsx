"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DemoDock() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [storage, setStorage] = useState<{
    label: string;
    durable: boolean;
    ok?: boolean;
  } | null>(null);
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
        <div className="rise mb-2 w-[248px] rounded-2xl border border-white/10 bg-[#101016]/95 p-3 shadow-2xl backdrop-blur-xl">
          <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.2em] text-brass/80">Demo controls</p>
          <button
            onClick={reset}
            disabled={pending}
            className="mb-1.5 w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left text-[12.5px] text-ivory transition hover:border-white/16 hover:bg-white/[0.07] disabled:opacity-50"
          >
            ↺ Reset demo household
          </button>
          <a
            href="/keyholder"
            className="mb-1.5 block w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left text-[12.5px] text-ivory transition hover:border-white/16 hover:bg-white/[0.07]"
          >
            ⚿ Open keyholder portal
          </a>
          <a
            href="/onboarding"
            className="block w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left text-[12.5px] text-ivory transition hover:border-white/16 hover:bg-white/[0.07]"
          >
            ✎ Build a plan from scratch
          </a>
          <p className="mt-2 px-1 text-[10.5px] leading-relaxed text-muted/70">
            All balances, certificates and transfers are simulated.
          </p>
          <p className="mt-2 flex items-start gap-1.5 border-t border-white/6 px-1 pt-2 text-[10px] leading-relaxed text-muted/50">
            <span
              className={`mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full ${
                storage?.ok === false || !storage?.durable ? "bg-ember/70" : "bg-sage"
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
        className="ml-auto flex items-center gap-2 rounded-full border border-white/12 bg-[#101016]/90 px-3.5 py-2 text-[11.5px] text-muted shadow-xl backdrop-blur-xl transition hover:text-ivory"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="breathe absolute inline-flex h-full w-full rounded-full bg-brass" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brass" />
        </span>
        {msg ?? "Demo"}
      </button>
    </div>
  );
}
