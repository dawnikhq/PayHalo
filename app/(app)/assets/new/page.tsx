import Link from "next/link";
import { AssetForm } from "@/components/assets/AssetForm";
import { Page } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function NewAssetPage() {
  return (
    <Page>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Assets / New account</p>
          <h1 className="h1 mt-2.5">Add an asset</h1>
          <p className="t-body mt-2">Start with what matters. You can add the rest later.</p>
        </div>
        <Link href="/assets" className="btn btn-secondary self-start">
          Save &amp; exit
        </Link>
      </header>
      <AssetForm />
    </Page>
  );
}
