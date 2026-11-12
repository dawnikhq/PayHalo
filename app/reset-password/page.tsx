import { MarketingFooter, MarketingHeader } from "@/components/marketing/Chrome";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  // Someone already signed in does not need to reset from a link.
  const user = await currentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="paper min-h-screen">
      <MarketingHeader />

      <main className="mx-auto grid w-full max-w-[1120px] items-start gap-10 px-5 pb-24 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="h1 mt-3">Set a new password.</h1>
          <p className="t-body mt-3 max-w-[46ch]">
            This link came by email and proves you can read the address on the account. Choose a password you will
            remember — the plan is still yours alone until you choose to share it.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Ten characters or more, with letters and numbers.",
              "The link is spent as soon as the password is set.",
              "After this, every other sign-in ends and you sign in with the new password.",
            ].map((line) => (
              <li key={line} className="flex gap-3 text-[13px] text-[var(--color-ink)]">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-sage)]" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <ResetPasswordForm token={token} />
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
