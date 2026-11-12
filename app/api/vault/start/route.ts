import { NextResponse } from "next/server";
import { openVaultAction } from "@/lib/store";
import { guarded } from "@/lib/route-guard";
import { sendVaultKey, mailConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

/**
 * POST /api/vault/start — the last step of a finished plan.
 *
 * Everything else is already in place: a first choice, what they own, backups,
 * a final cause, a keyholder, and a sealed plan. This opens the vault and sends
 * the key to the first choice. The key is returned to the caller only when the
 * email could not be sent, so it is not lost.
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

  const started = await openVaultAction();
  if (!started.ok || !started.key || !started.vault) {
    return NextResponse.json({ error: started.error ?? "The vault could not be opened." }, { status: 400 });
  }

  const url = new URL("/beneficiary", request.url).toString();
  const mail = await sendVaultKey(started.firstBeneficiary?.email ?? "", {
    ownerName: started.snapshot.user.name,
    toName: started.firstBeneficiary?.name,
    vaultRef: started.vault.ref,
    key: started.key,
    url,
  });

  return NextResponse.json({
    ok: true,
    vault: started.vault,
    firstBeneficiary: started.firstBeneficiary,
    mailed: mail.sent,
    key: mail.sent ? null : started.key,
    mailConfigured: mailConfigured(),
  });
}

export const POST = guarded(handlePOST);
