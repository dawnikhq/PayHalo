import { NextResponse } from "next/server";
import { getKeyholderView } from "@/lib/store";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

/** The keyholder portal reads only this redacted shape — never the owner snapshot. */
async function handleGET() {
  return NextResponse.json(await getKeyholderView());
}

export const GET = guarded(handleGET);
