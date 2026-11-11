import { NextResponse } from "next/server";
import { startPlanAction } from "@/lib/store";
import { guarded } from "@/lib/route-guard";
import { sendVaultKey, mailConfigured } from "@/lib/mailer";
import { paypalMode } from "@/lib/paypal";

export const dynamic = "force-dynamic";

/**
 * POST /api/vault/start — the "Start a plan" button.
 *
 * Names the first beneficiary, opens the vault, mints the key and emails it.
 * The key is returned to the caller only when the email could not be sent, so
 * the owner can hand it over themselves rather than lose it.
 */
async function handlePOST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
    }
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; email?: unknown; relationship?: unknown }
    | null;

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const relationship = typeof body?.relationship === "string" ? body.relationship.trim() : "";

  if (!name) return NextResponse.json({ error: "Enter the name of the first person." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email for the key." }, { status: 400 });
  }

  const started = await startPlanAction({ name, email, relationship });
  if (!started.ok || !started.key || !started.vault) {
    return NextResponse.json({ error: started.error ?? "The vault could not be opened." }, { status: 400 });
  }

  const url = new URL("/beneficiary", request.url).toString();
  const mail = await sendVaultKey(started.firstBeneficiary?.email ?? email, {
    ownerName: started.snapshot.user.name,
    vaultRef: started.vault.ref,
    key: started.key,
    url,
  });

  return NextResponse.json({
    ok: true,
    vault: started.vault,
    firstBeneficiary: started.firstBeneficiary,
    mailed: mail.sent,
    mailReason: mail.reason ?? null,
    key: mail.sent ? null : started.key,
    mode: paypalMode(),
    mailConfigured: mailConfigured(),
  });
}

export const POST = guarded(handlePOST);
