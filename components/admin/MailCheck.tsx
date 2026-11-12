"use client";

import { useState } from "react";

/**
 * A one-click proof that email leaves the building. Sends the same vault-key
 * message a finished plan sends, to an address the operator types, so nobody has
 * to invent a plan to find out whether the post works.
 */
export function MailCheck({ configured }: { configured: boolean }) {
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "ok" | "bad"; body: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = (await res.json().catch(() => ({}))) as { sent?: boolean; reason?: string; error?: string };
      if (res.ok && data.sent) setResult({ tone: "ok", body: `Sent to ${to}.` });
      else setResult({ tone: "bad", body: data.error ?? data.reason ?? "The email did not go out." });
    } catch {
      setResult({ tone: "bad", body: "The email did not go out." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-6 p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Post</p>
          <h2 className="h2 mt-2">Does email leave here?</h2>
        </div>
        <span className={`pill ${configured ? "badge-lime" : "badge-neutral"}`}>
          {configured ? "connected" : "not connected"}
        </span>
      </div>

      {configured ? (
        <>
          <p className="t-small mt-3 max-w-[62ch]">
            Sends the vault-key message to an address you name. If it lands, keys and sign-in links are working for
            everyone.
          </p>
          <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@example.com"
              aria-label="Address to test with"
              className="input sm:max-w-[320px]"
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? "Sending…" : "Send a test"}
            </button>
          </form>
        </>
      ) : (
        <p className="t-small mt-3 max-w-[62ch]">
          No email service is connected, so a finished plan shows its key on screen once instead of mailing it.
        </p>
      )}

      {result && (
        <p className={`mt-3 text-[12.5px] ${result.tone === "ok" ? "text-[var(--color-brand)]" : "field-error"}`}>
          {result.body}
        </p>
      )}
    </section>
  );
}
