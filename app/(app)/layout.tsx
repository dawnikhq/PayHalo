import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getSnapshot } from "@/lib/store";
import { ownerSession } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await ownerSession();
  if (!user) redirect("/signin");

  const snapshot = await getSnapshot("owner");
  return (
    <AppShell role="owner" name={snapshot.user.name}>
      {children}
    </AppShell>
  );
}
