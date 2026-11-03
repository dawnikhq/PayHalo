import { allocate } from "@/lib/engine";
import type { Beneficiary } from "@/lib/types";
import { money } from "@/lib/format";

const COLORS = ["#d9b070", "#8fbf9f", "#7f9fd9", "#c98fd9"];

export function SplitBar({
  beneficiaries,
  totalCents,
  showLegend = true,
  segments = 24,
}: {
  beneficiaries: Beneficiary[];
  totalCents: number;
  showLegend?: boolean;
  segments?: number;
}) {
  const allocations = allocate(beneficiaries, totalCents);
  const total = allocations.reduce((s, a) => s + a.amountCents, 0) || 1;

  const fills: string[] = [];
  allocations.forEach((a, i) => {
    const width = Math.max(1, Math.round((a.amountCents / total) * segments));
    for (let j = 0; j < width; j += 1) fills.push(COLORS[i % COLORS.length]);
  });
  while (fills.length < segments) fills.push("#2a2a33");

  const isFallback =
    allocations.length > 0 && allocations[0].role !== "primary";

  return (
    <div>
      <div className="flex gap-[3px]" role="img" aria-label="Estate distribution">
        {fills.slice(0, segments).map((c, i) => (
          <span
            key={i}
            className="h-2.5 flex-1 rounded-full transition-colors duration-500"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {showLegend && (
        <div className="mt-4 space-y-2.5">
          {allocations.map((a, i) => (
            <div key={a.beneficiaryId} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="truncate text-[13px] text-ivory">{a.name}</span>
                <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-muted/70">
                  {a.role === "charity" ? "final cause" : a.role}
                </span>
              </span>
              <span className="mono shrink-0 text-[12.5px] text-muted">
                {money(a.amountCents)} · {a.share}%
              </span>
            </div>
          ))}
        </div>
      )}

      {isFallback && (
        <p className="mt-3 text-[11.5px] text-ember/80">
          Primary beneficiary unreachable — the engine has fallen through to your{" "}
          {allocations[0].role === "backup" ? "backup instructions" : "final cause"}.
        </p>
      )}
    </div>
  );
}
