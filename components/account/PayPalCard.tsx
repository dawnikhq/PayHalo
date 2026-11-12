"use client";

import { useCallback, useEffect, useState } from "react";
import { money, shortDate } from "@/lib/format";
import { useRouter } from "next/navigation";

interface StatusPayload {
  configured: boolean;
  mode: "sandbox" | "live";
  payouts: { enabled: boolean; blockedReason: string | null; passcodeRequired: boolean };
  connection: { email: string; name: string | null; payerId: string; connectedAt: string; expired: boolean } | null;
  payoutAccount:
    | { ok: true; balances: { currency: string; total: string; available: string; primary: boolean }[] }
    | { ok: false; reason: string; status: number }
    | null;
  ledger: {
    claimId: number;
    distributedAt: string;
    totalCents: number;
    rows: { name: string; email: string; amountCents: number; paid: boolean; batchId: string | null; status: string | null }[];
  } | null;
}

export function PayPalCard() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusPayload | null>(null);
  /** Only used to show the exact return URL to register; empty until mounted. */
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [passcode, setPasscode] = useState("");
  const [note, setNote] = useState<{ tone: "ok" | "bad"; body: string } | null>(null);
  const [amount, setAmount] = useState("50");
  const [diagnosis, setDiagnosis] = useState<
    | {
        mode: string;
        api: string;
        redirectUri: string;
        token: { ok: boolean; status: number; message: string };
        balances: { ok: boolean; status: number; message: string };
        payoutCapability: { ok: boolean; status: number; message: string };
        invoicing: { ok: boolean; status: number; message: string };
        oauth: { host: string; status: number; finalHost: string; title: string | null; hint: string };
        otherEnvironment: { mode: string; ok: boolean; message: string } | null;
        verdict: string;
      }
    | { error: string }
    | null
  >(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/paypal/status", { cache: "no-store" });
      if (res.ok) setStatus((await res.json()) as StatusPayload);
    } catch {
      /* the card simply stays in its loading state */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const funded = new URLSearchParams(window.location.search).get("funded");
    if (!funded) return;
    if (funded === "cancelled") {
      setNote({ tone: "bad", body: "Payment cancelled. Nothing was added." });
    } else if (funded === "expired") {
      setNote({ tone: "bad", body: "That payment link had expired. Start again." });
    } else if (funded === "failed") {
      setNote({ tone: "bad", body: "PayPal did not complete the payment." });
    } else {
      setNote({ tone: "ok", body: `Added ${funded} USD to the release account.` });
    }
  }, []);

  async function testConnection() {
    setBusy("diagnose");
    setDiagnosis(null);
    try {
      const res = await fetch("/api/paypal/diagnose", { cache: "no-store" });
      const data = (await res.json()) as Record<string, unknown>;
      setDiagnosis(res.ok ? (data as never) : { error: (data.error as string) ?? "PayPal did not answer." });
    } catch {
      setDiagnosis({ error: "Could not reach the diagnostic route." });
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    setNote(null);
    try {
      await fetch("/api/paypal/disconnect", { method: "POST" });
      await load();
      router.refresh();
      setNote({ tone: "ok", body: "PayPal account disconnected." });
    } catch {
      setNote({ tone: "bad", body: "Could not disconnect. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function fund() {
    setBusy("fund");
    setNote(null);
    try {
      const res = await fetch("/api/paypal/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = (await res.json()) as { approveUrl?: string; error?: string };
      if (!res.ok || !data.approveUrl) throw new Error(data.error ?? "PayPal could not start the payment.");
      window.location.href = data.approveUrl;
    } catch (error) {
      setNote({ tone: "bad", body: error instanceof Error ? error.message : "Could not start the payment." });
      setBusy(null);
    }
  }

  async function release() {
    const total = status?.ledger?.totalCents ?? 0;
    const count = status?.ledger?.rows.length ?? 0;
    const confirmed = window.confirm(
      `Release ${money(total)} to ${count} recipient${count === 1 ? "" : "s"} through PayPal?\n\n` +
        `Mode: ${status?.mode === "live" ? "LIVE — real money" : "sandbox — no real money moves"}.\n` +
        `Each recipient is paid the amount on the plan. This cannot be undone from here.`,
    );
    if (!confirmed) return;

    setBusy("release");
    setNote(null);
    try {
      const res = await fetch("/api/paypal/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, passcode }),
      });
      const json = (await res.json()) as { ok?: boolean; batchId?: string; sent?: number; error?: string; alreadySent?: boolean };
      if (!res.ok) {
        setNote({ tone: "bad", body: json.error ?? "PayPal rejected the payout." });
        setPasscode("");
      } else if (json.alreadySent) {
        setNote({ tone: "ok", body: "Already released — nothing was sent twice." });
      } else {
        setNote({
          tone: "ok",
          body: `Sent ${json.sent} payout${json.sent === 1 ? "" : "s"}. Batch ${json.batchId ?? "(pending)"}.`,
        });
      }
      await load();
      router.refresh();
    } catch {
      setNote({ tone: "bad", body: "The payout request failed before reaching PayPal." });
    } finally {
      setBusy(null);
    }
  }

  const modeLabel = status?.mode === "live" ? "Live" : "Sandbox";
  const unpaid = status?.ledger?.rows.filter((r) => !r.paid) ?? [];

  return (
    <section className="card p-6 md:p-7" id="paypal">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Connected account</p>
          <h2 className="h2 mt-2">PayPal</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`pill ${status?.connection ? "badge-lime" : "badge-neutral"}`}>
            {status === null ? "Checking…" : status.connection ? `Connected · ${modeLabel.toLowerCase()}` : "Not connected"}
          </span>
          <button
            onClick={testConnection}
            disabled={busy !== null}
            className="text-[12.5px] font-semibold text-[var(--color-brand)] transition hover:underline disabled:opacity-50"
          >
            {busy === "diagnose" ? "Testing…" : "Test connection"}
          </button>
        </div>
      </div>

      <p className="t-small mt-2 max-w-[62ch]">
        Connecting only proves which PayPal account is yours — PayHalo reads nothing about your money. The handover
        payout is sent from the plan&apos;s own business account, in {modeLabel.toLowerCase()} mode.
      </p>

      <p className="mt-2 max-w-[62ch] text-[11.5px] text-[var(--color-muted)]">
        Connecting is optional: Send and Receive use the deployment&apos;s own API credentials, not this link. Sandbox apps need
        no PayPal review; <em>Log in with PayPal</em> on a Live app is reviewed by PayPal and that review is what takes weeks.
      </p>

      {diagnosis && (
        <div className="mt-4 rounded-[14px] border border-[var(--color-line-strong)] bg-[#fbfdfb] p-4">
          {"error" in diagnosis ? (
            <p className="text-[12.5px] font-semibold text-[var(--color-ember)]">
              We could not reach PayPal just now. Nothing has changed.
            </p>
          ) : (
            <>
              <p className="text-[12.5px] font-semibold text-[var(--color-ink)]">
                {diagnosis.token.ok && diagnosis.payoutCapability.ok
                  ? "PayPal is answering this deployment normally."
                  : diagnosis.token.ok
                    ? "PayPal recognises this deployment, but sending is not available on this account yet."
                    : "PayPal did not recognise this deployment's credentials."}
              </p>
              {!diagnosis.oauth.hint.includes("log-in form") && !diagnosis.oauth.hint.includes("sign-in form") && (
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
                  Connecting a personal account is a separate step from sending money: PayPal&apos;s own sign-in page has to
                  accept this app. {diagnosis.oauth.hint}
                </p>
              )}
              <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">
                The full report is on the operator console, under PayPal.
              </p>
            </>
          )}
        </div>
      )}

      {status === null && <div className="mt-5 h-16 animate-pulse rounded-[14px] bg-[#f6f9f5]" />}

      {status && !status.configured && (
        <div className="mt-5 rounded-[14px] border border-[var(--color-line)] bg-[#fbfdfb] p-4">
          <p className="text-[12.5px] font-semibold text-[var(--color-ink)]">Not configured on this deployment</p>
          <p className="t-small mt-1">
            Add <code className="rounded bg-[var(--color-mint)] px-1">PAYPAL_CLIENT_ID</code>,{" "}
            <code className="rounded bg-[var(--color-mint)] px-1">PAYPAL_CLIENT_SECRET</code> and{" "}
            <code className="rounded bg-[var(--color-mint)] px-1">PAYPAL_ENV=sandbox</code> to the environment, then redeploy.
          </p>
        </div>
      )}

      {status?.configured && (
        <div className="mt-5 space-y-4">
          {status.connection ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--color-line)] bg-[#fbfdfb] p-4">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[var(--color-ink)]">
                  {status.connection.name ?? status.connection.email ?? "PayPal account"}
                </p>
                <p className="truncate text-[12px] text-[var(--color-muted)]">
                  {status.connection.email ? `${status.connection.email} · ` : "Email not shared · "}
                  linked {shortDate(status.connection.connectedAt)}
                </p>
                {status.connection.expired && (
                  <p className="mt-1 text-[11.5px] font-semibold text-[var(--color-warnink)]">
                    The token has expired — reconnect to refresh it.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <a href="/api/paypal/oauth/start" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
                  Reconnect →
                </a>
                <button
                  onClick={disconnect}
                  disabled={busy !== null}
                  className="text-[12.5px] font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ember)] disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[14px] border border-dashed border-[var(--color-line-strong)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="t-small max-w-[46ch]">
                  Connect the PayPal account this plan should pay from. PayHalo asks for no password and no permissions over your money.
                </p>
                <a href="/api/paypal/oauth/start" className="btn btn-primary btn-sm">
                  Connect PayPal <span aria-hidden>→</span>
                </a>
              </div>

              {/*
                The three things PayPal checks before it shows its login form.
                Almost every failed connect is one of them, and none of them is
                visible from the button itself.
              */}
              <details className="mt-3 border-t border-[var(--color-line)] pt-3">
                <summary className="cursor-pointer text-[11.5px] font-semibold text-[var(--color-ink)]">
                  Using a sandbox account? Three things PayPal checks
                </summary>
                <ol className="mt-2 space-y-2 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
                  <li>
                    <span className="font-semibold text-[var(--color-ink)]">1 · Sign in with a sandbox test account.</span>{" "}
                    Your normal PayPal login is refused on the sandbox. Use a Personal account from Developer Dashboard →
                    Sandbox → Accounts.
                  </li>
                  <li>
                    <span className="font-semibold text-[var(--color-ink)]">2 · Turn on Log in with PayPal.</span> Apps &
                    Credentials → your app → Features → Log in with PayPal, with the Email scope.
                  </li>
                  <li>
                    <span className="font-semibold text-[var(--color-ink)]">3 · Register this exact return URL.</span> The
                    same screen takes it, and it must match to the character:{" "}
                    <code className="rounded bg-[#f2f7f2] px-1 text-[11px] text-[var(--color-forest)]">
                      {origin}/api/paypal/callback
                    </code>
                  </li>
                </ol>
                <p className="mt-2 text-[11px] text-[var(--color-muted)]">
                  If it still refuses, the operator&apos;s connection test says exactly which of the three PayPal is
                  unhappy about.
                </p>
              </details>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] border border-[var(--color-line)] p-4">
              <p className="label">Payout account balance</p>
              {status.payoutAccount?.ok ? (
                status.payoutAccount.balances.length ? (
                  status.payoutAccount.balances.map((balance) => (
                    <p key={balance.currency} className="t-num mt-2 text-[22px] text-[var(--color-forest)]">
                      {balance.currency} {balance.total}
                    </p>
                  ))
                ) : (
                  <p className="t-small mt-2">PayPal returned no balance for this account yet.</p>
                )
              ) : (
                <p className="t-small mt-2">
                  {status.payoutAccount?.reason ??
                    "Unavailable — the PayPal app needs the reporting/balances scope to read this."}
                </p>
              )}
            </div>

            <div className="rounded-[14px] border border-[var(--color-line)] p-4">
              <p className="label">Transfers</p>
              {status.payouts.enabled ? (
                <>
                  <p className="t-small mt-2">
                    Enabled in {modeLabel.toLowerCase()} mode. A payout only runs after the 14-day window closes.
                  </p>
                  {status.ledger ? (
                    <div className="mt-3 space-y-2">
                      <label htmlFor="release-passcode" className="block text-[11px] font-semibold text-[var(--color-muted)]">
                        Release passcode
                      </label>
                      <input
                        id="release-passcode"
                        type="password"
                        value={passcode}
                        onChange={(event) => setPasscode(event.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Required to release"
                        className="h-9 w-full rounded-[10px] border border-[var(--color-line-strong)] bg-white px-2.5 text-[12.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none"
                      />
                      <button
                        onClick={release}
                        disabled={busy !== null || !unpaid.length || !passcode.trim()}
                        className="btn btn-primary btn-sm"
                      >
                        {busy === "release"
                          ? "Sending…"
                          : unpaid.length
                            ? `Release ${money(unpaid.reduce((sum, r) => sum + r.amountCents, 0))}`
                            : "Already released"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-[11.5px] font-semibold text-[var(--color-muted)]">
                      No completed handover yet.
                    </p>
                  )}
                </>
              ) : (
                <p className="t-small mt-2">{status.payouts.blockedReason ?? "Payouts are switched off."}</p>
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-[var(--color-line)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="label">Add money</p>
                <p className="t-small mt-1.5 max-w-[46ch]">
                  A release is paid out of this PayPal business account. Top it up with a real PayPal payment — PayHalo
                  cannot hold a balance of its own, so the money sits with PayPal until a handover clears.
                </p>
              </div>
              <div className="flex items-end gap-2">
                <div>
                  <label htmlFor="fund-amount" className="block text-[11px] font-semibold text-[var(--color-muted)]">
                    Amount (USD)
                  </label>
                  <input
                    id="fund-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
                    className="mt-1 h-9 w-[110px] rounded-[10px] border border-[var(--color-line-strong)] bg-white px-2.5 text-[12.5px] tabular-nums text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:outline-none"
                  />
                </div>
                <button onClick={fund} disabled={busy !== null} className="btn btn-primary btn-sm">
                  {busy === "fund" ? "Opening…" : "Add money"}
                </button>
              </div>
            </div>
          </div>

          {status.ledger && (
            <div className="rounded-[14px] border border-[var(--color-line)]">
              <div className="border-b border-[var(--color-line)] px-4 py-2.5">
                <p className="label">
                  Release ledger · claim #{status.ledger.claimId} · {shortDate(status.ledger.distributedAt)}
                </p>
              </div>
              <ul className="divide-y divide-[var(--color-line)]">
                {status.ledger.rows.map((row) => (
                  <li key={row.email} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-[var(--color-ink)]">{row.name}</p>
                      <p className="truncate text-[11.5px] text-[var(--color-muted)]">{row.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[12.5px] tabular-nums text-[var(--color-ink)]">{money(row.amountCents)}</span>
                      <span className={`pill ${row.paid ? "badge-mint" : "badge-neutral"}`}>
                        {row.paid ? (row.status ?? "sent") : "not sent"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {note && (
        <p
          className={`mt-4 rounded-[12px] px-3 py-2 text-[12px] ${
            note.tone === "ok"
              ? "bg-[var(--color-mint)] text-[var(--color-forest)]"
              : "bg-[#fdf1ee] text-[var(--color-ember)]"
          }`}
        >
          {note.body}
        </p>
      )}

      <p className="mt-4 border-t border-[var(--color-line)] pt-3 text-[11px] leading-relaxed text-[var(--color-muted)]">
        {status?.mode === "live"
          ? "Live mode. A release moves real money and cannot be undone here."
          : "Sandbox mode. PayPal test accounts only — no real money moves, whatever the ledger says."}
      </p>
    </section>
  );
}
