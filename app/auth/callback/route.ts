import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Magic-link landing. Supabase sends the visitor here with a one-time code;
 * exchanging it sets the session cookies, then we send them on to the page they
 * originally asked for.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/signin?error=missing-code", request.url));
  }

  const client = await supabaseServer();
  if (!client) {
    return NextResponse.redirect(new URL("/signin?unconfigured=1", request.url));
  }

  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(error.message)}`, request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
