import Link from "next/link";
import { SupportDesk } from "@/components/support/SupportDesk";
import type { SupportTicket } from "@/lib/support";

const FAQ = [
  {
    q: "Do I have to complete a plan?",
    a: "No. Setup is optional. Save your draft, explore the dashboard and return whenever you are ready.",
  },
  {
    q: "What can my Trusted Key see?",
    a: "Only handover request information. Not balances, recipient details or asset access. They cannot edit or move assets.",
  },
  {
    q: "How does the safety window work?",
    a: "A verified handover request notifies the account holder. No release before 14 full days. An owner response stops the handover.",
  },
  {
    q: "Who receives my inheritance?",
    a: "Your primary receives 100%. Backups apply only if needed. If no named person can inherit, your final cause receives 100%.",
  },
  {
    q: "What documents should I add?",
    a: "Recovery instructions and practical guidance — never passwords, private keys or wallet recovery phrases.",
  },
  {
    q: "Is any of this connected to real accounts?",
    a: "Balances are the figures you enter. Documents are verified on upload, and a release only runs through PayPal once you enable it.",
  },
];

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function HelpContent({
  firstName,
  role = "owner",
  email = "",
  name = "",
  tickets = [],
}: {
  firstName: string;
  role?: "owner" | "keyholder" | "beneficiary";
  email?: string;
  name?: string;
  tickets?: SupportTicket[];
}) {
  const backHref = role === "keyholder" ? "/keyholder" : role === "beneficiary" ? "/beneficiary" : "/dashboard";
  const backLabel = role === "keyholder" ? "Trusted Key home" : role === "beneficiary" ? "Beneficiary home" : "Overview";

  return (
    <>
      <header className="mb-6">
        <p className="eyebrow">Here when you need us</p>
        <h1 className="h1 mt-2.5">A clearer way forward.</h1>
        <p className="t-body mt-2">Straight answers for a thoughtful plan — from Halo first, from a person when you ask.</p>
      </header>

      <SupportDesk role={role} defaultName={name || firstName} defaultEmail={email} />

      {tickets.length ? (
        <section className="card mt-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="h2">Your requests</h2>
            <p className="t-meta">{tickets.length} on record</p>
          </div>
          <ul className="mt-3 divide-y divide-[var(--color-line)]">
            {tickets.slice(0, 6).map((ticket) => (
              <li key={ticket.ref} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-[var(--font-display)] text-[12px] font-semibold tracking-[0.05em] text-[var(--color-forest)]">
                    {ticket.ref}
                  </span>
                  <span className="rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    {ticket.status}
                  </span>
                  <span className="text-[11px] text-[var(--color-muted)]">
                    {ticket.topic} · {when(ticket.createdAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12.5px] text-[var(--color-muted)]">{ticket.message}</p>
                {ticket.reply ? (
                  <p className="mt-2 rounded-[10px] bg-[#f4f8f2] px-3 py-2 text-[12px] leading-relaxed text-[var(--color-ink)]">
                    <span className="font-semibold text-[var(--color-forest)]">PayHalo replied: </span>
                    {ticket.reply.body}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
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
              Requests about {firstName}&apos;s plan, account access or a safety notice are read by the operator, in the
              order they arrive.
            </p>
            <a
              href="#support-form"
              className="btn mt-5 w-full bg-white text-[var(--color-forest)] hover:bg-[#f2f7f2]"
            >
              Write to a person
            </a>
            <p className="mt-2 text-[11px] text-[#8fb098]">
              You get a reference by email the moment it is logged.
            </p>
          </section>

          <section className="card-mint p-6">
            <h2 className="h3 text-[var(--color-forest)]">About this experience</h2>
            <p className="t-body mt-2 text-[#3c5a4e]">
              PayHalo records your instructions and runs a verified handover. Balances are the figures you enter; the only live
              connection is PayPal, and only if you enable it.
            </p>
            <p className="t-body mt-3 text-[#3c5a4e]">
              PayHalo helps organise instructions. It does not execute legal documents or replace professional
              legal advice.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="h3">The safety notice</h2>
            <ol className="mt-3 space-y-2.5">
              {[
                "A Trusted Key submits evidence.",
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
