import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/Chrome";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";
import { currentUser } from "@/lib/auth";
import { accountsAvailable } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; unconfigured?: string; link?: string; confirm?: string }>;
}) {
  const { next, unconfigured, link, confirm } = await searchParams;
  const user = await currentUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/dashboard");

  const configured = await accountsAvailable();

  return (
    <div className="paper min-h-screen">
      <MarketingHeader />

      <main className="mx-auto grid w-full max-w-[1120px] items-start gap-10 px-5 pb-24 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="h1 mt-3">Sign in to your plan.</h1>
          <p className="mt-2.5 font-[var(--font-display)] text-[15px] font-medium tracking-[-0.01em] text-[var(--color-brand)]">
            Your Wealth, left in good hands.
          </p>
          <p className="t-body mt-3 max-w-[46ch]">
            A password, or a one-time link by email. Either way the plan is yours alone until you choose to
            share it.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Your assets, people and instructions, only under your login.",
              "A Trusted Key link that shows handover requests and nothing else.",
              "A beneficiary link that reveals an entitlement only after the window closes.",
            ].map((line) => (
              <li key={line} className="flex gap-3 text-[13px] text-[var(--color-ink)]">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-sage)]" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div>
          {!configured || unconfigured ? (
            <div className="rounded-[18px] border border-[#f0cfc6] bg-[#fdf1ee] p-6">
              <p className="label text-[var(--color-ember)]">One moment</p>
              <p className="h2 mt-2">Sign-in is unavailable.</p>
              <p className="t-small mt-2">
                We cannot reach the account service right now. Nothing is lost — try again in a few minutes.
              </p>
            </div>
          ) : (
            <>
              {link === "invalid" && (
                <p className="mb-4 rounded-[12px] bg-[#fdf1ee] px-3 py-2 text-[12px] text-[var(--color-ember)]">
                  That link has expired or was already used. Ask for a new one.
                </p>
              )}
              {confirm === "expired" && (
                <p className="mb-4 rounded-[12px] bg-[#fdf1ee] px-3 py-2 text-[12px] text-[var(--color-ember)]">
                  That confirmation link has expired or was already used. Sign in, or sign up again for a fresh one.
                </p>
              )}
              <SignInForm next={next && next.startsWith("/") ? next : "/dashboard"} />
            </>
          )}

          <p className="mt-5 text-[11px] leading-relaxed text-[var(--color-muted)]">
            We keep your email to sign you in and nothing else. Your plan is never shown to another account holder.
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
