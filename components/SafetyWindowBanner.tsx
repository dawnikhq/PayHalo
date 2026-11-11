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
    <section className="rise card-warn p-6 md:p-7" aria-live="polite">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--color-warnink)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="breathe absolute inline-flex h-full w-full rounded-full bg-[var(--color-ember)]" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-ember)]" />
            </span>
            Action needed · claim #{claimId}
          </p>
          <h2 className="h2 mt-2 text-[#5c3d0f]">A handover was started on {shortDate(initiatedAt)}.</h2>
          <p className="t-body mt-2 text-[#6a4712]">
            If this is a mistake, stop it now and nothing transfers. Do nothing and the window closes on
            its own after 14 full days.
          </p>

          <details className="mt-4">
            <summary className="cursor-pointer list-none text-[12px] font-semibold text-[var(--color-warnink)] underline decoration-[#d9bf8c] underline-offset-4">
              View the notice you were sent
            </summary>
            <div className="mt-2.5 rounded-[12px] border border-[#e9d6b2] bg-white/70 p-3.5">
              <p className="label text-[var(--color-warnink)]">PayHalo notice</p>
              <p className="mt-1.5 text-[12.5px] font-semibold text-[#5c3d0f]">
                A handover has been started on your plan
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6a4712]">
                {`Someone holding your access code submitted a death certificate on ${shortDate(
                  initiatedAt,
                )}. If this is a mistake, stop it from your dashboard. Nothing transfers for 14 days.`}
              </p>
            </div>
          </details>
        </div>

        <div className="w-full md:w-[260px]">
          <Countdown seconds={seconds} />
          {confirming ? (
            <div className="mt-3 flex gap-2">
              <button
                onClick={cancel}
                disabled={cancelling || pending}
                className="btn btn-danger btn-sm flex-1"
              >
                {cancelling ? "Stopping…" : "Yes, stop it"}
              </button>
              <button onClick={() => setConfirming(false)} className="btn btn-secondary btn-sm">
                Keep
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="btn btn-primary btn-sm mt-3 w-full">
              I&apos;m alive — stop this handover
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
