"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money, pct } from "@/lib/format";

interface Person {
  name: string;
  relationship: string;
  share: number;
}
interface Asset {
  kind: string;
  label: string;
  provider: string;
  balanceCents: number;
}
interface Draft {
  reading: string;
  people: Person[];
  assets: Asset[];
  source: "model" | "rules";
  model: string | null;
}

const EXAMPLE =
  "I'm 54. My flat is worth about $120,000 and my savings are roughly $18,000. " +
  "My daughter Chidi should get the flat. My son Tunde gets the savings. My sister Ngozi is the backup.";

/**
 * Describe it, then look at what the machine read before anything is written.
 * The draft is a proposal: every row can be dropped, and nothing enters the
 * plan until "Add to my plan" is pressed.
 */
export function DescribePlan({ modelReady }: { modelReady: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropped, setDropped] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<{ people: number; assets: number; skipped: string[] } | null>(null);

  async function read() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as { draft?: Draft; error?: string };
      if (!res.ok || !data.draft) throw new Error(data.error ?? "That could not be read.");
      setDraft(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That could not be read.");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!draft) return;
    setApplying(true);
    setError(null);
    try {
      const people = draft.people.filter((p) => !dropped[`p:${p.name}`]);
      const assets = draft.assets.filter((a) => !dropped[`a:${a.label}`]);
      const res = await fetch("/api/ai/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: { ...draft, people, assets } }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        addedPeople?: number;
        addedAssets?: number;
        skipped?: string[];
      };
      if (!res.ok) throw new Error(data.error ?? "That could not be saved.");
      setDone({ people: data.addedPeople ?? 0, assets: data.addedAssets ?? 0, skipped: data.skipped ?? [] });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That could not be saved.");
    } finally {
      setApplying(false);
    }
  }

  const keptPeople = draft?.people.filter((p) => !dropped[`p:${p.name}`]) ?? [];
  const keptAssets = draft?.assets.filter((a) => !dropped[`a:${a.label}`]) ?? [];
  const keptCents = keptAssets.reduce((n, a) => n + a.balanceCents, 0);

  return (
    <div className="space-y-5">
      <section className="card p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">In your own words</p>
            <h2 className="h2 mt-2">Say it once, plainly.</h2>
          </div>
          <span className="pill badge-neutral">{modelReady ? "reading with a model" : "reading with rules"}</span>
        </div>

        <p className="t-small mt-2 max-w-[62ch]">
          Who is in your life, what you own, who should get what. It comes back as a draft you can check — and nothing is
          written to your plan until you press add.
        </p>

        <label htmlFor="describe" className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          Your description
        </label>
        <textarea
          id="describe"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          className="mt-1.5 w-full rounded-[14px] border border-[var(--color-line-strong)] bg-white px-3.5 py-3 text-[13.5px] leading-relaxed text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-brand)] focus:outline-none"
        />

        {error && <p className="field-error mt-3">{error}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={read} disabled={busy || text.trim().length < 20} className="btn btn-primary">
            {busy ? "Reading…" : "Read it back to me"}
          </button>
          <button
            type="button"
            onClick={() => setText(EXAMPLE)}
            className="text-[12.5px] font-semibold text-[var(--color-muted)]"
          >
            Use the example
          </button>
        </div>
      </section>

      {draft && !done && (
        <section className="card p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">The draft</p>
              <h2 className="h2 mt-2">Check what it read</h2>
            </div>
            <span className="pill badge-neutral">
              {draft.source === "model" ? draft.model ?? "model" : "rules, not a model"}
            </span>
          </div>

          <p className="t-small mt-2">{draft.reading}</p>

          {keptPeople.length > 0 && (
            <>
              <p className="label mt-5">People</p>
              <ul className="mt-2 divide-y divide-[var(--color-line)]">
                {draft.people.map((p) => (
                  <li key={p.name} className="flex items-center justify-between gap-3 py-2.5">
                    <span className={dropped[`p:${p.name}`] ? "line-through opacity-40" : ""}>
                      <span className="block text-[13.5px] font-semibold text-[var(--color-ink)]">{p.name}</span>
                      <span className="t-meta">{p.relationship || "relationship not given"}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="t-num text-[13px] text-[var(--color-forest)]">{pct(p.share)}</span>
                      <button
                        onClick={() => setDropped((prev) => ({ ...prev, [`p:${p.name}`]: !prev[`p:${p.name}`] }))}
                        className="text-[12px] font-semibold text-[var(--color-muted)]"
                      >
                        {dropped[`p:${p.name}`] ? "keep" : "drop"}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {draft.assets.length > 0 && (
            <>
              <p className="label mt-5">Assets</p>
              <ul className="mt-2 divide-y divide-[var(--color-line)]">
                {draft.assets.map((a) => (
                  <li key={a.label} className="flex items-center justify-between gap-3 py-2.5">
                    <span className={dropped[`a:${a.label}`] ? "line-through opacity-40" : ""}>
                      <span className="block text-[13.5px] font-semibold text-[var(--color-ink)]">{a.label}</span>
                      <span className="t-meta">
                        {a.kind}
                        {a.provider ? ` · ${a.provider}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="t-num text-[13px] text-[var(--color-forest)]">{money(a.balanceCents)}</span>
                      <button
                        onClick={() => setDropped((prev) => ({ ...prev, [`a:${a.label}`]: !prev[`a:${a.label}`] }))}
                        className="text-[12px] font-semibold text-[var(--color-muted)]"
                      >
                        {dropped[`a:${a.label}`] ? "keep" : "drop"}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="t-small mt-4">
            {keptPeople.length} people · {keptAssets.length} assets · {money(keptCents)} recorded
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={apply}
              disabled={applying || (keptPeople.length === 0 && keptAssets.length === 0)}
              className="btn btn-primary"
            >
              {applying ? "Adding…" : "Add to my plan"}
            </button>
            <button onClick={read} disabled={busy} className="text-[12.5px] font-semibold text-[var(--color-muted)]">
              Read it again
            </button>
          </div>
          <p className="t-meta mt-2">
            Shares are normalised to 100%. The first person becomes your first choice; the rest become backups.
          </p>
        </section>
      )}

      {done && (
        <section className="card-lime p-6 md:p-7">
          <p className="label text-[#4d6b2a]">Added</p>
          <h2 className="h2 mt-2 text-[var(--color-forest)]">
            {done.people} {done.people === 1 ? "person" : "people"} and {done.assets}{" "}
            {done.assets === 1 ? "asset" : "assets"} are on the plan.
          </h2>
          {done.skipped.length > 0 && (
            <p className="mt-2 text-[12.5px] text-[#3f5b3a]">
              Left out because they were already there, or the plan already had a first choice: {done.skipped.join(", ")}.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/plan/start" className="btn btn-primary btn-sm">
              Start the vault <span aria-hidden>→</span>
            </Link>
            <Link href="/beneficiaries" className="text-[12.5px] font-semibold text-[#42603f]">
              Review people and shares
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
