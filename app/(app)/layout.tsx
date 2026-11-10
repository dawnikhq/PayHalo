import { AppShell } from "@/components/shell/AppShell";
import { getSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const snapshot = await getSnapshot("owner");
  return (
    <AppShell role="owner" name={snapshot.user.name}>
      {children}
    </AppShell>
  );
}
