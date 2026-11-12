import { redirect } from "next/navigation";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/Chrome";
import { PayPalEmailForm } from "@/components/auth/PayPalEmailForm";
import { openTicket } from "@/lib/paypal";

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
  const ticket = typeof t === "string" ? t : "";
  const pending = ticket ? openTicket(ticket) : null;

  if (!pending) redirect("/signin?paypal=expired");

  return (
    <div className="paper min-h-screen">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-[520px] px-5 pb-24 pt-10 sm:px-8 lg:pt-16">
        <p className="eyebrow">Your account</p>
        <h1 className="h1 mt-3">Which email should we use?</h1>

        <div className="mt-7">
          <PayPalEmailForm ticket={ticket} next={pending.next} />
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
