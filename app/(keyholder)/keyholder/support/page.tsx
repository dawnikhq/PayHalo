import { getKeyholderView } from "@/lib/store";
import { Page } from "@/components/ui";
import { HelpContent } from "@/components/help/HelpContent";
import { PortalGate } from "@/components/PortalGate";

export const dynamic = "force-dynamic";

export default async function KeyholderSupportPage() {
  const view = await getKeyholderView();
  if (!view) return <PortalGate audience="keyholder" />;
  return (
    <Page>
      <HelpContent firstName={view.ownerFirstName} role="keyholder" />
    </Page>
  );
}
