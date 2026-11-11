"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money, shortDate } from "@/lib/format";

export interface MyPlan {
  ownerId: string;
  ownerName: string;
  vault: { ref: string; status: string; keySentAt: string | null } | null;
  role: string;
  share: number;
  valueCents: number;
  assets: { label: string; kind: string }[];
  request: { ref: string; status: string; createdAt: string } | null;
}

/**
 * What a signed-in person sees when somebody's plan names them: the plan, their
 * own share, and the one action they have — ask for the vault to be opened with
 * the key they were sent.
 */
export function MyInheritance({ plans }: { plans: MyPlan[] }) {
  const router = useRouter();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; body: string } | null>(null);

  async function request(plan: MyPlan) {
    setBusy(plan.ownerId);
    setMessage(null);
    try {
      const res = await fetch("/api/release/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: plan.ownerId, key: keys[plan.ownerId] ?? "", note: notes[plan.ownerId] ?? "" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ref?: string };
      if (!res.ok) throw new Error(data.error ?? "That did not work.");
      setMessage({
        tone: "ok",
        body: `${data.ref ?? "Your request"} is with the release desk. They will check the documentation before anything moves.`,
      });
      setOpenFor(null);
      router.refresh();
    } catch (err) {
      setMessage({ tone: "bad", body: err instanceof Error ? err.message : "That did not work." });
    } finally {
      setBusy(null);
    }
  }

  if (!plans.length) {
    return (
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="eyebrow">Your inheritance</p>
          <Link href="/dashboard" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
            ← Back to my home
          </Link>
        </div>
        <h1 className="h2">Nobody has named you yet</h1>
        <p className="t-small mt-2 max-w-[58ch]">
          When someone starts a PayHalo plan and names you, it appears here with the key they sent and what the plan
          holds for you. Nothing is visible until they do.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Your inheritance</p>
          <h1 className="h1 mt-2.5">Plans that name you</h1>
          <p className="t-body mt-2 max-w-[58ch]">
            Only plans where your email is written as a beneficiary appear here. Each one is a promise, held until it is
            confirmed that it should be opened.
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary btn-sm">
          ← Back to my home
        </Link>
      </header>

      {message && (
        <p
          className={`rounded-[12px] px-4 py-3 text-[12.5px] ${
            message.tone === "ok"
              ? "bg-[var(--color-mint)] text-[var(--color-forest)]"
              : "bg-[#fdf1ec] text-[var(--color-ember)]"
          }`}
        >
          {message.body}
        </p>
      )}

      {plans.map((plan) => (
        <section key={plan.ownerId} className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{plan.vault?.ref ?? "No vault yet"}</p>
              <h2 className="h2 mt-2">{plan.ownerName}&apos;s plan</h2>
              <p className="t-small mt-1">
                You are the {plan.role === "primary" ? "first beneficiary" : plan.role === "backup" ? "family backup" : "final cause"} ·{" "}
                {plan.share}% share
              </p>
            </div>
            <div className="text-right">
              <p className="t-num text-[22px] leading-none text-[var(--color-ink)]">{money(plan.valueCents)}</p>
              <p className="t-meta mt-1">your share, at today&apos;s figures</p>
            </div>
          </div>

          {plan.assets.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {plan.assets.slice(0, 8).map((a) => (
                <li key={a.label} className="pill badge-neutral">
                  {a.label}
                </li>
              ))}
            </ul>
          )}

          <p className="t-meta mt-4">
            Vault {plan.vault?.status ?? "not started"}
            {plan.vault?.keySentAt ? ` · key sent ${shortDate(plan.vault.keySentAt)}` : " · no key sent yet"}
          </p>

          {plan.request && plan.request.status !== "approved" && plan.request.status !== "rejected" ? (
            <p className="mt-3 rounded-[12px] bg-[var(--color-mint)] px-4 py-3 text-[12.5px] text-[var(--color-forest)]">
              {plan.request.ref} is with the release desk ({plan.request.status}), filed {shortDate(plan.request.createdAt)}.
            </p>
          ) : plan.request?.status === "approved" ? (
            <p className="mt-3 rounded-[12px] bg-[var(--color-mint)] px-4 py-3 text-[12.5px] text-[var(--color-forest)]">
              Release approved — the vault is open to the people the plan names, including you.
            </p>
          ) : (
            <>
              {openFor === plan.ownerId ? (
                <div className="mt-4 rounded-[14px] border border-[var(--color-line)] bg-[#fbfdfb] p-4">
                  <label htmlFor={`key-${plan.ownerId}`} className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    The key you were sent
                  </label>
                  <input
                    id={`key-${plan.ownerId}`}
                    value={keys[plan.ownerId] ?? ""}
                    onChange={(e) => setKeys((prev) => ({ ...prev, [plan.ownerId]: e.target.value }))}
                    placeholder="PH-2-ABCDE-12345"
                    className="mt-1.5 h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-[13.5px] tracking-[0.04em] text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:outline-none"
                  />
                  <textarea
                    value={notes[plan.ownerId] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [plan.ownerId]: e.target.value }))}
                    rows={2}
                    placeholder="What happened, and what documentation you can send"
                    className="mt-2 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 py-2 text-[12.5px] text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:outline-none"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => request(plan)}
                      disabled={busy !== null || !(keys[plan.ownerId] ?? "").trim()}
                      className="btn btn-primary btn-sm"
                    >
                      {busy === plan.ownerId ? "Sending…" : "Request the vault be opened"}
                    </button>
                    <button
                      onClick={() => setOpenFor(null)}
                      className="text-[12.5px] font-semibold text-[var(--color-muted)]"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="t-meta mt-2">
                    An operator checks the death documentation before anything moves. PayHalo staff cannot open a vault
                    without this request.
                  </p>
                </div>
              ) : (
                <button onClick={() => setOpenFor(plan.ownerId)} className="btn btn-secondary btn-sm mt-4">
                  Request the assets
                </button>
              )}
            </>
          )}
        </section>
      ))}
    </div>
  );
}
