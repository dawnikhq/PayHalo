import { initials } from "@/lib/format";

export function Avatar({
  name,
  size = 40,
  tone = "mint",
}: {
  name: string;
  size?: number;
  tone?: "mint" | "forest" | "lime" | "quiet";
}) {
  const tones: Record<string, string> = {
    mint: "bg-[var(--color-mint)] text-[var(--color-forest)]",
    forest: "bg-[var(--color-forest)] text-[#eaf3ea]",
    lime: "bg-[var(--color-lime)] text-[var(--color-forest)]",
    quiet: "bg-[#f2f5f2] text-[var(--color-muted)]",
  };
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${tones[tone]}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.33) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
