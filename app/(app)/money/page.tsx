import { Page } from "@/components/ui";
import { MoneyClient } from "@/components/money/MoneyClient";
import { getSnapshot } from "@/lib/store";
import { getAppBalances, paypalConfigured, paypalMode } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const { added } = await searchParams;
  const s = await getSnapshot("owner");

  const configured = paypalConfigured();
  let total: string | null = null;
  let error: string | null = null;

  if (configured) {
    try {
      const { balances } = await getAppBalances();
      const primary = balances.find((b) => b.primary) ?? balances[0];
      total = primary ? `${primary.currency} ${primary.total}` : null;
    } catch (e) {
      error = e instanceof Error ? e.message : "PayPal did not answer.";
    }
  }

  return (
    <Page className="pb-28 lg:pb-16">
      <header className="mb-6">
        <p className="eyebrow">Money</p>
        <h1 className="h1 mt-2.5">Send it, set it aside.</h1>
        <p className="t-body mt-2 max-w-[58ch]">
          Money moves through PayPal; VIVO keeps the reason. Every transfer asks what it is for, so the plan is
          never just a balance.
        </p>
      </header>

      <MoneyClient
        stashCents={s.stashCents}
        pots={s.pots}
        moves={s.moves}
        beneficiaries={s.beneficiaries.map((b) => ({ id: b.id, name: b.name }))}
        paypal={{ configured, mode: paypalMode(), total, error }}
        added={added ?? null}
      />
    </Page>
  );
}
