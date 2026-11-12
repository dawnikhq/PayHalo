"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SealPlan({
  sealed,
  ready,
  className = "",
}: {
  sealed: boolean;
  ready: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function seal() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/plan", { method: "POST" });
    const data = await res.json().catch(() => ({ ok: false, error: "Something went wrong." }));
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "The plan could not be confirmed yet.");
      return;
    }
    const mail = (data as {
      keyholderMail?: { sent?: boolean; reason?: string; to?: string; existingAccount?: boolean };
    }).keyholderMail;

    if (mail && !mail.sent) {
      setNotice({
        ok: false,
        text: `The plan is confirmed, but the email to your Trusted Key did not go out${
          mail.reason ? ` (${mail.reason})` : ""
        }. You can send it again below — the arrangements are unaffected.`,
      });
      return;
    }

    router.push("/dashboard?sealed=1");
    router.refresh();
  }

  async function resend() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/plan/notify", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        keyholderMail?: { sent?: boolean; reason?: string; to?: string };
      };
      if (!res.ok || !data.keyholderMail?.sent) {
        throw new Error(data.keyholderMail?.reason ?? "The message still could not be sent.");
      }
      setNotice({ ok: true, text: `Sent to ${data.keyholderMail.to ?? "your Trusted Key"}.` });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "The message could not be sent." });
    } finally {
      setBusy(false);
    }
  }

  if (sealed) {
    return (
      <div className={`card-mint p-5 ${className}`}>
        <p className="text-[13px] font-semibold text-[var(--color-forest)]">These arrangements are confirmed.</p>
        <p className="t-small mt-1 text-[#3c5a4e]">
          Your instructions are recorded. You can still edit them — any change is dated on the trail.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {ready ? (
        confirming ? (
          <div className="flex flex-wrap gap-2">
            <button onClick={seal} disabled={busy} className="btn btn-primary flex-1">
              {busy ? "Confirming…" : "Yes, confirm my plan"}
            </button>
            <button onClick={() => setConfirming(false)} className="btn btn-secondary">
              Not yet
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="btn btn-primary w-full">
            Review &amp; confirm <span aria-hidden>→</span>
          </button>
        )
      ) : (
        <p className="t-small">
          Finish the remaining steps and the confirm button unlocks. Nothing is locked in the meantime.
        </p>
      )}
      {error && <p className="field-error mt-2">{error}</p>}
      {notice && (
        <div
          className={`mt-3 rounded-[12px] border px-3.5 py-2.5 text-[12px] leading-relaxed ${
            notice.ok
              ? "border-[#cbea92] bg-[var(--color-mint)] text-[var(--color-forest)]"
              : "border-[#f0cfc6] bg-[#fdf1ee] text-[var(--color-ember)]"
          }`}
        >
          <p>{notice.text}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {!notice.ok && (
              <button type="button" onClick={resend} disabled={busy} className="font-semibold underline underline-offset-4">
                {busy ? "Sending…" : "Send it again"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                router.push("/dashboard?sealed=1");
                router.refresh();
              }}
              className="font-semibold underline underline-offset-4"
            >
              Continue to my plan
            </button>
          </div>
        </div>
      )}
      {confirming && (
        <p className="t-meta mt-2">
          Confirming records your instructions as final. Nothing is released without a verified claim and 14
          full days.
        </p>
      )}
    </div>
  );
}
