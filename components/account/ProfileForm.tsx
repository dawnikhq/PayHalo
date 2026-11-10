"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/ui";
import type { User } from "@/lib/types";

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [timezone, setTimezone] = useState(user.timezone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, timezone }),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "Something went wrong." }));
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Your profile could not be saved.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 md:p-7">
      <h2 className="h2">Your details</h2>
      <p className="t-small mt-1">
        Kept current so a safety notice can reach you. Never shown to a keyholder or beneficiary.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="pr-name">
          <input id="pr-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Email" htmlFor="pr-email">
          <input
            id="pr-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Phone" htmlFor="pr-phone" optional help="Never shared with a keyholder or beneficiary.">
          <input id="pr-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Time zone" htmlFor="pr-tz" optional>
          <input
            id="pr-tz"
            className="input"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="West Africa Time · UTC+1"
          />
        </Field>
      </div>

      {error && <p className="field-error mt-3">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
        <p className="t-meta">Only you can see your contact details.</p>
        <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
          {busy ? "Saving…" : saved ? "Saved" : "Save details"}
        </button>
      </div>
    </form>
  );
}
