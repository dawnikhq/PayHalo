"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Taking the seal off.
 *
 * Two presses, because it is a real change of state: the instructions stop being
 * fixed, the plan becomes a draft, and the Trusted Key is told. The vault is not
 * touched, and the copy says so.
 */
export function UnsealPlan({
  tone = "dark",
  className = "",
}: {
  /** "dark" sits on the green sealed banner, "light" on a white card. */
  tone?: "dark" | "light";
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unseal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plan/unseal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "The seal could not be lifted. Try again.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("The seal could not be lifted. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const primary =
    tone === "dark" ? "btn btn-sm bg-white text-[var(--color-forest)] hover:bg-[#eaf7ef]" : "btn btn-primary btn-sm";
  const secondary =
    tone === "dark"
      ? "btn btn-sm border border-white/35 text-white hover:bg-white/10"
      : "btn btn-secondary btn-sm";

  return (
    <div className={className}>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={unseal} disabled={busy} className={primary}>
            {busy ? "Unsealing…" : "Yes, unseal to edit"}
          </button>
          <button onClick={() => setConfirming(false)} disabled={busy} className={secondary}>
            Keep it sealed
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className={primary}>
          Unseal to edit
        </button>
      )}

      {confirming && !error && (
        <p className={`mt-2 text-[11.5px] leading-relaxed ${tone === "dark" ? "text-[#c9e4d2]" : "text-[var(--color-muted)]"}`}>
          The plan becomes a draft and your Trusted Key is told. Money already in the vault stays where it is — you will
          need to seal it again before a handover can use it.
        </p>
      )}
      {error && (
        <p className={`mt-2 text-[11.5px] leading-relaxed ${tone === "dark" ? "text-[#ffd9cd]" : "field-error"}`}>
          {error}
        </p>
      )}
    </div>
  );
}
