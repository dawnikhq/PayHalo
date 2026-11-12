"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyButton";

/**
 * Share links are built in the browser because only the browser knows the
 * origin this plan is being viewed on. The token itself is minted on the
 * server and signed — the page never sees the secret.
 */
export function ShareLinks({
  keyholderToken,
  beneficiaryToken,
  hasKeyholder,
}: {
  keyholderToken: string;
  beneficiaryToken: string;
  hasKeyholder: boolean;
}) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const rows = [
    {
      label: "Trusted Key link",
      hint: "Shows handover request status, evidence and the safety window. Never balances, assets or other people.",
      path: `/keyholder?share=${keyholderToken}`,
      disabled: !hasKeyholder,
      disabledNote: "Add a Trusted Key first.",
    },
    {
      label: "Beneficiary link",
      hint: "Shows nothing at all until a verified handover clears the 14-day window, then only that person's entitlement.",
      path: `/beneficiary?share=${beneficiaryToken}`,
      disabled: false,
      disabledNote: "",
    },
  ];

  return (
    <section className="card p-6 md:p-7" id="sharing">
      <p className="eyebrow">Sharing</p>
      <h2 className="h2 mt-2">Links, not passwords.</h2>
      <p className="t-small mt-2 max-w-[62ch]">
        Each portal is opened with a signed link you control. Anyone holding a link sees exactly one audience:
        nothing more. Replacing the links invalidates the old ones.
      </p>

      <ul className="mt-5 space-y-3">
        {rows.map((row) => {
          const url = origin ? `${origin}${row.path}` : row.path;
          return (
            <li key={row.label} className="rounded-[14px] border border-[var(--color-line)] bg-[#fbfdfb] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12.5px] font-semibold text-[var(--color-ink)]">{row.label}</p>
                {row.disabled ? (
                  <span className="text-[11.5px] text-[var(--color-muted)]">{row.disabledNote}</span>
                ) : (
                  <CopyButton value={url} label="Copy link" />
                )}
              </div>
              <p className="mt-1 break-all text-[11px] text-[var(--color-muted)]">{row.disabled ? "—" : url}</p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--color-muted)]">{row.hint}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
