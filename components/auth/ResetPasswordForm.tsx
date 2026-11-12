"use client";

import { useState } from "react";

const input =
  "mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none";
const label = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (password !== confirm) {
        throw new Error("Those two passwords do not match.");
      }
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not reset your password.");
      window.location.assign("/signin?reset=done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-[18px] border border-[#f0cfc6] bg-[#fdf1ee] p-6 md:p-7">
        <p className="label text-[var(--color-ember)]">One moment</p>
        <p className="h3 mt-2">This reset link is not complete.</p>
        <p className="t-small mt-2">
          The link you followed is missing its token. Request a fresh one and open it from the email.
        </p>
        <a href="/forgot-password" className="btn btn-primary mt-5 inline-block">
          Request a new link
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[18px] border border-[var(--color-line)] bg-white p-6 md:p-7">
      <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-mint)] text-[16px] text-[var(--color-forest)]">
        ↺
      </span>
      <p className="label mt-4 text-[var(--color-brand)]">Choose a new password</p>
      <p className="h3 mt-2">Set your new password.</p>
      <p className="t-small mt-2">
        Ten characters or more, with letters and numbers. This link works once — after it is used, it is gone.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="password" className={label}>
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 10 characters"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="confirm" className={label}>
            Repeat it
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Type it again"
            className={input}
          />
        </div>
      </div>

      {error && <p className="field-error mt-4">{error}</p>}

      <button
        type="submit"
        disabled={busy || password.length < 10 || password !== confirm}
        className="btn btn-primary mt-5 w-full"
      >
        {busy ? "Saving…" : "Set my new password"}
      </button>

      <p className="t-small mt-4">
        Once it is set, every other sign-in ends and you sign in again with the new password.{" "}
        <a href="/signin" className="font-semibold text-[var(--color-brand)]">
          Back to sign in
        </a>
        .
      </p>
    </form>
  );
}
