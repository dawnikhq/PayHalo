"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Take someone off the plan, in place.
 *
 * Removing a beneficiary is an edit, not a reset: the plan, its assets, its
 * Trusted Key and everyone else stay exactly where they are. The first click
 * asks, because this is the one button on the page that changes who inherits.
 */
export function RemovePerson({
  id,
  name,
  className = "",
  label = "Remove",
}: {
  id: number;
  name: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/beneficiaries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remove: id }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "That person could not be removed.");
      setAsking(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That person could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={`text-[12px] font-semibold text-[var(--color-muted)] underline-offset-4 transition hover:text-[var(--color-ember)] hover:underline ${className}`}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-2 text-[12px] ${className}`}>
      <span className="text-[var(--color-ink)]">Remove {name.split(" ")[0]}?</span>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="font-semibold text-[var(--color-ember)] underline underline-offset-4 disabled:opacity-50"
      >
        {busy ? "Removing…" : "Yes, remove"}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        disabled={busy}
        className="font-semibold text-[var(--color-brand)] underline underline-offset-4"
      >
        Keep
      </button>
      {error && <span className="text-[var(--color-ember)]">{error}</span>}
    </span>
  );
}
