"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SealPlan({
  sealed,
  ready,
  className = "",
}: {
  sealed: boolean;
  ready: boolean;
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
    const data = await res.json().catch(() => ({ ok: false, error: "Something went wrong." }));
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
      <div className={`card-mint p-5 ${className}`}>
        <p className="text-[13px] font-semibold text-[var(--color-forest)]">This plan is sealed.</p>
        <p className="t-small mt-1 text-[#3c5a4e]">
          Your instructions are recorded. You can still edit them — any change is dated on the trail.
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
              {busy ? "Sealing…" : "Yes, seal the plan"}
            </button>
            <button onClick={() => setConfirming(false)} className="btn btn-secondary">
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
          Finish the remaining steps and the seal button unlocks. Nothing is locked in the meantime.
        </p>
      )}
      {error && <p className="field-error mt-2">{error}</p>}
      {confirming && (
        <p className="t-meta mt-2">
          Sealing records your instructions as final. Nothing is released without a verified claim and 14
          full days.
        </p>
      )}
    </div>
  );
}
