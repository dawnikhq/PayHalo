import { stampLabel } from "@/lib/format";

/**
 * The seal itself.
 *
 * A sealing animation that stops: the stamp lands once, three rings travel out,
 * a sheen crosses the word, then everything rests. It is the same mark wherever
 * a sealed arrangement is shown, so "sealed" reads as a state rather than a
 * button that has not been pressed yet.
 */
export function SealedSeal({
  sealedAt,
  vaultRef,
  compact = false,
  className = "",
}: {
  sealedAt: string | null;
  vaultRef?: string | null;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className={compact ? "seal-mark !h-14 !w-14" : "seal-mark"} aria-hidden>
        <span className="seal-ring" />
        <span className="seal-ring" style={{ animationDelay: "1.2s" }} />
        <span className="seal-ring" style={{ animationDelay: "2.4s" }} />
        <span className={`seal-core seal-stamp ${compact ? "!h-14 !w-14" : ""}`}>
          <svg
            width={compact ? 20 : 26}
            height={compact ? 20 : 26}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="10.5" width="16" height="9.5" rx="2.5" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            <circle cx="12" cy="15.2" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        </span>
      </div>

      <div className="min-w-0">
        <p className="seal-sheen inline-flex items-center gap-1.5 rounded-full bg-[var(--color-forest)] px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-lime)]">
          <span aria-hidden>✓</span> Sealed
        </p>
        <p className="mt-1.5 text-[12.5px] text-[var(--color-muted)]">
          {sealedAt ? `Sealed ${stampLabel(sealedAt)}` : "Recorded"}
          {vaultRef ? ` · Vault ${vaultRef}` : ""}
        </p>
      </div>
    </div>
  );
}
