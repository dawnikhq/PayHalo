"use client";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn btn-secondary btn-sm print:hidden">
      <span aria-hidden>⎙</span>
      {label}
    </button>
  );
}
