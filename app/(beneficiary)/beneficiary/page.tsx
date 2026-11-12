import { getBeneficiaryView, plansForBeneficiary } from "@/lib/store";
import { currentUser } from "@/lib/scope";
import { BeneficiaryPortal } from "@/components/BeneficiaryPortal";
import { MyInheritance } from "@/components/beneficiary/MyInheritance";
import { Page } from "@/components/ui";
import { PortalGate } from "@/components/PortalGate";

export const dynamic = "force-dynamic";

export default async function BeneficiaryPage() {
  // Beneficiary-scoped read: their own entitlement only, and only after release.
  const view = await getBeneficiaryView();
  if (!view) {
    /* No share link: if somebody is signed in, show them the plans that name
       them. That is the beneficiary tab for an account, not a link. */
    const user = await currentUser();
    if (!user) return <PortalGate audience="beneficiary" />;

    const plans = await plansForBeneficiary(user.email);
    return (
      <Page>
        <MyInheritance
          plans={plans.map((p) => ({
            ownerId: p.ownerId,
            ownerName: p.ownerName,
            vault: p.vault ? { ref: p.vault.ref, status: p.vault.status, keySentAt: p.vault.keySentAt } : null,
            role: p.role,
            share: p.share,
            valueCents: p.valueCents,
            assets: p.assets.map((a) => ({ label: a.label, kind: String(a.kind) })),
            request: p.request
              ? { ref: p.request.ref, status: p.request.status, createdAt: p.request.createdAt }
              : null,
          }))}
        />
      </Page>
    );
  }
  return (
    <Page>
      <BeneficiaryPortal view={view} />
    </Page>
  );
}
