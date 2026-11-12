"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { money } from "@/lib/format";
import type { Beneficiary } from "@/lib/types";

export function AllocationEditor({
  backups,
  locked,
  totalCents,
}: {
  backups: Beneficiary[];
  locked: boolean;
  /** Value of the assets recorded in this plan — the estate these shares split. */
  totalCents: number;
}) {
  const router = useRouter();
  const [shares, setShares] = useState<Record<number, string>>(
    Object.fromEntries(backups.map((b) => [b.id, String(b.share)])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const typed = backups.reduce((sum, b) => sum + (Number(shares[b.id]) || 0), 0);
  const total = typed;
  const dirty = backups.some((b) => Number(shares[b.id] ?? 0) !== b.share);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/beneficiaries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shares: backups.map((b) => ({ id: b.id, share: Number(shares[b.id]) || 0 })),
      }),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "Something went wrong." }));
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Those shares could not be saved.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
    router.refresh();
  }

  async function remove(id: number) {
    setBusy(true);
    await fetch("/api/beneficiaries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remove: id }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <p className="eyebrow">02 / Family backups</p>
      <h2 className="h2 mt-2">A second circle of care.</h2>

      {backups.length ? (
        <>
          <ul className="mt-5 divide-y divide-[var(--color-line)]">
            {backups.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 py-3.5 first:pt-0">
                <Avatar name={b.name} size={34} tone="mint" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">{b.name}</p>
                  <p className="t-meta truncate">
                    {b.relationship}
                    {b.email ? ` · ${b.email}` : ""}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--color-brand)]">
                    {money(Math.round((totalCents * (Number(shares[b.id]) || 0)) / 100))} of this plan&apos;s{" "}
                    {money(totalCents)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 rounded-[10px] border border-[var(--color-line-strong)] bg-white px-2.5 py-1.5">
                  <label className="sr-only" htmlFor={`share-${b.id}`}>
                    Share for {b.name}
                  </label>
                  <input
                    id={`share-${b.id}`}
                    type="number"
                    min="0"
                    max="100"
                    value={shares[b.id] ?? "0"}
                    onChange={(e) => setShares((prev) => ({ ...prev, [b.id]: e.target.value }))}
                    disabled={locked}
                    className="w-10 bg-transparent text-right text-[13px] tabular-nums text-[var(--color-ink)] focus:outline-none"
                  />
                  <span className="text-[12px] text-[var(--color-muted)]">%</span>
                </div>

                <button
                  type="button"
                  onClick={() => remove(b.id)}
                  disabled={locked || busy}
                  aria-label={`Remove ${b.name}`}
                  className="grid h-8 w-8 place-items-center rounded-full text-[15px] text-[#a3b0a8] transition hover:bg-[#fdf3f0] hover:text-[var(--color-ember)] disabled:opacity-40"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p
              className={`text-[12px] font-medium ${
                total === 100 ? "text-[var(--color-brand)]" : "text-[var(--color-ember)]"
              }`}
            >
              {total}% of this plan allocated ·{" "}
              {money(Math.round((totalCents * total) / 100))} across {backups.length}{" "}
              {backups.length === 1 ? "backup" : "backups"}
              {total === 100 ? " · If only one backup can inherit, they receive 100%." : " · must total 100%."}
            </p>
            <button
              onClick={save}
              disabled={busy || !dirty || locked}
              className="btn btn-primary btn-sm"
            >
              {busy ? "Saving…" : saved ? "Saved" : "Save allocations"}
            </button>
          </div>
          {error && <p className="field-error mt-2">{error}</p>}
          {locked && (
            <p className="t-meta mt-2">Shares are locked while a handover is running.</p>
          )}
        </>
      ) : (
        <p className="t-body mt-4">
          No family backups yet. Add one so the plan never stops at a single person.
        </p>
      )}
    </div>
  );
}
