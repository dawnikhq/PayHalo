import { redirect } from "next/navigation";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/Chrome";
import { PayPalEmailForm } from "@/components/auth/PayPalEmailForm";
import { verifyState } from "@/lib/paypal";
import { readTicket } from "@/lib/paypal-identity";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "One more step — PayHalo" } };

/**
 * Where a PayPal sign-in lands when PayPal shares the account and not the
 * address. One field, one email, one click — instead of an apology and a
 * sign-up form that asked them to start over.
 */
export default async function PayPalEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const ticket = typeof t === "string" && t ? t : "";
  const sid = ticket ? verifyState(ticket) : null;
  const pending = sid ? await readTicket(sid).catch(() => null) : null;

  if (!pending) redirect("/signin?paypal=expired");

  return (
    <div className="paper min-h-screen">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-[520px] px-5 pb-24 pt-10 sm:px-8 lg:pt-16">
        <p className="eyebrow">Your account</p>
        <h1 className="h1 mt-3">One field left.</h1>
        <p className="t-body mt-2">
          PayPal knows who you are. It just did not pass on an email address, and the address is what your plan is
          keyed to.
        </p>

        <div className="mt-7">
          <PayPalEmailForm ticket={ticket} name={pending.name} />
        </div>

        <p className="t-meta mt-6">
          This step lasts {""}
          fifteen minutes. If it lapses, press the PayPal button again — nothing is lost in between.
        </p>
      </main>

      <MarketingFooter />
    </div>
  );
}
