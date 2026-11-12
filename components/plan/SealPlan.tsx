"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SealedSeal } from "@/components/plan/SealedSeal";

/**
 * Sealing.
 *
 * Two things changed here for good. A plan does not seal without the Trusted Key
 * being told — the introduction is sent first, and if it cannot go out the plan
 * stays a draft with the reason on screen. And a sealed plan stops looking like
 * a button: it wears the seal.
 */
export function SealPlan({
  sealed,
  ready,
  sealedAt,
  vaultRef,
  className = "",
}: {
  sealed: boolean;
  ready: boolean;
  sealedAt?: string | null;
  vaultRef?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function seal() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/plan", { method: "POST" });
    const data = (await res.json().catch(() => ({ ok: false, error: "Something went wrong." }))) as {
      ok?: boolean;
      error?: string;
      keyholderMail?: { to?: string };
    };
    setBusy(false);

    if (!res.ok || !data.ok) {
      setError(data.error ?? "The plan could not be sealed yet.");
      return;
    }

    router.push("/dashboard?sealed=1");
    router.refresh();
  }

  if (sealed) {
    return (
      <div className={`rounded-[16px] bg-[linear-gradient(155deg,#0e6f56,#0b3d2e)] p-5 ${className}`}>
        <SealedSeal sealedAt={sealedAt ?? null} vaultRef={vaultRef ?? null} compact />
        <p className="mt-3 text-[12px] leading-relaxed text-[#c9e4d2]">
          Your instructions are recorded and your Trusted Key has been told. You can still edit anything — a change is
          dated on the trail and never unseals the plan.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {ready ? (
        confirming ? (
          <div className="flex flex-wrap gap-2">
            <button onClick={seal} disabled={busy} className="btn btn-primary flex-1">
              {busy ? "Sealing…" : "Yes, seal my plan"}
            </button>
            <button onClick={() => setConfirming(false)} disabled={busy} className="btn btn-secondary">
              Not yet
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="btn btn-primary w-full">
            Review &amp; seal <span aria-hidden>→</span>
          </button>
        )
      ) : (
        <p className="t-small">
          Finish the remaining steps and sealing unlocks. Nothing is locked in the meantime, and nothing is lost by
          waiting.
        </p>
      )}

      {confirming && !error && (
        <p className="t-meta mt-2">
          Sealing dates your instructions and emails your Trusted Key. The email is required — a plan cannot be sealed
          silently.
        </p>
      )}
      {error && (
        <div className="mt-3 rounded-[12px] border border-[#f0cfc6] bg-[#fdf1ee] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--color-ember)]">
          <p>{error}</p>
          <button
            type="button"
            onClick={seal}
            disabled={busy}
            className="mt-2 font-semibold underline underline-offset-4"
          >
            {busy ? "Sending…" : "Try again"}
          </button>
        </div>
      )}
    </div>
  );
}
