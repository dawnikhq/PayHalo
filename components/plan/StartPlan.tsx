"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";

export interface WizardStep {
  key: "first_choice" | "assets" | "backups" | "charity" | "keyholder" | "review";
  label: string;
  done: boolean;
}

interface Props {
  steps: WizardStep[];
  ownerName: string;
  vaultOpen: boolean;
  people: { name: string; role: string; share: number; relationship: string }[];
  assetCount: number;
  totalCents: number;
  keyholderName: string | null;
}

const field =
  "mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white/80 px-3 text-[13.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none";
const label = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

const COPY: Record<WizardStep["key"], { title: string; body: string }> = {
  first_choice: {
    title: "Who comes first?",
    body: "The person you would want to reach this first. They will receive a key of their own, and only they can ask for the vault to be opened.",
  },
  assets: {
    title: "What are you leaving?",
    body: "Add what you own — a balance, a wallet, a shop. A rough figure is fine; you can change anything later.",
  },
  backups: {
    title: "Who comes after them?",
    body: "If your first choice cannot receive it, this is who steps in. Family, usually.",
  },
  charity: {
    title: "And if no one can?",
    body: "A cause you would want it to go to. This is the last line, and it makes the plan complete.",
  },
  keyholder: {
    title: "Who holds the door?",
    body: "Someone trusted who can start a handover request. They will never see your balances, your shares, or anyone's details.",
  },
  review: {
    title: "Read it back.",
    body: "This is the whole plan. Confirming it means it is ready — the vault comes next.",
  },
};

/**
 * The six steps, in order, and the vault only at the end.
 *
 * ONE THING AT A TIME: each step writes what it collected and moves on, so a
 * person can stop at any point and come back to the same place.
 */
export function StartPlan(props: Props) {
  const router = useRouter();
  const firstUndone = props.steps.findIndex((s) => !s.done);
  const [index, setIndex] = useState(firstUndone === -1 ? props.steps.length - 1 : firstUndone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");

  const [assetLabel, setAssetLabel] = useState("");
  const [assetKind, setAssetKind] = useState("paypal");
  const [assetValue, setAssetValue] = useState("");
  const [added, setAdded] = useState(0);

  const [opening, setOpening] = useState(false);
  const [vault, setVault] = useState<{ ref: string; mailed: boolean; key: string | null; who: string | null } | null>(
    null,
  );

  const step = props.steps[index];
  const copy = COPY[step.key];

  function clearPerson() {
    setName("");
    setEmail("");
    setRelationship("");
  }

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "That could not be saved.");
    return data;
  }

  async function advance() {
    setBusy(true);
    setError(null);
    try {
      if (step.key === "first_choice") {
        await post("/api/beneficiaries", { name, email, relationship, role: "primary", share: 100 });
        clearPerson();
      } else if (step.key === "assets") {
        if (assetLabel.trim()) {
          await post("/api/assets", {
            kind: assetKind,
            label: assetLabel,
            value: Number(assetValue || "0"),
            detail: "",
          });
        }
        setAssetLabel("");
        setAssetValue("");
      } else if (step.key === "backups") {
        await post("/api/beneficiaries", { name, email, relationship, role: "backup" });
        clearPerson();
      } else if (step.key === "charity") {
        await post("/api/beneficiaries", { name, email, relationship, role: "charity" });
        clearPerson();
      } else if (step.key === "keyholder") {
        await post("/api/keyholder/plan", { name, email, relationship });
        clearPerson();
      } else if (step.key === "review") {
        await post("/api/plan", {});
      }
      router.refresh();
      setIndex((i) => Math.min(i + 1, props.steps.length - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function addAnotherAsset() {
    setBusy(true);
    setError(null);
    try {
      await post("/api/assets", { kind: assetKind, label: assetLabel, value: Number(assetValue || "0"), detail: "" });
      setAssetLabel("");
      setAssetValue("");
      setAdded((n) => n + 1);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function openVault() {
    setOpening(true);
    setError(null);
    try {
      const res = await fetch("/api/vault/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        vault?: { ref: string };
        mailed?: boolean;
        key?: string | null;
        firstBeneficiary?: { name: string } | null;
      };
      if (!res.ok || !data.vault) throw new Error(data.error ?? "The vault could not be opened.");
      setVault({
        ref: data.vault.ref,
        mailed: Boolean(data.mailed),
        key: data.key ?? null,
        who: data.firstBeneficiary?.name ?? null,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The vault could not be opened.");
    } finally {
      setOpening(false);
    }
  }

  const allDone = props.steps.every((s) => s.done) && props.vaultOpen === false;

  /* ------------------------------------------------------------- finished -- */
  if (vault) {
    return (
      <section className="glass glass-lime p-6 md:p-8">
        <p className="label text-[#4d6b2a]">The vault is open</p>
        <h2 className="h2 mt-2 text-[var(--color-forest)]">{vault.ref}</h2>
        <p className="mt-2 max-w-[58ch] text-[12.5px] text-[#3f5b3a]">
          {vault.who ? `${vault.who} has the key` : "Your first choice has the key"} and the plan is complete. From here
          the money has one door: a release that we confirm, paid to the people you named.
        </p>

        {vault.mailed ? (
          <p className="mt-4 rounded-[14px] bg-white/70 px-4 py-3 text-[12.5px] text-[var(--color-forest)]">
            The key is on its way to {vault.who ?? "your first choice"}. Keep the reference above.
          </p>
        ) : (
          <div className="mt-4 rounded-[14px] bg-white/70 px-4 py-3">
            <p className="text-[12.5px] text-[var(--color-forest)]">
              Give this key to {vault.who ?? "your first choice"} yourself. It is shown once.
            </p>
            <p className="mt-2 select-all break-all rounded-[10px] bg-white px-3 py-2 font-[var(--font-mono,monospace)] text-[13px] tracking-[0.06em] text-[var(--color-ink)]">
              {vault.key}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/dashboard" className="btn btn-primary">
            Go to my dashboard <span aria-hidden>→</span>
          </Link>
          <Link href="/plan" className="text-[12.5px] font-semibold text-[#42603f]">
            See the plan
          </Link>
        </div>
      </section>
    );
  }

  /* -------------------------------------------------------------- finished -- */
  if (props.vaultOpen) {
    return (
      <section className="glass p-6 md:p-8">
        <p className="label">Plan</p>
        <h2 className="h2 mt-2">Everything is in place.</h2>
        <p className="t-small mt-2 max-w-[58ch]">
          Your vault is open and your arrangements are confirmed. Make a change whenever you like — nothing moves while you are here.
        </p>
        <Link href="/dashboard" className="btn btn-primary btn-sm mt-4">
          Back to my dashboard
        </Link>
      </section>
    );
  }

  /* ---------------------------------------------------------------- wizard -- */
  return (
    <div className="space-y-5">
      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {props.steps.map((s, i) => {
          const active = i === index;
          return (
            <li
              key={s.key}
              className={`rounded-[14px] border px-3 py-2.5 text-[12px] transition ${
                active
                  ? "border-[var(--color-brand)] bg-white/80 font-semibold text-[var(--color-forest)] shadow-[0_10px_30px_-24px_rgba(21,63,53,0.6)]"
                  : s.done
                    ? "border-[#cfe6c0] bg-[var(--color-mint)]/70 text-[var(--color-forest)]"
                    : "border-[var(--color-line)] bg-white/40 text-[var(--color-muted)]"
              }`}
            >
              <span className="mr-1.5 text-[10px] tracking-[0.14em] opacity-70">{String(i + 1).padStart(2, "0")}</span>
              {s.label}
              {s.done && <span className="ml-1.5" aria-label="done">✓</span>}
            </li>
          );
        })}
      </ol>

      <section className="glass p-6 md:p-8">
        <p className="eyebrow">
          Step {index + 1} of {props.steps.length}
        </p>
        <h2 className="h2 mt-2">{copy.title}</h2>
        <p className="t-small mt-1.5 max-w-[58ch]">{copy.body}</p>

        {(step.key === "first_choice" || step.key === "backups" || step.key === "charity" || step.key === "keyholder") && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="w-name" className={label}>
                {step.key === "keyholder" ? "Their name" : "Name"}
              </label>
              <input id="w-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="w-email" className={label}>
                Email <span className="normal-case tracking-normal opacity-60">(optional)</span>
              </label>
              <input
                id="w-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="w-rel" className={label}>
                How do you know them?
              </label>
              <input
                id="w-rel"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="Daughter, brother, friend"
                className={field}
              />
            </div>
          </div>
        )}

        {step.key === "assets" && (
          <div className="mt-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label htmlFor="a-label" className={label}>
                  What is it
                </label>
                <input
                  id="a-label"
                  value={assetLabel}
                  onChange={(e) => setAssetLabel(e.target.value)}
                  placeholder="Savings, a flat, a shop"
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="a-kind" className={label}>
                  Kind
                </label>
                <select id="a-kind" value={assetKind} onChange={(e) => setAssetKind(e.target.value)} className={field}>
                  <option value="paypal">Money held</option>
                  <option value="crypto">Crypto</option>
                  <option value="business">A business</option>
                </select>
              </div>
              <div>
                <label htmlFor="a-value" className={label}>
                  Roughly (USD)
                </label>
                <input
                  id="a-value"
                  inputMode="decimal"
                  value={assetValue}
                  onChange={(e) => setAssetValue(e.target.value.replace(/[^0-9.]/g, ""))}
                  className={field}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={addAnotherAsset}
                disabled={busy || !assetLabel.trim()}
                className="btn btn-secondary btn-sm"
              >
                Add this one
              </button>
              <span className="t-meta">
                {props.assetCount + added} recorded
                {props.totalCents > 0 ? ` · ${money(props.totalCents)}` : ""}
              </span>
            </div>
          </div>
        )}

        {step.key === "review" && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] border border-white/60 bg-white/60 p-4">
                <p className="label">People</p>
                <ul className="mt-2 space-y-1.5">
                  {props.people.length === 0 && <li className="t-small">No one yet.</li>}
                  {props.people.map((p) => (
                    <li key={`${p.name}-${p.role}`} className="text-[13px] text-[var(--color-ink)]">
                      {p.name}
                      <span className="t-meta">
                        {" "}
                        · {p.role === "primary" ? "first" : p.role === "backup" ? "backup" : "final cause"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[14px] border border-white/60 bg-white/60 p-4">
                <p className="label">The rest</p>
                <p className="mt-2 text-[13px] text-[var(--color-ink)]">
                  {props.assetCount} {props.assetCount === 1 ? "thing" : "things"} · {money(props.totalCents)}
                </p>
                <p className="t-meta mt-1">{props.keyholderName ? `${props.keyholderName} holds the key` : "No Trusted Key"}</p>
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-3 rounded-[12px] bg-[#fdf1ec] px-4 py-2.5 text-[12.5px] text-[var(--color-ember)]">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={advance}
            disabled={busy || (["first_choice", "backups", "charity", "keyholder"].includes(step.key) && !name.trim())}
            className="btn btn-primary"
          >
            {busy
              ? "Saving…"
              : step.key === "review"
                ? "Confirm my plan"
                : index === props.steps.length - 1
                  ? "Continue"
                  : "Continue"}
          </button>
          {index > 0 && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIndex((i) => Math.max(0, i - 1));
              }}
              className="text-[12.5px] font-semibold text-[var(--color-muted)]"
            >
              Back
            </button>
          )}
          <span className="t-meta ml-auto">You can stop at any step and come back to it.</span>
        </div>
      </section>

      {allDone && props.steps.every((s) => s.done) && (
        <section className="glass glass-lime p-6 md:p-8">
          <p className="label text-[#4d6b2a]">Last thing</p>
          <h2 className="h2 mt-2 text-[var(--color-forest)]">Open the vault</h2>
          <p className="mt-1.5 max-w-[58ch] text-[12.5px] text-[#3f5b3a]">
            Every step is done. Opening the vault gives the plan a reference and sends the key to{" "}
            {props.people.find((p) => p.role === "primary")?.name ?? "your first choice"}.
          </p>
          <button onClick={openVault} disabled={opening} className="btn btn-primary mt-4">
            {opening ? "Opening…" : "Open the vault"}
          </button>
          {error && <p className="mt-3 text-[12.5px] text-[var(--color-ember)]">{error}</p>}
        </section>
      )}
    </div>
  );
}
