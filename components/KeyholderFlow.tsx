"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Snapshot } from "@/lib/types";
import { money, shortDate } from "@/lib/format";
import { Countdown } from "./Countdown";
import { Avatar } from "./Avatar";
import { StatusPill } from "./StatusPill";

type Field = { label: string; value: string; confidence: number };
type Check = { label: string; pass: boolean; detail: string };

const STAGE_INDEX: Record<string, number> = {
  none: 0,
  verifying: 1,
  window: 2,
  distributed: 3,
  cancelled: 0,
};

const STAGES = ["Identify", "Document", "Verification", "Window", "Release"];

export function KeyholderFlow({ initial }: { initial: Snapshot }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [code, setCode] = useState("");
  const [docName, setDocName] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const claim = s.claim;
  const stage = claim && claim.status !== "cancelled" ? claim.status : "none";
  const activeIdx = STAGE_INDEX[stage] ?? 0;
  const fields: Field[] = claim ? safeParse(claim.extracted) : [];

  async function post(url: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
      if (data.snapshot) setS(data.snapshot);
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function startClaim() {
    if (!docName) {
      setError("Attach a certificate first.");
      return;
    }
    setScanning(true);
    const started = Date.now();
    const ok = await post("/api/claim", { accessCode: code, documentName: docName });
    const elapsed = Date.now() - started;
    await new Promise((r) => setTimeout(r, Math.max(0, 1500 - elapsed)));
    setScanning(false);
    if (!ok) setDocName(null);
  }

  return (
    <main className="shell py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">
            <span className="h-px w-8 bg-brass/60" />
            Keyholder portal
          </p>
          <h1 className="display mt-3 text-[clamp(2rem,4vw,3rem)]">
            Start a handover<span className="text-brass">.</span>
          </h1>
          <p className="mt-3 max-w-[58ch] text-[13px] leading-relaxed text-muted">
            You&apos;re acting as the trusted keyholder for{" "}
            <span className="text-ivory">{s.user.name}</span>. Submit proof of death and the process
            begins — you still cannot see or move anything.
          </p>
        </div>
        <StatusPill status={stage === "none" ? "active" : stage} />
      </div>

      {/* stepper */}
      <ol className="mt-9 flex flex-wrap items-center gap-x-2 gap-y-3">
        {STAGES.map((label, i) => {
          const done = i < activeIdx;
          const current = i === activeIdx;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] transition ${
                  done
                    ? "border-sage/40 bg-sage/15 text-sage"
                    : current
                      ? "border-brass/50 bg-brass/15 text-brass"
                      : "border-white/10 text-muted/40"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`text-[11px] uppercase tracking-[0.14em] ${
                  current ? "text-ivory" : done ? "text-muted" : "text-muted/40"
                }`}
              >
                {label}
              </span>
              {i < STAGES.length - 1 && <span className="mx-1 h-px w-5 bg-white/10 sm:w-8" />}
            </li>
          );
        })}
      </ol>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* ------------------------------------------------------ main col */}
        <div className="space-y-5">
          {stage === "none" && (
            <>
              <section className="card p-6 md:p-7">
                <h2 className="font-serif text-[22px] leading-tight">1. Confirm it&apos;s you</h2>
                <p className="mt-1.5 text-[12px] text-muted">
                  Enter the access code {s.user.name.split(" ")[0]} gave you. It unlocks this form
                  only.
                </p>

                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <input
                    className="input mono tracking-[0.14em] uppercase"
                    placeholder="KEY-0000"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={() => setCode(s.keyholder?.accessCode ?? "")}
                    className="btn btn-ghost shrink-0 !py-2.5 !text-[12px]"
                  >
                    Use demo code
                  </button>
                </div>

                <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted/70">
                  <span className="h-1 w-1 rounded-full bg-brass/60" />
                  Demo key: <span className="mono text-brass/90">{s.keyholder?.accessCode}</span>
                </div>
              </section>

              <section className="card p-6 md:p-7">
                <h2 className="font-serif text-[22px] leading-tight">2. Submit a death certificate</h2>
                <p className="mt-1.5 text-[12px] text-muted">
                  A scanned copy or photo. The extraction below is simulated for this prototype.
                </p>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) setDocName(f.name);
                  }}
                  onClick={() => fileRef.current?.click()}
                  className={`mt-5 cursor-pointer rounded-2xl border border-dashed p-8 text-center transition ${
                    drag
                      ? "border-brass/60 bg-brass/8"
                      : docName
                        ? "border-sage/40 bg-sage/[0.05]"
                        : "border-white/12 bg-white/[0.015] hover:border-white/25"
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => setDocName(e.target.files?.[0]?.name ?? null)}
                  />
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-black/30 text-brass">
                    {docName ? "✓" : "⇪"}
                  </div>
                  <p className="mt-3 text-[13px] text-ivory">
                    {docName ?? "Drop the certificate here, or click to browse"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted/70">
                    PDF, PNG or JPG · up to 10MB · not stored in this demo
                  </p>
                </div>

                <button
                  onClick={() => setDocName("ada-okafor-death-certificate.pdf")}
                  className="mt-3 text-[11.5px] text-brass/80 transition hover:text-brass"
                >
                  No file handy? Use the sample certificate →
                </button>

                {error && (
                  <p className="mt-4 rounded-xl border border-ember/30 bg-ember/10 p-3 text-[12px] text-ember">
                    {error}
                  </p>
                )}

                <button
                  onClick={startClaim}
                  disabled={!docName || scanning || busy}
                  className="btn btn-brass mt-5 w-full"
                >
                  {scanning ? (
                    <>
                      <span className="spin inline-block h-3 w-3 rounded-full border-2 border-[#1b1206]/30 border-t-[#1b1206]" />
                      Reading document…
                    </>
                  ) : (
                    "Submit certificate"
                  )}
                </button>
              </section>
            </>
          )}

          {stage === "verifying" && claim && (
            <>
              <section className="card p-6 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-[22px] leading-tight">Document read</h2>
                    <p className="mt-1.5 text-[12px] text-muted">
                      {claim.documentName} · extraction complete
                    </p>
                  </div>
                  <span className="pill border-brass/30 bg-brass/8 text-[9.5px] text-brass">
                    {Math.round(claim.confidence * 100)}% confidence
                  </span>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-white/8">
                  {fields.map((f, i) => (
                    <div
                      key={f.label}
                      className={`flex items-center justify-between gap-4 px-4 py-3 ${
                        i % 2 ? "bg-white/[0.012]" : ""
                      }`}
                    >
                      <span className="text-[11.5px] text-muted">{f.label}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-right text-[12.5px] text-ivory">{f.value}</span>
                        <span className="mono w-9 text-right text-[10.5px] text-sage/80">
                          {Math.round(f.confidence * 100)}%
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 space-y-2">
                  <p className="label">Verification checks</p>
                  {[
                    ["Name matches plan owner", `Exact match on ${s.user.name}`],
                    ["Document integrity", "No tampering signals detected"],
                    ["Issuing authority", "Lagos State Vital Records — recognised"],
                    ["Duplicate submission", "No earlier claim on this plan"],
                  ].map(([t, d]) => (
                    <div key={t} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.015] px-3.5 py-2.5">
                      <span className="grid h-4 w-4 place-items-center rounded-full border border-sage/40 bg-sage/15 text-[8px] text-sage">
                        ✓
                      </span>
                      <span className="flex-1 text-[12px] text-ivory">{t}</span>
                      <span className="hidden text-[10.5px] text-muted/80 sm:block">{d}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] p-3.5 text-[11px] leading-relaxed text-muted/85">
                  This is document processing, not legal proof of death. A production system would
                  require a registrar check and human review.
                </div>

                {error && (
                  <p className="mt-4 rounded-xl border border-ember/30 bg-ember/10 p-3 text-[12px] text-ember">
                    {error}
                  </p>
                )}

                <button
                  onClick={() => post("/api/claim/verify")}
                  disabled={busy}
                  className="btn btn-brass mt-5 w-full"
                >
                  {busy ? "Verifying…" : "Approve verification & notify owner"}
                </button>
              </section>
            </>
          )}

          {stage === "window" && claim && (
            <>
              <section className="card overflow-hidden">
                <div className="border-b border-white/6 bg-ember/[0.06] px-6 py-4">
                  <p className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.2em] text-ember">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="breathe absolute inline-flex h-full w-full rounded-full bg-ember" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember" />
                    </span>
                    Safety window running
                  </p>
                </div>
                <div className="p-6 md:p-7">
                  <h2 className="font-serif text-[24px] leading-tight">
                    Nothing moves until the clock runs out.
                  </h2>
                  <p className="mt-2 max-w-[52ch] text-[12.5px] leading-relaxed text-muted">
                    {s.user.name.split(" ")[0]} was notified on {shortDate(claim.initiatedAt)}. They
                    have 14 days to stop this. If they respond, the claim is void and you&apos;ll see
                    it here.
                  </p>

                  <div className="mt-6 max-w-sm">
                    <Countdown seconds={s.secondsToWindowEnd ?? 0} />
                  </div>

                  <div className="mt-6 space-y-2.5">
                    {[
                      ["Owner notified", `Email + in-app alert sent ${shortDate(claim.initiatedAt)}`, true],
                      ["Claim verified", `${Math.round(claim.confidence * 100)}% extraction confidence`, true],
                      ["Waiting period", "14 days from verification", false],
                    ].map(([t, d, done]) => (
                      <div key={String(t)} className="flex items-center gap-3">
                        <span
                          className={`grid h-4 w-4 place-items-center rounded-full border text-[8px] ${
                            done ? "border-sage/40 bg-sage/15 text-sage" : "border-ember/40 bg-ember/15 text-ember"
                          }`}
                        >
                          {done ? "✓" : "•"}
                        </span>
                        <span className="text-[12px] text-ivory">{String(t)}</span>
                        <span className="text-[10.5px] text-muted/70">{String(d)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => post("/api/claim/fast-forward")}
                      disabled={busy}
                      className="btn btn-brass flex-1"
                    >
                      {busy ? "Releasing…" : "Fast-forward to day 14 (demo)"}
                    </button>
                    <Link href="/dashboard" className="btn btn-ghost flex-1">
                      View owner side
                    </Link>
                  </div>
                  <p className="mt-3 text-[10.5px] leading-relaxed text-muted/60">
                    In the demo, fast-forward jumps the clock. A live system would never allow this.
                  </p>
                </div>
              </section>
            </>
          )}

          {stage === "distributed" && claim && (
            <section className="card overflow-hidden">
              <div className="border-b border-white/6 bg-brass/[0.07] px-6 py-4">
                <p className="text-[10.5px] uppercase tracking-[0.2em] text-brass">Handover executed</p>
              </div>
              <div className="p-6 md:p-7">
                <h2 className="font-serif text-[26px] leading-tight">
                  {money(s.totalCents)} released according to plan.
                </h2>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  The window closed with no response on {shortDate(claim.distributedAt)}. The
                  automation engine distributed the estate and closed the plan.
                </p>

                <div className="mt-6 space-y-2">
                  {s.distributions.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3">
                      <Avatar name={d.name} size={30} tone={d.role === "charity" ? "sage" : "brass"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] text-ivory">{d.name}</p>
                        <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted/70">
                          {d.role === "charity" ? "final cause" : d.role} · {d.share}%
                        </p>
                      </div>
                      <p className="mono text-[13px] text-brass">{money(d.amountCents)}</p>
                    </div>
                  ))}
                </div>

                <Link href="/beneficiary" className="btn btn-brass mt-6 w-full">
                  Open the beneficiary view →
                </Link>
              </div>
            </section>
          )}

          {claim?.status === "cancelled" && stage === "none" && (
            <div className="rise rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[12.5px] text-ivory">
                <span className="mr-2 text-muted">↺</span>
                The owner stopped claim #{claim.id}. Nothing transferred. You can submit a new
                certificate below if needed.
              </p>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------ side col */}
        <aside className="space-y-5">
          <section className="card p-6">
            <p className="label">Plan owner</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={s.user.name} size={42} />
              <div>
                <p className="text-[14px] text-ivory">{s.user.name}</p>
                <p className="text-[11px] text-muted">{s.user.email}</p>
              </div>
            </div>
            <div className="hairline my-4" />
            <dl className="space-y-2.5 text-[11.5px]">
              <div className="flex justify-between">
                <dt className="text-muted">Plan status</dt>
                <dd className="text-ivory capitalize">{s.plan.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Recipients</dt>
                <dd className="text-ivory">{s.beneficiaries.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Sealed</dt>
                <dd className="text-ivory">{shortDate(s.plan.sealedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-6">
            <p className="label">What you can&apos;t do</p>
            <ul className="mt-2 space-y-3">
              {[
                ["See balances", "Assets stay hidden from keyholders, always."],
                ["Change recipients", "The plan is written once and sealed."],
                ["Move money", "Release only happens through the engine."],
                ["Skip the window", "No claim can bypass the 14 days."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-[3px] text-[10px] text-ember/70">✕</span>
                  <span>
                    <span className="block text-[12px] text-ivory">{t}</span>
                    <span className="block text-[10.5px] leading-relaxed text-muted/80">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <p className="label">Trail</p>
            <div className="mt-3 space-y-3">
              {s.events.slice(0, 5).map((e) => (
                <div key={e.id} className="flex gap-2.5">
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-brass/60" />
                  <div>
                    <p className="text-[11.5px] text-ivory">{e.title}</p>
                    <p className="text-[10px] text-muted/70">{shortDate(e.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function safeParse(json: string): Field[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as Field[]) : [];
  } catch {
    return [];
  }
}
