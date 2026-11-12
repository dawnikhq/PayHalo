import { redirect } from "next/navigation";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/Chrome";
import { ResetForm } from "@/components/auth/ResetForm";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Reset your password — PayHalo" } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const user = await currentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="paper min-h-screen">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-[520px] px-5 pb-24 pt-10 sm:px-8 lg:pt-16">
        <p className="eyebrow">Your account</p>
        <h1 className="h1 mt-3">Forgot the password?</h1>
        <p className="t-body mt-2">It happens. Set a new one and carry on where you left off.</p>

        <div className="mt-7">
          <ResetForm token={typeof token === "string" ? token : ""} />
        </div>

        <p className="mt-5 text-[11px] leading-relaxed text-[var(--color-muted)]">
          PayHalo never asks for your PayPal password, a private key or a recovery phrase — on this screen or any other.
        </p>
      </main>

      <MarketingFooter />
    </div>
  );
}
