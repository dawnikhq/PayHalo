export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    active: { label: "Plan active", cls: "border-sage/30 bg-sage/10 text-sage", dot: "bg-sage" },
    draft: { label: "Draft", cls: "border-white/12 bg-white/5 text-muted", dot: "bg-muted" },
    claiming: { label: "Safety window open", cls: "border-ember/35 bg-ember/10 text-ember", dot: "bg-ember" },
    verifying: { label: "Awaiting verification", cls: "border-brass/30 bg-brass/10 text-brass", dot: "bg-brass" },
    window: { label: "Safety window open", cls: "border-ember/35 bg-ember/10 text-ember", dot: "bg-ember" },
    cancelled: { label: "Cancelled by owner", cls: "border-white/12 bg-white/5 text-muted", dot: "bg-muted" },
    distributed: { label: "Handover complete", cls: "border-brass/35 bg-brass/12 text-brass", dot: "bg-brass" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className={`pill ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
