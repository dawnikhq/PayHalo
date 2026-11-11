import Link from "next/link";
import { notFound } from "next/navigation";
import { getSnapshot } from "@/lib/store";
import { money, pct, stampLabel } from "@/lib/format";
import { KIND_LABEL } from "@/components/assets/AssetsExplorer";
import { Page } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSnapshot();
  const asset = s.assets.find((a) => a.id === Number(id));
  if (!asset) notFound();

  const share = s.totalCents ? pct((asset.balanceCents / s.totalCents) * 100) : "0%";
  const primary = s.beneficiaries.find((b) => b.role === "primary");
  const backups = s.beneficiaries.filter((b) => b.role === "backup");
  const docs = s.documents.filter((d) => d.relatedTo === asset.label);

  const metrics: { label: string; value: string }[] = [];
  if (asset.kind === "business") {
    if (asset.monthlyCents) metrics.push({ label: "Monthly revenue", value: money(asset.monthlyCents, false) });
    if (asset.customers) metrics.push({ label: "Customers", value: String(asset.customers) });
  } else if (asset.kind === "crypto") {
    metrics.push({ label: "Holdings", value: asset.detail || "—" });
    metrics.push({ label: "Custody", value: "Self-custody" });
  } else {
    metrics.push({ label: "Account type", value: asset.provider });
    if (asset.detail) metrics.push({ label: "Activity", value: asset.detail });
  }

  return (
    <Page>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="eyebrow">
            <Link href="/assets" className="hover:underline">
              Assets
            </Link>{" "}
            / {KIND_LABEL[asset.kind]}
          </nav>
          <h1 className="h1 mt-2.5">{asset.label}</h1>
          <p className="t-body mt-2">
            {asset.kind === "business"
              ? "A business you built. A future you can plan for."
              : asset.kind === "crypto"
                ? "A self-custody position. Instructions, never secrets."
                : "A payment account, with a clear recovery route."}
          </p>
        </div>
        <Link href={`/assets/${asset.id}/edit`} className="btn btn-secondary self-start">
          Edit asset
        </Link>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section className="card-forest p-6 md:p-7">
          <p className="label">
            {KIND_LABEL[asset.kind]} / {asset.provider}
          </p>
          <p className="t-num mt-2.5 text-[clamp(2rem,4vw,2.7rem)] leading-none text-white">
            {money(asset.balanceCents)}
          </p>
          <p className="mt-2 text-[12.5px] text-[#b7cfbd]">
            Recorded value · {share} of your digital estate
          </p>

          {metrics.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/12 pt-5">
              {metrics.map((m) => (
                <div key={m.label}>
                  <p className="t-num text-[20px] leading-none text-[var(--color-lime)]">{m.value}</p>
                  <p className="mt-1.5 text-[11.5px] text-[#a9c4b0]">{m.label}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-6">
          <span className={`pill ${asset.reviewed ? "badge-mint" : "badge-neutral"}`}>
            {asset.reviewed ? "Included in draft" : "Needs a review"}
          </span>
          <h2 className="h2 mt-4">
            {primary ? `Planned for ${primary.name.split(" ")[0]}.` : "No primary beneficiary yet."}
          </h2>
          <p className="t-body mt-2">
            {primary
              ? `${pct(primary.share)} to your primary beneficiary. Family backups and your final cause apply only if needed.`
              : "Add a primary beneficiary so this asset has somewhere to go."}
          </p>
          <p className="t-small mt-3">
            {backups.length
              ? `Backups: ${backups.map((b) => `${b.name.split(" ")[0]} ${pct(b.share)}`).join(" · ")}.`
              : "No family backups named yet."}
          </p>
          <Link href="/beneficiaries" className="mt-4 inline-block text-[12.5px] font-semibold text-[var(--color-brand)]">
            View allocation rules →
          </Link>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section className="card p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <h2 className="h2">Handover instructions</h2>
            <Link href={`/assets/${asset.id}/edit`} className="text-[12.5px] font-semibold text-[var(--color-brand)]">
              Edit →
            </Link>
          </div>

          <dl className="mt-5 space-y-5">
            <div>
              <dt className="label">{asset.kind === "business" ? "Business URL" : asset.kind === "crypto" ? "Wallet label" : "Account URL"}</dt>
              <dd className="mt-1.5 text-[13.5px] text-[var(--color-ink)]">{asset.url || "Not set"}</dd>
            </div>
            <div>
              <dt className="label">What to pass on</dt>
              <dd className="mt-1.5 text-[13.5px] text-[var(--color-ink)]">
                {asset.handoverNote || "No instructions written yet."}
              </dd>
            </div>
            <div>
              <dt className="label">Access note</dt>
              <dd className="mt-1.5 text-[13.5px] text-[var(--color-ink)]">
                {asset.accessNote || "No access note written yet."}
              </dd>
            </div>
          </dl>

          <p className="t-meta mt-5 border-t border-[var(--color-line)] pt-4">
            Guidance only. PayHalo never asks for a password, private key or recovery phrase.
          </p>
        </section>

        <section className="card p-6">
          <h2 className="h2">Supporting documents</h2>
          {docs.length ? (
            <ul className="mt-4 divide-y divide-[var(--color-line)]">
              {docs.map((d) => (
                <li key={d.id} className="py-3 first:pt-0">
                  <p className="text-[13.5px] font-medium text-[var(--color-ink)]">{d.name}</p>
                  <p className="t-meta mt-0.5">
                    {d.kind} · {(d.sizeKb / 1024).toFixed(1)} MB · Document
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-body mt-3">No guidance attached to this asset yet.</p>
          )}
          <div className="mt-4 border-t border-[var(--color-line)] pt-3">
            <p className="label">Last updated</p>
            <p className="mt-1 text-[13px] text-[var(--color-ink)]">{stampLabel(asset.reviewed ? s.plan.updatedAt : null)}</p>
          </div>
          <Link href="/documents" className="mt-3 inline-block text-[12.5px] font-semibold text-[var(--color-brand)]">
            Open documents →
          </Link>
          <p className="t-meta mt-4">Only you can edit this asset.</p>
        </section>
      </div>

      <section className="card-mint mt-5 p-6">
        <h2 className="h3 text-[var(--color-forest)]">14 days. Always time to respond.</h2>
        <p className="t-body mt-1.5 text-[#3c5a4e]">
          A verified claim notifies the account holder. Nothing is released before 14 full days. An owner
          response stops the handover.
        </p>
      </section>
    </Page>
  );
}
