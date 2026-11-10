import { getKeyholderView } from "@/lib/store";
import { KeyholderFlow } from "@/components/KeyholderFlow";
import { Page } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function KeyholderPage() {
  // Keyholder-scoped read: no balances, assets, recipient names or shares.
  const view = await getKeyholderView();
  return (
    <Page>
      <KeyholderFlow initial={view} />
    </Page>
  );
}
