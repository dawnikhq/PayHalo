"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteAsset({ id, label }: { id: number; label: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    const res = await fetch("/api/assets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "It could not be removed.");
      return;
    }
    router.push("/assets");
    router.refresh();
  }

  return (
    <div className="rounded-[16px] border border-[#efd9d2] bg-[#fdf6f4] p-5">
      <p className="text-[13px] font-semibold text-[#8c3520]">Remove this asset</p>
      <p className="t-small mt-1">
        {label} would leave your plan entirely. Your beneficiaries and instructions stay as they are.
      </p>
      {error && <p className="field-error mt-2">{error}</p>}
      <div className="mt-4 flex gap-2">
        {confirming ? (
          <>
            <button onClick={remove} disabled={busy} className="btn btn-danger btn-sm">
              {busy ? "Removing…" : "Yes, remove it"}
            </button>
            <button onClick={() => setConfirming(false)} className="btn btn-secondary btn-sm">
              Keep it
            </button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className="btn btn-secondary btn-sm">
            Remove asset
          </button>
        )}
      </div>
    </div>
  );
}
