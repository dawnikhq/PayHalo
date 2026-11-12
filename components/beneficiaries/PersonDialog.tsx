"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Field } from "@/components/ui";
import type { Beneficiary, Role } from "@/lib/types";

const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
  { value: "primary", label: "Primary beneficiaries", hint: "Receives everything if able to inherit." },
  { value: "backup", label: "Family backup", hint: "Shares the estate only if the first choice can't." },
  { value: "charity", label: "Final beneficiary", hint: "Receives 100% only if no named person can." },
];

export function PersonDialog({
  person,
  label,
  variant = "primary",
  className = "",
}: {
  person?: Beneficiary;
  label: string;
  variant?: "primary" | "quiet";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person?.name ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [relationship, setRelationship] = useState(person?.relationship ?? "");
  const [note, setNote] = useState(person?.note ?? "");
  const [role, setRole] = useState<Role>("backup");
  const [share, setShare] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
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
    const res = await fetch("/api/beneficiaries", {
      method: person ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        person
          ? { update: { id: person.id, name, email, relationship, note } }
          : { name, email, relationship, note, role, share: Number(share) || 0 },
      ),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "Something went wrong." }));
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "primary"
            ? `btn btn-primary ${className}`
            : `text-[12.5px] font-semibold text-[var(--color-brand)] ${className}`
        }
      >
        {label}
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
            aria-label={person ? `Edit ${person.name}` : "Add a beneficiary"}
            className="relative w-full max-w-[520px] rounded-t-[22px] border border-[var(--color-line)] bg-white p-6 shadow-2xl sm:rounded-[20px]"
          >
            <p className="eyebrow">{person ? "Edit person" : "New beneficiary"}</p>
            <h2 className="h2 mt-2">{person ? person.name : "Who comes next?"}</h2>
            <p className="t-small mt-1">
              Only you can see or change this list. Nobody is notified while you are alive.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="p-name">
                <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Relationship" htmlFor="p-rel" help="Brother, mother, cousin…">
                <input
                  id="p-rel"
                  className="input"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Brother"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Email" htmlFor="p-email" help="How they would be reached after a verified handover.">
                  <input
                    id="p-email"
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </Field>
              </div>

              {!person && (
                <>
                  <div className="sm:col-span-2">
                    <span className="mb-1.5 block text-[13px] font-semibold text-[var(--color-ink)]">Their place</span>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {ROLE_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          aria-pressed={role === o.value}
                          onClick={() => setRole(o.value)}
                          className={`rounded-[12px] border p-3 text-left transition ${
                            role === o.value
                              ? "border-[var(--color-brand)] bg-[var(--color-mint)]"
                              : "border-[var(--color-line)] bg-white hover:bg-[#f8fbf8]"
                          }`}
                        >
                          <span className="block text-[12.5px] font-semibold text-[var(--color-forest)]">{o.label}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-muted)]">{o.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {role === "backup" && (
                    <Field label="Share of the estate" htmlFor="p-share" help="Backup shares must total 100%.">
                      <input
                        id="p-share"
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        value={share}
                        onChange={(e) => setShare(e.target.value)}
                      />
                    </Field>
                  )}
                </>
              )}

              <div className={person ? "sm:col-span-2" : "sm:col-span-1"}>
                <Field label="Private note" htmlFor="p-note" optional help="Only you can read this.">
                  <input id="p-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
              </div>
            </div>

            {error && <p className="field-error mt-3">{error}</p>}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {busy ? "Saving…" : person ? "Save changes" : "Add to plan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
