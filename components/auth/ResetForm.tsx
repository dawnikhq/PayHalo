"use client";

import Link from "next/link";
import { useState } from "react";
import { PasswordField } from "./PasswordField";

const input =
  "mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none";
const label = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

const RULES = [
  "At least 10 characters",
  "A mix of letters and numbers",
  "Something you do not use anywhere else",
];

export function ResetForm({ token, email: initialEmail = "" }: { token: string; email?: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* The no-token view: ask for the link instead of pretending one exists. This
     is the page a security notice points at, so it has to be a real door. */
  const [email, setEmail] = useState(initialEmail);
  const [asking, setAsking] = useState(false);
  const [asked, setAsked] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  async function requestLink(event: React.FormEvent) {
    event.preventDefault();
    if (asking) return;
    setAsking(true);
    setAskError(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "That could not be sent just now.");
      setAsked(data.message ?? "If that address has a PayHalo account, a reset link is on its way.");
    } catch (e) {
      setAskError(e instanceof Error ? e.message : "That could not be sent just now.");
    } finally {
      setAsking(false);
    }
  }

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
      <form onSubmit={requestLink} className="rounded-[18px] border border-[var(--color-line)] bg-white p-6 md:p-7">
        <p className="label text-[var(--color-brand)]">Change your password</p>
        <p className="h3 mt-2">{asked ? "Check your inbox." : "Start with your email."}</p>

        {asked ? (
          <>
            <p className="t-small mt-2">{asked}</p>
            <p className="t-small mt-2">
              The link works once, and for an hour. If it does not arrive, look in spam before asking again.
            </p>
            <Link href="/signin" className="btn btn-primary mt-5 w-full">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="t-small mt-2">
              Reset links are single use and expire after an hour. Enter the address on your account and we will send a
              fresh one.
            </p>
            <label htmlFor="reset-email" className={`${label} mt-5`}>
              Email address
            </label>
            <input
              id="reset-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={input}
            />
            {askError ? <p className="field-error mt-3">{askError}</p> : null}
            <button type="submit" disabled={asking} className="btn btn-primary mt-4 w-full">
              {asking ? "Sending…" : "Email me a reset link"}
            </button>
            <p className="t-small mt-4">
              Remembered it?{" "}
              <Link href="/signin" className="font-semibold text-[var(--color-brand)]">
                Sign in instead
              </Link>
              .
            </p>
          </>
        )}
      </form>
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
        <PasswordField
          id="new-password"
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          autoFocus
          placeholder="At least 10 characters"
        />
        <PasswordField
          id="confirm-password"
          label="Repeat it"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          placeholder="The same password"
        />
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
