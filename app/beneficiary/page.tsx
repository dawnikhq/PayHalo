import { getSnapshot } from "@/lib/store";
import { BeneficiaryPortal } from "@/components/BeneficiaryPortal";

export const dynamic = "force-dynamic";

export default function BeneficiaryPage() {
  const snapshot = getSnapshot();
  return <BeneficiaryPortal snapshot={snapshot} />;
}
