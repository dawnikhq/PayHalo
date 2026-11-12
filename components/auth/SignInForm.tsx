"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "password" | "link" | "reset";

const input =
  "mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none";
const label = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

export function SignInForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"credentials" | "code">("credentials");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ delivered: boolean; message: string } | null>(null);
  const [sentMessage, setSentMessage] = useState<{
    delivered: boolean;
    title: string;
    lead: string;
    message: string;
  } | null>(null);
  const [resent, setResent] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage === "code") codeRef.current?.focus();
  }, [stage]);

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
        const data = (await res.json()) as { error?: string; code?: boolean };
        if (!res.ok) throw new Error(data.error ?? "Could not sign you in.");
        if (data.code === false) {
          // email is down: the server accepted the password on its own and said so
          window.location.assign(`${next}${next.includes("?") ? "&" : "?"}nocode=1`);
          return;
        }
        setStage("code");
        return;
      }

      if (mode === "reset") {
        const res = await fetch("/api/auth/forgot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = (await res.json()) as { error?: string; delivered?: boolean; message?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not send the link.");
        setSentMessage({
          delivered: data.delivered !== false,
          title: data.delivered === false ? "Reset link not sent" : "Check your inbox",
          lead: data.delivered === false ? "Email isn’t connected here." : "One link, one hour.",
          message: data.message ?? "If that address has a PayHalo account, a reset link is on its way.",
        });
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

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not sign you in.");
      window.location.assign(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    setError(null);
    setResent(null);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send a new code.");
      setResent("A new code is on its way. The old one no longer works.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "code") {
    return (
      <form onSubmit={submitCode} className="rounded-[18px] border border-[var(--color-line)] bg-white p-6 md:p-7">
        <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-mint)] text-[16px] text-[var(--color-forest)]">
          ✉
        </span>
        <p className="label mt-4 text-[var(--color-brand)]">Check your inbox</p>
        <p className="h3 mt-2">Enter your six-digit code.</p>
        <p className="t-small mt-2">
          We sent a code to <span className="font-semibold text-[var(--color-ink)]">{email}</span>. It works once, and
          for ten minutes.
        </p>

        <label htmlFor="code" className={`${label} mt-5`}>
          Six-digit code
        </label>
        <input
          id="code"
          ref={codeRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className={`${input} t-num text-center text-[20px] tracking-[0.4em]`}
        />

        {error && <p className="field-error mt-4">{error}</p>}
        {resent && <p className="t-small mt-4 text-[var(--color-brand)]">{resent}</p>}

        <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary mt-5 w-full">
          {busy ? "Checking…" : "Sign in"}
        </button>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={resendCode} disabled={busy} className="text-[12.5px] font-semibold text-[var(--color-brand)]">
            Send a new code
          </button>
          <button
            type="button"
            onClick={() => {
              setStage("credentials");
              setCode("");
              setError(null);
              setResent(null);
            }}
            className="text-[12.5px] font-medium text-[var(--color-muted)]"
          >
            Use a different account
          </button>
        </div>
      </form>
    );
  }

  if (sentMessage) {
    return (
      <div className="rounded-[18px] border border-[var(--color-line)] bg-white p-6">
        <p className="label text-[var(--color-brand)]">{sentMessage.title}</p>
        <p className="h3 mt-2">{sentMessage.lead}</p>
        <p className="t-small mt-2">{sentMessage.message}</p>
        <button
          type="button"
          onClick={() => {
            setSentMessage(null);
            setMode("password");
            setError(null);
          }}
          className="btn btn-secondary mt-5 w-full"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="rounded-[18px] border border-[var(--color-line)] bg-white p-6">
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
      {mode === "reset" ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="label text-[var(--color-brand)]">Password reset</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              Enter the address on your account and we will email a link to set a new password.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError(null);
            }}
            className="shrink-0 text-[11.5px] font-semibold text-[var(--color-brand)]"
          >
            Cancel
          </button>
        </div>
      ) : (
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
      )}

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
            <div className="mt-1.5 flex items-start justify-between gap-3">
              <p className="t-meta">We then email a six-digit code — the password alone does not open the plan.</p>
              <button
                type="button"
                onClick={() => {
                  setMode("reset");
                  setError(null);
                }}
                className="shrink-0 text-[11.5px] font-semibold text-[var(--color-brand)] underline-offset-4 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="field-error mt-4">{error}</p>}

      <button type="submit" disabled={busy} className="btn btn-primary mt-5 w-full">
        {busy
          ? "Working…"
          : mode === "password"
            ? "Continue"
            : mode === "reset"
              ? "Email me a reset link"
              : "Email me a sign-in link"}
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
