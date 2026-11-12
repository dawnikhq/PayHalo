import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { mailConfigured, sendSupportReply } from "@/lib/mailer";
import { getTicket, replyToTicket } from "@/lib/support";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/support — the operator answers a request.
 *
 * Form-encoded, because it is a plain form on the console: no client JavaScript
 * stands between the operator and the reply. The person is emailed the answer
 * and the ticket closes with it.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Operator passcode required." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const ref = String(form?.get("ref") ?? "").trim().toUpperCase();
  const body = String(form?.get("body") ?? "").trim().slice(0, 4000);

  if (!ref || body.length < 4) {
    return NextResponse.redirect(new URL("/admin?support=empty#support", request.url), 303);
  }

  const ticket = await replyToTicket(ref, body, "Operator");
  if (!ticket) {
    return NextResponse.redirect(new URL("/admin?support=missing#support", request.url), 303);
  }

  if (mailConfigured()) {
    await sendSupportReply(ticket.email, {
      name: ticket.name,
      reference: ticket.ref,
      topic: ticket.topic,
      reply: body,
    }).catch(() => undefined);
  }

  return NextResponse.redirect(new URL(`/admin?support=${ticket.ref}#support`, request.url), 303);
}

/** GET /api/admin/support?ref=PH-SUP-XXXXX — one ticket, for the console. */
export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Operator passcode required." }, { status: 401 });
  }
  const ref = new URL(request.url).searchParams.get("ref") ?? "";
  const ticket = await getTicket(ref);
  if (!ticket) return NextResponse.json({ error: "No such request." }, { status: 404 });
  return NextResponse.json({ ok: true, ticket });
}
