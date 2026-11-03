import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { money, pct, shortDate } from "@/lib/format";
import { SplitBar } from "@/components/SplitBar";
import { StatusPill } from "@/components/StatusPill";
import { Timeline } from "@/components/Timeline";
import { BeneficiaryList } from "@/components/BeneficiaryList";
import { SafetyWindowBanner } from "@/components/SafetyWindowBanner";
import { CopyButton } from "@/components/CopyButton";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

const ICON: Record<string, string> = { paypal: "P", crypto: "₿", business: "◫" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sealed?: string }>;
}) {
  const { sealed } = await searchParams;
  const s = await getSnapshot();
  const firstName = s.user.name.split(" ")[0];
  const claimed = Boolean(sealed);

  const claim = s.claim;
  const isWindow = claim?.status === "window";
  const isDistributed = claim?.status === "distributed";
  const locked = Boolean(claim && claim.status !== "cancelled" && claim.status !== "distributed");

  return (
    <main className="shell py-10 md:py-14">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">
            <span className="h-px w-8 bg-brass/60" />
            Owner dashboard
          </p>
          <h1 className="display mt-3 text-[clamp(2rem,4vw,3rem)]">
            {firstName}&apos;s plan<span className="text-brass">.</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusPill status={claim && claim.status !== "cancelled" ? claim.status : s.plan.status} />
            <span className="text-[11.5px] text-muted">
              sealed {shortDate(s.plan.sealedAt)} · updated {shortDate(s.plan.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/onboarding" className="btn btn-ghost !py-2.5 !text-[12.5px]">
            Build a new plan
          </Link>
          <Link href="/keyholder" className="btn btn-brass !py-2.5 !text-[12.5px]">
            Keyholder portal
          </Link>
        </div>
      </div>

      {claimed && (
        <div className="rise mt-6 rounded-2xl border border-sage/25 bg-sage/[0.07] px-5 py-4">
          <p className="text-[13px] text-ivory">
            <span className="mr-2 text-sage">✓</span>
            Your plan is sealed. {s.beneficiaries.length} recipients are on file and your keyholder
            can start a handover whenever it&apos;s needed.
          </p>
        </div>
      )}

      {isWindow && claim && (
        <div className="mt-6">
          <SafetyWindowBanner
            seconds={s.secondsToWindowEnd ?? 0}
            claimId={claim.id}
            initiatedAt={claim.initiatedAt}
          />
        </div>
      )}

      {isDistributed && claim && (
        <div className="rise mt-6 rounded-2xl border border-brass/30 bg-brass/[0.07] px-5 py-4">
          <p className="text-[10.5px] uppercase tracking-[0.2em] text-brass">Handover complete</p>
          <p className="mt-1.5 text-[13px] text-ivory">
            The safety window closed with no response. {money(s.totalCents)} was allocated across{" "}
            {s.distributions.length} recipient{s.distributions.length === 1 ? "" : "s"} on{" "}
            {shortDate(claim.distributedAt)}.
          </p>
          <Link href="/beneficiary" className="mt-2 inline-block text-[12px] text-brass hover:underline">
            See the beneficiary view →
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* ------------------------------------------------------ left rail */}
        <div className="space-y-5">
          {/* estate */}
          <section className="card p-6 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="label">Estate in your plan</p>
                <p className="mono text-[38px] leading-none tracking-tight">{money(s.totalCents)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10.5px] uppercase tracking-[0.16em] text-muted">Accounts</p>
                <p className="mono mt-1 text-[15px] text-ivory">{s.assets.length}</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {s.assets.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3.5 rounded-xl border border-white/6 bg-white/[0.015] px-3.5 py-3"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/30 font-serif text-[13px] text-brass">
                    {ICON[a.kind] ?? "•"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-ivory">{a.label}</p>
                    <p className="truncate text-[10.5px] text-muted/80">{a.detail}</p>
                  </div>
                  <p className="mono shrink-0 text-[12.5px] text-ivory">{money(a.balanceCents)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="label !mb-0">How it divides</p>
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted/70">
                  live preview
                </p>
              </div>
              <SplitBar beneficiaries={s.beneficiaries} totalCents={s.totalCents} />
            </div>
          </section>

          {/* instructions */}
          <section className="card p-6 md:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-[22px] leading-tight">The handover list</h2>
                <p className="mt-1 text-[11.5px] text-muted">
                  Order matters. The engine reads top to bottom.
                </p>
              </div>
              <span className="pill border-sage/25 bg-sage/8 text-[9px] text-sage">
                {pct(s.beneficiaries.find((b) => b.role === "primary")?.share ?? 100)} first choice
              </span>
            </div>

            <BeneficiaryList
              beneficiaries={s.beneficiaries}
              totalCents={s.totalCents}
              locked={locked}
            />

            <p className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-muted/90">
              Toggle <span className="text-ivory">reachable</span> to simulate a beneficiary who
              can&apos;t inherit — the engine falls through to the next instruction instantly.
            </p>
          </section>

          {/* engine */}
          <section className="card p-6 md:p-7">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-serif text-[22px] leading-tight">Automation engine</h2>
                <p className="mt-1 text-[11.5px] text-muted">
                  The rule your plan runs on, verbatim.
                </p>
              </div>
              <span className="pill border-brass/25 bg-brass/8 text-[9px] text-brass">rule v1</span>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-white/8 bg-black/40">
              <div className="flex items-center gap-1.5 border-b border-white/6 px-3.5 py-2.5">
                <span className="h-2 w-2 rounded-full bg-ember/50" />
                <span className="h-2 w-2 rounded-full bg-brass/50" />
                <span className="h-2 w-2 rounded-full bg-sage/50" />
                <span className="ml-2 text-[10px] uppercase tracking-[0.16em] text-muted/60">
                  inheritance.rules
                </span>
              </div>
              <pre className="overflow-x-auto px-4 py-4 text-[11px] leading-[1.9] text-muted">
                <code>
                  <span className="text-muted/50">on</span> claim.verified &amp; window.elapsed:{"\n"}
                  {"  "}<span className="text-sage">if</span> primary.reachable:{"\n"}
                  {"    "}release <span className="text-brass">100%</span> → primary{"\n"}
                  {"  "}<span className="text-sage">else if</span> any(backups).reachable:{"\n"}
                  {"    "}split estate by backup weights{"\n"}
                  {"  "}<span className="text-sage">else</span>:{"\n"}
                  {"    "}release <span className="text-brass">100%</span> → final cause{"\n"}
                  {"  "}audit.append(every step)
                </code>
              </pre>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {s.beneficiaries.map((b) => (
                <span
                  key={b.id}
                  className={`pill !text-[9px] ${
                    b.available
                      ? "border-white/10 bg-white/5 text-muted"
                      : "border-ember/25 bg-ember/8 text-ember/80"
                  }`}
                >
                  {b.name.split(" ")[0]} · {b.available ? "reachable" : "unreachable"}
                </span>
              ))}
            </div>
          </section>
        </div>

        {/* ----------------------------------------------------- right rail */}
        <div className="space-y-5">
          {/* keyholder */}
          <section className="card p-6">
            <p className="label">Trusted keyholder</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={s.keyholder?.name ?? "—"} size={44} tone="sage" />
              <div className="min-w-0">
                <p className="truncate text-[14px] text-ivory">{s.keyholder?.name}</p>
                <p className="text-[11.5px] text-muted">{s.keyholder?.relationship}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/8 bg-black/25 px-3.5 py-2.5">
              <div>
                <p className="text-[9.5px] uppercase tracking-[0.16em] text-muted/70">Access code</p>
                <p className="mono mt-0.5 text-[13px] tracking-[0.12em] text-brass">
                  {s.keyholder?.accessCode}
                </p>
              </div>
              <CopyButton value={s.keyholder?.accessCode ?? ""} />
            </div>

            <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
              {s.keyholder?.name?.split(" ")[0]} can begin a handover. They cannot see balances,
              edit recipients, or move anything while you&apos;re alive.
            </p>
            <Link href="/keyholder" className="btn btn-ghost mt-4 w-full !py-2 !text-[12px]">
              Open the claim form
            </Link>
          </section>

          {/* status */}
          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-[20px] leading-tight">Handover trail</h2>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted/60">
                {s.events.length} events
              </span>
            </div>
            <Timeline events={s.events} />
          </section>

          {/* window explainer */}
          <section className="card overflow-hidden p-0">
            <div className="border-b border-white/6 bg-white/[0.02] px-6 py-4">
              <p className="text-[10.5px] uppercase tracking-[0.18em] text-brass/80">
                The safety window
              </p>
            </div>
            <div className="p-6">
              <p className="font-serif text-[21px] leading-snug">
                Fourteen days between a claim and any transfer.
              </p>
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                Every handover starts with a notice to you. If you respond, it stops. If you
                don&apos;t, the instructions run exactly as written.
              </p>
              <div className="mt-5 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.12em] text-muted/70">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-brass/30 text-[9px] text-brass">1</span>
                claim
                <span className="h-px flex-1 bg-white/10" />
                <span className="grid h-5 w-5 place-items-center rounded-full border border-brass/30 text-[9px] text-brass">14</span>
                days
                <span className="h-px flex-1 bg-white/10" />
                <span className="grid h-5 w-5 place-items-center rounded-full border border-sage/30 text-[9px] text-sage">✓</span>
                release
              </div>
            </div>
          </section>

          {isDistributed && (
            <section className="card p-6">
              <p className="label">Release ledger</p>
              <ul className="mt-3 space-y-2.5">
                {s.distributions.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-[12.5px] text-ivory">{d.name}</span>
                    <span className="mono shrink-0 text-[12px] text-brass">{money(d.amountCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
