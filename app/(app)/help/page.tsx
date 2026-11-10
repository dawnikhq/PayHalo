import { getSnapshot } from "@/lib/store";
import { Page } from "@/components/ui";
import { HelpContent } from "@/components/help/HelpContent";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const s = await getSnapshot();
  return (
    <Page>
      <HelpContent firstName={s.user.name.split(" ")[0]} />
    </Page>
  );
}
