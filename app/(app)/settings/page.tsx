import Link from "next/link";
import { getSnapshot } from "@/lib/store";
import { Page } from "@/components/ui";
import { ProfileForm } from "@/components/account/ProfileForm";
import { ShareLinks } from "@/components/account/ShareLinks";
import { requireOwner } from "@/lib/scope";
import { shareToken } from "@/lib/share";
import { CopyButton } from "@/components/CopyButton";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

const ROLES = [
  {
    role: "Account holder",
    can: "Create and edit the plan, confirm it, respond to a handover request.",
    cannot: "See a handover request still inside its registry check.",
  },
  {
    role: "Trusted Key",
    can: "Start a handover request and submit supporting evidence.",
    cannot: "See balances, edit recipients, move assets or open documents.",
  },
  {
    role: "Beneficiary",
    can: "See their own entitlement after the full safety window.",
    cannot: "See the estate, other recipients or anything before verification.",
  },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ paypal?: string; reason?: string }>;
}) {
  const s = await getSnapshot();
  const owner = await requireOwner();
  const { paypal, reason } = await searchParams;

  return (
    <Page>
      <header className="mb-7">
        <p className="eyebrow">Your account</p>
        <h1 className="h1 mt-2.5">Profile &amp; security</h1>
        <p className="t-body mt-2">Who you are, who can act, and what is never shared.</p>
      </header>

      {paypal && (
        <div
          className={`mb-5 rounded-[14px] border p-4 text-[12.5px] ${
            paypal === "connected"
              ? "border-[#cbea92] bg-[var(--color-lime)] text-[var(--color-forest)]"
              : "border-[#f0cfc6] bg-[#fdf1ee] text-[var(--color-ember)]"
          }`}
        >
          {paypal === "connected"
            ? "You are connected. Nothing about your balances or permissions was read."
            : paypal === "unconfigured"
              ? "Connecting is not available just yet. Everything else works as normal."
              : "That did not complete. Nothing changed — try again when you are ready."}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <ProfileForm user={s.user} />

          <section className="card p-6 md:p-7">
            <p className="eyebrow">Account</p>
            <h2 className="h2 mt-2">Signed in as</h2>
            <p className="mt-2 break-all text-[13px] font-medium text-[var(--color-ink)]">{owner.email}</p>
            <p className="t-small mt-1">
              Sign-in is by emailed link. Nothing is shared with a Trusted Key or beneficiary unless you send them a link
              below.
            </p>
          </section>

          <ShareLinks
            keyholderToken={shareToken(owner.id, "keyholder")}
            beneficiaryToken={shareToken(owner.id, "beneficiary")}
            hasKeyholder={Boolean(s.keyholder)}
          />


          <section className="card p-6 md:p-7">
            <h2 className="h2">Who can see what</h2>
            <p className="t-small mt-1">
              Role visibility is enforced in the data each portal is given — not just hidden in the interface.
            </p>
            <div className="mt-5 overflow-x-auto rounded-[14px] border border-[var(--color-line)]">
              <table className="w-full min-w-[520px] text-left">
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
                <p className="eyebrow">Trusted Key</p>
                <h2 className="h2 mt-2">Someone who can start a handover request</h2>
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
                  The code starts a handover request. It is not a password, and it grants no access to balances or assets.
                </p>
              </>
            ) : (
              <p className="t-body mt-3">No Trusted Key is assigned. Nothing can start without one.</p>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card-forest p-6">
            <h2 className="h2 text-white">Private by design.</h2>
            <p className="t-body mt-3 text-[#b7cfbd]">
              PayHalo stores instructions, not credentials. No portal can display a password, private key or
              recovery phrase — because none are ever collected.
            </p>
            <div className="my-5 h-px bg-white/12" />
            <h3 className="h3 text-[var(--color-lime)]">Sessions are real.</h3>
            <p className="t-body mt-2 text-[#b7cfbd]">
              You are signed in with an emailed link. Each portal is scoped on the server: a Trusted Key link carries no
              balances, a beneficiary link carries nothing until the window closes.
            </p>
          </section>

          <section className="card-mint p-6">
            <h2 className="h3 text-[var(--color-forest)]">What PayHalo never asks for</h2>
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
              your records are yours alone and can be edited or removed at any time.
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
