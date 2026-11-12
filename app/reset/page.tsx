import { redirect } from "next/navigation";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/Chrome";
import { ResetForm } from "@/components/auth/ResetForm";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Reset your password — PayHalo" } };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;
  const user = await currentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="paper min-h-screen">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-[520px] px-5 pb-24 pt-10 sm:px-8 lg:pt-16">
        <p className="eyebrow">Your account</p>
        <h1 className="h1 mt-3">Change your password.</h1>
        <p className="t-body mt-2">
          {typeof token === "string" && token
            ? "Choose a new password and carry on where you left off."
            : "We will email you a link that sets a new one. Nothing changes until you use it."}
        </p>

        <div className="mt-7">
          <ResetForm
            token={typeof token === "string" ? token : ""}
            email={typeof email === "string" ? email : ""}
          />
        </div>

      </main>

      <MarketingFooter />
    </div>
  );
}
