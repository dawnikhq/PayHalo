import { Badge } from "./ui";

const MAP: Record<string, { label: string; tone: "forest" | "lime" | "mint" | "warn" | "danger" | "neutral" }> = {
  active: { label: "Plan active", tone: "mint" },
  draft: { label: "In progress", tone: "neutral" },
  claiming: { label: "Safety window open", tone: "warn" },
  review: { label: "Under registry check", tone: "warn" },
  window: { label: "Safety window open", tone: "warn" },
  cancelled: { label: "Stopped by owner", tone: "neutral" },
  distributed: { label: "Handover complete", tone: "lime" },
  sealed: { label: "Sealed", tone: "mint" },
};

export function StatusPill({ status }: { status: string }) {
  const s = MAP[status] ?? MAP.draft;
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}
