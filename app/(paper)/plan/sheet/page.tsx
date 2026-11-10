import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { allocate } from "@/lib/engine";
import { money, shortDate } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Instruction sheet — VIVO",
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

  const ref = `VIVO-${String(s.plan.id).padStart(4, "0")}-${String(s.user.id).padStart(3, "0")}`;

  return (
    <main className="mx-auto max-w-[816px] px-4 py-8 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/dashboard" className="text-[12px] font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          ← Back to the dashboard
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-[6px] border border-[var(--color-line)] bg-white px-8 py-10 text-[var(--color-ink)] shadow-[0_20px_60px_-45px_rgba(23,45,41,0.6)] md:px-12 md:py-12 print:rounded-none print:border-0 print:px-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-line)] pb-6">
          <div>
            <p className="font-[var(--font-display)] text-[20px] font-extrabold tracking-[-0.05em] text-[var(--color-brand)]">
              vivo
            </p>
            <h1 className="mt-3 font-[var(--font-display)] text-[30px] font-medium leading-none tracking-[-0.02em]">
              Instruction sheet
            </h1>
            <p className="t-small mt-2">
              A record of the plan of <span className="font-medium text-[var(--color-ink)]">{s.user.name}</span>
            </p>
          </div>
          <div className="text-right text-[11px] leading-relaxed text-[var(--color-muted)]">
            <p>Ref {ref}</p>
            <p>Sealed {shortDate(s.plan.sealedAt)}</p>
            <p>Sample total {money(s.totalCents)}</p>
          </div>
        </header>

        <p className="mt-6 max-w-[64ch] text-[13px] leading-[1.75] text-[#3a4c45]">
          This sheet records what {s.user.name.split(" ")[0]} decided should happen to their digital wealth.
          Reading it gives you no access to any account, and you will never need one of their passwords. It
          tells you <em>who</em> is entitled to what, <em>in which order</em>, and <em>who may start the
          process</em>.
        </p>

        <section className="mt-8">
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
            <p className="t-small mt-2">No first choice is recorded.</p>
          )}
        </section>

        <section className="mt-8">
          <SectionHeading n="02" title="If they cannot inherit" />
          {backups.length ? (
            <table className="mt-3 w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--color-line)]">
                  <th className="label py-2">Name</th>
                  <th className="label py-2">Relationship</th>
                  <th className="label py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--color-line)]">
                    <td className="py-2.5 text-[12.5px]">{b.name}</td>
                    <td className="py-2.5 text-[12.5px] text-[var(--color-muted)]">{b.relationship}</td>
                    <td className="py-2.5 text-right text-[12.5px] tabular-nums">
                      {Math.round((b.share / backupTotal) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="t-small mt-2">No family backups are recorded.</p>
          )}
          <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
            The backups inherit only if the first choice cannot be reached. They divide the estate in the
            proportions above.
          </p>
        </section>

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
            <p className="t-small mt-2">No final cause is recorded.</p>
          )}
        </section>

        <section className="mt-8">
          <SectionHeading n="04" title="Who may start the process" />
          {s.keyholder ? (
            <div className="mt-2 rounded-[4px] border border-[#d9e4d9] bg-[#f4f9f4] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[14px]">{s.keyholder.name}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand)]">
                  trusted keyholder
                </p>
              </div>
              <p className="mt-1 text-[11.5px] text-[var(--color-muted)]">
                {s.keyholder.relationship}
                {s.keyholder.email ? ` · ${s.keyholder.email}` : ""}
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[#3a4c45]">
                They hold the access code, which is deliberately not printed here. They can file the claim,
                but cannot see balances, change these instructions, or move anything.
              </p>
            </div>
          ) : (
            <p className="t-small mt-2">No keyholder is recorded.</p>
          )}
        </section>

        <section className="mt-8">
          <SectionHeading n="05" title="What happens, in order" />
          <ol className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-[#3a4c45]">
            {[
              "The keyholder submits proof of death through the portal.",
              "The certificate is verified: format, text, name and registry details.",
              "The record then spends 72 hours in registry review.",
              "Only when that review clears is the account holder notified — never before.",
              "A 14-day safety window begins. If the account holder responds, everything stops.",
              "If the window closes with no response, the estate is released in the order above.",
              "Each recipient is notified, and each sees only their own entitlement.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-4 shrink-0 text-[10px] font-semibold text-[var(--color-brand)]">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 break-inside-avoid">
          <SectionHeading n="06" title="What is in the estate" />
          <table className="mt-3 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-line)]">
                <th className="label py-2">Account</th>
                <th className="label py-2">Held with</th>
                <th className="label py-2 text-right">Sample balance</th>
              </tr>
            </thead>
            <tbody>
              {s.assets.map((a) => (
                <tr key={a.id} className="border-b border-[var(--color-line)]">
                  <td className="py-2.5 text-[12.5px]">
                    {a.label}
                    <span className="block text-[10.5px] text-[var(--color-muted)]">{a.detail}</span>
                  </td>
                  <td className="py-2.5 text-[12.5px] text-[var(--color-muted)]">{a.provider}</td>
                  <td className="py-2.5 text-right text-[12.5px] tabular-nums">{money(a.balanceCents)}</td>
                </tr>
              ))}
              <tr>
                <td className="label py-2.5" colSpan={2}>
                  Total
                </td>
                <td className="py-2.5 text-right text-[13px] font-semibold tabular-nums">{money(s.totalCents)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <div className="mt-10 flex items-end justify-between gap-8 border-t border-[var(--color-line)] pt-6">
          <div>
            <div className="h-8 w-52 border-b border-[#c9d5ca]" />
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand)]">
              {s.user.name}
            </p>
          </div>
          <p className="text-[10.5px] text-[var(--color-muted)]">{shortDate(s.plan.sealedAt)}</p>
        </div>

        <p className="mt-6 border-t border-[var(--color-line)] pt-4 text-[10px] leading-relaxed text-[var(--color-muted)]">
          Simulation only · This document is a design artifact, not a legal instrument. No live connections,
          notices, claims or transfers. VIVO never asks for passwords, private keys or recovery phrases.
        </p>
      </article>

      <p className="mt-4 text-center text-[11px] text-[var(--color-muted)] print:hidden">
        VIVO / Your legacy, considered.
      </p>
    </main>
  );
}

function SectionHeading({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-[var(--color-line)] pb-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand)]">{n}</span>
      <h2 className="font-[var(--font-display)] text-[15px] font-semibold text-[var(--color-ink)]">{title}</h2>
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
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[14px] font-medium">{name}</p>
        <p className="text-[13px] font-semibold tabular-nums">{amount}</p>
      </div>
      <p className="mt-0.5 text-[11.5px] text-[var(--color-muted)]">
        {detail}
        {email ? ` · ${email}` : ""} · {share}
      </p>
      {note && <p className="mt-2 border-l-2 border-[var(--color-line)] pl-3 text-[12px] italic text-[#3a4c45]">“{note}”</p>}
    </div>
  );
}
