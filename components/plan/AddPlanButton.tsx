"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Add plan.
 *
 * A second plan is a whole second document — its own assets, people, Trusted Key
 * and vault — so this creates one and opens it, rather than copying anything
 * across. The name is optional; a plan can be named later.
 */
export function AddPlanButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "That didn't work. Try again.");
        return;
      }
      setName("");
      setOpen(false);
      router.push("/plan");
      router.refresh();
    } catch {
      setError("That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`btn btn-secondary ${className}`}>
        <span aria-hidden>+</span> Add plan
      </button>
    );
  }

  return (
    <div className={`w-full max-w-[340px] rounded-[14px] border border-[var(--color-line)] bg-white p-3 text-left ${className}`}>
      <form onSubmit={create} className="flex flex-col gap-2">
        <label className="label" htmlFor="new-plan-name">
          Name this plan
        </label>
        <input
          id="new-plan-name"
          className="input h-10"
          placeholder="Family, the studio, a second set…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoFocus
        />
        <div className="flex items-center gap-2">
          <button className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? "Creating…" : "Create plan"}
          </button>
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
      <p className="field-help mt-2">
        A separate plan with its own assets, people, Trusted Key and vault. Nothing is copied across.
      </p>
      {error && <p className="field-error mt-2">{error}</p>}
    </div>
  );
}
