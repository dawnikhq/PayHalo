import type { EventRow } from "@/lib/types";
import { relTime } from "@/lib/format";

const TONE: Record<string, string> = {
  "plan.sealed": "var(--color-forest)",
  "claim.submitted": "var(--color-brand)",
  "claim.verified": "var(--color-brand)",
  "window.elapsed": "var(--color-ember)",
  "window.cancelled": "#9aa8a2",
  "distribution.executed": "var(--color-brand)",
};

export function Timeline({ events, dense = false }: { events: EventRow[]; dense?: boolean }) {
  if (!events.length) {
    return <p className="t-small">Nothing has happened yet.</p>;
  }

  return (
    <ol>
      {events.map((e, i) => (
        <li key={e.id} className="relative flex gap-3.5 pb-5 last:pb-0">
          {i !== events.length - 1 && (
            <span className="absolute left-[4px] top-3 h-full w-px bg-[var(--color-line)]" aria-hidden />
          )}
          <span
            className="relative z-10 mt-[5px] h-2 w-2 shrink-0 rounded-full ring-4 ring-white"
            style={{ background: TONE[e.type] ?? "#c3cfc6" }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              <p className="text-[13.5px] font-medium text-[var(--color-ink)]">{e.title}</p>
              <span className="text-[11px] text-[var(--color-muted)]">{relTime(e.createdAt)}</span>
            </div>
            {!dense && e.body && <p className="t-small mt-0.5">{e.body}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
