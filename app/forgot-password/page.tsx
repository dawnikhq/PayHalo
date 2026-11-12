import { MarketingFooter, MarketingHeader } from "@/components/marketing/Chrome";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { currentUser } from "@/lib/auth";
import { accountsAvailable } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const user = await currentUser();
  if (user) redirect("/dashboard");

  const configured = await accountsAvailable();

  return (
    <div className="paper min-h-screen">
      <MarketingHeader />

      <main className="mx-auto grid w-full max-w-[1120px] items-start gap-10 px-5 pb-24 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="h1 mt-3">Forgot your password?</h1>
          <p className="t-body mt-3 max-w-[46ch]">
            We can email a link to the address on your account. Opening it lets you choose a new password — it does
            not open the plan, and it does not touch a single asset.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "The link goes only to the address we already hold.",
              "It works once, and for thirty minutes.",
              "A password change ends every other sign-in, so an old login cannot survive it.",
            ].map((line) => (
              <li key={line} className="flex gap-3 text-[13px] text-[var(--color-ink)]">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-sage)]" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div>
          {!configured ? (
            <div className="rounded-[18px] border border-[#f0cfc6] bg-[#fdf1ee] p-6">
              <p className="label text-[var(--color-ember)]">One moment</p>
              <p className="h2 mt-2">Password reset is unavailable.</p>
              <p className="t-small mt-2">
                We cannot reach the account service right now. Nothing is lost — try again in a few minutes.
              </p>
            </div>
          ) : (
            <ForgotPasswordForm />
          )}

          <p className="mt-5 text-[11px] leading-relaxed text-[var(--color-muted)]">
            We keep your email to reset your password and nothing else. Your plan is never shown to another account
            holder.
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
