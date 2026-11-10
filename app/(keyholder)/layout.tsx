import { AppShell } from "@/components/shell/AppShell";
import { getKeyholderView } from "@/lib/store";
import { footerNote } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export default async function KeyholderLayout({ children }: { children: React.ReactNode }) {
  // Only the redacted keyholder view reaches this layout.
  const view = await getKeyholderView();
  return (
    <AppShell role="keyholder" name={view?.keyholder?.name ?? "Keyholder"} note={footerNote()}>
      {children}
    </AppShell>
  );
}
