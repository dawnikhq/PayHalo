import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/Chrome";

export const metadata = {
  title: { absolute: "Privacy Policy and Terms of Service — PayHalo" },
  description: "How PayHalo handles the information you record, and the terms that apply when you use it.",
};

export default function LegalPage() {
  return (
    <div className="paper min-h-screen">
      <MarketingHeader />

      <main id="main" className="mx-auto w-full max-w-[760px] px-4 py-14 sm:px-8 sm:py-20">
        <span className="eyebrow-pill">Legal</span>
        <h1 className="display-sm mt-5 text-[var(--color-ink)]">The plain version, before the formal one.</h1>
        <p className="mt-4 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
          PayHalo records what you own, who should inherit it and who may start the handover. It is not a bank, a
          wallet, a custodian or a law firm, and it does not replace a will. Full documents are available from the
          operator on request; the essentials are below.
        </p>

        <section id="privacy" className="mt-12 scroll-mt-24">
          <h2 className="display-xs text-[var(--color-ink)]">Privacy Policy</h2>
          <div className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
            <p>
              <span className="font-semibold text-[var(--color-ink)]">What we hold.</span> Your account email, your
              name, the asset records you enter, the people you name and the arrangements you make. Nothing more than
              the plan needs.
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">What to keep out.</span> Account passwords,
              cryptocurrency private keys or recovery phrases. A record needs the account, the institution and who
              should receive it — never the secret that opens it.
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">Who can see it.</span> You. A Trusted Key sees
              that a plan exists and may start a handover request, and nothing else. A beneficiary sees their own
              allocation after the safety window. No account holder sees another&apos;s plan.
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">Cookies.</span> One cookie keeps you signed in.
              One remembers the choice you made in the cookie banner, so we do not ask again. Analytics and marketing
              cookies stay off unless you turn them on, and no cookie is used to follow you to another site.
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">Email.</span> We send two kinds of message: a
              sign-in link, and the key that proves a named beneficiary when a plan is completed. Nothing else.
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">Deleting.</span> Ask the operator to remove your
              account and the record attached to it; the request is carried out without keeping a copy for marketing.
            </p>
          </div>
        </section>

        <section id="terms" className="mt-12 scroll-mt-24">
          <h2 className="display-xs text-[var(--color-ink)]">Terms of Service</h2>
          <div className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
            <p>
              <span className="font-semibold text-[var(--color-ink)]">What PayHalo is.</span> A place to record digital
              assets and inheritance instructions, and to support a handover process that follows them.
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">What it is not.</span> Not a will, not legal
              advice, and not a guarantee that any provider will release an asset. Each provider applies its own
              inheritance, verification and documentation requirements.
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">Your responsibility.</span> Keep your entries
              accurate and current. Record only information you are entitled to record.
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">The handover.</span> A handover request requires
              verification and a 14-day response window during which the account holder may cancel it. Nothing proceeds
              while that window is open.
            </p>
            <p>
              <span className="font-semibold text-[var(--color-ink)]">Availability.</span> This is a demonstration
              deployment provided as it stands, without warranty of any kind.
            </p>
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-3 border-t border-[rgba(21,63,53,0.10)] pt-6">
          <Link href="/" className="btn btn-secondary btn-sm">
            Back to home
          </Link>
          <Link href="/help" className="btn btn-secondary btn-sm">
            Contact
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
