import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { allocate } from "@/lib/engine";
import { money, shortDate } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Instruction sheet — Hack1",
};

/**
 * The physical artifact the whole product exists to produce: a plain sheet a
 * family can hold when the time comes. Deliberately light and printable.
 */
export default async function SheetPage() {
  const s = await getSnapshot();
  const allocations = allocate(s.beneficiaries, s.totalCents);

  const primary = s.beneficiaries.find((b) => b.role === "primary");
  const backups = s.beneficiaries.filter((b) => b.role === "backup");
  const charity = s.beneficiaries.find((b) => b.role === "charity");

  const amountFor = (id: number) => allocations.find((a) => a.beneficiaryId === id)?.amountCents ?? 0;
  const shareFor = (id: number) => allocations.find((a) => a.beneficiaryId === id)?.share ?? 0;
  const backupTotal = backups.reduce((sum, b) => sum + b.share, 0) || 1;

  const ref = `HK1-${String(s.plan.id).padStart(4, "0")}-${String(s.user.id).padStart(3, "0")}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 print:max-w-none print:p-0">
      <div className="mb-5 flex items-center justify-between print:hidden">
        <Link href="/dashboard" className="text-[12px] text-muted transition hover:text-ivory">
          ← Back to the dashboard
        </Link>
        <PrintButton />
      </div>

      <article className="paper rounded-[6px] bg-[#f7f2e6] px-8 py-10 text-[#1d1a14] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] md:px-12 md:py-14 print:rounded-none print:px-0 print:shadow-none">
        {/* masthead */}
        <header className="flex items-start justify-between border-b border-[#d8cbb0] pb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#8a7340]">Hack1</p>
            <h1 className="mt-3 font-serif text-[38px] leading-[1.05] tracking-tight">
              Instruction sheet
            </h1>
            <p className="mt-2 text-[12px] text-[#6b6252]">
              The handover plan of <span className="text-[#1d1a14]">{s.user.name}</span>
            </p>
          </div>
          <div className="text-right text-[10.5px] leading-relaxed text-[#6b6252]">
            <p className="mono">Ref {ref}</p>
            <p className="mono">Sealed {shortDate(s.plan.sealedAt)}</p>
            <p className="mono">Total {money(s.totalCents)}</p>
          </div>
        </header>

        <p className="mt-7 max-w-[62ch] text-[13px] leading-[1.75] text-[#3b3529]">
          This sheet records what {s.user.name.split(" ")[0]} decided should happen to their digital
          wealth. Reading it does not give you access to any account, and you will never need one of
          their passwords. It tells you <em>who</em> is entitled to what, <em>in which order</em>, and{" "}
          <em>who is allowed to start the process</em>.
        </p>

        {/* 1 — primary */}
        <section className="mt-9">
          <SectionHeading n="01" title="First choice" />
          {primary ? (
            <PersonRow
              name={primary.name}
              detail={primary.relationship}
              email={primary.email}
              amount={money(amountFor(primary.id))}
              share={`${shareFor(primary.id)}% of the estate`}
              note={primary.note}
            />
          ) : (
            <Empty />
          )}
        </section>

        {/* 2 — backups */}
        <section className="mt-8">
          <SectionHeading n="02" title="If they cannot inherit" />
          {backups.length ? (
            <table className="mt-3 w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[#d8cbb0] text-left text-[9.5px] uppercase tracking-[0.16em] text-[#8a7340]">
                  <th className="py-2 font-normal">Name</th>
                  <th className="py-2 font-normal">Relationship</th>
                  <th className="py-2 text-right font-normal">Share</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} className="border-b border-[#e6dcc5]">
                    <td className="py-2.5">{b.name}</td>
                    <td className="py-2.5 text-[#6b6252]">{b.relationship}</td>
                    <td className="mono py-2.5 text-right">
                      {Math.round((b.share / backupTotal) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty />
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-[#6b6252]">
            The backups only inherit if the first choice cannot be reached. They divide the estate in
            the proportions above.
          </p>
        </section>

        {/* 3 — charity */}
        <section className="mt-8">
          <SectionHeading n="03" title="If nobody can inherit" />
          {charity ? (
            <PersonRow
              name={charity.name}
              detail={charity.relationship}
              email={charity.email}
              amount={money(s.totalCents)}
              share="the entire estate"
              note={charity.note}
            />
          ) : (
            <Empty />
          )}
        </section>

        {/* 4 — keyholder */}
        <section className="mt-8">
          <SectionHeading n="04" title="Who starts the process" />
          {s.keyholder ? (
            <div className="mt-2 rounded-[3px] border border-[#d8cbb0] bg-[#f1e9d6] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[14px]">{s.keyholder.name}</p>
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-[#8a7340]">
                  trusted keyholder
                </p>
              </div>
              <p className="mt-1 text-[11.5px] text-[#6b6252]">
                {s.keyholder.relationship}
                {s.keyholder.email ? ` · ${s.keyholder.email}` : ""}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-[#3b3529]">
                They hold the access code. It is not printed here on purpose. They can file the
                claim, but they cannot see balances, change these instructions, or move anything.
              </p>
            </div>
          ) : (
            <Empty />
          )}
        </section>

        {/* 5 — what happens */}
        <section className="mt-8">
          <SectionHeading n="05" title="What happens, in order" />
          <ol className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-[#3b3529]">
            {[
              "The keyholder submits proof of death through the portal.",
              "The document is verified and the owner is notified immediately.",
              "A 14-day safety window begins. If the owner responds, everything stops and nothing transfers.",
              "If the window closes with no response, the automation engine releases the estate in the order above.",
              "Each recipient is notified, and the full trail is recorded.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mono mt-[1px] text-[10px] text-[#8a7340]">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* assets */}
        <section className="mt-8 break-inside-avoid">
          <SectionHeading n="06" title="What is in the estate" />
          <table className="mt-3 w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#d8cbb0] text-left text-[9.5px] uppercase tracking-[0.16em] text-[#8a7340]">
                <th className="py-2 font-normal">Account</th>
                <th className="py-2 font-normal">Held with</th>
                <th className="py-2 text-right font-normal">Balance</th>
              </tr>
            </thead>
            <tbody>
              {s.assets.map((a) => (
                <tr key={a.id} className="border-b border-[#e6dcc5]">
                  <td className="py-2.5">
                    {a.label}
                    <span className="block text-[10px] text-[#8a8270]">{a.detail}</span>
                  </td>
                  <td className="py-2.5 text-[#6b6252]">{a.provider}</td>
                  <td className="mono py-2.5 text-right">{money(a.balanceCents)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 text-[10px] uppercase tracking-[0.14em] text-[#8a7340]" colSpan={2}>
                  Total
                </td>
                <td className="mono py-2.5 text-right text-[13px]">{money(s.totalCents)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* signature */}
        <div className="mt-10 flex items-end justify-between gap-8 border-t border-[#d8cbb0] pt-6">
          <div>
            <div className="h-8 w-52 border-b border-[#b9a680]" />
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-[#8a7340]">
              {s.user.name}
            </p>
          </div>
          <p className="mono text-[10px] text-[#8a8270]">{shortDate(s.plan.sealedAt)}</p>
        </div>

        <footer className="mt-8 border-t border-[#e6dcc5] pt-4 text-[9.5px] leading-relaxed text-[#8a8270]">
          Hack1 is a hackathon prototype. Accounts, balances and transfers shown are simulated. This
          sheet is not a will, a trust, or legal advice, and it does not override the rules of any
          platform or the inheritance law that applies where you live. In a live system, release
          would follow verified proof of death and the requirements of each institution.
        </footer>
      </article>

      <p className="mt-5 text-center text-[10.5px] text-muted print:hidden">
        Tip: “Save as PDF” in the print dialog gives you a copy to keep.
      </p>
    </main>
  );
}

function SectionHeading({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="mono text-[10px] tracking-[0.2em] text-[#a8874a]">{n}</span>
      <h2 className="font-serif text-[20px] leading-none text-[#1d1a14]">{title}</h2>
      <span className="h-px flex-1 bg-[#e0d5bd]" />
    </div>
  );
}

function PersonRow({
  name,
  detail,
  email,
  amount,
  share,
  note,
}: {
  name: string;
  detail: string;
  email: string;
  amount: string;
  share: string;
  note: string;
}) {
  return (
    <div className="mt-3 rounded-[3px] border border-[#d8cbb0] bg-[#fbf7ee] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[15px]">{name}</p>
          <p className="text-[11px] text-[#6b6252]">
            {detail}
            {email ? ` · ${email}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="mono text-[15px]">{amount}</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#8a7340]">{share}</p>
        </div>
      </div>
      {note && (
        <p className="mt-3 border-l-2 border-[#d8cbb0] pl-3 font-serif text-[14px] italic leading-relaxed text-[#3b3529]">
          “{note}”
        </p>
      )}
    </div>
  );
}

function Empty() {
  return (
    <p className="mt-3 text-[12px] italic text-[#8a8270]">
      No one has been named here yet.
    </p>
  );
}
