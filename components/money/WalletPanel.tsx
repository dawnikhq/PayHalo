"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";

/**
 * The balance card and the transfer form.
 *
 * The balance shown here is demo money and the panel says so, plainly, before
 * the figure. A transfer to a handle moves it inside PayHalo only — the PayPal
 * card beneath is the real (sandbox) connection and never mixes with this.
 */
export function WalletPanel({
  balanceCents,
  handle,
  directory,
}: {
  balanceCents: number;
  handle: string;
  directory: { handle: string; name: string }[];
}) {
  const router = useRouter();
  const [balance, setBalance] = useState(balanceCents);
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ to: string; cents: number; ref?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyHandle() {
    try {
      await navigator.clipboard.writeText(`@${handle}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/wallet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: target, amount, note }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        balanceCents?: number;
        to?: { handle: string; name: string };
        entry?: { ref?: string };
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "That transfer did not go through.");
      setBalance(data.balanceCents ?? balance);
      setReceipt({
        to: data.to?.handle ?? target,
        cents: Math.round(Number(amount) * 100),
        ref: data.entry?.ref,
      });
      setTarget("");
      setAmount("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That transfer did not go through.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative overflow-hidden rounded-[20px] bg-[var(--color-forest)] p-6 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(167,243,208,0.22),transparent_65%)]"
        />
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#a9c9b8]">PayHalo balance</p>
        <p className="mt-2 font-[var(--font-display)] text-[38px] font-semibold leading-none tracking-[-0.03em] text-white">
          {money(balance)}
        </p>
        <p className="mt-2 max-w-[34ch] text-[11.5px] leading-relaxed text-[#a9c9b8]">
          Demo money, granted once when the account opened. It moves between PayHalo handles only — it is never real
          funds and never leaves through PayPal.
        </p>

        <div className="mt-5 rounded-[14px] border border-white/15 bg-white/[0.06] px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8fb7a4]">Your handle</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="truncate font-[var(--font-display)] text-[15px] font-semibold tracking-[0.01em]">@{handle}</p>
            <button
              type="button"
              onClick={copyHandle}
              className="shrink-0 rounded-full border border-white/25 px-2.5 py-1 text-[10.5px] font-semibold text-white/90 transition hover:bg-white/10"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-[#8fb7a4]">
          Give this handle to whoever should send you demo money. Nobody needs your email address.
        </p>

        {directory.length ? (
          <details className="mt-4 rounded-[12px] border border-white/12 px-3 py-2">
            <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a9c9b8]">
              Demo directory ({directory.length})
            </summary>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {directory.map((person) => (
                <li key={person.handle}>
                  <button
                    type="button"
                    onClick={() => setTarget(person.handle)}
                    className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/85 transition hover:bg-white/10"
                    title={`Send to ${person.name}`}
                  >
                    @{person.handle}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10.5px] text-[#8fb7a4]">Tap one to fill the form. Handles only — no balances.</p>
          </details>
        ) : null}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="h3">Send to a handle</h2>
        <p className="t-small mt-1">Inside PayHalo, instantly. There is no fee and nothing to approve.</p>

        {receipt ? (
          <div className="mt-4 rounded-[14px] border border-[rgba(14,111,86,0.22)] bg-[#f2f9f5] px-4 py-3">
            <p className="text-[12.5px] font-semibold text-[var(--color-forest)]">
              Sent {money(receipt.cents)} to @{receipt.to}.
            </p>
            <p className="mt-1 text-[11.5px] text-[var(--color-muted)]">
              {receipt.ref ? `Reference ${receipt.ref}. ` : ""}Both balances are updated now.
            </p>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="mt-2 text-[11.5px] font-semibold text-[var(--color-brand)] underline underline-offset-4"
            >
              Send another
            </button>
          </div>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={send}>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                To
              </span>
              <input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="@theirhandle"
                className="input h-11 w-full text-[13px]"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                Amount
              </span>
              <div className="flex items-center gap-2">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] border border-[var(--color-line)] bg-[#f7faf6] text-[13px] font-semibold text-[var(--color-forest)]">
                  $
                </span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="250.00"
                  className="input h-11 w-full text-[13px]"
                  required
                />
              </div>
              <span className="mt-1 block text-[10.5px] text-[var(--color-muted)]">
                Available {money(balance)}. Send at least $1.00.
              </span>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                Note <span className="font-normal normal-case tracking-normal">(optional)</span>
              </span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={120}
                placeholder="What is it for?"
                className="input h-11 w-full text-[13px]"
              />
            </label>

            {error ? (
              <p className="rounded-[10px] bg-[#fdf3ee] px-3 py-2 text-[12px] text-[#8a4a2c]">{error}</p>
            ) : null}

            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? "Sending…" : "Send demo money"}
            </button>
            <p className="text-center text-[10.5px] text-[var(--color-muted)]">
              Nothing leaves PayHalo. No real money moves, and no card is involved.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
