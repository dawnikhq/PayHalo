"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import type { Asset, AssetKind } from "@/lib/types";

export const KIND_LABEL: Record<AssetKind, string> = {
  paypal: "Payment account",
  crypto: "Crypto wallet",
  business: "Digital business",
};

export function AssetsExplorer({ assets }: { assets: Asset[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | AssetKind>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      const matchesKind = kind === "all" || a.kind === kind;
      const matchesQuery =
        !q ||
        a.label.toLowerCase().includes(q) ||
        a.provider.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q) ||
        KIND_LABEL[a.kind].toLowerCase().includes(q);
      return matchesKind && matchesQuery;
    });
  }, [assets, kind, query]);

  return (
    <section className="card p-6 md:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="h2">All assets ({filtered.length})</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative">
            <span className="sr-only">Search assets</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets…"
              className="h-9 w-full rounded-[10px] border border-transparent bg-transparent px-2.5 text-[12.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-line-strong)] focus:outline-none sm:w-[190px]"
            />
          </label>
          <label>
            <span className="sr-only">Filter by type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "all" | AssetKind)}
              className="h-9 w-full rounded-[10px] border border-[var(--color-line-strong)] bg-white px-3 text-[12.5px] font-medium text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:outline-none sm:w-[150px]"
            >
              <option value="all">All types</option>
              <option value="paypal">Payment accounts</option>
              <option value="crypto">Crypto wallets</option>
              <option value="business">Digital businesses</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 hidden grid-cols-[1.6fr_1fr_1fr_1fr_24px] gap-4 border-b border-[var(--color-line)] pb-2 md:grid">
        <p className="label">Account</p>
        <p className="label">Category</p>
        <p className="label">Value</p>
        <p className="label">Plan status</p>
        <span />
      </div>

      <ul className="divide-y divide-[var(--color-line)]">
        {filtered.map((a) => (
          <li key={a.id}>
            <Link
              href={`/assets/${a.id}`}
              className="row-link -mx-2 grid grid-cols-1 gap-2 rounded-[10px] px-2 py-4 md:grid-cols-[1.6fr_1fr_1fr_1fr_24px] md:items-center md:gap-4"
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium text-[var(--color-ink)]">{a.label}</span>
                <span className="t-small block truncate">{a.detail}</span>
              </span>
              <span className="t-small md:text-[13px] md:text-[var(--color-ink)]">{KIND_LABEL[a.kind]}</span>
              <span className="t-num text-[13.5px] text-[var(--color-ink)]">{money(a.balanceCents)}</span>
              <span>
                <span className={`pill ${a.reviewed ? "badge-mint" : "badge-neutral"}`}>
                  {a.reviewed ? "Included" : "Review instructions"}
                </span>
              </span>
              <span className="hidden text-[var(--color-brand)] md:block" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
        {!filtered.length && (
          <li className="py-8 text-center">
            <p className="text-[13.5px] font-medium text-[var(--color-ink)]">No assets match that search.</p>
            <button
              onClick={() => {
                setQuery("");
                setKind("all");
              }}
              className="btn btn-secondary btn-sm mt-3"
            >
              Clear filters
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
