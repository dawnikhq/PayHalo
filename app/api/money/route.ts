import { NextResponse } from "next/server";
import { allocateAction, createPotAction, recordMoveAction } from "@/lib/store";
import { guarded } from "@/lib/route-guard";
import type { MoveInput } from "@/lib/model";

export const dynamic = "force-dynamic";

/**
 * The money ledger's write endpoint. One route, three verbs' worth of work:
 * name a save, move money between the stash and a save, or record a move that
 * already happened against PayPal.
 */
async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        action?: string;
        name?: string;
        purpose?: string;
        targetCents?: number;
        beneficiaryId?: number | null;
        potId?: number;
        amountCents?: number;
        direction?: "to" | "from";
        kind?: MoveInput["kind"];
        counterparty?: string;
        note?: string;
        status?: MoveInput["status"];
        providerId?: string;
      }
    | null;

  if (!body?.action) return NextResponse.json({ error: "Nothing to do." }, { status: 400 });

  switch (body.action) {
    case "create-pot": {
      const result = await createPotAction({
        name: String(body.name ?? ""),
        purpose: String(body.purpose ?? ""),
        targetCents: Number(body.targetCents ?? 0),
        beneficiaryId: body.beneficiaryId ?? null,
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "allocate": {
      const result = await allocateAction(Number(body.potId), Number(body.amountCents), body.direction ?? "to");
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "record": {
      if (!body.kind) return NextResponse.json({ error: "A move needs a kind." }, { status: 400 });
      const result = await recordMoveAction({
        kind: body.kind,
        amountCents: Number(body.amountCents),
        potId: body.potId ?? null,
        counterparty: body.counterparty ?? null,
        note: body.note ?? "",
        status: body.status ?? "recorded",
        providerId: body.providerId ?? null,
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}

export const POST = guarded(handlePOST);
