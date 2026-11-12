"use client";

import Link from "next/link";
import { useState } from "react";

const input =
  "mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none";
const label = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

const RULES = [
  "At least 10 characters",
  "A mix of letters and numbers",
  "Something you do not use anywhere else",
];

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "The password could not be changed.");
      window.location.assign("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-[18px] border border-[var(--color-line)] bg-white p-6 md:p-7">
        <p className="label text-[var(--color-brand)]">Reset link</p>
        <p className="h3 mt-2">This link is incomplete.</p>
        <p className="t-small mt-2">
          Reset links are single use and expire after an hour. Ask for a fresh one from the sign-in screen.
        </p>
        <Link href="/signin" className="btn btn-primary mt-5 w-full">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[18px] border border-[var(--color-line)] bg-white p-6 md:p-7">
      <p className="label text-[var(--color-brand)]">Choose a new password</p>
      <p className="h3 mt-2">Take your account back.</p>
      <p className="t-small mt-2">
        Setting a password signs you in and closes the reset link. Any other open reset links stop working too.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="new-password" className={label}>
            New password
          </label>
          <input
            id="new-password"
            type="password"
            required
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 10 characters"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className={label}>
            Repeat it
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="The same password"
            className={input}
          />
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {RULES.map((rule) => (
          <li key={rule} className="flex items-center gap-2 text-[11.5px] text-[var(--color-muted)]">
            <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--color-sage)]" />
            {rule}
          </li>
        ))}
      </ul>

      {error && <p className="field-error mt-4">{error}</p>}

      <button type="submit" disabled={busy} className="btn btn-primary mt-5 w-full">
        {busy ? "Saving…" : "Set password and sign in"}
      </button>

      <p className="t-small mt-4">
        Remembered it?{" "}
        <Link href="/signin" className="font-semibold text-[var(--color-brand)]">
          Sign in instead
        </Link>
        .
      </p>
    </form>
  );
}
