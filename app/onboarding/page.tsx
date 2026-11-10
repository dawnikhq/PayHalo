"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { Field } from "@/components/ui";

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
  {
    kicker: "Before we begin",
    title: "Four minutes now. Years of clarity later.",
    note: "No passwords leave your hands, and nothing transfers while you are alive.",
  },
  { kicker: "Step one", title: "Whose plan is this?", note: "We only use this to match a certificate later." },
  {
    kicker: "Step two",
    title: "What would you be leaving behind?",
    note: "You enter these figures yourself — VIVO never reads a provider balance.",
  },
  { kicker: "Step three", title: "Who inherits first?", note: "The person you would want it to reach without hesitation." },
  { kicker: "Step four", title: "And if they can't?", note: "A plan needs a second path. Split it however feels fair." },
  {
    kicker: "Step five",
    title: "If there is nobody left to carry it.",
    note: "The final cause. Your legacy keeps working even without heirs.",
  },
  { kicker: "Step six", title: "Who holds your key?", note: "They can start the process. They can never see your money." },
  { kicker: "Last look", title: "Seal it.", note: "A sealed plan follows your order exactly, and only you can stop it." },
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
  const [backups, setBackups] = useState<Backup[]>([{ name: "", email: "", relationship: "", note: "" }]);
  const [split, setSplit] = useState(60);
  const [charity, setCharity] = useState({ name: CAUSES[0].name, email: CAUSES[0].email, note: "" });
  const [keyholder, setKeyholder] = useState({ name: "", email: "", relationship: "" });
  const [code] = useState(() => `KEY-${Math.floor(1000 + Math.random() * 8999)}`);

  const connected = assets.filter((a) => a.connected);
  const total = connected.reduce((sum, a) => sum + a.balanceCents, 0);

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
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-[64px] w-full max-w-[1120px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-[var(--font-display)] text-[24px] font-extrabold tracking-[-0.055em] text-[var(--color-brand)]">
              vivo
            </span>
            <span className="hidden text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[#94a29a] sm:block">
              New plan
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="t-meta">Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}</span>
            <Link href="/" className="text-[12.5px] font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              Leave without saving
            </Link>
          </div>
        </div>
        <div className="h-0.5 w-full bg-[#edf2ed]">
          <div
            className="h-full bg-[var(--color-brand)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1120px] gap-8 px-5 py-9 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14 lg:py-12">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="eyebrow">{meta.kicker}</p>
          <h1 className="h1 mt-3">{meta.title}</h1>
          <p className="t-body mt-3 max-w-[38ch]">{meta.note}</p>

          <nav aria-label="Plan steps" className="mt-8 max-w-[300px]">
            {STEPS.slice(1).map((s, i) => {
              const idx = i + 1;
              const done = idx < step;
              const current = idx === step;
              return (
                <button
                  key={s.kicker}
                  onClick={() => idx <= step && setStep(idx)}
                  disabled={idx > step}
                  className={`flex w-full items-center gap-2.5 rounded-[8px] px-1 py-1.5 text-left text-[11.5px] transition ${
                    current
                      ? "font-semibold text-[var(--color-forest)]"
                      : done
                        ? "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                        : "text-[#b6c1ba]"
                  }`}
                >
                  <span
                    className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[9px] ${
                      done
                        ? "bg-[var(--color-mint)] text-[var(--color-forest)]"
                        : current
                          ? "bg-[var(--color-forest)] text-[var(--color-lime)]"
                          : "border border-[var(--color-line-strong)]"
                    }`}
                  >
                    {done ? "✓" : idx}
                  </span>
                  {s.kicker}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="card p-6 md:p-8">
          <div key={step} className="rise">
            {step === 0 && (
              <div>
                <p className="h2">Most people never write anything down.</p>
                <div className="mt-4 space-y-3">
                  <p className="t-body">
                    Not because they don&apos;t care — because it feels morbid, expensive, or like something
                    you&apos;ll do later. Then one day the accounts stay open, the wallet stays locked, and the
                    family inherits a spreadsheet of guesses.
                  </p>
                  <p className="t-body">
                    What follows isn&apos;t a will and it isn&apos;t legal advice. It&apos;s the instruction sheet
                    your family would otherwise never have.
                  </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["01", "Instructions", "Who gets what, in order"],
                    ["02", "A keyholder", "Someone who can start it"],
                    ["03", "14 days", "Time to stop a mistake"],
                  ].map(([n, title, body]) => (
                    <div key={n} className="rounded-[14px] bg-[#f6f9f6] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-brand)]">{n}</p>
                      <p className="mt-1.5 text-[12.5px] font-medium text-[var(--color-ink)]">{title}</p>
                      <p className="t-meta mt-0.5">{body}</p>
                    </div>
                  ))}
                </div>

                <button onClick={next} className="btn btn-primary mt-7 w-full sm:w-auto">
                  Begin <span aria-hidden>→</span>
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <Field label="Full legal name" htmlFor="owner-name" help="This is the name matched against a certificate later.">
                  <input
                    id="owner-name"
                    className="input"
                    placeholder="Ada Okafor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label="Email" htmlFor="owner-email" help="Where a safety notice would reach you.">
                  <input
                    id="owner-email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="space-y-2.5">
                  {assets.map((a, i) => (
                    <button
                      key={a.kind}
                      onClick={() =>
                        setAssets((prev) => prev.map((p, j) => (j === i ? { ...p, connected: !p.connected } : p)))
                      }
                      aria-pressed={a.connected}
                      className={`flex w-full items-center gap-4 rounded-[14px] border p-4 text-left transition ${
                        a.connected
                          ? "border-[var(--color-brand)] bg-[var(--color-mint)]"
                          : "border-[var(--color-line)] bg-white hover:border-[var(--color-line-strong)]"
                      }`}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white text-[13px] font-semibold text-[var(--color-forest)]">
                        {a.kind === "paypal" ? "P" : a.kind === "crypto" ? "₿" : "◫"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-medium text-[var(--color-ink)]">{a.label}</span>
                        <span className="block truncate text-[11.5px] text-[var(--color-muted)]">
                          {a.provider} · {a.detail}
                        </span>
                      </span>
                      <span className="t-num hidden text-[12.5px] sm:block">{money(a.balanceCents)}</span>
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                          a.connected
                            ? "bg-[var(--color-forest)] text-[var(--color-lime)]"
                            : "border border-[var(--color-line-strong)] text-transparent"
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex items-end justify-between rounded-[14px] bg-[#f6f9f6] p-4">
                  <div>
                    <p className="label">Included total</p>
                    <p className="t-num mt-1 text-[26px] leading-none">{money(total)}</p>
                  </div>
                  <p className="t-meta">
                    {connected.length} of {assets.length} included
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Their name" htmlFor="p-name">
                    <input
                      id="p-name"
                      className="input"
                      placeholder="Chidi Okafor"
                      value={primary.name}
                      onChange={(e) => setPrimary({ ...primary, name: e.target.value })}
                      autoFocus
                    />
                  </Field>
                  <Field label="Relationship" htmlFor="p-rel">
                    <input
                      id="p-rel"
                      className="input"
                      placeholder="Brother"
                      value={primary.relationship}
                      onChange={(e) => setPrimary({ ...primary, relationship: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Email" htmlFor="p-email">
                  <input
                    id="p-email"
                    className="input"
                    placeholder="chidi@example.com"
                    value={primary.email}
                    onChange={(e) => setPrimary({ ...primary, email: e.target.value })}
                  />
                </Field>
                <Field
                  label="A note for them"
                  htmlFor="p-note"
                  optional
                  help="Beneficiaries see this with their entitlement. Never include passwords."
                >
                  <textarea
                    id="p-note"
                    className="textarea"
                    placeholder="Something they should read when the time comes…"
                    value={primary.note}
                    onChange={(e) => setPrimary({ ...primary, note: e.target.value })}
                  />
                </Field>
                <p className="card-mint p-3.5 text-[12px] leading-relaxed text-[#3c5a4e]">
                  The first choice receives the full estate unless you add backups with a split.
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                {backups.map((b, i) => (
                  <div key={i} className="rounded-[14px] border border-[var(--color-line)] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="label">
                        Backup {i + 1} · {backups.length === 1 ? 100 : i === 0 ? split : 100 - split}%
                      </p>
                      {backups.length > 1 && (
                        <button
                          onClick={() => setBackups((prev) => prev.filter((_, j) => j !== i))}
                          className="text-[11px] font-medium text-[var(--color-muted)] hover:text-[var(--color-ember)]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="input"
                        placeholder="Name"
                        aria-label={`Backup ${i + 1} name`}
                        value={b.name}
                        onChange={(e) =>
                          setBackups((prev) => prev.map((p, j) => (j === i ? { ...p, name: e.target.value } : p)))
                        }
                      />
                      <input
                        className="input"
                        placeholder="Relationship"
                        aria-label={`Backup ${i + 1} relationship`}
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
                        aria-label={`Backup ${i + 1} email`}
                        value={b.email}
                        onChange={(e) =>
                          setBackups((prev) => prev.map((p, j) => (j === i ? { ...p, email: e.target.value } : p)))
                        }
                      />
                    </div>
                  </div>
                ))}

                {backups.length < 2 && (
                  <button
                    onClick={() => setBackups((prev) => [...prev, { name: "", email: "", relationship: "", note: "" }])}
                    className="btn btn-secondary w-full"
                  >
                    + Add a second backup
                  </button>
                )}

                {backups.length === 2 && (
                  <div className="rounded-[14px] border border-[var(--color-line)] p-4">
                    <div className="flex items-center justify-between">
                      <p className="label">How the backup share splits</p>
                      <p className="t-num text-[12.5px]">
                        {split}% / {100 - split}%
                      </p>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={split}
                      onChange={(e) => setSplit(Number(e.target.value))}
                      className="mt-4 w-full accent-[var(--color-brand)]"
                      aria-label="Backup split"
                    />
                    <div className="mt-2 flex justify-between text-[11px] text-[var(--color-muted)]">
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
                        aria-pressed={active}
                        className={`flex items-center justify-between rounded-[14px] border p-4 text-left transition ${
                          active
                            ? "border-[var(--color-brand)] bg-[var(--color-mint)]"
                            : "border-[var(--color-line)] bg-white hover:border-[var(--color-line-strong)]"
                        }`}
                      >
                        <span>
                          <span className="block text-[13.5px] font-medium text-[var(--color-ink)]">{c.name}</span>
                          <span className="block text-[11.5px] text-[var(--color-muted)]">{c.email}</span>
                        </span>
                        <span
                          className={`h-3.5 w-3.5 rounded-full border ${
                            active ? "border-[var(--color-brand)] bg-[var(--color-brand)]" : "border-[var(--color-line-strong)]"
                          }`}
                          aria-hidden
                        />
                      </button>
                    );
                  })}
                </div>

                <Field label="Or name your own cause" htmlFor="cause-custom">
                  <input
                    id="cause-custom"
                    className="input"
                    placeholder="Organisation name"
                    value={CAUSES.some((c) => c.name === charity.name) ? "" : charity.name}
                    onChange={(e) => setCharity({ name: e.target.value, email: "", note: charity.note })}
                  />
                </Field>
                <Field label="Why this one?" htmlFor="cause-note" optional>
                  <textarea
                    id="cause-note"
                    className="textarea"
                    placeholder="They taught me to build…"
                    value={charity.note}
                    onChange={(e) => setCharity({ ...charity, note: e.target.value })}
                  />
                </Field>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <div className="card-mint p-4">
                  <p className="text-[12.5px] leading-relaxed text-[#3c5a4e]">
                    A keyholder can begin a handover by submitting proof of death. They{" "}
                    <span className="font-semibold text-[var(--color-forest)]">cannot</span> view balances,
                    change your split, or move anything while you are alive.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Their name" htmlFor="k-name">
                    <input
                      id="k-name"
                      className="input"
                      placeholder="Emeka Nwosu"
                      value={keyholder.name}
                      onChange={(e) => setKeyholder({ ...keyholder, name: e.target.value })}
                      autoFocus
                    />
                  </Field>
                  <Field label="Relationship" htmlFor="k-rel">
                    <input
                      id="k-rel"
                      className="input"
                      placeholder="Best friend"
                      value={keyholder.relationship}
                      onChange={(e) => setKeyholder({ ...keyholder, relationship: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Email" htmlFor="k-email">
                  <input
                    id="k-email"
                    className="input"
                    placeholder="emeka@example.com"
                    value={keyholder.email}
                    onChange={(e) => setKeyholder({ ...keyholder, email: e.target.value })}
                  />
                </Field>
                <div className="flex items-center justify-between gap-4 rounded-[14px] bg-[#f6f9f6] p-4">
                  <div>
                    <p className="label">Their access code</p>
                    <p className="t-num mt-1 text-[18px] tracking-[0.14em] text-[var(--color-forest)]">{code}</p>
                  </div>
                  <p className="max-w-[22ch] text-[11px] leading-snug text-[var(--color-muted)]">
                    Share this privately. It only unlocks the claim form.
                  </p>
                </div>
              </div>
            )}

            {step === 7 && (
              <div>
                <div className="rounded-[14px] bg-[#f6f9f6] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="label">Estate value</p>
                      <p className="t-num mt-1 text-[30px] leading-none">{money(total)}</p>
                    </div>
                    <span className="pill badge-mint">Ready to seal</span>
                  </div>

                  <dl className="mt-5 space-y-2.5">
                    {[
                      ["Account holder", name || "—"],
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
                      <div
                        key={k}
                        className="flex items-start justify-between gap-6 border-b border-[var(--color-line)] pb-2.5 last:border-0 last:pb-0"
                      >
                        <dt className="t-meta">{k}</dt>
                        <dd className="max-w-[62%] text-right text-[12.5px] text-[var(--color-ink)]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {error && <p className="field-error mt-4">{error}</p>}

                <div className="mt-6 flex items-center gap-2">
                  <button onClick={back} className="btn btn-secondary shrink-0">
                    ← Back
                  </button>
                  <button onClick={seal} disabled={submitting} className="btn btn-primary flex-1">
                    {submitting ? "Sealing…" : "Seal my plan"}
                  </button>
                </div>
                <p className="t-meta mt-3 text-center">
                  Sealing records your instructions and starts the safety clock. It is not a will.
                </p>
              </div>
            )}
          </div>

          {step > 0 && step < STEPS.length - 1 && (
            <div className="mt-7 flex items-center justify-between border-t border-[var(--color-line)] pt-5">
              <button onClick={back} className="btn btn-secondary">
                ← Back
              </button>
              <button onClick={next} disabled={!canAdvance} className="btn btn-primary">
                Continue <span aria-hidden>→</span>
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-1.5 px-5 pb-24 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:pb-20">
          <p className="t-meta">VIVO records instructions. It is not a will and does not replace legal advice.</p>
          <p className="font-[var(--font-display)] text-[11.5px] font-semibold text-[var(--color-forest)]">
            VIVO / Your legacy, considered.
          </p>
        </div>
      </footer>
    </div>
  );
}
