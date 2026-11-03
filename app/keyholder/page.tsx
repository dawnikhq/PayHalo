import { getSnapshot } from "@/lib/store";
import { KeyholderFlow } from "@/components/KeyholderFlow";

export const dynamic = "force-dynamic";

export default function KeyholderPage() {
  const snapshot = getSnapshot();
  return <KeyholderFlow initial={snapshot} />;
}
