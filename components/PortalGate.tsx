import Link from "next/link";

/**
 * Shown when a portal is opened without a valid share link. It says nothing
 * about whether the plan exists — an invalid link and a wrong audience look
 * identical from the outside.
 */
export function PortalGate({ audience }: { audience: "keyholder" | "beneficiary" }) {
  const role = audience === "keyholder" ? "keyholder" : "beneficiary";
  return (
    <div className="mx-auto w-full max-w-[560px] px-5 py-16 text-center">
      <p className="eyebrow">Private link required</p>
      <h1 className="h1 mt-3">This {role} link isn&apos;t valid.</h1>
      <p className="t-body mt-3">
        A Trusted Key reaches this page either through the link the account holder shared, or by signing in with the
        exact email address they named. Links can be revoked, and this one no longer works.
      </p>
      <p className="t-small mt-4">
        If you were named as a Trusted Key, sign in with that email — the portal opens on its own. Otherwise ask the
        account holder to send a fresh link from their plan. If you are the account holder,{" "}
        <Link href="/signin" className="font-semibold text-[var(--color-brand)]">
          sign in
        </Link>
        .
      </p>
    </div>
  );
}
