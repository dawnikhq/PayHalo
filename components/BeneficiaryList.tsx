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
}: {
  beneficiaries: Beneficiary[];
  totalCents: number;
  locked: boolean;
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
    <ul className="divide-y divide-white/6">
      {beneficiaries.map((b) => {
        const allocation = allocations.find((a) => a.beneficiaryId === b.id);
        return (
          <li key={b.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
            <Avatar name={b.name} tone={b.role === "charity" ? "sage" : "brass"} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <p className="text-[14px] text-ivory">{b.name}</p>
                <span
                  className={`pill !py-0.5 !text-[9px] ${
                    b.role === "charity"
                      ? "border-sage/25 bg-sage/8 text-sage"
                      : b.role === "primary"
                        ? "border-brass/30 bg-brass/8 text-brass"
                        : "border-white/12 bg-white/5 text-muted"
                  }`}
                >
                  {ROLE_COPY[b.role]}
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] text-muted">
                {b.relationship}
                {b.email ? ` · ${b.email}` : ""}
              </p>
              {b.note && (
                <p className="mt-2 max-w-[46ch] border-l border-white/10 pl-3 text-[11.5px] italic leading-relaxed text-muted/80">
                  “{b.note}”
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              {allocation ? (
                <>
                  <p className="mono text-[13.5px] text-ivory">{money(allocation.amountCents)}</p>
                  <p className="text-[10.5px] text-muted">{allocation.share}% today</p>
                </>
              ) : (
                <p className="text-[10.5px] uppercase tracking-[0.12em] text-ember/70">on hold</p>
              )}

              {b.role !== "charity" && (
                <button
                  onClick={() => toggle(b)}
                  disabled={locked || pending || busyId === b.id}
                  title={locked ? "Locked while a handover is running" : "Toggle reachability"}
                  className="mt-2.5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-muted transition enabled:hover:text-ivory disabled:opacity-40"
                >
                  <span
                    className={`relative h-3.5 w-6 rounded-full border transition ${
                      b.available
                        ? "border-sage/40 bg-sage/25"
                        : "border-white/15 bg-white/5"
                    }`}
                  >
                    <span
                      className={`absolute top-[1.5px] h-2 w-2 rounded-full transition-all ${
                        b.available ? "left-[11px] bg-sage" : "left-[2px] bg-muted"
                      }`}
                    />
                  </span>
                  {b.available ? "reachable" : "unreachable"}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
