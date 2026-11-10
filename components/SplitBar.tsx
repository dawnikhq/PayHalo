import { allocate } from "@/lib/engine";
import type { Beneficiary } from "@/lib/types";
import { money } from "@/lib/format";

const COLORS = ["#d9f4a5", "#7ec9bd", "#b9d8c6", "#8aa79b"];

export function SplitBar({
  beneficiaries,
  totalCents,
  legend = true,
  segments = 28,
  dark = true,
}: {
  beneficiaries: Beneficiary[];
  totalCents: number;
  legend?: boolean;
  segments?: number;
  dark?: boolean;
}) {
  const allocations = allocate(beneficiaries, totalCents);
  const total = allocations.reduce((s, a) => s + a.amountCents, 0) || 1;

  const fills: string[] = [];
  allocations.forEach((a, i) => {
    const width = Math.max(1, Math.round((a.amountCents / total) * segments));
    for (let j = 0; j < width; j += 1) fills.push(COLORS[i % COLORS.length]);
  });
  while (fills.length < segments) fills.push(dark ? "rgba(255,255,255,0.14)" : "#e4ebe4");

  const isFallback = allocations.length > 0 && allocations[0].role !== "primary";

  return (
    <div>
      <div className="flex gap-[3px]" role="img" aria-label="How the estate divides">
        {fills.slice(0, segments).map((c, i) => (
          <span key={i} className="h-2.5 flex-1 rounded-full" style={{ backgroundColor: c }} />
        ))}
      </div>

      {legend && (
        <ul className="mt-4 space-y-2.5">
          {allocations.map((a, i) => (
            <li key={a.beneficiaryId} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="truncate text-[13px] text-white/90">{a.name}</span>
                <span className="shrink-0 text-[10.5px] uppercase tracking-[0.12em] text-white/45">
                  {a.role === "charity" ? "final cause" : a.role === "primary" ? "first choice" : "backup"}
                </span>
              </span>
              <span className="shrink-0 text-[12.5px] tabular-nums text-white/70">
                {money(a.amountCents)} · {a.share}%
              </span>
            </li>
          ))}
        </ul>
      )}

      {isFallback && (
        <p className="mt-3 text-[11.5px] text-[var(--color-lime)]">
          First choice unreachable — the engine falls through to your{" "}
          {allocations[0].role === "backup" ? "family backups" : "final cause"}.
        </p>
      )}
    </div>
  );
}
