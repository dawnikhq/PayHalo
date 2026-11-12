"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClaimReviewRow } from "@/lib/operator";

/**
 * The death-verification desk.
 *
 * Every row here is a claim a person filed and no machine can settle. The
 * operator reads the extracted fields, the automated verdict and the assets the
 * claim names, then either accepts the documents — which releases the registry
 * hold and starts the owner's 14-day window — or refuses them with a reason the
 * Trusted Key will read.
 */
export function ClaimDesk({ rows }: { rows: ClaimReviewRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [note, setNote] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<{ id: number; ok: boolean; text: string } | null>(null);

  async function decide(id: number, decision: "accept" | "reject") {
    setBusy(id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          note: note[id] ?? "",
          claimId: id,
          ownerEmail: rows.find((r) => r.claimId === id)?.ownerEmail ?? "",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "The decision did not save.");
      setMessage({
        id,
        ok: true,
        text:
          decision === "accept"
            ? "Documents accepted. The registry hold is released and the safety window begins."
            : "Documents refused. The plan stays with its owner.",
      });
      router.refresh();
    } catch (e) {
      setMessage({ id, ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-[16px] border border-[rgba(21,63,53,0.08)] bg-white p-5">
        <p className="text-[13px] font-semibold text-[var(--color-ink)]">Nothing waiting on verification</p>
        <p className="t-meta mt-1">
          When a Trusted Key files a death certificate it lands here, with the extracted fields and the checks that ran.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <article key={row.claimId} className="rounded-[16px] border border-[rgba(21,63,53,0.08)] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Claim #{row.claimId} · filed {row.filedAt.slice(0, 16).replace("T", " ")} UTC
              </p>
              <h3 className="mt-1 font-[var(--font-display)] text-[16px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
                {row.ownerName}
                <span className="ml-2 text-[12px] font-medium text-[var(--color-muted)]">{row.ownerEmail}</span>
              </h3>
              <p className="mt-1 text-[12px] text-[var(--color-muted)]">
                Filed by {row.keyholderName} · {row.keyholderEmail}
              </p>
            </div>
            <span className="pill badge-sand h-[22px] px-2 text-[10px]">
              {row.verdict === "verified" ? "Checks passed" : "Needs a human look"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-[12px] border border-[rgba(21,63,53,0.08)] bg-[#fbfdfb] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Document
              </p>
              <p className="mt-1 text-[13px] font-semibold text-[var(--color-ink)]">
                {row.documentName}{" "}
                <span className="text-[11px] font-medium text-[var(--color-muted)]">
                  · {row.documentKind.toUpperCase()} · {Math.round(row.confidence * 100)}% match
                </span>
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--color-muted)]">{row.summary}</p>

              {row.fields.length > 0 && (
                <dl className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {row.fields.map((f) => (
                    <div key={`${f.label}-${f.value}`} className="min-w-0">
                      <dt className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#94a29a]">
                        {f.label}
                      </dt>
                      <dd className="truncate text-[12px] text-[var(--color-ink)]" title={f.value}>
                        {f.value || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <div className="rounded-[12px] border border-[rgba(21,63,53,0.08)] bg-[#fbfdfb] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Assets named in the claim
              </p>
              {row.assets.length === 0 ? (
                <p className="mt-1 text-[12px] text-[var(--color-muted)]">
                  The whole plan — no individual assets were named.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {row.assets.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="truncate text-[var(--color-ink)]">{a.label}</span>
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                        {a.kind.replace(/_/g, " ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {row.note && (
                <p className="mt-3 rounded-[10px] bg-white px-3 py-2 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
                  “{row.note}”
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={note[row.claimId] ?? ""}
              onChange={(e) => setNote((n) => ({ ...n, [row.claimId]: e.target.value }))}
              placeholder="Reason (required to refuse)"
              className="h-10 w-full rounded-[10px] border border-[rgba(21,63,53,0.14)] bg-white px-3 text-[12.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none"
            />
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busy === row.claimId}
                onClick={() => decide(row.claimId, "accept")}
                className="btn btn-primary btn-sm flex-1 sm:flex-none"
              >
                {busy === row.claimId ? "Saving…" : "Accept documents"}
              </button>
              <button
                type="button"
                disabled={busy === row.claimId}
                onClick={() => decide(row.claimId, "reject")}
                className="btn btn-secondary btn-sm flex-1 sm:flex-none"
              >
                Refuse
              </button>
            </div>
          </div>

          {message?.id === row.claimId && (
            <p
              className={`mt-2 text-[11.5px] ${message.ok ? "text-[var(--color-sage)]" : "text-[var(--color-ember)]"}`}
            >
              {message.text}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
