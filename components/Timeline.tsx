import type { EventRow } from "@/lib/types";
import { relTime } from "@/lib/format";

const TONE: Record<string, string> = {
  "plan.sealed": "bg-sage",
  "claim.submitted": "bg-brass",
  "claim.verified": "bg-brass",
  "window.elapsed": "bg-ember",
  "window.cancelled": "bg-muted",
  "distribution.executed": "bg-brass",
  "beneficiary.availability": "bg-muted",
};

export function Timeline({ events, dense = false }: { events: EventRow[]; dense?: boolean }) {
  if (!events.length) {
    return <p className="text-[13px] text-muted">Nothing has happened yet.</p>;
  }

  return (
    <ol className="relative space-y-0">
      {events.map((e, i) => (
        <li key={e.id} className="relative flex gap-3.5 pb-5 last:pb-0">
          {i !== events.length - 1 && (
            <span className="absolute left-[4.5px] top-3 h-full w-px bg-white/8" aria-hidden />
          )}
          <span
            className={`relative z-10 mt-[5px] h-[9px] w-[9px] shrink-0 rounded-full ring-4 ring-ink ${
              TONE[e.type] ?? "bg-white/30"
            }`}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              <p className="text-[13px] font-medium text-ivory">{e.title}</p>
              <span className="text-[10.5px] uppercase tracking-[0.12em] text-muted/60">
                {relTime(e.createdAt)}
              </span>
            </div>
            {!dense && e.body && (
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{e.body}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
