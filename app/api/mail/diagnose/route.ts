import { NextResponse } from "next/server";
import { brevoAccount, mailConfigured, mailHealth } from "@/lib/mailer";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

function keyMatches(request: Request): boolean {
  const expected = (process.env.MAIL_DIAGNOSE_KEY ?? process.env.PAYPAL_DIAGNOSE_KEY ?? "").trim();
  const given = (request.headers.get("x-diagnose-key") ?? "").trim();
  return Boolean(expected && given && expected === given);
}

/**
 * GET /api/mail/diagnose — what the deployment thinks about email.
 *
 * Reachable two ways: an operator session, or the machine key, so a deployment
 * can be checked without signing in. It reports yes/no and the sender address,
 * never a secret, and asks Brevo directly whether the key is live.
 */
export async function GET(request: Request) {
  const allowed = keyMatches(request) || (await isAdmin());
  if (!allowed) return NextResponse.json({ error: "Not available." }, { status: 404 });

  const health = mailHealth();
  const account = await brevoAccount();

  return NextResponse.json({
    configured: mailConfigured(),
    ...health,
    brevo: account,
    targets: {
      note: "MAIL_FROM is optional: when it is absent the verified PayHalo sender is used, so preview deployments can send too.",
    },
  });
}
