import { Page } from "@/components/ui";
import { AdminGate } from "@/components/admin/AdminGate";
import { ReleaseQueue } from "@/components/admin/ReleaseQueue";
import { MailCheck } from "@/components/admin/MailCheck";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { releaseQueue } from "@/lib/store";
import { mailConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Release desk — PayHalo" };

export default async function AdminPage() {
  const allowed = await isAdmin();
  if (!allowed) {
    return (
      <Page className="pb-16">
        <AdminGate configured={adminConfigured()} />
      </Page>
    );
  }

  const rows = await releaseQueue();

  return (
    <Page className="pb-16">
      <header className="mb-6">
        <p className="eyebrow">Operators</p>
        <h1 className="h1 mt-2.5">Release desk</h1>
        <p className="t-body mt-2 max-w-[64ch]">
          Confirm the death documentation, then decide. Approval is the only route into a vault, and it pays the plan&apos;s
          own beneficiaries — operators cannot name a different recipient or a different amount.
        </p>
      </header>

      <ReleaseQueue
        rows={rows.map((row) => ({
          ownerId: row.ownerId,
          ownerName: row.ownerName,
          ownerEmail: row.ownerEmail,
          vault: row.vault ? { ref: row.vault.ref, status: row.vault.status } : null,
          valueCents: row.valueCents,
          request: {
            id: row.request.id,
            ref: row.request.ref,
            status: row.request.status,
            requesterName: row.request.requesterName,
            requesterEmail: row.request.requesterEmail,
            note: row.request.note,
            createdAt: row.request.createdAt,
            adminNote: row.request.adminNote,
          },
          beneficiaries: row.beneficiaries,
        }))}
      />

      <MailCheck configured={mailConfigured()} />
    </Page>
  );
}
