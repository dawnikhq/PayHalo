import Link from "next/link";
import { Page } from "@/components/ui";
import { AdminGate } from "@/components/admin/AdminGate";
import { ReleaseQueue } from "@/components/admin/ReleaseQueue";
import { MailCheck } from "@/components/admin/MailCheck";
import { OperatorSignOut } from "@/components/admin/OperatorSignOut";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { operatorOverview } from "@/lib/operator";
import { releaseQueue } from "@/lib/store";
import { mailConfigured, mailHealth } from "@/lib/mailer";
import { money, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operations — PayHalo" };

const TONE: Record<string, string> = {
  mint: "badge-mint",
  lime: "badge-lime",
  sand: "badge-sand",
  neutral: "badge-neutral",
};

function stamp(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${shortDate(iso)} · ${d.toISOString().slice(11, 16)}`;
}

function serverTime(iso: string) {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

export default async function AdminPage() {
  const allowed = await isAdmin();
  if (!allowed) {
    return (
      <Page className="pb-16">
        <AdminGate configured={adminConfigured()} />
      </Page>
    );
  }

  const [overview, queue] = await Promise.all([operatorOverview(), releaseQueue()]);
  const mail = mailHealth();
  const { totals, signups, statuses, customers, events } = overview;
  const peak = Math.max(1, ...signups.map((s) => s.count));

  const kpis = [
    {
      label: "Members",
      value: String(totals.accounts),
      sub: `${totals.confirmed} confirmed · ${totals.unconfirmed} waiting`,
    },
    {
      label: "Arrangements confirmed",
      value: String(totals.confirmedPlans),
      sub: `${totals.withPlan} gathering detail`,
    },
    {
      label: "Recorded value",
      value: money(totals.valueCents),
      sub: `${totals.assets} asset records`,
    },
    {
      label: "Handover requests",
      value: String(totals.handoversOpen),
      sub: `${totals.handoversWindow} in window · ${totals.released} released`,
    },
    {
      label: "Trusted Keys appointed",
      value: String(totals.withTrustedKey),
      sub: `${totals.people} beneficiaries named`,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      {/* operator rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[224px] flex-col justify-between border-r border-[rgba(21,63,53,0.08)] bg-white/70 px-4 py-6 backdrop-blur-xl lg:flex">
        <div>
          <p className="px-2 font-[var(--font-display)] text-[18px] font-extrabold tracking-[-0.05em] text-[var(--color-brand)]">
            payhalo
          </p>
          <p className="mt-1 px-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#94a29a]">Operations</p>

          <nav aria-label="Operator sections" className="mt-7 space-y-1">
            {[
              ["#overview", "Overview"],
              ["#customers", "Customers"],
              ["#release", "Release desk"],
              ["#activity", "Activity"],
              ["#mail", "Email delivery"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="block rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#5c6b63] transition hover:bg-[var(--color-mint)] hover:text-[var(--color-forest)]"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className="space-y-3 px-2">
          <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
            Storage: <span className="font-semibold text-[var(--color-ink)]">{overview.storage}</span>
          </p>
          <Link href="/" className="block text-[12px] font-semibold text-[var(--color-brand)]">
            View the site →
          </Link>
          <OperatorSignOut />
        </div>
      </aside>

      <div className="lg:pl-[224px]">
        <main id="main" className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
          <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Operations</p>
              <h1 className="h1 mt-2">The customer desk</h1>
              <p className="t-body mt-2 max-w-[70ch]">
                Who has joined, how far each arrangement has got, and what is waiting on a decision. Operators read and
                decide — they cannot move money, name a recipient, or see a vault key.
              </p>
            </div>
            <div className="sm:text-right">
              <p className="label">Refreshed</p>
              <p className="t-small mt-1">{serverTime(overview.generatedAt)}</p>
            </div>
          </header>

          {/* ---------------------------------------------------------- kpis */}
          <section id="overview" className="scroll-mt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-[16px] border border-[rgba(21,63,53,0.08)] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {k.label}
                  </p>
                  <p className="t-num mt-2 text-[26px] font-semibold leading-none text-[var(--color-ink)]">{k.value}</p>
                  <p className="mt-2 text-[11.5px] leading-snug text-[var(--color-muted)]">{k.sub}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_1fr]">
              {/* sign-ups */}
              <div className="rounded-[16px] border border-[rgba(21,63,53,0.08)] bg-white p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--color-ink)]">Sign-ups, last eight weeks</p>
                    <p className="t-meta">Accounts created per week</p>
                  </div>
                  <p className="t-num text-[12px] text-[var(--color-muted)]">
                    {signups.reduce((n, s) => n + s.count, 0)} total
                  </p>
                </div>
                <div className="mt-5 flex h-[132px] items-end gap-2">
                  {signups.map((s) => (
                    <div key={s.label} className="flex flex-1 flex-col items-center gap-2">
                      <span className="t-num text-[10.5px] text-[var(--color-muted)]">{s.count || ""}</span>
                      <div
                        className="w-full rounded-t-[6px] bg-[var(--color-brand)]/85"
                        style={{ height: `${Math.max(4, (s.count / peak) * 100)}%`, opacity: s.count ? 1 : 0.18 }}
                        title={`${s.count} in the week beginning ${s.label}`}
                      />
                      <span className="text-[9.5px] uppercase tracking-[0.08em] text-[#9aa8a0]">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* pipeline */}
              <div className="rounded-[16px] border border-[rgba(21,63,53,0.08)] bg-white p-5">
                <p className="text-[13px] font-semibold text-[var(--color-ink)]">Where members are</p>
                <p className="t-meta">Every customer, by the furthest thing they have done</p>
                <ul className="mt-4 space-y-2.5">
                  {statuses.length === 0 && <li className="t-small">No members yet.</li>}
                  {statuses.map((s) => (
                    <li key={s.label} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink)]">
                        <span className={`pill ${TONE[s.tone] ?? "badge-neutral"} h-[20px] px-2 text-[10px]`}>
                          {s.label}
                        </span>
                      </span>
                      <span className="t-num text-[12.5px] font-semibold text-[var(--color-forest)]">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------- customers */}
          <section id="customers" className="mt-8 scroll-mt-6">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="h2">Customers</h2>
                <p className="t-meta">Newest first. Six decisions make a finished arrangement.</p>
              </div>
              <p className="t-num text-[12px] text-[var(--color-muted)]">{customers.length} rows</p>
            </div>

            <div className="overflow-x-auto rounded-[16px] border border-[rgba(21,63,53,0.08)] bg-white">
              <table className="w-full min-w-[880px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[rgba(21,63,53,0.08)] text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {["Member", "Joined", "Last sign-in", "Status", "Steps", "Assets", "People", "Recorded", "Trusted Key"].map(
                      (h) => (
                        <th key={h} className="px-4 py-3 font-semibold">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-[13px] text-[var(--color-muted)]">
                        No accounts yet.
                      </td>
                    </tr>
                  )}
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-[rgba(21,63,53,0.05)] last:border-0 hover:bg-[#fafbf7]">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-[var(--color-ink)]">{c.name}</p>
                        <p className="text-[11.5px] text-[var(--color-muted)]">
                          {c.email}
                          {!c.confirmed && <span className="ml-2 text-[10px] font-semibold text-[var(--color-ember)]">unconfirmed</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--color-muted)]">{stamp(c.joinedAt)}</td>
                      <td className="px-4 py-3 text-[12px] text-[var(--color-muted)]">{stamp(c.lastLoginAt)}</td>
                      <td className="px-4 py-3">
                        <span className="pill badge-sand h-[22px] px-2 text-[10px]">{c.planStatus}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1" aria-label={`${c.stepsDone} of 6 steps`}>
                          {Array.from({ length: 6 }).map((_, i) => (
                            <span
                              key={i}
                              aria-hidden
                              className={`h-1.5 w-3 rounded-full ${
                                i < c.stepsDone ? "bg-[var(--color-brand)]" : "bg-[rgba(21,63,53,0.10)]"
                              }`}
                            />
                          ))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] t-num">{c.assets}</td>
                      <td className="px-4 py-3 text-[12px] t-num">{c.people}</td>
                      <td className="px-4 py-3 text-[12px] t-num">{money(c.valueCents)}</td>
                      <td className="px-4 py-3 text-[12px]">
                        {c.hasTrustedKey ? (
                          <span className="text-[var(--color-forest)]">Appointed</span>
                        ) : (
                          <span className="text-[var(--color-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* --------------------------------------------------- release desk */}
          <section id="release" className="mt-8 scroll-mt-6">
            <div className="mb-3">
              <h2 className="h2">Release desk</h2>
              <p className="t-meta">
                Confirm the death documentation, then decide. Approval is the only route into a vault, and it pays the
                plan&apos;s own beneficiaries — never a name an operator supplies.
              </p>
            </div>
            <ReleaseQueue
              rows={queue.map((row) => ({
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
          </section>

          {/* -------------------------------------------------------- activity */}
          <section id="activity" className="mt-8 scroll-mt-6">
            <div className="mb-3">
              <h2 className="h2">Recent activity</h2>
              <p className="t-meta">The last twelve events across every arrangement.</p>
            </div>
            <div className="rounded-[16px] border border-[rgba(21,63,53,0.08)] bg-white">
              {events.length === 0 && <p className="px-4 py-5 text-[13px] text-[var(--color-muted)]">Nothing yet.</p>}
              <ul>
                {events.map((e, i) => (
                  <li
                    key={`${e.at}-${i}`}
                    className="flex flex-col gap-1 border-b border-[rgba(21,63,53,0.05)] px-4 py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-[var(--color-ink)]">{e.title}</p>
                      <p className="text-[11.5px] leading-relaxed text-[var(--color-muted)]">{e.body}</p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="text-[11.5px] font-medium text-[var(--color-forest)]">{e.owner}</p>
                      <p className="t-num text-[10.5px] text-[#9aa8a0]">{stamp(e.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="mail" className="mt-8 scroll-mt-6">
            <div className="mb-3">
              <h2 className="h2">Email delivery</h2>
              <p className="t-meta">
                Confirmation links, sign-in codes and notices all leave through Brevo. If this is off, nobody can create
                an account or take the second step of signing in.
              </p>
            </div>
            <div className="mb-3 grid gap-3 sm:grid-cols-3">
              {[
                ["Status", mailConfigured() ? "Sending" : "Off", mailConfigured() ? "A Brevo key is present." : "No Brevo key on this deployment."],
                ["Sender", mail.sender, mail.senderSource === "environment" ? "From MAIL_FROM." : "Verified PayHalo default."],
                ["Reply name", mail.senderName, "Shown in the inbox."],
              ].map(([label, value, note]) => (
                <div key={label} className="rounded-[16px] border border-[rgba(21,63,53,0.08)] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p>
                  <p className="mt-2 break-words text-[14px] font-semibold text-[var(--color-ink)]">{value}</p>
                  <p className="mt-1 text-[11.5px] text-[var(--color-muted)]">{note}</p>
                </div>
              ))}
            </div>
            <MailCheck configured={mailConfigured()} />
          </section>
        </main>
      </div>
    </div>
  );
}
