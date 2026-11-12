"use client";

import { useState } from "react";
import Link from "next/link";

type Outcome =
  | { kind: "sent"; email: string; existing: boolean }
  | { kind: "sign-in"; email: string }
  | { kind: "sign-up"; email: string };

/**
 * The one field PayPal left out.
 *
 * No paragraph explaining the handshake: the heading asks the question, the
 * field takes the answer, and the reply is either a link on its way or the door
 * they actually wanted — signing in when the address already has a plan, making
 * one when it does not.
 */
export function PayPalEmailForm({ ticket, next }: { ticket: string; next?: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

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
        outcome?: string;
        sentTo?: string;
        email?: string;
        existing?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "That did not go through. Try again.");

      const sentTo = json.sentTo ?? json.email ?? email;
      if (json.outcome === "sign-in") setOutcome({ kind: "sign-in", email: sentTo });
      else if (json.outcome === "sign-up") setOutcome({ kind: "sign-up", email: sentTo });
      else setOutcome({ kind: "sent", email: sentTo, existing: Boolean(json.existing) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (outcome?.kind === "sign-in") {
    return (
      <div className="card p-6 sm:p-7">
        <p className="eyebrow">Already here</p>
        <p className="h2 mt-2">That address has a plan.</p>
        <p className="t-small mt-2">
          <span className="font-semibold text-[var(--color-ink)]">{outcome.email}</span> is already signed up, so there
          is nothing to create. Sign in and carry on where you left off.
        </p>
        <Link href="/signin" className="btn btn-primary mt-5 inline-flex">
          Sign in instead
        </Link>
        <p className="t-meta mt-3">
          Not your address?{" "}
          <button
            type="button"
            onClick={() => setOutcome(null)}
            className="font-semibold text-[var(--color-brand)] hover:underline"
          >
            Use another one
          </button>
          .
        </p>
      </div>
    );
  }

  if (outcome?.kind === "sign-up") {
    return (
      <div className="card p-6 sm:p-7">
        <p className="eyebrow">Not yet</p>
        <p className="h2 mt-2">No plan with that address.</p>
        <p className="t-small mt-2">
          <span className="font-semibold text-[var(--color-ink)]">{outcome.email}</span> has never made a plan here, so
          there is nothing to sign in to. Create one — it takes a few minutes.
        </p>
        <Link href="/signup" className="btn btn-primary mt-5 inline-flex">
          Create my plan
        </Link>
        <p className="t-meta mt-3">
          Typed it wrong?{" "}
          <button
            type="button"
            onClick={() => setOutcome(null)}
            className="font-semibold text-[var(--color-brand)] hover:underline"
          >
            Use another address
          </button>
          .
        </p>
      </div>
    );
  }

  if (outcome?.kind === "sent") {
    return (
      <div className="card p-6 sm:p-7">
        <p className="eyebrow">Check your inbox</p>
        <p className="h2 mt-2">{outcome.existing ? "One click and you are in." : "Confirm the address."}</p>
        <p className="t-small mt-2">
          We emailed <span className="font-semibold text-[var(--color-ink)]">{outcome.email}</span>
          {outcome.existing
            ? " a sign-in link. That address already has a plan, so the link is how we know it is yours."
            : " a link. Opening it confirms the address and opens your plan."}
        </p>
        <p className="t-small mt-3">
          Wrong address?{" "}
          <button
            type="button"
            onClick={() => setOutcome(null)}
            className="font-semibold text-[var(--color-brand)] hover:underline"
          >
            Try a different one
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-7">
      <label htmlFor="paypal-email" className="label block">
        Email address
      </label>
      <input
        id="paypal-email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        autoFocus
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
        {busy ? "Checking…" : "Continue"}
      </button>

      <p className="t-meta mt-3">
        <Link href="/signin" className="font-semibold text-[var(--color-brand)] hover:underline">
          Use a password instead
        </Link>
        .
      </p>
    </form>
  );
}
