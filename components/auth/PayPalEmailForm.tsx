"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * One field between a PayPal sign-in and a plan.
 *
 * PayPal proved the person; the address is the only thing missing, and the
 * sentence says so plainly rather than blaming them or the button. The answer
 * is never trusted on its own: submitting emails a link, and opening that link
 * is what opens the account.
 */
export function PayPalEmailForm({ ticket, name }: { ticket: string; name: string | null }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<{ email: string; existing: boolean } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/paypal/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket, email }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        sentTo?: string;
        existing?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "That did not go through. Try again.");
      setSentTo({ email: json.sentTo ?? email, existing: Boolean(json.existing) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="card p-6 sm:p-7">
        <p className="eyebrow">Check your inbox</p>
        <p className="h2 mt-2">{sentTo.existing ? "One click and you are in." : "Confirm the address."}</p>
        <p className="t-small mt-2">
          We emailed <span className="font-semibold text-[var(--color-ink)]">{sentTo.email}</span>
          {sentTo.existing
            ? " a sign-in link. That address already has a PayHalo sign-in, so the link is how we know it is yours."
            : " a link. Opening it confirms the address and opens your plan — nothing is created until you do."}
        </p>
        <p className="t-small mt-3">
          Wrong address?{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="font-semibold text-[var(--color-brand)] hover:underline"
          >
            Try a different one
          </button>
          .
        </p>
        <Link href="/signin" className="btn btn-secondary mt-5 inline-flex">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-7">
      <p className="eyebrow">Almost there</p>
      <p className="h2 mt-2">Which email should we use?</p>
      <p className="t-small mt-2">
        {name ? `${name}, PayPal` : "PayPal"} signed you in but did not pass on an address, so we never received one. Type
        the address on the PayPal account and we will send a link to prove it.
      </p>

      <label htmlFor="paypal-email" className="label mt-5 block">
        Email address
      </label>
      <input
        id="paypal-email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="input mt-1 w-full"
      />

      {error && (
        <p role="alert" className="mt-3 rounded-[12px] bg-[#fdf1ee] px-3 py-2 text-[12px] text-[var(--color-ember)]">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn btn-primary mt-4 w-full">
        {busy ? "Sending…" : "Email me the link"}
      </button>

      <p className="t-meta mt-3">
        We use the address for the link and for signing in. Nothing else.{" "}
        <Link href="/signin" className="font-semibold text-[var(--color-brand)] hover:underline">
          Use a password instead
        </Link>
        .
      </p>
    </form>
  );
}
