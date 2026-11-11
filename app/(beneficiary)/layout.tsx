import { AppShell } from "@/components/shell/AppShell";
import { getBeneficiaryView } from "@/lib/store";
import { currentUser } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function BeneficiaryLayout({ children }: { children: React.ReactNode }) {
  // Only this beneficiary's own view reaches this layout.
  const view = await getBeneficiaryView();
  const user = view ? null : await currentUser();
  return (
    <AppShell role="beneficiary" name={view?.person.name ?? user?.name ?? "Beneficiary"}>
      {children}
    </AppShell>
  );
}
