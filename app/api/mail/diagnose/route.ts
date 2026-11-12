import { NextResponse } from "next/server";
import { brevoAccount, mailConfigured, mailHealth } from "@/lib/mailer";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/mail/diagnose — what the deployment thinks about email, and what
 * Brevo says actually happened to the messages it accepted.
 *
 * Reachable two ways: an operator session, or the machine key (header
 * `x-diagnose-key` or `?key=`, so it can be checked from a browser or a shell).
 * It reports yes/no, the sender address and Brevo's event log — never a secret.
 */
function keyFrom(request: Request): string {
  const url = new URL(request.url);
  return (request.headers.get("x-diagnose-key") ?? url.searchParams.get("key") ?? "").trim();
}

function keyMatches(request: Request): boolean {
  const expected = (process.env.MAIL_DIAGNOSE_KEY ?? "").trim();
  const given = keyFrom(request);
  if (!expected || !given) return false;
  // constant-time-ish compare; lengths differ rarely and it is a read-only report
  let diff = expected.length ^ given.length;
  for (let i = 0; i < Math.min(expected.length, given.length); i += 1) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

const apiKey = () => (process.env.BREVO_API_KEY ?? "").trim();

async function brevo(path: string): Promise<{ ok: boolean; status: number; body: unknown }> {
  if (!apiKey()) return { ok: false, status: 0, body: "No BREVO_API_KEY on this deployment." };
  try {
    const res = await fetch(`https://api.brevo.com/v3${path}`, {
      headers: { "api-key": apiKey(), Accept: "application/json" },
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* leave as text */
    }
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: error instanceof Error ? error.message : "unreachable" };
  }
}

export async function GET(request: Request) {
  const allowed = keyMatches(request) || (await isAdmin());
  if (!allowed) return NextResponse.json({ error: "Not available." }, { status: 404 });

  const url = new URL(request.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const health = mailHealth();
  const account = await brevoAccount();

  const [senders, events] = await Promise.all([
    brevo("/senders?ip=0"),
    email ? brevo(`/smtp/statistics/events?email=${encodeURIComponent(email)}&limit=25&sort=desc`) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    configured: mailConfigured(),
    ...health,
    brevo: account,
    senders,
    events,
    note: "senderSource 'default' means MAIL_FROM was absent and the verified PayHalo address was used.",
  });
}
