import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/Chrome";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { currentUser } from "@/lib/auth";
import { accountsAvailable } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { email, next } = await searchParams;
  const user = await currentUser();
  if (user) redirect("/dashboard");

  const configured = await accountsAvailable();
  const invited = next === "/keyholder";
  const prefill = typeof email === "string" ? email.trim().slice(0, 160) : "";
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "";

  return (
    <div className="paper min-h-screen">
      <MarketingHeader />

      <main className="mx-auto grid w-full max-w-[1120px] items-start gap-10 px-5 pb-24 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <div>
          <p className="eyebrow">{invited ? "Trusted Key" : "Your account"}</p>
          <h1 className="h1 mt-3">{invited ? "Open your Trusted Key portal." : "Start a plan of your own."}</h1>
          <p className="t-body mt-3 max-w-[46ch]">
            {invited
              ? "You were named as someone's Trusted Key. Create an account with the same email address they named, and your portal — with your access code inside it — opens straight away."
              : "One account, one plan, nobody else's household. You can fill it in over months — nothing is shared until you send a link."}
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
          {configured ? (
            <SignUpForm initialEmail={prefill} next={destination} />
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

      <MarketingFooter />
    </div>
  );
}
