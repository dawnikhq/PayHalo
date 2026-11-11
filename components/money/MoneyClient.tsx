"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import type { MoneyMove, Pot } from "@/lib/types";

type Panel = "send" | "receive" | "transfer" | null;

const field =
  "mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none";
const label = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

export function MoneyClient({
  stashCents,
  pots,
  moves,
  beneficiaries,
  paypal,
  added,
}: {
  stashCents: number;
  pots: Pot[];
  moves: MoneyMove[];
  beneficiaries: { id: number; name: string }[];
  paypal: { configured: boolean; mode: "sandbox" | "live"; total: string | null; error: string | null };
  added: string | null;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    added && added !== "cancelled" && added !== "failed" ? `Added ${added} USD. Now say what it is for.` : null,
  );
  const [askPurpose, setAskPurpose] = useState(Boolean(added && added !== "cancelled" && added !== "failed"));

  const setAside = useMemo(() => pots.reduce((sum, p) => sum + p.allocatedCents, 0), [pots]);
  const held = stashCents + setAside;

  async function post(url: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; approveUrl?: string; ok?: boolean };
      if (!res.ok || data.error) throw new Error(data.error ?? "That did not work.");
      return data;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* balance */}
      <section className="card-forest overflow-hidden">
        <div className="p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label text-[#8fb098]">Money in this plan</p>
              <p className="t-num mt-2.5 text-[clamp(2.2rem,6vw,3rem)] leading-none text-white">{money(held)}</p>
              <p className="mt-2 text-[12.5px] text-[#b7cfbd]">
                {money(stashCents)} in your stash · {money(setAside)} set aside in {pots.length}{" "}
                {pots.length === 1 ? "save" : "saves"}
              </p>
            </div>
            <span className="pill badge-mint shrink-0">{paypal.mode}</span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2.5">
            {(
              [
                ["Send", "send", "Anyone with PayPal"],
                ["Receive", "receive", "Request a payment"],
                ["Transfer", "transfer", "Stash and saves"],
              ] as [string, Exclude<Panel, null>, string][]
            ).map(([text, key, hint]) => (
              <button
                key={key}
                onClick={() => {
                  setPanel(panel === key ? null : key);
                  setError(null);
                }}
                className={`min-w-0 rounded-[14px] border px-3 py-3 text-left transition ${
                  panel === key
                    ? "border-[var(--color-lime)] bg-[var(--color-lime)] text-[var(--color-forest)]"
                    : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                <span className="block text-[13px] font-semibold">{text}</span>
                <span className={`mt-0.5 block text-[10.5px] leading-[1.25] ${panel === key ? "text-[#4d6b2a]" : "text-[#8fb098]"}`}>
                  {hint}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-4 border-t border-white/10 pt-3 text-[11px] text-[#8fb098]">
            {paypal.configured
              ? paypal.total
                ? `PayPal payout account: ${paypal.total} available.`
                : (paypal.error ?? "Connected, but PayPal did not return a balance.")
              : "PayPal is not connected on this deployment, so no money can move yet."}
          </p>
        </div>
      </section>

      {notice && (
        <p className="rounded-[12px] bg-[var(--color-mint)] px-4 py-3 text-[12.5px] text-[var(--color-forest)]">{notice}</p>
      )}

      {panel && (
        <section className="card p-6 md:p-7">
          {panel === "send" && (
            <SendForm
              disabled={busy}
              onSubmit={async (form) => {
                const data = await post("/api/paypal/send", form);
                setNotice(`Sent ${money(form.amountCents)} to ${form.email}.`);
                setPanel(null);
                void data;
              }}
              error={error}
            />
          )}
          {panel === "receive" && (
            <ReceiveForm
              disabled={busy}
              onSubmit={async (form) => {
                await post("/api/paypal/receive", form);
                setNotice(`PayPal emailed a request for ${money(form.amountCents)} to ${form.email}.`);
                setPanel(null);
              }}
              error={error}
            />
          )}
          {panel === "transfer" && (
            <TransferPanel
              disabled={busy}
              stashCents={stashCents}
              pots={pots}
              onFund={async (amountCents) => {
                const data = await post("/api/paypal/fund", { amount: (amountCents / 100).toFixed(2) });
                if (data.approveUrl) window.location.href = data.approveUrl;
              }}
              onAllocate={async (potId, amountCents, direction) => {
                await post("/api/money", { action: "allocate", potId, amountCents, direction });
                setNotice(direction === "to" ? "Moved into the save." : "Moved back to your stash.");
                setPanel(null);
              }}
              error={error}
            />
          )}
        </section>
      )}

      {askPurpose && stashCents > 0 && (
        <PurposeForm
          stashCents={stashCents}
          beneficiaries={beneficiaries}
          disabled={busy}
          onSkip={() => setAskPurpose(false)}
          onSubmit={async (form) => {
            const created = await post("/api/money", { action: "create-pot", ...form, targetCents: form.targetCents });
            const id = (created as { id?: number }).id;
            if (id) {
              await post("/api/money", {
                action: "allocate",
                potId: id,
                amountCents: form.allocateCents,
                direction: "to",
              });
            }
            setAskPurpose(false);
            setNotice(`${form.name} is set up.`);
            window.location.reload();
          }}
          error={error}
        />
      )}

      <section className="card p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="h2">Saves</h2>
            <p className="t-small mt-1.5">What the money is for, one named purpose at a time.</p>
          </div>
          {!askPurpose && (
            <button onClick={() => setAskPurpose(true)} className="btn btn-secondary btn-sm">
              New save
            </button>
          )}
        </div>

        {pots.length === 0 ? (
          <div className="mt-5 rounded-[14px] border border-dashed border-[var(--color-line-strong)] bg-[#fbfdfb] p-6">
            <p className="text-[13px] font-semibold text-[var(--color-ink)]">No saves yet.</p>
            <p className="t-small mt-1.5">
              Move money in with <span className="font-semibold">Transfer</span>, then say what it is for — a
              deposit, school fees, the money a brother should receive first.
            </p>
          </div>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {pots.map((pot) => {
              const pct = pot.targetCents ? Math.min(100, Math.round((pot.allocatedCents / pot.targetCents) * 100)) : 0;
              return (
                <li key={pot.id} className="rounded-[14px] border border-[var(--color-line)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{pot.name}</p>
                      <p className="mt-0.5 text-[11.5px] text-[var(--color-muted)]">{pot.purpose}</p>
                    </div>
                    <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[var(--color-forest)]">
                      {money(pot.allocatedCents)}
                    </p>
                  </div>
                  {pot.targetCents > 0 && (
                    <>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
                        <div className="h-full rounded-full bg-[var(--color-sage)]" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1.5 text-[10.5px] text-[var(--color-muted)]">
                        {pct}% of {money(pot.targetCents)}
                      </p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-6 md:p-7">
        <h2 className="h2">Recent movements</h2>
        {moves.length === 0 ? (
          <p className="t-small mt-2">Nothing has moved yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--color-line)]">
            {moves.map((move) => {
              const pot = pots.find((p) => p.id === move.potId);
              const sign = move.kind === "in" || move.kind === "from-pot" ? "+" : "−";
              return (
                <li key={move.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-[var(--color-ink)]">
                      {move.kind === "in"
                        ? "Money in"
                        : move.kind === "out"
                          ? "Sent"
                          : move.kind === "to-pot"
                            ? `Set aside${pot ? ` · ${pot.name}` : ""}`
                            : `Back to stash${pot ? ` · ${pot.name}` : ""}`}
                    </p>
                    <p className="truncate text-[11px] text-[var(--color-muted)]">
                      {move.counterparty ?? move.note ?? "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12.5px] tabular-nums text-[var(--color-ink)]">
                    {sign}
                    {money(move.amountCents)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
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

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLocalError(null);
        try {
          await onSubmit({
            email,
            amountCents: Math.round(Number(amount) * 100),
            note,
            passcode,
          });
        } catch (err) {
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
      <button type="submit" disabled={disabled} className="btn btn-primary mt-4">
        {disabled ? "Sending…" : "Send"}
      </button>
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

function TransferPanel({
  stashCents,
  pots,
  onFund,
  onAllocate,
  disabled,
  error,
}: {
  stashCents: number;
  pots: Pot[];
  onFund: (amountCents: number) => Promise<void>;
  onAllocate: (potId: number, amountCents: number, direction: "to" | "from") => Promise<void>;
  disabled: boolean;
  error: string | null;
}) {
  const [mode, setMode] = useState<"in" | "to-pot" | "from-pot">("in");
  const [amount, setAmount] = useState("");
  const [potId, setPotId] = useState<number | null>(pots[0]?.id ?? null);
  const [localError, setLocalError] = useState<string | null>(null);

  const cents = Math.round(Number(amount) * 100);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLocalError(null);
        try {
          if (mode === "in") await onFund(cents);
          else if (potId) await onAllocate(potId, cents, mode === "to-pot" ? "to" : "from");
        } catch (err) {
          setLocalError(err instanceof Error ? err.message : "That did not work.");
        }
      }}
    >
      <h2 className="h2">Transfer</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["in", "Into VIVO"],
            ["to-pot", "Stash → save"],
            ["from-pot", "Save → stash"],
          ] as ["in" | "to-pot" | "from-pot", string][]
        ).map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
              mode === key ? "bg-[var(--color-forest)] text-white" : "bg-[var(--color-mint)] text-[var(--color-forest)]"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      <p className="t-small mt-3">
        {mode === "in"
          ? "Pays into this plan's PayPal account with your own PayPal balance or card."
          : mode === "to-pot"
            ? `Set money aside. ${money(stashCents)} is waiting in the stash.`
            : "Move money back out of a save and into the stash."}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="tr-amount" className={label}>
            Amount (USD)
          </label>
          <input
            id="tr-amount"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className={field}
          />
        </div>
        {mode !== "in" && (
          <div>
            <label htmlFor="tr-pot" className={label}>
              Save
            </label>
            <select
              id="tr-pot"
              value={potId ?? ""}
              onChange={(e) => setPotId(Number(e.target.value))}
              className={field}
            >
              {pots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {money(p.allocatedCents)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {(localError || error) && <p className="field-error mt-3">{localError ?? error}</p>}
      <button type="submit" disabled={disabled || (mode !== "in" && !potId)} className="btn btn-primary mt-4">
        {disabled ? "Working…" : mode === "in" ? "Add money with PayPal" : "Move it"}
      </button>
      {mode !== "in" && pots.length === 0 && <p className="t-meta mt-2">Create a save first.</p>}
    </form>
  );
}

function PurposeForm({
  stashCents,
  beneficiaries,
  onSubmit,
  onSkip,
  disabled,
  error,
}: {
  stashCents: number;
  beneficiaries: { id: number; name: string }[];
  onSubmit: (form: {
    name: string;
    purpose: string;
    targetCents: number;
    beneficiaryId: number | null;
    allocateCents: number;
  }) => Promise<void>;
  onSkip: () => void;
  disabled: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [target, setTarget] = useState("");
  const [beneficiaryId, setBeneficiaryId] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <section className="card-lime p-6 md:p-7">
      <p className="label text-[#4d6b2a]">One question</p>
      <h2 className="h2 mt-2 text-[var(--color-forest)]">What is this money for?</h2>
      <p className="mt-1.5 max-w-[56ch] text-[12.5px] text-[#3f5b3a]">
        {money(stashCents)} is sitting in your stash. Naming it now is what turns money into an instruction: a save
        says what it is for, and who it should reach.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLocalError(null);
          try {
            await onSubmit({
              name,
              purpose,
              targetCents: target ? Math.round(Number(target) * 100) : 0,
              beneficiaryId,
              allocateCents: stashCents,
            });
          } catch (err) {
            setLocalError(err instanceof Error ? err.message : "Could not create the save.");
          }
        }}
        className="mt-5 grid gap-3 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="p-name" className={label}>
            Call it something
          </label>
          <input id="p-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="School fees" className={field} />
        </div>
        <div>
          <label htmlFor="p-purpose" className={label}>
            What it is for
          </label>
          <input
            id="p-purpose"
            required
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Chidi's university, first year"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="p-target" className={label}>
            Target (optional)
          </label>
          <input
            id="p-target"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="p-person" className={label}>
            Who it should reach
          </label>
          <select
            id="p-person"
            value={beneficiaryId ?? ""}
            onChange={(e) => setBeneficiaryId(e.target.value ? Number(e.target.value) : null)}
            className={field}
          >
            <option value="">Not assigned yet</option>
            {beneficiaries.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        {(localError || error) && <p className="field-error sm:col-span-2">{localError ?? error}</p>}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={disabled} className="btn btn-primary">
            {disabled ? "Saving…" : "Create the save"}
          </button>
          <button type="button" onClick={onSkip} className="text-[12.5px] font-semibold text-[#42603f]">
            Not now
          </button>
        </div>
      </form>
    </section>
  );
}
