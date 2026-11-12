"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* clipboard may be unavailable in an iframe */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-[var(--color-brand)] transition hover:bg-[var(--color-mint)]"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
