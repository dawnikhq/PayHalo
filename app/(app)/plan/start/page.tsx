import { Page } from "@/components/ui";
import { StartPlan } from "@/components/plan/StartPlan";
import { getSnapshot } from "@/lib/store";
import { mailConfigured } from "@/lib/mailer";
import { paypalMode } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export default async function StartPlanPage() {
  const s = await getSnapshot();

  return (
    <Page>
      <header className="mb-6">
        <p className="eyebrow">Start a plan</p>
        <h1 className="h1 mt-2.5">A vault, a key, a person.</h1>
        <p className="t-body mt-2 max-w-[60ch]">
          Starting the plan opens its vault and sends a key to the first person you name. From then on the money has a
          home that nobody — including us — can empty.
        </p>
      </header>

      {!mailConfigured() && (
        <p className="mb-5 rounded-[12px] border border-[var(--color-line)] bg-[#fbfdfb] px-4 py-3 text-[12px] text-[var(--color-muted)]">
          Email delivery is not configured on this deployment, so the key will be shown to you once to pass on by hand.
        </p>
      )}

      <StartPlan ownerName={s.user.name} hasVault={Boolean(s.vault)} />

      <p className="t-meta mt-6">
        Vaults are {paypalMode() === "live" ? "live" : "in sandbox"} mode on this deployment.
      </p>
    </Page>
  );
}
