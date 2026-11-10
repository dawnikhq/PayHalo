"use client";

import { useState } from "react";

type Mode = "password" | "link";

const input =
  "mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none";
const label = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

export function SignInForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ delivered: boolean; message: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSent(null);

    try {
      if (mode === "password") {
        const res = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not sign you in.");
        window.location.assign(next);
        return;
      }

      const res = await fetch("/api/auth/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; delivered?: boolean; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send the link.");
      setSent({
        delivered: data.delivered !== false,
        message: data.message ?? "If that address has an account, a link is on its way.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rise rounded-[18px] border border-[var(--color-line)] bg-white p-6">
        <p className="label text-[var(--color-brand)]">{sent.delivered ? "Check your inbox" : "Link not sent"}</p>
        <p className="h3 mt-2">{sent.delivered ? "One link, twenty minutes." : "Email isn’t connected here."}</p>
        <p className="t-small mt-2">{sent.message}</p>
        <p className="t-small mt-4">
          You can also{" "}
          <button
            type="button"
            onClick={() => {
              setSent(null);
              setMode("password");
            }}
            className="font-semibold text-[var(--color-brand)]"
          >
            sign in with your password
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[18px] border border-[var(--color-line)] bg-white p-6 md:p-7">
      <div className="flex gap-1 rounded-full border border-[var(--color-line)] p-1">
        {(
          [
            ["password", "Password"],
            ["link", "Email a link"],
          ] as [Mode, string][]
        ).map(([value, text]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={`h-8 flex-1 rounded-full text-[12px] font-semibold transition ${
              mode === value
                ? "bg-[var(--color-forest)] text-white"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
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

        {mode === "password" && (
          <div>
            <label htmlFor="password" className={label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className={input}
            />
          </div>
        )}
      </div>

      {error && <p className="field-error mt-4">{error}</p>}

      <button type="submit" disabled={busy} className="btn btn-primary mt-5 w-full">
        {busy ? "Working…" : mode === "password" ? "Sign in" : "Email me a sign-in link"}
      </button>

      <p className="t-small mt-4">
        New here?{" "}
        <a href="/signup" className="font-semibold text-[var(--color-brand)]">
          Create your plan
        </a>
        .
      </p>
    </form>
  );
}
