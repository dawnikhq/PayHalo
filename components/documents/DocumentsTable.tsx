"use client";

import { useMemo, useState } from "react";
import { stampLabel } from "@/lib/format";
import type { DocumentRow } from "@/lib/types";

const ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M6 3.5h7l5 5v12A1.5 1.5 0 0 1 16.5 22H6A1.5 1.5 0 0 1 4.5 20.5v-15A2 2 0 0 1 6 3.5Z" />
    <path d="M13 3.5V9h5" />
  </svg>
);

export function DocumentsTable({ documents }: { documents: DocumentRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.relatedTo.toLowerCase().includes(q) ||
        d.kind.toLowerCase().includes(q),
    );
  }, [documents, query]);

  return (
    <section className="card p-6 md:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="h2">Your documents ({filtered.length})</h2>
        <label className="relative">
          <span className="sr-only">Search documents</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="h-9 w-full rounded-[10px] border border-transparent bg-transparent px-2.5 text-[12.5px] text-[var(--color-ink)] placeholder:text-[#94a29a] focus:border-[var(--color-line-strong)] focus:outline-none sm:w-[190px]"
          />
        </label>
      </div>

      <div className="mt-5 hidden grid-cols-[1.7fr_1fr_0.9fr_0.9fr] gap-4 border-b border-[var(--color-line)] pb-2 md:grid">
        <p className="label">Document</p>
        <p className="label">Related to</p>
        <p className="label">Updated</p>
        <p className="label text-right">Access</p>
      </div>

      <ul className="divide-y divide-[var(--color-line)]">
        {filtered.map((d) => (
          <li
            key={d.id}
            className="grid grid-cols-1 gap-2 py-4 md:grid-cols-[1.7fr_1fr_0.9fr_0.9fr] md:items-center md:gap-4"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[var(--color-muted)]">{ICON}</span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">{d.name}</p>
                <p className="t-meta mt-0.5">
                  {d.kind} · {(d.sizeKb / 1024).toFixed(1)} MB · Document
                </p>
              </div>
            </div>
            <p className="t-small md:text-[13px] md:text-[var(--color-ink)]">{d.relatedTo}</p>
            <p className="t-meta">{stampLabel(d.updatedAt)}</p>
            <div className="md:text-right">
              <span className="pill badge-mint">{d.access === "owner" ? "Owner only" : "Shared after handover"}</span>
            </div>
          </li>
        ))}
        {!filtered.length && (
          <li className="py-8 text-center">
            <p className="text-[13.5px] font-medium text-[var(--color-ink)]">No documents match that search.</p>
            <button onClick={() => setQuery("")} className="btn btn-secondary btn-sm mt-3">
              Clear search
            </button>
          </li>
        )}
      </ul>

      <p className="t-meta mt-4 border-t border-[var(--color-line)] pt-3">
        Documents are private while you are alive. Relevant instructions are released only to the entitled
        beneficiary after verification and the full 14-day window.
      </p>
    </section>
  );
}
