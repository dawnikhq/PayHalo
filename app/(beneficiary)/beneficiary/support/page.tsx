import { getBeneficiaryView } from "@/lib/store";
import { Page } from "@/components/ui";
import { HelpContent } from "@/components/help/HelpContent";
import { PortalGate } from "@/components/PortalGate";

export const dynamic = "force-dynamic";

export default async function BeneficiarySupportPage() {
  const view = await getBeneficiaryView();
  if (!view) return <PortalGate audience="beneficiary" />;
  return (
    <Page>
      <HelpContent firstName={view.ownerFirstName} role="beneficiary" />
    </Page>
  );
}
