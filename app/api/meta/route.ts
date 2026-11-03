import { NextResponse } from "next/server";
import { storageKind } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Tells the demo dock which persistence driver is live. */
export async function GET() {
  return NextResponse.json(await storageKind());
}
