import Link from "next/link";
import { SupportRequest } from "@/components/account/SupportRequest";

const FAQ = [
  {
    q: "Do I have to complete a plan?",
    a: "No. Setup is optional. Save your draft, explore the dashboard and return whenever you are ready.",
  },
  {
    q: "What can my keyholder see?",
    a: "Only claim-related information. Not balances, recipient details or asset access. They cannot edit or move assets.",
  },
  {
    q: "How does the safety window work?",
    a: "A verified claim notifies the account holder. No release before 14 full days. An owner response stops the handover.",
  },
  {
    q: "Who receives my legacy?",
    a: "Your primary receives 100%. Backups apply only if needed. If no named person can inherit, your final cause receives 100%.",
  },
  {
    q: "What documents should I add?",
    a: "Recovery instructions and practical guidance — never passwords, private keys or wallet recovery phrases.",
  },
  {
    q: "Is any of this connected to real accounts?",
    a: "No. Balances, verification, notices and transfers are all simulated in this concept.",
  },
];

export function HelpContent({
  firstName,
  role = "owner",
}: {
  firstName: string;
  role?: "owner" | "keyholder" | "beneficiary";
}) {
  const backHref = role === "keyholder" ? "/keyholder" : role === "beneficiary" ? "/beneficiary" : "/dashboard";
  const backLabel = role === "keyholder" ? "Keyholder home" : role === "beneficiary" ? "Beneficiary home" : "Dashboard";

  return (
    <>
      <header className="mb-7">
        <p className="eyebrow">Here when you need us</p>
        <h1 className="h1 mt-2.5">A clearer way forward.</h1>
        <p className="t-body mt-2">Straight answers for a thoughtful plan.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section className="card p-6 md:p-7">
          <h2 className="h2">Good questions, clear answers.</h2>
          <div className="mt-4 divide-y divide-[var(--color-line)]">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span className="text-[13.5px] font-semibold text-[var(--color-ink)]">{item.q}</span>
                  <span aria-hidden className="text-[15px] text-[var(--color-muted)] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="t-small mt-2 max-w-[62ch] pr-6">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="card-forest p-6">
            <h2 className="h2 text-white">A person, when it matters.</h2>
            <p className="t-body mt-3 text-[#b7cfbd]">
              For questions about {firstName}&apos;s plan, account access or a safety notice.
            </p>
            <div className="mt-5">
              <SupportRequest />
            </div>
          </section>

          <section className="card-mint p-6">
            <h2 className="h3 text-[var(--color-forest)]">About this experience</h2>
            <p className="t-body mt-2 text-[#3c5a4e]">
              This is a high-fidelity interface for a considered digital legacy. Accounts, connections,
              balances, claims, notices and transfers are simulated.
            </p>
            <p className="t-body mt-3 text-[#3c5a4e]">
              VIVO helps organise instructions. It does not execute legal documents or replace professional
              legal advice.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="h3">The safety notice</h2>
            <ol className="mt-3 space-y-2.5">
              {[
                "A keyholder submits evidence.",
                "Evidence is verified before anything else.",
                "The account holder is notified, and 14 days begin.",
                "A response stops the handover.",
              ].map((step, i) => (
                <li key={step} className="flex gap-2.5 text-[12.5px] text-[var(--color-muted)]">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-mint)] text-[10px] font-semibold text-[var(--color-forest)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <Link href={backHref} className="mt-4 inline-block text-[12.5px] font-semibold text-[var(--color-brand)]">
              Back to {backLabel} →
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
