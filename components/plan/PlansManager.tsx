"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlanSummary } from "@/lib/store";
import { money, stampLabel } from "@/lib/format";

/**
 * Several arrangements, one account.
 *
 * Each card is a complete plan — its own assets, people, Trusted Key and vault —
 * so "open" here means switching documents, not filtering a list. Nothing is
 * copied between them: a new arrangement starts blank.
 */
export function PlansManager({ plans }: { plans: PlanSummary[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  async function post(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "That didn't work. Try again.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("That didn't work. Try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="field-error rounded-[14px] border border-[#f4d2c9] bg-[#fbe7e2] px-3 py-2">{error}</p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => {
          const isRenaming = renaming === plan.no;
          return (
            <li
              key={plan.key}
              className={`card flex flex-col p-5 ${plan.active ? "ring-2 ring-[var(--color-brand)]/25" : ""}`}
              data-tour={plan.active ? "app-plan-card" : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="label">
                    Arrangement {plan.no}
                    {plan.sealedAt ? " · sealed" : " · draft"}
                  </p>
                  {isRenaming ? (
                    <form
                      className="mt-1 flex items-center gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const ok = await post({ action: "rename", no: plan.no, name: draft }, `rename-${plan.no}`);
                        if (ok) setRenaming(null);
                      }}
                    >
                      <input
                        className="input h-9 min-w-0 py-0 text-[13px]"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        maxLength={60}
                        autoFocus
                        aria-label="Arrangement name"
                      />
                      <button className="btn btn-primary btn-xs" disabled={busy === `rename-${plan.no}`}>
                        Save
                      </button>
                    </form>
                  ) : (
                    <h3 className="h3 mt-1 truncate">{plan.name}</h3>
                  )}
                  <p className="t-meta mt-1 truncate">
                    {plan.sealedAt ? `Sealed ${stampLabel(plan.sealedAt)}` : `Saved ${stampLabel(plan.updatedAt)}`}
                  </p>
                </div>
                <span className={`pill ${plan.active ? "badge-lime" : plan.sealedAt ? "badge-mint" : "badge-neutral"} shrink-0`}>
                  {plan.active ? "Open now" : plan.sealedAt ? "Sealed" : "Draft"}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-y border-[var(--color-line)] py-3 text-[12px]">
                <div>
                  <dt className="label">Recorded</dt>
                  <dd className="mt-0.5 font-medium text-[var(--color-ink)]">
                    {money(plan.valueCents)} · {plan.assets} {plan.assets === 1 ? "asset" : "assets"}
                  </dd>
                </div>
                <div>
                  <dt className="label">People</dt>
                  <dd className="mt-0.5 truncate font-medium text-[var(--color-ink)]">
                    {plan.beneficiaryNames.length
                      ? plan.beneficiaryNames.slice(0, 3).join(", ") +
                        (plan.beneficiaryNames.length > 3 ? ` +${plan.beneficiaryNames.length - 3}` : "")
                      : "None named"}
                  </dd>
                </div>
                <div>
                  <dt className="label">Trusted Key</dt>
                  <dd className="mt-0.5 truncate font-medium text-[var(--color-ink)]">
                    {plan.keyholderName ?? "Not appointed"}
                  </dd>
                </div>
                <div>
                  <dt className="label">Vault</dt>
                  <dd className="mt-0.5 truncate font-medium text-[var(--color-ink)]">
                    {plan.vault ? `${plan.vault.ref} · ${plan.vault.status}` : "Not opened"}
                  </dd>
                </div>
              </dl>

              <div className="mt-3.5 flex items-center gap-2">
                {Array.from({ length: plan.total }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5 flex-1 rounded-full"
                    style={{ background: i < plan.done ? "var(--color-forest)" : "#dbe5db" }}
                  />
                ))}
              </div>
              <p className="t-meta mt-2">
                {plan.done} of {plan.total} steps complete
              </p>

              <div className="mt-auto pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {plan.active ? (
                    <a href="/dashboard" className="btn btn-primary btn-sm">
                      Continue <span aria-hidden>→</span>
                    </a>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={busy === `switch-${plan.no}`}
                      onClick={async () => {
                        const ok = await post({ action: "switch", no: plan.no }, `switch-${plan.no}`);
                        if (ok) router.push("/dashboard");
                      }}
                    >
                      {busy === `switch-${plan.no}` ? "Opening…" : "Open this plan"}
                    </button>
                  )}
                  <button
                    className="btn btn-quiet btn-sm"
                    onClick={() => {
                      setRenaming(isRenaming ? null : plan.no);
                      setDraft(plan.name);
                    }}
                  >
                    {isRenaming ? "Cancel" : "Rename"}
                  </button>
                </div>
                <p className="t-meta mt-2">
                  {plan.sealedAt
                    ? "Sealed, so read-only. Open it and unseal to make changes."
                    : plan.active
                      ? "Assets can be moved into another plan from the asset's own page."
                      : "Open this plan, then open an asset to move it here."}
                </p>
              </div>
            </li>
          );
        })}

        <li className="flex flex-col justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-line-strong)] bg-[#fbfdfb] p-5">
          <p className="label">Another arrangement</p>
          <p className="t-small mt-1.5">
            A separate plan with its own assets, beneficiaries, Trusted Key and vault. Nothing is copied across.
          </p>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await post({ action: "create", name }, "create");
              if (ok) {
                setName("");
                router.push("/dashboard");
              }
            }}
          >
            <input
              className="input flex-1"
              placeholder="Family, the studio, a second set…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              aria-label="New arrangement name"
            />
            <button className="btn btn-primary shrink-0" disabled={busy === "create"}>
              {busy === "create" ? "Creating…" : "Create"}
            </button>
          </form>
          <p className="field-help mt-2">You can rename it later, and switch between plans at any time.</p>
        </li>
      </ul>
    </div>
  );
}
