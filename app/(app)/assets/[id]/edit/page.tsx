import { notFound } from "next/navigation";
import { getSnapshot } from "@/lib/store";
import { AssetForm } from "@/components/assets/AssetForm";
import { DeleteAsset } from "@/components/assets/DeleteAsset";
import { Page } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSnapshot();
  const asset = s.assets.find((a) => a.id === Number(id));
  if (!asset) notFound();

  return (
    <Page>
      <header className="mb-7">
        <p className="eyebrow">Assets / Edit</p>
        <h1 className="h1 mt-2.5">{asset.label}</h1>
        <p className="t-body mt-2">Change the record, not the relationship. Anything you save is dated.</p>
      </header>
      <AssetForm asset={asset} />
      <div className="mt-8 max-w-[720px]">
        <DeleteAsset id={asset.id} label={asset.label} />
      </div>
    </Page>
  );
}
