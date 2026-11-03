"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* clipboard may be unavailable in an iframe */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="text-[10.5px] uppercase tracking-[0.12em] text-muted transition hover:text-brass"
    >
      {copied ? "copied" : label}
    </button>
  );
}
