import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { Page } from "@/components/ui";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { UploadDocument } from "@/components/documents/UploadDocument";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const s = await getSnapshot();
  const related = ["My Plan", ...s.assets.map((a) => a.label)];

  return (
    <Page>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Your records</p>
          <h1 className="h1 mt-2.5">Documents</h1>
          <p className="t-body mt-2">Practical guidance, kept alongside your plan.</p>
        </div>
        <UploadDocument related={related} />
      </header>

      <section className="card-mint mb-5 p-6">
        <h2 className="h3 text-[var(--color-forest)]">Guidance belongs here. Secrets do not.</h2>
        <p className="t-body mt-2 text-[#3c5a4e]">
          Never upload passwords, private keys or wallet recovery phrases. Documents are stored as records against your plan, never as credentials.
        </p>
      </section>

      <DocumentsTable documents={s.documents} />

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="card p-6">
          <h2 className="h2">A deliberate handover.</h2>
          <p className="t-body mt-2">
            Documents remain private while you are alive. Relevant instructions are released only to the
            entitled beneficiary after verification and the full 14-day window.
          </p>
          <Link href="/plan" className="mt-4 inline-block text-[12.5px] font-semibold text-[var(--color-brand)]">
            See what is released, and when →
          </Link>
        </div>
        <div className="card-forest p-6">
          <h2 className="h2 text-white">{s.documents.length} sample documents</h2>
          <p className="t-body mt-2 text-[#b7cfbd]">
            Documents stay private while you are alive. Only what you mark for handover is ever released.
          </p>
        </div>
      </div>
    </Page>
  );
}
