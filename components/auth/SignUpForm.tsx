"use client";

import { useState } from "react";
import { PasswordField } from "./PasswordField";

const input =
  "mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none";
const label = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

export function SignUpForm({ initialEmail = "", next = "" }: { initialEmail?: string; next?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<string | null>(null);
  const [resent, setResent] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, next }),
      });
      const data = (await res.json()) as { error?: string; email?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create the account.");
      setWaiting(data.email ?? email);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setResent(null);
    const res = await fetch("/api/auth/resend-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: waiting, next }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    setResent(data.message ?? data.error ?? "If that address is waiting, a fresh link is on its way.");
  }

  if (waiting) {
    return (
      <div className="rounded-[18px] border border-[var(--color-line)] bg-white p-6 md:p-7">
        <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-mint)] text-[16px] text-[var(--color-forest)]">
          ✉
        </span>
        <p className="label mt-4 text-[var(--color-brand)]">One step left</p>
        <p className="h3 mt-2">Confirm your email address.</p>
        <p className="t-small mt-2">
          We have sent a link to <span className="font-semibold text-[var(--color-ink)]">{waiting}</span>. Open it and
          your account is made — until then, nothing is stored beyond the address you gave us.
        </p>
        <ul className="mt-4 space-y-2 text-[12.5px] text-[var(--color-muted)]">
          <li>The link works once, and for 24 hours.</li>
          <li>Nothing arrives? Look in spam, then ask for another below.</li>
          <li>You can close this page and come back through the link.</li>
        </ul>
        <button type="button" onClick={resend} className="btn btn-secondary mt-5 w-full">
          Send the link again
        </button>
        {resent && <p className="t-small mt-3 text-[var(--color-brand)]">{resent}</p>}
        <p className="t-small mt-4">
          Wrong address?{" "}
          <button type="button" onClick={() => setWaiting(null)} className="font-semibold text-[var(--color-brand)]">
            Start again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[18px] border border-[var(--color-line)] bg-white p-6 md:p-7">
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className={label}>
            Your name
          </label>
          <input
            id="name"
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ada Okafor"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="email" className={label}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={input}
          />
        </div>
        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={10}
          placeholder="At least 10 characters"
          hint="Ten characters or more, with letters and numbers."
        />
      </div>

      {error && <p className="field-error mt-4">{error}</p>}

      <button type="submit" disabled={busy} className="btn btn-primary mt-5 w-full">
        {busy ? "Creating…" : "Create my plan"}
      </button>

      <p className="t-meta mt-3">
        We email a link to confirm this address, then your account is made. Every sign-in after that asks for a
        six-digit code by email as well.
      </p>

      <p className="t-small mt-4">
        Already have a plan?{" "}
        <a href="/signin" className="font-semibold text-[var(--color-brand)]">
          Sign in
        </a>
        .
      </p>
    </form>
  );
}
