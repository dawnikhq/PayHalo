import type { ReactNode } from "react";

/**
 * A still of the product, drawn in markup rather than screenshotted.
 *
 * The reference wallet opens with its own interface floating on the page; this
 * is the same idea in PayHalo's colours — one frame, four states, no images to
 * go stale the moment a label changes.
 */

export type MockVariant = "overview" | "assets" | "people" | "handover";

const CHIPS: Record<MockVariant, string> = {
  overview: "Overview",
  assets: "My assets",
  people: "Beneficiaries",
  handover: "Handover",
};

function Bar({ w, tone = "#eef2ec" }: { w: string; tone?: string }) {
  return <span className="block h-[7px] rounded-full" style={{ width: w, background: tone }} />;
}

function Shell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[310px]">
      <div className="rounded-[34px] border border-[rgba(21,63,53,0.14)] bg-[var(--color-forest)] p-2 shadow-[0_40px_80px_-50px_rgba(9,32,27,0.85)]">
        <div className="overflow-hidden rounded-[27px] bg-[#fbfdfa]">
          <div className="flex items-center justify-between px-4 pb-1 pt-2.5 text-[9px] font-semibold text-[#7c8b83]">
            <span>9:41</span>
            <span aria-hidden className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c3d0c5]" />
              <span className="h-1.5 w-3 rounded-[2px] bg-[#c3d0c5]" />
            </span>
          </div>
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <span className="font-[var(--font-display)] text-[15px] font-extrabold tracking-[-0.05em] text-[var(--color-brand)]">
              payhalo
            </span>
            <span className="rounded-full bg-[var(--color-mint)] px-2 py-[3px] text-[8.5px] font-bold text-[var(--color-forest)]">
              {CHIPS[label as MockVariant] ?? label}
            </span>
          </div>
          <div className="px-3.5 pb-4">{children}</div>
          <div className="flex items-center justify-around border-t border-[var(--color-line)] px-3 pb-3 pt-2 text-[7.5px] font-semibold text-[#93a29a]">
            {["Overview", "Assets", "People", "Plan", "You"].map((t) => (
              <span key={t} className={t === CHIPS[label as MockVariant] ? "text-[var(--color-brand)]" : ""}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductMock({ variant = "overview", label }: { variant?: MockVariant; label?: string }) {
  if (variant === "assets") {
    return (
      <Shell label={label ?? "assets"}>
        <div className="rounded-[16px] border border-[var(--color-line)] bg-white p-3">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#93a29a]">Recorded</p>
          <p className="mt-1 font-[var(--font-display)] text-[19px] font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
            3 assets
          </p>
        </div>
        <ul className="mt-2 space-y-1.5">
          {[
            ["PayPal balance", "Payment account"],
            ["BTC wallet", "Cryptocurrency"],
            ["Halcyon Studio", "Online business"],
          ].map(([name, kind]) => (
            <li key={name} className="flex items-center gap-2 rounded-[13px] border border-[var(--color-line)] bg-white px-2.5 py-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-mint)] text-[8px] font-bold text-[var(--color-forest)]">
                {name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[9.5px] font-semibold text-[var(--color-ink)]">{name}</span>
                <span className="block text-[7.5px] text-[#93a29a]">{kind}</span>
              </span>
              <span className="text-[7.5px] font-semibold text-[var(--color-brand)]">reviewed</span>
            </li>
          ))}
        </ul>
      </Shell>
    );
  }

  if (variant === "people") {
    return (
      <Shell label={label ?? "people"}>
        <div className="rounded-[16px] bg-[var(--color-lime)] p-3">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#4d6b2a]">Primary beneficiaries</p>
          <p className="mt-1 font-[var(--font-display)] text-[19px] font-semibold tracking-[-0.03em] text-[var(--color-forest)]">
            100% allocated
          </p>
        </div>
        <ul className="mt-2 space-y-1.5">
          {[
            ["Chidi", "first beneficiary", "60%"],
            ["Ngozi", "first beneficiary", "30%"],
            ["The Foundation", "final beneficiary", "10%"],
          ].map(([who, role, share]) => (
            <li key={who} className="flex items-center justify-between gap-2 rounded-[13px] border border-[var(--color-line)] bg-white px-2.5 py-2">
              <span className="min-w-0">
                <span className="block truncate text-[9.5px] font-semibold text-[var(--color-ink)]">{who}</span>
                <span className="block text-[7.5px] text-[#93a29a]">{role}</span>
              </span>
              <span className="font-[var(--font-display)] text-[10px] font-semibold text-[var(--color-brand)]">{share}</span>
            </li>
          ))}
        </ul>
      </Shell>
    );
  }

  if (variant === "handover") {
    return (
      <Shell label={label ?? "handover"}>
        <div className="rounded-[16px] bg-[linear-gradient(155deg,#17453a,#0f2f28)] p-3 text-[#eaf3ea]">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--color-lime)]">Safety window</p>
          <p className="mt-1 font-[var(--font-display)] text-[19px] font-semibold tracking-[-0.03em]">13 days left</p>
          <p className="mt-1 text-[7.5px] leading-relaxed text-[#b9d2c0]">A handover request was submitted and verified.</p>
        </div>
        <ul className="mt-2 space-y-1.5">
          {[
            ["Death documentation", "checked in 72 hours"],
            ["Registry check", "cleared"],
            ["You were notified", "2 days ago"],
          ].map(([t, s]) => (
            <li key={t} className="flex items-center gap-2 rounded-[13px] border border-[var(--color-line)] bg-white px-2.5 py-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-mint)] text-[8px] text-[var(--color-forest)]">
                ✓
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[9px] font-semibold text-[var(--color-ink)]">{t}</span>
                <span className="block text-[7.5px] text-[#93a29a]">{s}</span>
              </span>
            </li>
          ))}
        </ul>
      </Shell>
    );
  }

  return (
    <Shell label={label ?? "overview"}>
      <div className="rounded-[16px] border border-[var(--color-line)] bg-white p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#93a29a]">My plan</p>
            <p className="mt-1 font-[var(--font-display)] text-[15px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
              PH-2-KBVLVK
            </p>
          </div>
          <span className="rounded-full bg-[var(--color-mint)] px-2 py-[3px] text-[7.5px] font-bold text-[var(--color-forest)]">
            saved
          </span>
        </div>
        <div className="mt-2.5 flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: i < 3 ? "var(--color-forest)" : "#dbe5db" }}
            />
          ))}
        </div>
        <p className="mt-2 text-[7.5px] text-[#93a29a]">3 of 4 complete</p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {[
          ["Assets", "3"],
          ["People", "3"],
          ["Trusted Key", "Amara O."],
          ["Vault", "not started"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[13px] border border-[var(--color-line)] bg-white p-2">
            <p className="text-[7.5px] font-semibold uppercase tracking-[0.1em] text-[#93a29a]">{k}</p>
            <p className="mt-0.5 truncate text-[9.5px] font-semibold text-[var(--color-ink)]">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2 rounded-[13px] bg-[var(--color-mint)] px-2.5 py-2">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-forest)] text-[8px] text-[var(--color-lime)]">
          ↻
        </span>
        <span className="text-[8px] font-semibold text-[var(--color-forest)]">Next: name your Trusted Key</span>
      </div>
    </Shell>
  );
}

/** The wide frame the marketing page uses above the fold. */
export function DeviceStage({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-[rgba(21,63,53,0.10)] bg-[radial-gradient(120%_80%_at_20%_0%,#e9f6e0,transparent_55%),radial-gradient(120%_80%_at_90%_10%,#dff1ea,transparent_60%),#f2f7ef] px-4 py-8 sm:px-10 sm:py-12">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/60 to-transparent" />
      {children}
      <div aria-hidden className="pointer-events-none absolute left-6 top-6 hidden gap-1.5 sm:flex">
        {["#d9f4a5", "#bfe6d8", "#cfdacf"].map((c) => (
          <span key={c} className="h-2 w-2 rounded-full" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}
