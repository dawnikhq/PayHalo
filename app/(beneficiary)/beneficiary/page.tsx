import { getBeneficiaryView } from "@/lib/store";
import { BeneficiaryPortal } from "@/components/BeneficiaryPortal";
import { Page } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BeneficiaryPage() {
  // Beneficiary-scoped read: their own entitlement only, and only after release.
  const view = await getBeneficiaryView();
  return (
    <Page>
      <BeneficiaryPortal view={view} />
    </Page>
  );
}
