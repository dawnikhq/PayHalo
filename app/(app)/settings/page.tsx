import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { Page } from "@/components/ui";
import { ProfileForm } from "@/components/account/ProfileForm";
import { CopyButton } from "@/components/CopyButton";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

const ROLES = [
  {
    role: "Account holder",
    can: "Create and edit the plan, seal it, respond to a claim.",
    cannot: "See a claim that is still inside its registry check.",
  },
  {
    role: "Keyholder",
    can: "Start a claim and submit supporting evidence.",
    cannot: "See balances, edit recipients, move assets or open documents.",
  },
  {
    role: "Beneficiary",
    can: "See their own entitlement after the full safety window.",
    cannot: "See the estate, other recipients or anything before verification.",
  },
];

export default async function SettingsPage() {
  const s = await getSnapshot();

  return (
    <Page>
      <header className="mb-7">
        <p className="eyebrow">Your account</p>
        <h1 className="h1 mt-2.5">Profile &amp; security</h1>
        <p className="t-body mt-2">Who you are, who can act, and what is never shared.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <ProfileForm user={s.user} />

          <section className="card p-6 md:p-7">
            <h2 className="h2">Who can see what</h2>
            <p className="t-small mt-1">
              Role visibility is enforced in the data each portal is given — not just hidden in the interface.
            </p>
            <div className="mt-5 overflow-hidden rounded-[14px] border border-[var(--color-line)]">
              <table className="w-full text-left">
                <thead className="bg-[#f8faf7]">
                  <tr>
                    <th className="label px-4 py-2.5">Role</th>
                    <th className="label px-4 py-2.5">Can</th>
                    <th className="label px-4 py-2.5">Cannot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {ROLES.map((r) => (
                    <tr key={r.role}>
                      <td className="px-4 py-3 align-top text-[12.5px] font-semibold text-[var(--color-ink)]">
                        {r.role}
                      </td>
                      <td className="px-4 py-3 align-top text-[12px] text-[var(--color-muted)]">{r.can}</td>
                      <td className="px-4 py-3 align-top text-[12px] text-[var(--color-muted)]">{r.cannot}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="keyholder" className="card p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Trusted keyholder</p>
                <h2 className="h2 mt-2">Someone who can start a claim</h2>
              </div>
              <Link href="/keyholder" className="text-[12.5px] font-semibold text-[var(--color-brand)]">
                Open portal →
              </Link>
            </div>

            {s.keyholder ? (
              <>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar name={s.keyholder.name} size={40} tone="forest" />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-[var(--color-ink)]">{s.keyholder.name}</p>
                    <p className="t-small">
                      {s.keyholder.relationship}
                      {s.keyholder.email ? ` · ${s.keyholder.email}` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-[12px] border border-[var(--color-line)] bg-[#fafcfa] px-4 py-3">
                  <div>
                    <p className="label">Access code</p>
                    <p className="t-num mt-0.5 text-[14px] tracking-[0.12em] text-[var(--color-forest)]">
                      {s.keyholder.accessCode}
                    </p>
                  </div>
                  <CopyButton value={s.keyholder.accessCode} />
                </div>
                <p className="t-meta mt-3">
                  The code starts a claim. It is not a password, and it grants no access to balances or assets.
                </p>
              </>
            ) : (
              <p className="t-body mt-3">No keyholder is assigned. Nothing can start without one.</p>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card-forest p-6">
            <h2 className="h2 text-white">Private by design.</h2>
            <p className="t-body mt-3 text-[#b7cfbd]">
              VIVO stores instructions, not credentials. No portal can display a password, private key or
              recovery phrase — because none are ever collected.
            </p>
            <div className="my-5 h-px bg-white/12" />
            <h3 className="h3 text-[var(--color-lime)]">Sessions are simulated.</h3>
            <p className="t-body mt-2 text-[#b7cfbd]">
              This workspace has no live authentication. Role separation is demonstrated through the data each
              portal receives.
            </p>
          </section>

          <section className="card-mint p-6">
            <h2 className="h3 text-[var(--color-forest)]">What VIVO never asks for</h2>
            <ul className="mt-3 space-y-2">
              {["Passwords or PINs", "Private keys", "Wallet recovery phrases", "Bank logins"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[12.5px] text-[#3c5a4e]">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] text-[var(--color-ember)]">
                    ×
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="h3">Storage in this build</h2>
            <p className="t-small mt-1.5">
              State is served by <span className="font-semibold text-[var(--color-ink)]">{s.storage}</span>. In
              the demo, all records are sample data and can be reset at any time.
            </p>
            <Link href="/plan/sheet" className="mt-3 inline-block text-[12.5px] font-semibold text-[var(--color-brand)]">
              View the instruction sheet →
            </Link>
          </section>
        </aside>
      </div>
    </Page>
  );
}
