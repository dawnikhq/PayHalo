import { AppShell } from "@/components/shell/AppShell";
import { getBeneficiaryView } from "@/lib/store";
import { footerNote } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export default async function BeneficiaryLayout({ children }: { children: React.ReactNode }) {
  // Only this beneficiary's own view reaches this layout.
  const view = await getBeneficiaryView();
  return (
    <AppShell role="beneficiary" name={view?.person.name ?? "Beneficiary"} note={footerNote()}>
      {children}
    </AppShell>
  );
}
