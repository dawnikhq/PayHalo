import Link from "next/link";
import { UnsealPlan } from "./UnsealPlan";

/**
 * Shown on the pages that edit a plan, when the plan is sealed.
 *
 * The server refuses these edits anyway; this is the same answer arriving before
 * the person fills in a form that cannot be saved.
 */
export function SealedNotice({ sealedAt, what }: { sealedAt: string | null; what: string }) {
  if (!sealedAt) return null;

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-[16px] border border-[#e4dcbf] bg-[#fbf7e8] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-[#5c4a12]">This plan is sealed, so {what} is read-only.</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[#7a6631]">
          Unseal it to make changes. The plan becomes a draft, your Trusted Key is told, and money already in the vault
          stays where it is.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <UnsealPlan tone="light" />
        <Link href="/plan" className="text-[12px] font-semibold text-[#7a6631] underline underline-offset-4">
          View my plan
        </Link>
      </div>
    </div>
  );
}
