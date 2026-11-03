"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Countdown } from "./Countdown";
import { shortDate } from "@/lib/format";

export function SafetyWindowBanner({
  seconds,
  claimId,
  initiatedAt,
}: {
  seconds: number;
  claimId: number;
  initiatedAt: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function cancel() {
    setCancelling(true);
    await fetch("/api/claim/cancel", { method: "POST" });
    startTransition(() => router.refresh());
    setCancelling(false);
    setConfirming(false);
  }

  return (
    <div className="rise relative overflow-hidden rounded-2xl border border-ember/30 bg-ember/[0.07] p-5 md:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ember/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.2em] text-ember">
            <span className="relative flex h-1.5 w-1.5">
              <span className="breathe absolute inline-flex h-full w-full rounded-full bg-ember" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember" />
            </span>
            Action needed — claim #{claimId}
          </p>
          <h2 className="mt-3 font-serif text-[26px] leading-tight text-ivory">
            Someone started your handover on {shortDate(initiatedAt)}.
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            If you&apos;re reading this, the request was a mistake. Stop it now and nothing
            transfers. Do nothing, and the window closes on its own.
          </p>
        </div>

        <div className="w-full md:w-[248px]">
          <Countdown seconds={seconds} />
          {confirming ? (
            <div className="mt-3 flex gap-2">
              <button onClick={cancel} disabled={cancelling || pending} className="btn btn-ghost !flex-1 !py-2 !text-[11.5px] !border-ember/40 !text-ember">
                {cancelling ? "Stopping…" : "Yes, stop it"}
              </button>
              <button onClick={() => setConfirming(false)} className="btn btn-quiet !py-2 !text-[11.5px]">
                Keep
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="btn btn-ghost mt-3 w-full !py-2 !text-[12px] !border-ember/40 !text-ember hover:!bg-ember/10">
              I&apos;m alive — cancel this
            </button>
          )}

          <details className="mt-3 group">
            <summary className="cursor-pointer list-none text-center text-[10.5px] uppercase tracking-[0.12em] text-muted transition hover:text-ivory">
              View the notice you were sent
            </summary>
            <div className="mt-2 rounded-xl border border-white/10 bg-black/40 p-3 text-left">
              <p className="text-[9.5px] uppercase tracking-[0.14em] text-muted/70">Hack1 · notice</p>
              <p className="mt-1.5 text-[12px] font-medium text-ivory">
                A handover has been started on your plan
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {`Someone holding your access code submitted a death certificate on ${shortDate(
                  initiatedAt,
                )}. If this is a mistake, stop it from your dashboard. Nothing transfers for 14 days.`}
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
