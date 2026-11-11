import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { money, pad2 } from "@/lib/format";
import { AssetsExplorer } from "@/components/assets/AssetsExplorer";
import { Page } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const s = await getSnapshot();
  const reviewed = s.assets.filter((a) => a.reviewed).length;
  const pending = s.assets.length - reviewed;

  return (
    <Page>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Your digital estate</p>
          <h1 className="h1 mt-2.5">Assets</h1>
          <p className="t-body mt-2">The accounts, work and value you want to pass on.</p>
        </div>
        <Link href="/assets/new" className="btn btn-primary self-start">
          <span aria-hidden>+</span> Add an asset
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-forest p-6">
          <p className="label">Total sample value</p>
          <p className="t-num mt-2.5 text-[30px] leading-none text-white">{money(s.totalCents)}</p>
          <p className="mt-2 text-[12px] text-[#b7cfbd]">USD equivalent</p>
        </div>
        <div className="card p-6">
          <p className="label">Accounts in your plan</p>
          <p className="t-num mt-2.5 text-[30px] leading-none">{pad2(s.assets.length)}</p>
          <p className="t-small mt-2">
            {s.assets.length ? "All included in your draft" : "Nothing added yet"}
          </p>
        </div>
        <div className="card p-6">
          <p className="label">Access instructions</p>
          <p className="t-num mt-2.5 text-[30px] leading-none">
            {reviewed} of {s.assets.length}
          </p>
          <p className="t-small mt-2">
            {pending === 0
              ? "Every asset has been reviewed"
              : `${s.assets.find((a) => !a.reviewed)?.label ?? "One asset"} needs a review`}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href="/money" className="btn btn-secondary btn-sm">
          Transfer into VIVO
        </Link>
        <p className="t-meta">Move money in first, then say what it is for — it becomes an asset with a purpose.</p>
      </div>

      <div className="mt-5">
        <AssetsExplorer assets={s.assets} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="card-mint p-6">
          <h2 className="h3 text-[var(--color-forest)]">Your assets. Your control.</h2>
          <p className="t-body mt-2 text-[#3c5a4e]">
            Keyholders cannot see your balances or move your assets. Beneficiaries only see their own
            entitlement after a verified handover and the full safety window.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="h3">You record what you hold</h2>
          <p className="t-small mt-2">Balances are the figures you enter, so nothing is claimed on your behalf. Connect PayPal in Settings for a live payout account.</p>
        </div>
      </div>
    </Page>
  );
}
