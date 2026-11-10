import { getBeneficiaryView } from "@/lib/store";
import { Page } from "@/components/ui";
import { HelpContent } from "@/components/help/HelpContent";

export const dynamic = "force-dynamic";

export default async function BeneficiarySupportPage() {
  const view = await getBeneficiaryView();
  return (
    <Page>
      <HelpContent firstName={view.ownerFirstName} role="beneficiary" />
    </Page>
  );
}
