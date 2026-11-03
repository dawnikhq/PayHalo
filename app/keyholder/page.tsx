import { getSnapshot } from "@/lib/store";
import { KeyholderFlow } from "@/components/KeyholderFlow";

export const dynamic = "force-dynamic";

export default async function KeyholderPage() {
  const snapshot = await getSnapshot();
  return <KeyholderFlow initial={snapshot} />;
}
