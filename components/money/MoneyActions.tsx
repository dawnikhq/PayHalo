"use client";

import { useState } from "react";
import { money } from "@/lib/format";

const field =
  "mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none";
const label = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

/**
 * Send and Receive, straight from the dashboard. Both talk to PayPal;
 * neither can move money without the owner's release passcode and a
 * same-origin request, and a transfer is only sent after the review step.
 */
export function MoneyActions({
  flush = false,
  sendBlocked = null,
}: {
  flush?: boolean;
  sendBlocked?: string | null;
} = {}) {
  const [panel, setPanel] = useState<"send" | "receive" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function post(url: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok || data.error) throw new Error(data.error ?? "That did not work.");
      return data;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`card p-5 sm:p-6 ${flush ? "" : "mb-5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="h3">Money</h2>
          <p className="t-small mt-1">Send it with PayPal, or ask someone to pay in.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setPanel(panel === "send" ? null : "send");
              setError(null);
              setNotice(null);
            }}
            aria-expanded={panel === "send"}
            disabled={Boolean(sendBlocked)}
            title={sendBlocked ?? undefined}
            className={`btn btn-sm ${panel === "send" ? "btn-primary" : "btn-secondary"}`}
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => {
              setPanel(panel === "receive" ? null : "receive");
              setError(null);
              setNotice(null);
            }}
            aria-expanded={panel === "receive"}
            className={`btn btn-sm ${panel === "receive" ? "btn-primary" : "btn-secondary"}`}
          >
            Receive
          </button>
        </div>
      </div>

      {sendBlocked && (
        <p className="mt-3 rounded-[12px] border border-[var(--color-line)] bg-[#fbfdfb] px-3.5 py-2.5 text-[11.5px] text-[var(--color-muted)]">
          <strong className="font-semibold text-[var(--color-ink)]">Sending is locked.</strong> {sendBlocked}
        </p>
      )}

      {notice && (
        <p className="mt-4 rounded-[12px] bg-[var(--color-mint)] px-4 py-3 text-[12.5px] text-[var(--color-forest)]">
          {notice}
        </p>
      )}

      {panel && (
        <div className="mt-5 border-t border-[var(--color-line)] pt-5">
          {panel === "send" && (
            <SendForm
              disabled={busy}
              error={error}
              onSubmit={async (form) => {
                await post("/api/paypal/send", form);
                setNotice(`Sent ${money(form.amountCents)} to ${form.email}.`);
                setPanel(null);
              }}
            />
          )}
          {panel === "receive" && (
            <ReceiveForm
              disabled={busy}
              error={error}
              onSubmit={async (form) => {
                await post("/api/paypal/receive", form);
                setNotice(`PayPal emailed a request for ${money(form.amountCents)} to ${form.email}.`);
                setPanel(null);
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------- forms */

function SendForm({
  onSubmit,
  disabled,
  error,
}: {
  onSubmit: (form: { email: string; amountCents: number; note: string; passcode: string }) => Promise<void>;
  disabled: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [passcode, setPasscode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const amountCents = Math.round(Number(amount || "0") * 100);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLocalError(null);
        if (!confirming) {
          if (amountCents < 100) {
            setLocalError("Send at least 1.00.");
            return;
          }
          setConfirming(true);
          return;
        }
        try {
          await onSubmit({ email, amountCents, note, passcode });
        } catch (err) {
          setConfirming(false);
          setLocalError(err instanceof Error ? err.message : "Could not send.");
        }
      }}
    >
      <h2 className="h2">Send money</h2>
      <p className="t-small mt-1.5">Out of this plan&apos;s PayPal account, to anyone with a PayPal email.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="send-email" className={label}>
            Their PayPal email
          </label>
          <input id="send-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="send-amount" className={label}>
            Amount (USD)
          </label>
          <input
            id="send-amount"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className={field}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="send-note" className={label}>
            What is it for?
          </label>
          <input id="send-note" value={note} onChange={(e) => setNote(e.target.value)} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="send-passcode" className={label}>
            Release passcode
          </label>
          <input
            id="send-passcode"
            type="password"
            required
            autoComplete="off"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className={field}
          />
        </div>
      </div>
      {(localError || error) && <p className="field-error mt-3">{localError ?? error}</p>}

      {confirming ? (
        <div className="mt-4 rounded-[12px] border border-[var(--color-line-strong)] bg-[#f8faf7] p-4">
          <p className="text-[13px] font-semibold text-[var(--color-ink)]">
            Send {money(amountCents)} to {email}?
          </p>
          <p className="t-meta mt-1">Check the address. A PayPal payout cannot be pulled back once it is paid.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={disabled} className="btn btn-primary">
              {disabled ? "Sending…" : "Confirm and send"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-[12.5px] font-semibold text-[var(--color-muted)]"
            >
              Change it
            </button>
          </div>
        </div>
      ) : (
        <button type="submit" disabled={disabled} className="btn btn-primary mt-4">
          Review the transfer
        </button>
      )}
    </form>
  );
}

function ReceiveForm({
  onSubmit,
  disabled,
  error,
}: {
  onSubmit: (form: { email: string; amountCents: number; note: string }) => Promise<void>;
  disabled: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLocalError(null);
        try {
          await onSubmit({ email, amountCents: Math.round(Number(amount) * 100), note });
        } catch (err) {
          setLocalError(err instanceof Error ? err.message : "Could not raise the request.");
        }
      }}
    >
      <h2 className="h2">Receive money</h2>
      <p className="t-small mt-1.5">
        PayPal emails them a request they settle from their own account. Nothing is taken until they do.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="rcv-email" className={label}>
            Their email
          </label>
          <input id="rcv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="rcv-amount" className={label}>
            Amount (USD)
          </label>
          <input
            id="rcv-amount"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className={field}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="rcv-note" className={label}>
            What is it for?
          </label>
          <input id="rcv-note" value={note} onChange={(e) => setNote(e.target.value)} className={field} />
        </div>
      </div>
      {(localError || error) && <p className="field-error mt-3">{localError ?? error}</p>}
      <button type="submit" disabled={disabled} className="btn btn-primary mt-4">
        {disabled ? "Sending request…" : "Request money"}
      </button>
    </form>
  );
}
