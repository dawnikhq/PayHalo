"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const field =
  "mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none";
const label = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

interface Started {
  vaultRef: string;
  mailed: boolean;
  mailReason: string | null;
  key: string | null;
  beneficiary: { name: string; email: string } | null;
  mode: string;
}

/**
 * Start a plan: name the first person, open the vault, and send the key.
 * Three steps, one write. Nothing here moves money — the vault is a container
 * that only an operator-approved release can ever open.
 */
export function StartPlan({ ownerName, hasVault }: { ownerName: string; hasVault: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<Started | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/vault/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, relationship }),
      });
      const data = (await res.json()) as {
        error?: string;
        vault?: { ref: string };
        mailed?: boolean;
        mailReason?: string | null;
        key?: string | null;
        firstBeneficiary?: { name: string; email: string } | null;
        mode?: string;
      };
      if (!res.ok || !data.vault) throw new Error(data.error ?? "The vault could not be opened.");
      setStarted({
        vaultRef: data.vault.ref,
        mailed: Boolean(data.mailed),
        mailReason: data.mailReason ?? null,
        key: data.key ?? null,
        beneficiary: data.firstBeneficiary ?? null,
        mode: data.mode ?? "live",
      });
      setStep(2);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The vault could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          ["01", "Name the first person"],
          ["02", "Open the vault"],
          ["03", "Send the key"],
        ].map(([n, text]) => (
          <li
            key={n}
            className={`rounded-[14px] border px-4 py-3 text-[12.5px] ${
              (step === 1 && n === "01") || (step === 2 && n !== "01")
                ? "border-[var(--color-brand)] bg-[var(--color-mint)] font-semibold text-[var(--color-forest)]"
                : "border-[var(--color-line)] text-[var(--color-muted)]"
            }`}
          >
            <span className="mr-2 text-[10.5px] tracking-[0.14em]">{n}</span>
            {text}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section className="card p-6 md:p-7">
          {hasVault && (
            <p className="mb-4 rounded-[12px] border border-[var(--color-line)] bg-[#fbfdfb] px-3.5 py-2.5 text-[12px] text-[var(--color-muted)]">
              This plan already has a vault. Starting again would open a second one, so check My Plan first.
            </p>
          )}
          <h2 className="h2">Who receives this plan first?</h2>
          <p className="t-small mt-1.5 max-w-[58ch]">
            {ownerName.split(" ")[0]}, this is the person the key goes to. They are the first beneficiary, and they are
            the only one who can ask for the vault to be opened.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sp-name" className={label}>
                Their name
              </label>
              <input id="sp-name" required value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="sp-email" className={label}>
                Their email — where the key goes
              </label>
              <input
                id="sp-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="sp-rel" className={label}>
                Relationship (optional)
              </label>
              <input
                id="sp-rel"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="Daughter, brother, friend"
                className={field}
              />
            </div>
          </div>

          {error && <p className="field-error mt-3">{error}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={open}
              disabled={busy || !name.trim() || !email.trim()}
              className="btn btn-primary"
            >
              {busy ? "Opening the vault…" : "Open the vault and send the key"}
            </button>
            <Link href="/plan" className="text-[12.5px] font-semibold text-[var(--color-muted)]">
              Not yet
            </Link>
          </div>
        </section>
      )}

      {step === 2 && started && (
        <section className="card-lime p-6 md:p-7">
          <p className="label text-[#4d6b2a]">Vault open</p>
          <h2 className="h2 mt-2 text-[var(--color-forest)]">{started.vaultRef}</h2>
          <p className="mt-1.5 max-w-[58ch] text-[12.5px] text-[#3f5b3a]">
            {started.beneficiary?.name ?? "Your first beneficiary"} is the first beneficiary, and the vault is ready for
            money. It can only be opened one way: an operator confirms the death documentation you filed, and the
            release then pays the people this plan names — never anyone else, never us.
          </p>

          <div className="mt-5 rounded-[14px] border border-[#c9e39b] bg-white/70 p-4">
            <p className="text-[12.5px] font-semibold text-[var(--color-forest)]">
              {started.mailed ? `Key emailed to ${started.beneficiary?.email}` : "The key could not be emailed"}
            </p>
            {started.mailed ? (
              <p className="mt-1 text-[12px] text-[#3f5b3a]">
                They should keep it. It is required with any request to open the vault, and we cannot see it or resend it.
              </p>
            ) : (
              <>
                <p className="mt-1 text-[12px] text-[#3f5b3a]">
                  {started.mailReason ?? "Email delivery is not configured."} Copy the key below and send it to them
                  yourself — it is shown once and never again.
                </p>
                <p className="mt-2 select-all break-all rounded-[10px] bg-white px-3 py-2 font-[var(--font-mono,monospace)] text-[13px] tracking-[0.06em] text-[var(--color-ink)]">
                  {started.key}
                </p>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/plan" className="btn btn-primary">
              See the vault on My Plan <span aria-hidden>→</span>
            </Link>
            <Link href="/beneficiaries" className="text-[12.5px] font-semibold text-[#42603f]">
              Add the rest of your people
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
