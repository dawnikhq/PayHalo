"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/ui";
import type { Asset, AssetKind } from "@/lib/types";

const TYPES: { kind: AssetKind; title: string; caption: string }[] = [
  { kind: "paypal", title: "Payment account", caption: "Balances & payouts" },
  { kind: "crypto", title: "Crypto wallet", caption: "Self-custody assets" },
  { kind: "business", title: "Digital business", caption: "Storefronts & projects" },
];

const COPY: Record<AssetKind, { name: string; placeholder: string; provider: string; providerPlaceholder: string; detail: string; detailPlaceholder: string; url: string; urlPlaceholder: string }> = {
  paypal: {
    name: "Account name",
    placeholder: "My PayPal Business",
    provider: "Provider",
    providerPlaceholder: "PayPal",
    detail: "Currencies or notes",
    detailPlaceholder: "2 currencies · 41 pending payouts",
    url: "Account URL",
    urlPlaceholder: "paypal.com/business",
  },
  crypto: {
    name: "Wallet name",
    placeholder: "Self-custody wallet",
    provider: "Custodian or network",
    providerPlaceholder: "Ethereum · self-custody",
    detail: "Holdings",
    detailPlaceholder: "0.08 BTC · 3.1 ETH",
    url: "Wallet label",
    urlPlaceholder: "wallet address on file",
  },
  business: {
    name: "Asset name",
    placeholder: "My digital business",
    provider: "What it is",
    providerPlaceholder: "Storefront · design studio",
    detail: "Short description",
    detailPlaceholder: "$4,100 MRR · 612 customers",
    url: "Business URL",
    urlPlaceholder: "https://your-business.demo",
  },
};

export function AssetForm({ asset }: { asset?: Asset }) {
  const router = useRouter();
  const [kind, setKind] = useState<AssetKind>(asset?.kind ?? "business");
  const [label, setLabel] = useState(asset?.label ?? "");
  const [value, setValue] = useState(asset ? String(asset.balanceCents / 100) : "0.00");
  const [provider, setProvider] = useState(asset?.provider ?? "");
  const [detail, setDetail] = useState(asset?.detail ?? "");
  const [url, setUrl] = useState(asset?.url ?? "");
  const [handoverNote, setHandoverNote] = useState(asset?.handoverNote ?? "");
  const [accessNote, setAccessNote] = useState(asset?.accessNote ?? "");
  const [monthly, setMonthly] = useState(asset?.monthlyCents ? String(asset.monthlyCents / 100) : "");
  const [customers, setCustomers] = useState(asset?.customers ? String(asset.customers) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = COPY[kind];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const payload = {
      id: asset?.id,
      kind,
      label,
      value: Number(value) || 0,
      provider,
      detail,
      url,
      handoverNote,
      accessNote,
      monthly: kind === "business" && monthly !== "" ? Number(monthly) : undefined,
      customers: kind === "business" && customers !== "" ? Number(customers) : undefined,
    };
    const res = await fetch("/api/assets", {
      method: asset ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({ ok: false, error: "Something went wrong." }));
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(asset ? `/assets/${asset.id}` : `/assets/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
      <div className="card p-6 md:p-7">
        <fieldset>
          <legend className="h3">01 Choose an asset type</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {TYPES.map((t) => {
              const selected = kind === t.kind;
              return (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => setKind(t.kind)}
                  aria-pressed={selected}
                  className={`rounded-[14px] border p-4 text-left transition ${
                    selected
                      ? "border-[var(--color-brand)] bg-[var(--color-mint)]"
                      : "border-transparent bg-[#f4f6f3] hover:bg-[#eff3ef]"
                  }`}
                >
                  <span className="block text-[13px] font-semibold text-[var(--color-forest)]">{t.title}</span>
                  <span className="mt-0.5 block text-[11.5px] text-[var(--color-muted)]">{t.caption}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-7">
          <h2 className="h3">02 Asset details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={copy.name} htmlFor="asset-label" help="A name you will recognise.">
              <input
                id="asset-label"
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={copy.placeholder}
                required
              />
            </Field>

            <Field label="Estimated value (USD)" htmlFor="asset-value" help="Optional · A sample estimate only.">
              <input
                id="asset-value"
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
              />
            </Field>

            <Field label={copy.provider} htmlFor="asset-provider" help="Used for the handover instructions.">
              <input
                id="asset-provider"
                className="input"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder={copy.providerPlaceholder}
              />
            </Field>

            <Field label={copy.detail} htmlFor="asset-detail" optional help="Shown beside the name in your plan.">
              <input
                id="asset-detail"
                className="input"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={copy.detailPlaceholder}
              />
            </Field>

            <Field label={copy.url} htmlFor="asset-url" optional help="No live connection is made.">
              <input
                id="asset-url"
                className="input"
                value={url ?? ""}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={copy.urlPlaceholder}
              />
            </Field>

            {kind === "business" && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Monthly revenue" htmlFor="asset-monthly" optional>
                  <input
                    id="asset-monthly"
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthly}
                    onChange={(e) => setMonthly(e.target.value)}
                    placeholder="4,100"
                  />
                </Field>
                <Field label="Customers" htmlFor="asset-customers" optional>
                  <input
                    id="asset-customers"
                    className="input"
                    type="number"
                    min="0"
                    value={customers}
                    onChange={(e) => setCustomers(e.target.value)}
                    placeholder="612"
                  />
                </Field>
              </div>
            )}

            <div className="sm:col-span-2">
              <Field
                label="Handover instructions"
                htmlFor="asset-handover"
                optional
                help="How the recovery starts. Never a password, private key or recovery phrase."
              >
                <textarea
                  id="asset-handover"
                  className="textarea"
                  value={handoverNote ?? ""}
                  onChange={(e) => setHandoverNote(e.target.value)}
                  placeholder="Use the recovery guide in Documents. Contact the provider's deceased-account team."
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field
                label="Access note"
                htmlFor="asset-access"
                optional
                help="Where the official process begins — not the secret itself."
              >
                <textarea
                  id="asset-access"
                  className="textarea"
                  value={accessNote ?? ""}
                  onChange={(e) => setAccessNote(e.target.value)}
                  placeholder="Recovery goes through the provider's account-recovery process."
                />
              </Field>
            </div>
          </div>
        </div>

        {error && <p className="field-error mt-4">{error}</p>}

        <div className="mt-6 flex flex-col-reverse items-center justify-between gap-3 border-t border-[var(--color-line)] pt-5 sm:flex-row">
          <p className="t-meta">Only you can create and edit assets.</p>
          <button type="submit" disabled={busy} className="btn btn-primary w-full sm:w-auto">
            {busy ? "Saving…" : asset ? "Save changes" : "Save asset"}
          </button>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="card-forest p-6">
          <h2 className="h2 text-white">A record, not a transfer.</h2>
          <p className="t-body mt-3 text-[#c4d8c8]">
            Adding an asset does not move money or give anyone access today. It writes down what exists and
            what should happen later.
          </p>
          <div className="my-5 h-px bg-white/12" />
          <h3 className="h3 text-[var(--color-lime)]">Keep secrets out.</h3>
          <p className="t-body mt-2 text-[#c4d8c8]">
            Use recovery instructions, not private keys. Recipients are guided through a verified handover.
          </p>
        </div>

        <div className="card-warn p-6">
          <h3 className="h3 text-[#6a4712]">Simulation, clearly.</h3>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#7a5418]">
            This concept saves sample asset details only. It does not connect to providers, validate ownership
            or initiate transfers.
          </p>
        </div>

        <p className="t-meta px-1">Plan setup is optional. Your draft stays available when you return.</p>
      </aside>
    </form>
  );
}
