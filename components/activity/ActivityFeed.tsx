"use client";

import { useMemo, useState } from "react";
import { relTime } from "@/lib/format";
import type { EventRow } from "@/lib/types";

type Filter = "all" | "plan" | "assets" | "people" | "claims";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All activity" },
  { key: "plan", label: "Plan" },
  { key: "assets", label: "Assets" },
  { key: "people", label: "People" },
  { key: "claims", label: "Claims" },
];

const TONE: Record<string, string> = {
  "plan.sealed": "var(--color-forest)",
  "asset.added": "var(--color-brand)",
  "asset.updated": "var(--color-brand)",
  "asset.removed": "var(--color-ember)",
  "claim.submitted": "var(--color-brand)",
  "claim.verified": "var(--color-brand)",
  "window.elapsed": "var(--color-ember)",
  "window.cancelled": "#9aa8a2",
  "distribution.executed": "var(--color-brand)",
};

function category(type: string): Filter {
  if (type.startsWith("asset")) return "assets";
  if (type.startsWith("beneficiary") || type.startsWith("keyholder") || type.startsWith("document")) return "people";
  if (type.startsWith("claim") || type.startsWith("window") || type.startsWith("distribution")) return "claims";
  return "plan";
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function ActivityFeed({ events }: { events: EventRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const groups = useMemo(() => {
    const rows = filter === "all" ? events : events.filter((e) => category(e.type) === filter);
    const map = new Map<string, EventRow[]>();
    for (const e of rows) {
      const key = dayLabel(e.createdAt);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return Array.from(map.entries());
  }, [events, filter]);

  return (
    <section className="card p-6 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="h2">Every change, in order.</h2>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${
                filter === f.key
                  ? "bg-[var(--color-forest)] text-white"
                  : "bg-[#f4f6f3] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {groups.length ? (
        <div className="mt-6 space-y-7">
          {groups.map(([day, rows]) => (
            <div key={day}>
              <p className="text-[12.5px] font-semibold text-[var(--color-ink)]">{day}</p>
              <ol className="mt-3">
                {rows.map((e) => (
                  <li
                    key={e.id}
                    className="grid grid-cols-[52px_14px_1fr] gap-x-3 border-t border-[var(--color-line)] py-4 first:border-t-0 first:pt-0"
                  >
                    <span className="t-meta pt-0.5 tabular-nums">
                      {new Date(e.createdAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })}
                    </span>
                    <span className="relative mt-1.5 flex justify-center" aria-hidden>
                      <span
                        className="h-2 w-2 rounded-full ring-4 ring-white"
                        style={{ background: TONE[e.type] ?? "#c3cfc6" }}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium text-[var(--color-ink)]">{e.title}</span>
                      {e.body && <span className="t-small mt-0.5 block">{e.body}</span>}
                      <span className="t-meta mt-1 block">{relTime(e.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : (
        <p className="t-body mt-6">Nothing recorded in this category yet.</p>
      )}

      <p className="t-meta mt-6 border-t border-[var(--color-line)] pt-4">
        All activity shown here is simulated. The account holder is never shown a claim that is still inside
        its 72-hour registry check.
      </p>
    </section>
  );
}
