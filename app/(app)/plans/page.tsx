import Link from "next/link";
import { redirect } from "next/navigation";
import { listPlans } from "@/lib/store";
import { UnauthorizedError } from "@/lib/scope";
import { Page } from "@/components/ui";
import { PlansManager } from "@/components/plan/PlansManager";

export const dynamic = "force-dynamic";

export const metadata = { title: { absolute: "My arrangements — PayHalo" } };

export default async function PlansPage() {
  const plans = await listPlans().catch((err) => {
    if (err instanceof UnauthorizedError) redirect("/signin");
    throw err;
  });

  return (
    <Page>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">My arrangements</p>
          <h1 className="h1 mt-2.5">One account, as many plans as you need.</h1>
          <p className="t-body mt-2 max-w-[58ch]">
            Keep your family arrangements separate from a business, or split what you own across plans with different
            people and a different Trusted Key. Each one is a complete plan of its own, with one vault of its own —
            and an asset can move between them without being retyped.
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary self-start">
          Back to overview
        </Link>
      </header>

      <PlansManager plans={plans} />
    </Page>
  );
}
