"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CertCheck, CertReport } from "@/lib/certs";
import type { KeyholderView } from "@/lib/store";
import { clockLabel, shortDate } from "@/lib/format";
import { Countdown } from "./Countdown";
import { Badge, Field } from "./ui";

const CAN = ["Start a handover request", "Submit supporting evidence", "Track the verification status"];
const CANNOT = ["View balances or asset details", "Edit plans or beneficiaries", "Move or release any assets"];

const CARE = [
  {
    title: "Handover request review",
    body: "Evidence is reviewed before a safety window can begin. Nothing is assumed from a filename.",
  },
  { title: "Owner notice", body: "If verified, the account holder is notified and has 14 full days to respond." },
  { title: "A response stops it", body: "The account holder can stop the handover during the window." },
  { title: "No early release", body: "Release is eligible only after verification and the full safety window." },
];

const VERDICT: Record<CertReport["verdict"], { label: string; tone: "mint" | "warn" | "danger" }> = {
  verified: { label: "Checks passed", tone: "mint" },
  needs_review: { label: "Needs a human look", tone: "warn" },
  rejected: { label: "Not accepted", tone: "danger" },
};

const CHECK: Record<CertCheck["status"], { glyph: string; cls: string }> = {
  pass: { glyph: "✓", cls: "bg-[var(--color-mint)] text-[var(--color-forest)]" },
  warn: { glyph: "!", cls: "bg-[var(--color-warn)] text-[var(--color-warnink)]" },
  fail: { glyph: "✕", cls: "bg-[#fbe7e2] text-[var(--color-ember)]" },
};

export function KeyholderFlow({ initial }: { initial: KeyholderView }) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [intake, setIntake] = useState(false);
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<CertReport | null>(null);
  const [checking, setChecking] = useState(false);
  const [drag, setDrag] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const claim = view.claim;
  const stage = claim && claim.status !== "cancelled" ? claim.status : "none";

  async function refresh() {
    const res = await fetch("/api/keyholder", { cache: "no-store" });
    if (res.ok) setView((await res.json()) as KeyholderView);
    router.refresh();
  }

  async function checkFile(f: File) {
    setError(null);
    setChecking(true);
    setReport(null);
    setFile(f);
    try {
      const body = new FormData();
      body.append("file", f);
      const res = await fetch("/api/verify/certificate", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "The document could not be read.");
      setReport(data as CertReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The document could not be read.");
      setFile(null);
    } finally {
      setChecking(false);
    }
  }

  async function loadSample(path: string, name: string) {
    setError(null);
    setChecking(true);
    try {
      const res = await fetch(path);
      const blob = await res.blob();
      await checkFile(new File([blob], name, { type: blob.type || "application/pdf" }));
    } catch {
      setError("Couldn't load that document.");
      setChecking(false);
    }
  }

  async function startClaim() {
    if (!file || !report) {
      setError("Check a certificate first.");
      return;
    }
    if (!understood) {
      setError("Confirm you understand what a handover request does — and does not — give you.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("accessCode", code);
      body.append("file", file);
      const res = await fetch("/api/claim", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        if (data?.report) setReport(data.report as CertReport);
        throw new Error(data?.error ?? "The handover request couldn't be filed.");
      }
      setFile(null);
      setReport(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The handover request couldn't be filed.");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------ home view -- */

  if (stage === "none" && !intake) {
    return (
      <>
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Trusted Key</p>
            <h1 className="h1 mt-2.5">A little trust. A clear role.</h1>
            <p className="t-body mt-2">
              Welcome, {view.keyholder?.name.split(" ")[0] ?? "there"}. You are the trusted contact on{" "}
              {view.ownerFirstName ? `${view.ownerFirstName}'s` : "this"} plan.
            </p>
          </div>
          <Badge tone="mint" dot>
            Keyholder access
          </Badge>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          <section className="card-forest p-6 md:p-7 lg:col-span-2">
            <p className="label">You are a Trusted Key for</p>
            <h2 className="mt-4 font-[var(--font-display)] text-[clamp(1.9rem,4vw,2.5rem)] font-medium leading-none text-white">
              {view.ownerName}
            </h2>
            <p className="mt-3 text-[12.5px] text-[#b7cfbd]">
              {view.keyholder?.relationship ?? "Trusted contact"} · Trusted contact
            </p>
            <p className="mt-6 border-t border-white/10 pt-4 text-[12.5px] text-[#b7cfbd]">
              You can help start a verified handover if the time comes. That is the whole of your access.
            </p>
          </section>

          <section className="card-mint p-6">
            <span className="pill badge-mint bg-white/70">No handover request in progress</span>
            <h2 className="h2 mt-4 text-[var(--color-forest)]">No action needed.</h2>
            <p className="t-body mt-2 text-[#3c5a4e]">
              Being a Trusted Key does not grant access to {view.ownerFirstName}&apos;s assets or balances.
            </p>
          </section>

          <section id="role" className="card scroll-mt-24 p-6 md:p-7 lg:col-span-2">
            <h2 className="h2">Your role, clearly defined.</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand)]">You can</p>
                <ul className="mt-3 space-y-2.5">
                  {CAN.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-[var(--color-ink)]">
                      <span aria-hidden className="mt-0.5 text-[var(--color-brand)]">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-ember)]">
                  You cannot
                </p>
                <ul className="mt-3 space-y-2.5">
                  {CANNOT.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[13px] text-[var(--color-muted)]">
                      <span aria-hidden className="mt-0.5 text-[#b9a9a2]">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="card flex flex-col p-6">
            <h2 className="h2">When help is needed.</h2>
            <p className="t-body mt-2 flex-1">
              A handover request requires evidence and verification. It never releases assets immediately.
            </p>
            <button onClick={() => setIntake(true)} className="btn btn-primary mt-5 w-full">
              Start a handover request
            </button>
            <p className="t-meta mt-2.5">Filing tells the account holder. Nothing is transferred.</p>
          </section>
        </div>

        <section className="card mt-5 p-6 md:p-7">
          <h2 className="h2">A careful process. Not a shortcut.</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            {[
              ["01", "Submit evidence", "The handover request enters review."],
              ["02", "Verification & notice", "Owner gets 14 full days to respond."],
              ["03", "Eligible handover", "Only after all safeguards are met."],
            ].map(([n, title, body]) => (
              <div key={n}>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand)]">{n}</p>
                <p className="mt-1.5 text-[13.5px] font-medium text-[var(--color-ink)]">{title}</p>
                <p className="t-small mt-0.5">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {claim?.status === "cancelled" && (
          <div className="card mt-5 p-5">
            <p className="t-small">
              The account holder stopped claim #{claim.id}. Nothing transferred. You can start a new claim if it
              is ever needed.
            </p>
          </div>
        )}
      </>
    );
  }

  /* ---------------------------------------------------------- claim views -- */

  return (
    <>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Trusted Key / Handover request</p>
          <h1 className="h1 mt-2.5">
            {stage === "none"
              ? "Begin with the facts."
              : stage === "review"
                ? "Filed, and being checked."
                : stage === "window"
                  ? "Waiting, on purpose."
                  : "Your part is complete."}
          </h1>
          <p className="t-body mt-2">
            A handover request notifies the account holder and starts a 72-hour registry check. Nothing is transferred by filing it.
          </p>
        </div>
        {stage === "none" && (
          <button onClick={() => setIntake(false)} className="btn btn-secondary self-start">
            Save &amp; exit
          </button>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          {stage === "none" && (
            <section className="card p-6 md:p-7">
              <h2 className="h3">01 Confirm it&apos;s you</h2>
              <div className="mt-4 rounded-[14px] bg-[#f6f8f5] p-4">
                <p className="text-[13.5px] font-medium text-[var(--color-ink)]">{view.ownerName}</p>
                <p className="t-small mt-0.5">
                  You are listed as the Trusted Key · {view.keyholder?.name ?? "Unknown"}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Field label="Access code" htmlFor="kh-code" help="It unlocks this form only.">
                    <input
                      id="kh-code"
                      className="input uppercase tracking-[0.14em]"
                      placeholder="KEY-0000"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => setCode(view.keyholder?.accessCode ?? "")}
                  className="btn btn-secondary mb-[22px] shrink-0"
                >
                  Use my access code
                </button>
              </div>
              <p className="t-meta">
                Your access code: <span className="font-semibold text-[var(--color-forest)]">{view.keyholder?.accessCode}</span>
              </p>

              <h2 className="h3 mt-7">02 Supporting evidence</h2>
              <p className="t-body mt-1.5">
                Verification needs an official record of death. Do not upload real personal documents in this
                concept.
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
                  if (f) void checkFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className={`mt-4 cursor-pointer rounded-[14px] border border-dashed p-7 text-center transition ${
                  drag
                    ? "border-[var(--color-brand)] bg-[var(--color-mint)]"
                    : report
                      ? "border-[#bcd8c4] bg-[#f6faf6]"
                      : "border-[var(--color-line-strong)] bg-[#fafcfa] hover:border-[var(--color-brand)]"
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void checkFile(f);
                  }}
                />
                <p className="text-[13.5px] font-medium text-[var(--color-forest)]">
                  {checking ? "Reading the document…" : file ? file.name : "Attach supporting document"}
                </p>
                <p className="t-meta mt-1">PDF, PNG or JPG · up to 4 MB · checked in memory, never stored</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                <button
                  onClick={() =>
                    void loadSample("/documents/ada-okafor-death-certificate.pdf", "death-certificate.pdf")
                  }
                  className="text-[12px] font-semibold text-[var(--color-brand)] hover:underline"
                >
                  Use a test certificate →
                </button>
                <button
                  onClick={() => void loadSample("/documents/gumroad-payout-receipt.pdf", "gumroad-payout-receipt.pdf")}
                  className="text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                >
                  or try a document that isn&apos;t one (it should be refused)
                </button>
              </div>

              {report && <VerificationPanel report={report} />}

              {error && (
                <p className="mt-4 rounded-[12px] border border-[#f0d5cc] bg-[#fdf3f0] p-3.5 text-[12px] text-[#8c3520]">
                  {error}
                </p>
              )}

              <h2 className="h3 mt-7">03 Confirm your role</h2>
              <label className="mt-3 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--color-line-strong)] accent-[var(--color-brand)]"
                />
                <span className="t-small max-w-[62ch]">
                  I understand that a handover request must be verified, does not give me access to balances, recipients or
                  assets, and cannot release anything before 14 full days.
                </span>
              </label>

              <div className="mt-6 flex flex-col gap-3 border-t border-[var(--color-line)] pt-5 sm:flex-row sm:items-center">
                <button
                  onClick={startClaim}
                  disabled={!report || report.verdict === "rejected" || checking || busy}
                  className="btn btn-primary"
                >
                  {busy ? "Filing…" : "File the handover request"}
                </button>
                <p className="t-meta">No real service is connected.</p>
              </div>
            </section>
          )}

          {stage === "review" && claim && (
            <section className="card overflow-hidden">
              <div className="border-b border-[#f2ddb4] bg-[var(--color-warn)] px-6 py-3.5">
                <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--color-warnink)]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="breathe absolute inline-flex h-full w-full rounded-full bg-[var(--color-ember)]" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-ember)]" />
                  </span>
                  Registry check running · 72 hours
                </p>
              </div>
              <div className="p-6 md:p-7">
                <h2 className="h2">Filed. Nobody has been told yet.</h2>
                <p className="t-body mt-2 max-w-[56ch]">
                  {claim.documentName} passed the automated checks and is now with the registry for a 72-hour
                  review. {view.ownerFirstName} is not notified during this window — the notice only goes out
                  once the record is confirmed.
                </p>

                <div className="mt-6 max-w-sm">
                  <Countdown seconds={view.secondsToReviewEnd ?? 0} onExpire={() => void refresh()} />
                </div>

                <ul className="mt-6 space-y-2.5">
                  {[
                    ["Document read", `${Math.round(claim.confidence * 100)}% automated score`, true],
                    ["Registry check", "Running · up to 72 hours", false],
                    ["Owner notification", "Sends only after the check clears", false],
                  ].map(([title, detail, done]) => (
                    <li key={String(title)} className="flex items-center gap-3">
                      <span
                        className={`grid h-[18px] w-[18px] place-items-center rounded-full text-[9px] ${
                          done
                            ? "bg-[var(--color-mint)] text-[var(--color-forest)]"
                            : "bg-[var(--color-warn)] text-[var(--color-warnink)]"
                        }`}
                      >
                        {done ? "✓" : "•"}
                      </span>
                      <span className="text-[13px] text-[var(--color-ink)]">{String(title)}</span>
                      <span className="t-meta">{String(detail)}</span>
                    </li>
                  ))}
                </ul>

                {safeParseReport(claim.verification) && (
                  <details className="mt-6 rounded-[12px] border border-[var(--color-line)]">
                    <summary className="cursor-pointer list-none px-4 py-3 text-[12px] font-semibold text-[var(--color-brand)]">
                      View the verification transcript
                    </summary>
                    <div className="border-t border-[var(--color-line)] px-4 py-4">
                      <VerificationPanel report={safeParseReport(claim.verification)!} embedded />
                    </div>
                  </details>
                )}

                {error && <p className="field-error mt-4">{error}</p>}

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <button onClick={() => void refresh()} disabled={busy} className="btn btn-secondary flex-1">
                    {busy ? "Checking…" : "Check the status again"}
                  </button>
                </div>
                <p className="t-meta mt-3">
                  The registry check runs for 72 hours and cannot be hurried — not by you, and not by PayHalo. You will see
                  the result here.
                </p>
              </div>
            </section>
          )}

          {stage === "window" && claim && (
            <section className="card overflow-hidden">
              <div className="border-b border-[#f2ddb4] bg-[var(--color-warn)] px-6 py-3.5">
                <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--color-warnink)]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="breathe absolute inline-flex h-full w-full rounded-full bg-[var(--color-ember)]" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-ember)]" />
                  </span>
                  Safety window running
                </p>
              </div>
              <div className="p-6 md:p-7">
                <h2 className="h2">Nothing moves until the clock runs out.</h2>
                <p className="t-body mt-2 max-w-[54ch]">
                  The registry check cleared on {shortDate(claim.verifiedAt)} and {view.ownerFirstName} was
                  notified. They have 14 days to stop this. If they respond, the handover request is void and you will see it
                  here.
                </p>

                <div className="mt-6 max-w-sm">
                  <Countdown seconds={view.secondsToWindowEnd ?? 0} onExpire={() => void refresh()} />
                </div>

                <ul className="mt-6 space-y-2.5">
                  {[
                    ["Document checked", `${Math.round(claim.confidence * 100)}% automated score`, true],
                    ["72-hour registry check", `Cleared ${shortDate(claim.verifiedAt)}`, true],
                    ["Owner notified", `Notice issued ${shortDate(claim.verifiedAt)}`, true],
                    ["Waiting period", "14 full days from verification", false],
                  ].map(([title, detail, done]) => (
                    <li key={String(title)} className="flex items-center gap-3">
                      <span
                        className={`grid h-[18px] w-[18px] place-items-center rounded-full text-[9px] ${
                          done
                            ? "bg-[var(--color-mint)] text-[var(--color-forest)]"
                            : "bg-[var(--color-warn)] text-[var(--color-warnink)]"
                        }`}
                      >
                        {done ? "✓" : "•"}
                      </span>
                      <span className="text-[13px] text-[var(--color-ink)]">{String(title)}</span>
                      <span className="t-meta">{String(detail)}</span>
                    </li>
                  ))}
                </ul>

                {error && <p className="field-error mt-4">{error}</p>}

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <button onClick={() => void refresh()} disabled={busy} className="btn btn-secondary flex-1">
                    {busy ? "Checking…" : "Check the status again"}
                  </button>
                </div>
                <p className="t-meta mt-3">
                  The window runs for 14 full days and nothing can shorten it, including PayHalo. If the account holder
                  responds, this page changes to say so.
                </p>
              </div>
            </section>
          )}

          {stage === "distributed" && claim && (
            <section className="card-forest p-6 md:p-7">
              <p className="label">Handover completed</p>
              <h2 className="h2 mt-2 text-white">Your part is complete.</h2>
              <p className="t-body mt-2 max-w-[58ch] text-[#b7cfbd]">
                The safety window closed with no response on {shortDate(claim.distributedAt)}. PayHalo notified the{" "}
                {view.recipientCount} people named on the plan, each with only their own entitlement.
              </p>
              <p className="body mt-4 border-t border-white/10 pt-4 text-[12px] text-[#8fb098]">
                What was released, and to whom, is not visible to a Trusted Key. That boundary does not change
                after a handover.
              </p>
              <Link href="/beneficiary" className="btn mt-5 bg-white text-[var(--color-forest)] hover:bg-[#f2f7f2]">
                Open the beneficiary view →
              </Link>
            </section>
          )}

          {claim?.status === "cancelled" && (
            <div className="card-mint p-5">
              <p className="text-[13px] font-semibold text-[var(--color-forest)]">
                The account holder stopped claim #{claim.id}.
              </p>
              <p className="t-small mt-1">Nothing transferred. No new claim is in progress.</p>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <section className="card-forest p-6">
            <h2 className="h2 text-white">Care before action.</h2>
            <div className="mt-5 space-y-5">
              {CARE.map((item) => (
                <div key={item.title}>
                  <h3 className="text-[13px] font-semibold text-[var(--color-lime)]">{item.title}</h3>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#a9c4b0]">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="h3">Who you are acting for</h2>
            <p className="mt-2 text-[13px] text-[var(--color-ink)]">{view.ownerName}</p>
            <p className="t-meta mt-0.5">
              Plan {view.planStatus} · sealed {shortDate(view.sealedAt)} · {view.recipientCount} recipients on
              file
            </p>
            <p className="t-small mt-3">
              You cannot see balances, recipients or assets at any stage — including after a handover.
            </p>
          </section>

          {claim && (
            <section className="card p-6">
              <h2 className="h3">Your claim</h2>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between gap-3">
                  <dt className="t-meta">Reference</dt>
                  <dd className="text-[12.5px] font-medium text-[var(--color-ink)]">Claim #{claim.id}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="t-meta">Filed</dt>
                  <dd className="text-[12.5px] text-[var(--color-ink)]">{clockLabel(claim.initiatedAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="t-meta">Status</dt>
                  <dd className="text-[12.5px] text-[var(--color-ink)] capitalize">{claim.status}</dd>
                </div>
              </dl>
            </section>
          )}

          <section className="card p-6">
            <h2 className="h3">Trail</h2>
            <ul className="mt-3 space-y-3">
              {view.trail.slice(0, 5).map((e) => (
                <li key={e.id} className="flex gap-2.5">
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)]/60" />
                  <span>
                    <span className="block text-[12px] text-[var(--color-ink)]">{e.title}</span>
                    <span className="t-meta">{shortDate(e.createdAt)}</span>
                  </span>
                </li>
              ))}
              {!view.trail.length && <li className="t-small">Nothing recorded yet.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}

/* ------------------------------------------------------- verification UI -- */

function VerificationPanel({ report, embedded = false }: { report: CertReport; embedded?: boolean }) {
  const v = VERDICT[report.verdict];
  return (
    <div className={embedded ? "" : "mt-5 rounded-[14px] border border-[var(--color-line)] bg-[#fbfdfb] p-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <Badge tone={v.tone} dot>
          {v.label}
        </Badge>
        <span className="t-meta">
          {report.kind.toUpperCase()} · {(report.sizeBytes / 1024).toFixed(0)} KB · sha256{" "}
          {report.sha256.slice(0, 10)}…
        </span>
      </div>

      <p className="t-small mt-2.5">{report.summary}</p>

      {report.fields.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-[10px] border border-[var(--color-line)] bg-white">
          {report.fields.map((f, i) => (
            <div
              key={f.label}
              className={`flex items-center justify-between gap-4 px-4 py-2.5 ${
                i % 2 ? "bg-[#fbfdfb]" : ""
              }`}
            >
              <span className="t-meta">{f.label}</span>
              <span className="text-right text-[12px] text-[var(--color-ink)]">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      <p className="label mt-4">Checks run on the file</p>
      <div className="mt-2 space-y-1.5">
        {report.checks.map((c) => {
          const ic = CHECK[c.status];
          return (
            <div key={c.id} className="flex items-start gap-3 rounded-[10px] border border-[var(--color-line)] bg-white px-3.5 py-2.5">
              <span className={`mt-[1px] grid h-4 w-4 shrink-0 place-items-center rounded-full text-[8px] ${ic.cls}`}>
                {ic.glyph}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-[var(--color-ink)]">{c.label}</p>
                <p className="t-meta">{c.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {report.kind === "pdf" && report.textChars > 80 && (
        <p className="t-meta mt-3">
          Automated score {report.score}/100 · {report.textChars} characters of text read
          {report.pages ? ` from ${report.pages} page${report.pages === 1 ? "" : "s"}` : ""}
        </p>
      )}

      <p className="mt-3 rounded-[10px] border border-[var(--color-line)] bg-white p-3 text-[11px] leading-relaxed text-[var(--color-muted)]">
        These checks answer one question: does this document look like{" "}
        {report.verdict === "rejected" ? "a death certificate" : "this person's death certificate"}? They are
        not legal proof of death — a passed document still waits for the 72-hour registry review.
      </p>
    </div>
  );
}

function safeParseReport(json: string): CertReport | null {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && "verdict" in parsed ? (parsed as CertReport) : null;
  } catch {
    return null;
  }
}
