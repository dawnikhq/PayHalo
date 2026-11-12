"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminGate({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "That passcode is not right.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That passcode is not right.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto mt-10 max-w-[440px] p-7">
      <p className="eyebrow">Operators</p>
      <h1 className="h2 mt-2">The operator desk</h1>
      <p className="t-small mt-2">
        One passcode opens the console: who has joined, how far each arrangement has got, and every handover request
        waiting on a decision. Operators can read documentation, hold a request for research, and approve or decline.
        They cannot move money anywhere, name a recipient, or see a vault key.
      </p>
      {!configured && (
        <p className="field-error mt-3">No operator passcode is set on this deployment (ADMIN_PASSCODE).</p>
      )}
      <label htmlFor="admin-pass" className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        Operator passcode
      </label>
      <input
        id="admin-pass"
        type="password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-[13.5px] text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:outline-none"
      />
      {error && <p className="field-error mt-3">{error}</p>}
      <button type="submit" disabled={busy || !configured} className="btn btn-primary mt-4 w-full">
        {busy ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
