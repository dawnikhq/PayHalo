import { getSnapshot } from "@/lib/store";
import { Page } from "@/components/ui";
import { HelpContent } from "@/components/help/HelpContent";
import { AppTourButton } from "@/components/tour/AppTour";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const s = await getSnapshot();
  return (
    <Page>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--color-line)] bg-white px-4 py-3">
        <div>
          <p className="text-[13px] font-semibold text-[var(--color-ink)]">Not sure where to start?</p>
          <p className="t-meta">Take the product tour again — it walks through every screen in about a minute.</p>
        </div>
        <AppTourButton />
      </div>
      <HelpContent firstName={s.user.name.split(" ")[0]} />
    </Page>
  );
}
