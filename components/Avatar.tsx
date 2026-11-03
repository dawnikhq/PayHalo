import { initials } from "@/lib/format";

export function Avatar({
  name,
  size = 40,
  tone = "brass",
}: {
  name: string;
  size?: number;
  tone?: "brass" | "sage" | "quiet";
}) {
  const tones: Record<string, string> = {
    brass: "border-brass/30 bg-brass/12 text-brass",
    sage: "border-sage/30 bg-sage/12 text-sage",
    quiet: "border-white/12 bg-white/5 text-muted",
  };
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border font-medium ${tones[tone]}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(name)}
    </span>
  );
}
