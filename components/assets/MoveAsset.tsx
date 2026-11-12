"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Moving one asset into another arrangement, from the asset's own page.
 *
 * The select only ever lists real arrangements, and the label says whether the
 * destination is sealed — because an asset moved into a sealed plan joins that
 * plan's vault, and that is worth knowing before pressing the button.
 */
export function MoveAsset({
  assetId,
  assetLabel,
  plans,
}: {
  assetId: number;
  assetLabel: string;
  plans: { no: number; name: string; sealed: boolean; vault: string | null; current: boolean }[];
}) {
  const router = useRouter();
  const targets = plans.filter((p) => !p.current);
  const [to, setTo] = useState<number | "">(targets[0]?.no ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const chosen = targets.find((p) => p.no === to);

  async function move() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/assets/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assetId, toPlanNo: chosen.no }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; toName?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "The asset could not be moved.");
      setDone(`Moved to ${data.toName ?? chosen.name}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The asset could not be moved.");
    } finally {
      setBusy(false);
    }
  }

  if (!targets.length) {
    return (
      <p className="t-small">
        This is your only arrangement. Create another on the My arrangements page and {assetLabel} can move across.
      </p>
    );
  }

  return (
    <div>
      <label htmlFor="move-to" className="label block">
        Move to another arrangement
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <select
          id="move-to"
          className="input flex-1"
          value={String(to)}
          onChange={(e) => setTo(Number(e.target.value))}
          disabled={busy}
        >
          {targets.map((p) => (
            <option key={p.no} value={p.no}>
              {p.name}
              {p.sealed ? " · sealed" : " · draft"}
              {p.vault ? ` · vault ${p.vault}` : ""}
            </option>
          ))}
        </select>
        <button type="button" onClick={move} disabled={busy || !chosen} className="btn btn-secondary shrink-0">
          {busy ? "Moving…" : "Move asset"}
        </button>
      </div>
      <p className="field-help mt-2">
        {chosen?.sealed
          ? `${chosen.name} is sealed${chosen.vault ? ` and has vault ${chosen.vault}` : ""}. The asset joins that plan's vault and is shared among its people exactly as they are recorded.`
          : "The asset keeps its label, provider, figure and notes. Both plans keep a dated line in their trail."}
      </p>
      {error && <p className="field-error mt-2">{error}</p>}
      {done && <p className="mt-2 text-[12px] font-medium text-[var(--color-brand)]">{done}</p>}
    </div>
  );
}
