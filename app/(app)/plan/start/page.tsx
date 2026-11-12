import Link from "next/link";
import { Page } from "@/components/ui";
import { StartPlan } from "@/components/plan/StartPlan";
import { SealedNotice } from "@/components/plan/SealedNotice";
import { getSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function StartPlanPage() {
  const s = await getSnapshot();

  return (
    <Page>
      <header className="mb-6">
        <p className="eyebrow">Your plan</p>
        <h1 className="h1 mt-2.5">Six steps, in your own time.</h1>
        <p className="t-body mt-2 max-w-[60ch]">
          Who comes first, what you own, who comes after, a cause, someone you trust — then you read it back. The vault
          opens at the end, when it is all in place.
        </p>
        <p className="t-meta mt-3">
          Rather say it in a sentence?{" "}
          <Link href="/plan/describe" className="font-semibold text-[var(--color-brand)]">
            Describe your plan
          </Link>
        </p>
      </header>

      <SealedNotice sealedAt={s.plan.sealedAt} what="the steps below" />

      <StartPlan
        steps={s.steps}
        ownerName={s.user.name}
        vaultOpen={Boolean(s.vault)}
        people={s.beneficiaries.map((b) => ({
          name: b.name,
          role: b.role,
          share: b.share,
          relationship: b.relationship,
        }))}
        assetCount={s.assets.length}
        totalCents={s.totalCents}
        keyholderName={s.keyholder?.name ?? null}
      />
    </Page>
  );
}
