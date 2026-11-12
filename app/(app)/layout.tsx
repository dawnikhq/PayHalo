import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getSnapshot, listPlans } from "@/lib/store";
import { ownerSession } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await ownerSession();
  if (!user) redirect("/signin");

  const snapshot = await getSnapshot("owner");
  const plans = await listPlans();

  // a brand-new account: nothing recorded, nobody named, nothing sealed
  const fresh =
    snapshot.steps.every((step) => !step.done) &&
    snapshot.assets.length === 0 &&
    snapshot.beneficiaries.length === 0 &&
    !snapshot.keyholder;

  return (
    <AppShell role="owner" name={snapshot.user.name} plans={plans} fresh={fresh}>
      {children}
    </AppShell>
  );
}
