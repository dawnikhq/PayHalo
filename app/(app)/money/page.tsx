import { Page } from "@/components/ui";
import { WalletPanel } from "@/components/money/WalletPanel";
import { PayPalCard } from "@/components/account/PayPalCard";
import { requireOwner } from "@/lib/scope";
import { directory, ensureWallet, walletSummary } from "@/lib/wallet";
import { money, shortDate } from "@/lib/format";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Money — PayHalo" } };

const TONE: Record<string, string> = {
  seed: "badge-neutral",
  in: "badge-lime",
  out: "badge-sand",
  adjust: "badge-neutral",
};

function label(entry: { kind: string }): string {
  if (entry.kind === "seed") return "Starting balance";
  if (entry.kind === "in") return "Received";
  if (entry.kind === "out") return "Sent";
  return "Adjustment";
}

export default async function MoneyPage() {
  let owner;
  try {
    owner = await requireOwner();
  } catch {
    redirect("/signin?next=/money");
  }

  const wallet = await ensureWallet(owner);
  const people = await directory(wallet.userId);
  const summary = walletSummary(wallet);

  return (
    <Page>
      <header className="mb-6">
        <p className="eyebrow">Money</p>
        <h1 className="h1 mt-2.5">Your PayHalo balance.</h1>
        <p className="t-body mt-2 max-w-[62ch]">
          Every account opens with {money(2_000_000, false)} of demo money, and you can send it to anyone by their
          PayHalo handle. Your PayPal account is a separate, real connection — it is never mixed with this balance.
        </p>
      </header>

      <WalletPanel balanceCents={wallet.balanceCents} handle={wallet.handle} directory={people} />

      <section className="card mt-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h2">Movement</h2>
          <p className="t-meta">
            {money(summary.inCents)} in · {money(summary.outCents)} out · {summary.count} on record
          </p>
        </div>
        <ul className="mt-3 divide-y divide-[var(--color-line)]">
          {wallet.entries.map((entry) => {
            const credit = entry.kind === "seed" || entry.kind === "in";
            return (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-[var(--color-ink)]">{label(entry)}</span>
                    <span className={`badge ${TONE[entry.kind] ?? "badge-neutral"}`}>
                      {entry.kind === "seed" ? "demo" : entry.kind}
                    </span>
                    {entry.handle ? (
                      <span className="text-[11.5px] text-[var(--color-muted)]">@{entry.handle}</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-[11.5px] text-[var(--color-muted)]">
                    {entry.note ? `${entry.note} · ` : ""}
                    {shortDate(entry.at)}
                    {entry.ref ? ` · ${entry.ref}` : ""}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-[var(--font-display)] text-[14px] font-semibold ${
                    credit ? "text-[var(--color-brand)]" : "text-[var(--color-ink)]"
                  }`}
                >
                  {credit ? "+" : "−"}
                  {money(entry.amountCents)}
                </p>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-[var(--color-muted)]">
          Demo money is granted once, cannot be topped up, and has no cash value. The balance is stored against your
          account and visible only to you.
        </p>
      </section>

      <div className="mt-5">
        <PayPalCard />
      </div>
    </Page>
  );
}
