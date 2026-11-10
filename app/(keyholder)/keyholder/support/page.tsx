import { getKeyholderView } from "@/lib/store";
import { Page } from "@/components/ui";
import { HelpContent } from "@/components/help/HelpContent";

export const dynamic = "force-dynamic";

export default async function KeyholderSupportPage() {
  const view = await getKeyholderView();
  return (
    <Page>
      <HelpContent firstName={view.ownerFirstName} role="keyholder" />
    </Page>
  );
}
