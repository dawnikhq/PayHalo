"use client";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full border border-[#c9b590] bg-[#efe6d4] px-4 py-2 text-[12px] font-medium text-[#4a3a1d] transition hover:border-[#a98a4e] hover:bg-[#e8dcc4] print:hidden"
    >
      <span aria-hidden>⎙</span>
      {label}
    </button>
  );
}
