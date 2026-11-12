"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { money, shortDate } from "@/lib/format";
import type { HaloReview } from "@/lib/halo";

interface Row {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  vault: { ref: string; status: string } | null;
  valueCents: number;
  request: {
    id: number;
    ref: string;
    status: string;
    requesterName: string;
    requesterEmail: string;
    note: string;
    createdAt: string;
    adminNote: string;
  };
  beneficiaries: { name: string; email: string; share: number }[];
  review: HaloReview;
}

export function ReleaseQueue({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; body: string } | null>(null);

  async function decide(row: Row, decision: "researching" | "approved" | "rejected") {
    const key = `${row.ownerId}-${row.request.id}`;
    if (decision === "approved") {
      const ok = window.confirm(
        `Approve ${row.request.ref} and open the vault?\n\n` +
          `Owner: ${row.ownerName}\nValue: ${money(row.valueCents)}\n` +
          `Paid to the plan's beneficiaries only: ${row.beneficiaries.map((b) => b.name).join(", ") || "none named"}.\n\n` +
          "Only approve after the death documentation has been checked.",
      );
      if (!ok) return;
    }

    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: row.ownerId,
          requestId: row.request.id,
          decision,
          note: note[key] ?? "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "That did not work.");
      setMessage({
        tone: "ok",
        body:
          decision === "approved"
            ? `${row.request.ref} approved. The vault is open to ${row.beneficiaries.length} beneficiary(ies).`
            : decision === "rejected"
              ? `${row.request.ref} declined.`
              : `${row.request.ref} marked as under research.`,
      });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "bad", body: err instanceof Error ? err.message : "That did not work." });
    } finally {
      setBusy(null);
    }
  }

  if (!rows.length) {
    return (
      <div className="card p-6">
        <p className="text-[13px] font-semibold text-[var(--color-ink)]">Nothing waiting.</p>
        <p className="t-small mt-1">No plan has a release request open. Requests arrive here the moment a Trusted Key or beneficiary asks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {rows.map((row) => {
        const key = `${row.ownerId}-${row.request.id}`;
        return (
          <section key={key} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{row.request.ref}</p>
                <h2 className="h3 mt-1.5">{row.ownerName}</h2>
                <p className="t-meta">
                  {row.ownerEmail} · vault {row.vault?.ref ?? "none"} · {row.vault?.status ?? "unopened"}
                </p>
              </div>
              <div className="text-right">
                <p className="t-num text-[20px] leading-none text-[var(--color-ink)]">{money(row.valueCents)}</p>
                <span className="pill badge-neutral mt-2 inline-block">{row.request.status}</span>
              </div>
            </div>

            <p className="t-small mt-3">
              Asked by {row.request.requesterName} ({row.request.requesterEmail}) on {shortDate(row.request.createdAt)}.
              {row.request.note ? ` “${row.request.note}”` : ""}
            </p>

            <p className="t-small mt-2">
              Pays: {row.beneficiaries.map((b) => `${b.name} ${b.share}%`).join(" · ") || "nobody named yet"}
            </p>

            {/* Halo's read: what she checked, and what she would not decide */}
            <div
              className={`mt-4 rounded-[14px] border p-4 ${
                row.review.tone === "clear"
                  ? "border-[#d5e7cd] bg-[#f3f8ee]"
                  : row.review.tone === "hold"
                    ? "border-[#e8dfc6] bg-[#f8f4e8]"
                    : "border-[#f0cfc6] bg-[#fdf1ee]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-[var(--color-ink)]">
                  <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-forest)] text-[10px] font-bold text-[var(--color-lime)]">
                    H
                  </span>
                  Halo&apos;s read
                </p>
                <span className="pill badge-neutral h-[22px] px-2 text-[10px]">{row.review.verdict}</span>
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-ink)]">{row.review.line}</p>
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {row.review.checks.map((check) => (
                  <li key={check.label} className="flex items-start gap-2 text-[11.5px] leading-snug">
                    <span
                      aria-hidden
                      className={`mt-[2px] font-bold ${check.ok ? "text-[var(--color-brand)]" : "text-[#b4762a]"}`}
                    >
                      {check.ok ? "✓" : "!"}
                    </span>
                    <span className="text-[var(--color-muted)]">
                      <span className="font-medium text-[var(--color-ink)]">{check.label}</span> — {check.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <textarea
              value={note[key] ?? ""}
              onChange={(e) => setNote((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder="What the documentation check found (shown to the plan owner)"
              rows={2}
              className="mt-3 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 py-2 text-[12.5px] text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:outline-none"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => decide(row, "researching")}
                disabled={busy !== null}
                className="btn btn-secondary btn-sm"
              >
                Hold for research
              </button>
              <button onClick={() => decide(row, "approved")} disabled={busy !== null} className="btn btn-primary btn-sm">
                {busy === key ? "Working…" : "Approve release"}
              </button>
              <button
                onClick={() => decide(row, "rejected")}
                disabled={busy !== null}
                className="text-[12.5px] font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ember)] disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
