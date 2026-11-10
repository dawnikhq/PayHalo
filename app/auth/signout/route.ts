import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const client = await supabaseServer();
  if (client) await client.auth.signOut();
  return NextResponse.redirect(new URL("/signin", request.url), { status: 303 });
}
