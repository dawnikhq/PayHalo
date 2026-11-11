import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { currentUser } from "@/lib/auth";
import { accountsAvailable } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const user = await currentUser();
  if (user) redirect("/dashboard");

  const configured = await accountsAvailable();

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <header className="mx-auto flex h-[68px] w-full max-w-[1120px] items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          aria-label="PayHalo home"
          className="font-[var(--font-display)] text-[22px] font-extrabold tracking-[-0.055em] text-[var(--color-brand)]"
        >
          payhalo
        </Link>
        <Link href="/" className="text-[12.5px] font-semibold text-[var(--color-muted)]">
          ← Back to the site
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-[1120px] items-start gap-10 px-5 pb-24 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="h1 mt-3">Start a plan of your own.</h1>
          <p className="t-body mt-3 max-w-[46ch]">
            One account, one plan, nobody else&apos;s household. You can fill it in over months — nothing is shared
            until you send a link.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Your assets, people and instructions, only under your login.",
              "A keyholder link that shows claims and nothing else.",
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
          {configured ? (
            <SignUpForm />
          ) : (
            <div className="rounded-[18px] border border-[#f0cfc6] bg-[#fdf1ee] p-6">
              <p className="label text-[var(--color-ember)]">One moment</p>
              <p className="h2 mt-2">Sign-up is unavailable.</p>
              <p className="t-small mt-2">
                We cannot reach the account service right now. Nothing is lost — try again in a few minutes.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
