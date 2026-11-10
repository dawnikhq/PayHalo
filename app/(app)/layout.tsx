import { AppShell } from "@/components/shell/AppShell";
import { getSnapshot } from "@/lib/store";
import { footerNote } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const snapshot = await getSnapshot("owner");
  return (
    <AppShell role="owner" name={snapshot.user.name} note={footerNote()}>
      {children}
    </AppShell>
  );
}
