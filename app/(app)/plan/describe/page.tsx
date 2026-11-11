import Link from "next/link";
import { Page } from "@/components/ui";
import { DescribePlan } from "@/components/plan/DescribePlan";
import { aiConfigured, aiProvider } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default async function DescribePage() {
  return (
    <Page>
      <header className="mb-6">
        <p className="eyebrow">Describe a plan</p>
        <h1 className="h1 mt-2.5">One paragraph is enough.</h1>
        <p className="t-body mt-2 max-w-[60ch]">
          Some people would rather talk than fill a form. Say who matters and what you own, and the draft comes back for
          you to check before a single line is written.
        </p>
        <p className="t-meta mt-2">
          {aiConfigured()
            ? `A model reads the text (${aiProvider()}); your plan is still written by the app's own rules.`
            : "No model key is configured on this deployment, so a deterministic reader does the work and says so."}
        </p>
      </header>

      <DescribePlan modelReady={aiConfigured()} />

      <p className="mt-5 text-[12px] text-[var(--color-muted)]">
        Prefer to type it in yourself?{" "}
        <Link href="/plan/start" className="font-semibold text-[var(--color-brand)]">
          Start a plan step by step
        </Link>
        .
      </p>
    </Page>
  );
}
