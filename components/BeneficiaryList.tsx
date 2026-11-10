"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { allocate } from "@/lib/engine";
import { money } from "@/lib/format";
import type { Beneficiary } from "@/lib/types";
import { Avatar } from "./Avatar";

const ROLE_COPY: Record<string, string> = {
  primary: "First choice",
  backup: "Family backup",
  charity: "Final cause",
};

export function BeneficiaryList({
  beneficiaries,
  totalCents,
  locked,
  showToggle = true,
}: {
  beneficiaries: Beneficiary[];
  totalCents: number;
  locked: boolean;
  showToggle?: boolean;
}) {
  const allocations = allocate(beneficiaries, totalCents);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function toggle(b: Beneficiary) {
    setBusyId(b.id);
    await fetch("/api/beneficiary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, available: !b.available }),
    });
    startTransition(() => router.refresh());
    setBusyId(null);
  }

  return (
    <ul className="divide-y divide-[var(--color-line)]">
      {beneficiaries.map((b) => {
        const allocation = allocations.find((a) => a.beneficiaryId === b.id);
        return (
          <li key={b.id} className="flex items-start gap-3.5 py-4 first:pt-0 last:pb-0">
            <Avatar name={b.name} tone={b.role === "primary" ? "forest" : b.role === "charity" ? "lime" : "mint"} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[14px] font-medium text-[var(--color-ink)]">{b.name}</p>
                <span
                  className={`pill !h-[22px] !text-[10.5px] ${
                    b.role === "primary" ? "badge-forest" : b.role === "charity" ? "badge-lime" : "badge-mint"
                  }`}
                >
                  {ROLE_COPY[b.role]}
                </span>
              </div>
              <p className="t-small mt-0.5">
                {b.relationship}
                {b.email ? ` · ${b.email}` : ""}
              </p>
              {b.note && (
                <p className="mt-2 border-l-2 border-[var(--color-line)] pl-3 text-[12px] italic leading-relaxed text-[var(--color-muted)]">
                  “{b.note}”
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              {allocation ? (
                <>
                  <p className="t-num text-[14px] text-[var(--color-ink)]">{money(allocation.amountCents)}</p>
                  <p className="t-meta">{allocation.share}% of the estate</p>
                </>
              ) : (
                <p className="pill badge-neutral">On hold</p>
              )}

              {showToggle && b.role !== "charity" && (
                <button
                  onClick={() => toggle(b)}
                  disabled={locked || pending || busyId === b.id}
                  title={locked ? "Locked while a handover is running" : "Simulate an unreachable beneficiary"}
                  className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)] transition enabled:hover:text-[var(--color-ink)] disabled:opacity-40"
                >
                  <span
                    className={`relative h-3.5 w-6 rounded-full border transition ${
                      b.available ? "border-[#9ec9a9] bg-[#d9ecdd]" : "border-[var(--color-line-strong)] bg-[#f1f4f1]"
                    }`}
                  >
                    <span
                      className={`absolute top-[1.5px] h-2 w-2 rounded-full transition-all ${
                        b.available ? "left-[11px] bg-[var(--color-brand)]" : "left-[2px] bg-[#a9b6ae]"
                      }`}
                    />
                  </span>
                  {b.available ? "Reachable" : "Unreachable"}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
