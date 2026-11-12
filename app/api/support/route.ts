import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { clientKey, tooMany } from "@/lib/throttle";
import { mailConfigured, sendSupportReceipt } from "@/lib/mailer";
import { createTicket, listTickets, ticketsFor, type SupportRole } from "@/lib/support";

export const dynamic = "force-dynamic";

const TOPICS = [
  "A plan or asset",
  "Handover and claims",
  "Money and PayPal",
  "Keys and access",
  "Something is broken",
  "Something else",
];

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * POST /api/support — a person asks for a human.
 *
 * Halo is the first line, not the last: the form records what she said before
 * the request was raised, so whoever answers starts from the conversation the
 * person already had instead of asking them to repeat it.
 */
export async function POST(request: Request) {
  if (tooMany(clientKey(request, "support"), 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "That is a lot of requests at once. Please try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Send the request as JSON." }, { status: 400 });

  const user = await currentUser();
  const email = clean(body.email, 200) || user?.email || "";
  const name = clean(body.name, 120) || user?.name || "";
  const message = clean(body.message, 4000);
  const topic = clean(body.topic, 80);

  if (!looksLikeEmail(email)) {
    return NextResponse.json({ error: "Add an email address we can answer on." }, { status: 400 });
  }
  if (message.length < 15) {
    return NextResponse.json({ error: "Tell us a little more — a sentence or two is plenty." }, { status: 400 });
  }

  const haloQuestion = clean(body.haloQuestion, 600);
  const haloAnswer = clean(body.haloAnswer, 2000);
  const haloModel = clean(body.haloModel, 120);
  const haloTopic = clean(body.haloTopic, 80);

  const role = (["owner", "keyholder", "beneficiary", "visitor"] as SupportRole[]).includes(body.role as SupportRole)
    ? (body.role as SupportRole)
    : "visitor";

  try {
    const ticket = await createTicket({
      userId: user?.id ?? null,
      name: name || email.split("@")[0],
      email,
      role,
      topic: TOPICS.includes(topic) ? topic : "Something else",
      message,
      halo: haloQuestion
        ? { question: haloQuestion, answer: haloAnswer, model: haloModel || undefined, topic: haloTopic || undefined }
        : null,
    });

    /* The receipt is a courtesy. A mail failure must not lose the request. */
    if (mailConfigured()) {
      await sendSupportReceipt(email, {
        name: name || undefined,
        reference: ticket.ref,
        topic: ticket.topic,
        message: ticket.message,
      }).catch(() => undefined);
    }

    return NextResponse.json({ ok: true, ref: ticket.ref, ticket });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The request could not be saved." },
      { status: 503 },
    );
  }
}

/** GET /api/support — the inbox for the operator, the history for everyone else. */
export async function GET(request: Request) {
  if (await isAdmin()) {
    return NextResponse.json({ ok: true, tickets: await listTickets() });
  }
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your requests." }, { status: 401 });
  return NextResponse.json({ ok: true, tickets: await ticketsFor({ userId: user.id, email: user.email }) });
}
