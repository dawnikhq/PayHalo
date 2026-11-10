"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function SignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    setMessage(null);

    const client = supabaseBrowser();
    if (!client) {
      setState("error");
      setMessage("Accounts are not configured on this deployment.");
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });

    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="rise rounded-[18px] border border-[#cbea92] bg-[var(--color-lime)] p-6">
        <p className="label text-[#4d6b2a]">Check your inbox</p>
        <p className="h2 mt-2 text-[var(--color-forest)]">A sign-in link is on its way.</p>
        <p className="t-small mt-2 text-[#3f5b3a]">
          Sent to <span className="font-semibold">{email}</span>. The link works once and expires in an hour. If it
          doesn&apos;t arrive, check spam or send another.
        </p>
        <button onClick={() => setState("idle")} className="mt-4 text-[12.5px] font-semibold text-[var(--color-forest)] underline">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[18px] border border-[var(--color-line)] bg-white p-6 shadow-[0_20px_60px_-45px_rgba(23,45,41,0.6)]">
      <label htmlFor="email" className="label">
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
        className="mt-2 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3.5 text-[14px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none"
      />

      <button type="submit" disabled={state === "sending" || !email.trim()} className="btn btn-primary mt-4 w-full justify-center">
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>

      {message && <p className="mt-3 text-[12px] text-[var(--color-ember)]">{message}</p>}

      <p className="mt-4 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
        No password to remember and none for us to leak. We store your email to sign you in, and nothing you read here
        is shared with a keyholder or beneficiary until a verified handover completes.
      </p>
    </form>
  );
}
