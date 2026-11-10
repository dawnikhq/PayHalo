import { NextResponse } from "next/server";
import { getKeyholderView } from "@/lib/store";

export const dynamic = "force-dynamic";

/** The keyholder portal reads only this redacted shape — never the owner snapshot. */
export async function GET() {
  return NextResponse.json(await getKeyholderView());
}
