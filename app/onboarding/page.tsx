"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";

type AssetChoice = {
  kind: "paypal" | "crypto" | "business";
  label: string;
  provider: string;
  detail: string;
  balanceCents: number;
  connected: boolean;
};

type Backup = { name: string; email: string; relationship: string; note: string };

const ASSET_LIBRARY: AssetChoice[] = [
  {
    kind: "paypal",
    label: "PayPal Business",
    provider: "PayPal",
    detail: "2 currencies · 41 pending payouts",
    balanceCents: 842050,
    connected: false,
  },
  {
    kind: "crypto",
    label: "Self-custody wallet",
    provider: "Ethereum + Bitcoin",
    detail: "0.0842 BTC · 3.10 ETH",
    balanceCents: 561020,
    connected: false,
  },
  {
    kind: "business",
    label: "Your studio (storefront)",
    provider: "Gumroad + Stripe",
    detail: "$4,100 MRR · 612 customers",
    balanceCents: 1230000,
    connected: false,
  },
];

const CAUSES = [
  { name: "The Girls' Code Fund", email: "hello@girlscode.fund" },
  { name: "Doctors Without Borders", email: "giving@msf.org" },
  { name: "Rainforest Trust", email: "hello@rainforesttrust.org" },
];

const STEPS = [
  { kicker: "Before we begin", title: "Four minutes now. Years of clarity later.", note: "No passwords leave your hands, and nothing transfers while you're alive." },
  { kicker: "Step one", title: "Whose plan is this?", note: "We only use this to match the certificate later." },
  { kicker: "Step two", title: "What would you be leaving behind?", note: "Connect is simulated — these are demo balances." },
  { kicker: "Step three", title: "Who inherits first?", note: "Your first choice. The person you'd want it to reach without hesitation." },
  { kicker: "Step four", title: "And if they can't?", note: "A plan needs a second path. Split it however you feel is fair." },
  { kicker: "Step five", title: "If there's nobody left to carry it.", note: "The final cause. Your legacy keeps working even without heirs." },
  { kicker: "Step six", title: "Who holds your key?", note: "They can start the process. They can never see your money." },
  { kicker: "Last look", title: "Seal it.", note: "A sealed plan is written once, and follows your order exactly." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [assets, setAssets] = useState<AssetChoice[]>(ASSET_LIBRARY);
  const [primary, setPrimary] = useState({ name: "", email: "", relationship: "", note: "" });
  const [backups, setBackups] = useState<Backup[]>([
    { name: "", email: "", relationship: "", note: "" },
  ]);
  const [split, setSplit] = useState(60);
  const [charity, setCharity] = useState({ name: CAUSES[0].name, email: CAUSES[0].email, note: "" });
  const [keyholder, setKeyholder] = useState({ name: "", email: "", relationship: "" });
  const [code] = useState(
    () => `KEY-${Math.floor(1000 + Math.random() * 8999)}`,
  );

  const connected = assets.filter((a) => a.connected);
  const total = connected.reduce((s, a) => s + a.balanceCents, 0);

  const canAdvance = useMemo(() => {
    if (step === 2) return connected.length > 0;
    if (step === 1) return name.trim().length > 1;
    if (step === 3) return primary.name.trim().length > 1;
    if (step === 4) return backups.every((b) => b.name.trim().length > 1);
    if (step === 5) return charity.name.trim().length > 1;
    if (step === 6) return keyholder.name.trim().length > 1;
    return true;
  }, [step, name, connected.length, primary.name, backups, charity.name, keyholder.name]);

  function next() {
    setError(null);
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function seal() {
    setSubmitting(true);
    setError(null);

    const body = {
      name,
      email,
      assets: connected.map((a) => ({
        kind: a.kind,
        label: a.label,
        provider: a.provider,
        balanceCents: a.balanceCents,
        detail: a.detail,
      })),
      primary,
      backups: backups.map((b, i) => ({
        ...b,
        share: backups.length === 1 ? 100 : i === 0 ? split : 100 - split,
      })),
      charity,
      keyholder: { ...keyholder, accessCode: code },
    };

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not seal the plan.");
      router.push("/dashboard?sealed=1");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  const meta = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <main className="min-h-[calc(100vh-4rem)]">
      <div className="shell grid gap-10 py-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-16">
        {/* narrative rail */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Link href="/" className="text-[11.5px] text-muted transition hover:text-ivory">
            ← Leave without saving
          </Link>

          <p className="eyebrow mt-8">
            <span className="h-px w-8 bg-brass/60" />
            {meta.kicker}
          </p>
          <h1 className="display mt-4 text-[clamp(2.1rem,3.6vw,2.9rem)]">{meta.title}</h1>
          <p className="mt-4 max-w-[36ch] text-[13.5px] leading-relaxed text-muted">{meta.note}</p>

          <div className="mt-10 max-w-[300px]">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted/60">
              <span>Progress</span>
              <span className="mono">{Math.round(progress)}%</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brass-deep to-brass transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-6 space-y-1.5">
              {STEPS.slice(1).map((s, i) => {
                const idx = i + 1;
                const done = idx < step;
                const current = idx === step;
                return (
                  <button
                    key={s.kicker}
                    onClick={() => idx <= step && setStep(idx)}
                    disabled={idx > step}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left text-[11.5px] transition ${
                      current ? "text-brass" : done ? "text-muted hover:text-ivory" : "text-muted/30"
                    }`}
                  >
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[8px] ${
                        done
                          ? "border-sage/40 bg-sage/15 text-sage"
                          : current
                            ? "border-brass/50 bg-brass/15 text-brass"
                            : "border-white/10"
                      }`}
                    >
                      {done ? "✓" : idx}
                    </span>
                    {s.kicker}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* form panel */}
        <section className="card p-6 md:p-9">
          <div key={step} className="rise">
            {step === 0 && (
              <div>
                <p className="font-serif text-[26px] leading-snug text-ivory">
                  Most people never write anything down.
                </p>
                <div className="mt-5 space-y-3.5 text-[13.5px] leading-relaxed text-muted">
                  <p>
                    Not because they don&apos;t care — because it feels morbid, expensive, or like
                    something you&apos;ll do later. Then one day the accounts stay open, the wallet
                    stays locked, and the family inherits a spreadsheet of guesses.
                  </p>
                  <p>
                    What follows isn&apos;t a will and it isn&apos;t legal advice. It&apos;s the
                    instruction sheet your family would otherwise never have.
                  </p>
                </div>

                <div className="mt-7 grid gap-2.5 sm:grid-cols-3">
                  {[
                    ["01", "Instructions", "Who gets what, in order"],
                    ["02", "A keyholder", "Someone who can start it"],
                    ["03", "14 days", "Time to stop a mistake"],
                  ].map(([n, t, d]) => (
                    <div key={n} className="card-flat p-3.5">
                      <p className="mono text-[10px] text-brass/70">{n}</p>
                      <p className="mt-1.5 text-[12.5px] text-ivory">{t}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted/80">{d}</p>
                    </div>
                  ))}
                </div>

                <button onClick={next} className="btn btn-brass mt-8 w-full sm:w-auto">
                  Begin
                  <span aria-hidden>→</span>
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="label" htmlFor="owner-name">Full legal name</label>
                  <input
                    id="owner-name"
                    className="input"
                    placeholder="Ada Okafor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  <p className="mt-2 text-[11px] text-muted/70">
                    This is the name that will be matched against a death certificate later.
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="owner-email">Email</label>
                  <input
                    id="owner-email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="space-y-2.5">
                  {assets.map((a, i) => (
                    <button
                      key={a.kind}
                      onClick={() =>
                        setAssets((prev) =>
                          prev.map((p, j) => (j === i ? { ...p, connected: !p.connected } : p)),
                        )
                      }
                      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                        a.connected
                          ? "border-brass/35 bg-brass/[0.07]"
                          : "border-white/8 bg-white/[0.015] hover:border-white/16"
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/30 font-serif text-[16px] text-brass">
                        {a.kind === "paypal" ? "P" : a.kind === "crypto" ? "₿" : "◫"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] text-ivory">{a.label}</span>
                        <span className="block truncate text-[11px] text-muted/80">
                          {a.provider} · {a.detail}
                        </span>
                      </span>
                      <span className="mono hidden text-[12.5px] text-ivory sm:block">
                        {money(a.balanceCents)}
                      </span>
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                          a.connected
                            ? "border-sage/50 bg-sage/20 text-sage"
                            : "border-white/15 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex items-end justify-between rounded-2xl border border-brass/20 bg-brass/[0.05] p-4">
                  <div>
                    <p className="label !mb-1">Connected total</p>
                    <p className="mono text-[26px] leading-none text-ivory">{money(total)}</p>
                  </div>
                  <p className="text-[11px] text-muted">
                    {connected.length} of {assets.length} connected
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="p-name">Their name</label>
                    <input
                      id="p-name"
                      className="input"
                      placeholder="Chidi Okafor"
                      value={primary.name}
                      onChange={(e) => setPrimary({ ...primary, name: e.target.value })}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="p-rel">Relationship</label>
                    <input
                      id="p-rel"
                      className="input"
                      placeholder="Brother"
                      value={primary.relationship}
                      onChange={(e) => setPrimary({ ...primary, relationship: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="p-email">Email</label>
                  <input
                    id="p-email"
                    className="input"
                    placeholder="chidi@example.com"
                    value={primary.email}
                    onChange={(e) => setPrimary({ ...primary, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="p-note">A note for them (optional)</label>
                  <textarea
                    id="p-note"
                    className="input min-h-[92px] resize-none"
                    placeholder="Something they should read when the time comes…"
                    value={primary.note}
                    onChange={(e) => setPrimary({ ...primary, note: e.target.value })}
                  />
                  <p className="mt-2 text-[11px] text-muted/70">
                    Beneficiaries see this on their portal. It travels with the money.
                  </p>
                </div>
                <p className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[11.5px] leading-relaxed text-muted">
                  First choice receives the full estate unless you add backups with a split.
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                {backups.map((b, i) => (
                  <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.015] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                        Backup {i + 1} · {backups.length === 1 ? 100 : i === 0 ? split : 100 - split}%
                      </p>
                      {backups.length > 1 && (
                        <button
                          onClick={() => setBackups((prev) => prev.filter((_, j) => j !== i))}
                          className="text-[11px] text-muted/70 transition hover:text-ember"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="input"
                        placeholder="Name"
                        value={b.name}
                        onChange={(e) =>
                          setBackups((prev) =>
                            prev.map((p, j) => (j === i ? { ...p, name: e.target.value } : p)),
                          )
                        }
                      />
                      <input
                        className="input"
                        placeholder="Relationship"
                        value={b.relationship}
                        onChange={(e) =>
                          setBackups((prev) =>
                            prev.map((p, j) => (j === i ? { ...p, relationship: e.target.value } : p)),
                          )
                        }
                      />
                      <input
                        className="input sm:col-span-2"
                        placeholder="Email"
                        value={b.email}
                        onChange={(e) =>
                          setBackups((prev) =>
                            prev.map((p, j) => (j === i ? { ...p, email: e.target.value } : p)),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}

                {backups.length < 2 && (
                  <button
                    onClick={() =>
                      setBackups((prev) => [...prev, { name: "", email: "", relationship: "", note: "" }])
                    }
                    className="btn btn-ghost w-full !justify-start !text-[12.5px]"
                  >
                    + Add a second backup
                  </button>
                )}

                {backups.length === 2 && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.015] p-4">
                    <div className="flex items-center justify-between">
                      <p className="label !mb-0">How the backup share splits</p>
                      <p className="mono text-[12px] text-brass">
                        {split}% / {100 - split}%
                      </p>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={split}
                      onChange={(e) => setSplit(Number(e.target.value))}
                      className="mt-4 w-full accent-[#d9b070]"
                      aria-label="Backup split"
                    />
                    <div className="mt-2 flex justify-between text-[11px] text-muted/80">
                      <span>{backups[0].name || "Backup 1"}</span>
                      <span>{backups[1].name || "Backup 2"}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="grid gap-2.5">
                  {CAUSES.map((c) => {
                    const active = charity.name === c.name;
                    return (
                      <button
                        key={c.name}
                        onClick={() => setCharity({ ...c, note: charity.note })}
                        className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-sage/40 bg-sage/[0.07]"
                            : "border-white/8 bg-white/[0.015] hover:border-white/16"
                        }`}
                      >
                        <span>
                          <span className="block text-[13.5px] text-ivory">{c.name}</span>
                          <span className="block text-[11px] text-muted/80">{c.email}</span>
                        </span>
                        <span
                          className={`h-3 w-3 rounded-full border ${
                            active ? "border-sage bg-sage" : "border-white/20"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="label" htmlFor="cause-custom">Or name your own cause</label>
                  <input
                    id="cause-custom"
                    className="input"
                    placeholder="Organisation name"
                    value={CAUSES.some((c) => c.name === charity.name) ? "" : charity.name}
                    onChange={(e) => setCharity({ name: e.target.value, email: "", note: charity.note })}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="cause-note">Why this one? (optional)</label>
                  <textarea
                    id="cause-note"
                    className="input min-h-[80px] resize-none"
                    placeholder="They taught me to build…"
                    value={charity.note}
                    onChange={(e) => setCharity({ ...charity, note: e.target.value })}
                  />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-brass/20 bg-brass/[0.05] p-4">
                  <p className="text-[12px] leading-relaxed text-ivory/90">
                    A keyholder can begin the handover by submitting proof of death. They{" "}
                    <span className="text-brass">cannot</span> view balances, change your split, or
                    move anything while you&apos;re alive.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="k-name">Their name</label>
                    <input
                      id="k-name"
                      className="input"
                      placeholder="Emeka Nwosu"
                      value={keyholder.name}
                      onChange={(e) => setKeyholder({ ...keyholder, name: e.target.value })}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="k-rel">Relationship</label>
                    <input
                      id="k-rel"
                      className="input"
                      placeholder="Best friend"
                      value={keyholder.relationship}
                      onChange={(e) => setKeyholder({ ...keyholder, relationship: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="k-email">Email</label>
                  <input
                    id="k-email"
                    className="input"
                    placeholder="emeka@example.com"
                    value={keyholder.email}
                    onChange={(e) => setKeyholder({ ...keyholder, email: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/25 p-4">
                  <div>
                    <p className="label !mb-1">Their access code</p>
                    <p className="mono text-[18px] tracking-[0.14em] text-brass">{code}</p>
                  </div>
                  <p className="max-w-[22ch] text-[11px] leading-snug text-muted/80">
                    Share this privately. It only unlocks the claim form.
                  </p>
                </div>
              </div>
            )}

            {step === 7 && (
              <div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.015] p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="label !mb-1">Estate value</p>
                      <p className="mono text-[30px] leading-none text-ivory">{money(total)}</p>
                    </div>
                    <span className="pill border-sage/30 bg-sage/10 text-[9.5px] text-sage">
                      Ready to seal
                    </span>
                  </div>

                  <div className="mt-5 space-y-2.5 text-[12.5px]">
                    {[
                      ["Owner", name || "—"],
                      ["Primary", primary.name || "—"],
                      [
                        "Backups",
                        backups
                          .map(
                            (b, i) =>
                              `${b.name || "—"} (${backups.length === 1 ? 100 : i === 0 ? split : 100 - split}%)`,
                          )
                          .join(" · ") || "—",
                      ],
                      ["Final cause", charity.name || "—"],
                      ["Keyholder", keyholder.name || "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-6 border-b border-white/5 pb-2.5 last:border-0">
                        <span className="text-muted">{k}</span>
                        <span className="max-w-[60%] text-right text-ivory">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="mt-4 rounded-xl border border-ember/30 bg-ember/10 p-3 text-[12.5px] text-ember">
                    {error}
                  </p>
                )}

                <div className="mt-6 flex items-center gap-2">
                  <button onClick={back} className="btn btn-quiet shrink-0">
                    ← Back
                  </button>
                  <button
                    onClick={seal}
                    disabled={submitting}
                    className="btn btn-brass flex-1"
                  >
                    {submitting ? "Sealing…" : "Seal my plan"}
                    {!submitting && <span aria-hidden>◆</span>}
                  </button>
                </div>
                <p className="mt-3 text-center text-[10.5px] leading-relaxed text-muted/60">
                  Prototype only. Sealing simulates the process; no legal instrument is created.
                </p>
              </div>
            )}
          </div>

          {step > 0 && step < STEPS.length - 1 && (
            <div className="mt-8 flex items-center justify-between border-t border-white/6 pt-5">
              <button onClick={back} className="btn btn-quiet">
                ← Back
              </button>
              <button onClick={next} disabled={!canAdvance} className="btn btn-brass">
                Continue
                <span aria-hidden>→</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
