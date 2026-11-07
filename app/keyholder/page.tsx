import { getSnapshot } from "@/lib/store";
import { KeyholderFlow } from "@/components/KeyholderFlow";

export const dynamic = "force-dynamic";

export default async function KeyholderPage() {
  // Keyholders see the internal audit trail, including the 72-hour check.
  const snapshot = await getSnapshot("keyholder");
  return <KeyholderFlow initial={snapshot} />;
}
