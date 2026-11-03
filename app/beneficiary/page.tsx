import { getSnapshot } from "@/lib/store";
import { BeneficiaryPortal } from "@/components/BeneficiaryPortal";

export const dynamic = "force-dynamic";

export default async function BeneficiaryPage() {
  const snapshot = await getSnapshot();
  return <BeneficiaryPortal snapshot={snapshot} />;
}
