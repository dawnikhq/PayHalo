"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Field } from "@/components/ui";

export function UploadDocument({ related }: { related: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relatedTo, setRelatedTo] = useState(related[0] ?? "My Plan");
  const [access, setAccess] = useState<"owner" | "beneficiaries">("owner");
  const [sizeKb, setSizeKb] = useState(220);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sizeKb, relatedTo, access }),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "Something went wrong." }));
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "That document could not be added.");
      return;
    }
    setOpen(false);
    setName("");
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary self-start">
        <span aria-hidden>+</span> Upload document
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#172d29]/35 backdrop-blur-[2px]"
          />
          <form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-label="Upload a document"
            className="relative w-full max-w-[520px] rounded-t-[22px] border border-[var(--color-line)] bg-white p-6 shadow-2xl sm:rounded-[20px]"
          >
            <p className="eyebrow">New document</p>
            <h2 className="h2 mt-2">Add guidance</h2>
            <p className="t-small mt-1">
              Never upload passwords, private keys or wallet recovery phrases.
            </p>

            <label
              htmlFor="doc-file"
              className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--color-line-strong)] bg-[#fafcfa] px-4 py-7 text-center transition hover:border-[var(--color-brand)] hover:bg-[var(--color-mint)]"
            >
              <span className="text-[13px] font-semibold text-[var(--color-forest)]">Choose a sample file</span>
              <span className="t-meta mt-1">PDF only · 10 MB maximum · stored as a record</span>
              <input
                id="doc-file"
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setName(file.name);
                  setSizeKb(Math.max(1, Math.round(file.size / 1024)));
                }}
              />
            </label>

            <div className="mt-4 space-y-4">
              <Field label="Document name" htmlFor="doc-name">
                <input
                  id="doc-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Business recovery guide.pdf"
                  required
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Related to" htmlFor="doc-related">
                  <select
                    id="doc-related"
                    className="select"
                    value={relatedTo}
                    onChange={(e) => setRelatedTo(e.target.value)}
                  >
                    {related.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Who can see it" htmlFor="doc-access" help="Released only after a verified handover.">
                  <select
                    id="doc-access"
                    className="select"
                    value={access}
                    onChange={(e) => setAccess(e.target.value as "owner" | "beneficiaries")}
                  >
                    <option value="owner">Owner only</option>
                    <option value="beneficiaries">Share after handover</option>
                  </select>
                </Field>
              </div>
            </div>

            {error && <p className="field-error mt-3">{error}</p>}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {busy ? "Adding…" : "Add document"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
