import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { clockLabel, shortDate } from "@/lib/format";
import { Page } from "@/components/ui";
import { StatusPill } from "@/components/StatusPill";
import { ActivityFeed } from "@/components/activity/ActivityFeed";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const s = await getSnapshot();
  const claim = s.claim;
  const announced = claim && (claim.status === "window" || claim.status === "distributed");

  return (
    <Page>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">A clear record</p>
          <h1 className="h1 mt-2.5">Activity &amp; notifications</h1>
          <p className="t-body mt-2">Know what changed, and what needs your attention.</p>
        </div>
        <span className="btn btn-secondary btn-sm self-start" aria-hidden>
          {s.events.length} events
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <ActivityFeed events={s.events} />

        <aside className="space-y-5">
          <section className="card p-6">
            <h2 className="h2">You&apos;re up to date.</h2>
            <div className="mt-3">
              <StatusPill status={announced && claim ? claim.status : s.plan.status} />
            </div>
            <p className="t-body mt-3">
              {announced && claim?.status === "window"
                ? `A verified handover request is inside its safety window. The earliest anything could move is ${shortDate(claim.windowEndsAt)}.`
                : announced && claim?.status === "distributed"
                  ? `The handover completed on ${shortDate(claim.distributedAt)}. Each recipient sees only their own entitlement.`
                  : "No safety-window action is required in this account state."}
            </p>
            <p className="t-small mt-3">
              If a handover request is verified, a prominent notice will appear here and in your dashboard.
            </p>
          </section>

          <section className="card-forest p-6">
            <h2 className="h2 text-white">Important by design.</h2>
            <h3 className="h3 mt-5 text-[var(--color-lime)]">You will be notified first.</h3>
            <p className="t-body mt-2 text-[#b7cfbd]">
              A verified handover request starts a 14-day safety window. Respond during that window to stop the handover.
            </p>
            {announced && claim && (
              <p className="mt-4 text-[11.5px] text-[#8fb098]">Notice issued {clockLabel(claim.verifiedAt)}.</p>
            )}
            <p className="mt-6 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-[#8fb098]">
              This concept does not send real emails, messages or safety notices.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="h3">Need a person?</h2>
            <p className="t-small mt-1.5">Support can walk through any notice with you.</p>
            <Link href="/help" className="btn btn-secondary btn-sm mt-3 w-full">
              Get support
            </Link>
          </section>
        </aside>
      </div>
    </Page>
  );
}
