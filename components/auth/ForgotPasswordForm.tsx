"use client";

import { useState } from "react";

const input =
  "mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none";
const label = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ delivered: boolean; message: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; delivered?: boolean; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send the reset link.");
      setSent({
        delivered: data.delivered !== false,
        message: data.message ?? "If that address has an account, a reset link is on its way.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { delivered?: boolean; message?: string };
      setSent({
        delivered: data.delivered !== false,
        message: data.message ?? "If that address has an account, a reset link is on its way.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-[18px] border border-[var(--color-line)] bg-white p-6 md:p-7">
        <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-mint)] text-[16px] text-[var(--color-forest)]">
          ✉
        </span>
        <p className="label mt-4 text-[var(--color-brand)]">{sent.delivered ? "Check your inbox" : "Link not sent"}</p>
        <p className="h3 mt-2">{sent.delivered ? "One link, thirty minutes." : "Email isn’t connected here."}</p>
        <p className="t-small mt-2">{sent.message}</p>
        {sent.delivered ? (
          <ul className="mt-4 space-y-2 text-[12.5px] text-[var(--color-muted)]">
            <li>The link works once, and for thirty minutes.</li>
            <li>Nothing arrives? Look in spam, then ask for another below.</li>
            <li>It only sets a new password — it does not open your plan.</li>
          </ul>
        ) : null}
        {sent.delivered && (
          <button type="button" onClick={resend} disabled={busy} className="btn btn-secondary mt-5 w-full">
            {busy ? "Sending…" : "Send the link again"}
          </button>
        )}
        <p className="t-small mt-4">
          Wrong address?{" "}
          <button type="button" onClick={() => setSent(null)} className="font-semibold text-[var(--color-brand)]">
            Start again
          </button>
          .
        </p>
        <p className="t-small mt-2">
          Remembered it?{" "}
          <a href="/signin" className="font-semibold text-[var(--color-brand)]">
            Back to sign in
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[18px] border border-[var(--color-line)] bg-white p-6 md:p-7">
      <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-mint)] text-[16px] text-[var(--color-forest)]">
        ↺
      </span>
      <p className="label mt-4 text-[var(--color-brand)]">No access</p>
      <p className="h3 mt-2">Forgot your password?</p>
      <p className="t-small mt-2">
        Tell us the address on your account and we will send a link that lets you choose a new password. The link
        proves the mailbox is yours; it does not open the plan.
      </p>

      <div className="mt-5">
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

      {error && <p className="field-error mt-4">{error}</p>}

      <button type="submit" disabled={busy} className="btn btn-primary mt-5 w-full">
        {busy ? "Sending…" : "Email me a reset link"}
      </button>

      <p className="t-small mt-4">
        We send to the address on the account and to nothing else.{" "}
        <a href="/signin" className="font-semibold text-[var(--color-brand)]">
          Back to sign in
        </a>
        .
      </p>
    </form>
  );
}
