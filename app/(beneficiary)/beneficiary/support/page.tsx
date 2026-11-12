import { getBeneficiaryView } from "@/lib/store";
import { Page } from "@/components/ui";
import { HelpContent } from "@/components/help/HelpContent";
import { PortalGate } from "@/components/PortalGate";
import { currentUser } from "@/lib/auth";
import { ticketsFor } from "@/lib/support";

export const dynamic = "force-dynamic";

export default async function BeneficiarySupportPage() {
  const view = await getBeneficiaryView();
  if (!view) return <PortalGate audience="beneficiary" />;
  const user = await currentUser();
  const tickets = await ticketsFor({ userId: user?.id ?? null, email: user?.email ?? "" }).catch(() => []);
  return (
    <Page>
      <HelpContent
        firstName={view.ownerFirstName}
        role="beneficiary"
        name={user?.name ?? ""}
        email={user?.email ?? ""}
        tickets={tickets}
      />
    </Page>
  );
}
