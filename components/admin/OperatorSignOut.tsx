"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Closing the operator console forgets the passcode cookie. */
export function OperatorSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function leave() {
    setBusy(true);
    await fetch("/api/admin/session", { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={leave}
      disabled={busy}
      className="rounded-full border border-[rgba(21,63,53,0.14)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--color-muted)] transition hover:border-[rgba(21,63,53,0.24)] hover:text-[var(--color-ink)]"
    >
      {busy ? "Leaving…" : "Lock the desk"}
    </button>
  );
}
