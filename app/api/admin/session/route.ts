import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, adminCookieOptions, adminCookieValue, checkAdminPasscode } from "@/lib/admin";
import { registerFailure, isLockedOut, clearFailures, clientKey } from "@/lib/paypal-guard";

export const dynamic = "force-dynamic";

/** POST /api/admin/session — operators sign in with the shared passcode. */
export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "No operator passcode is set on this deployment." }, { status: 503 });
  }

  const key = clientKey(request);
  const lock = isLockedOut(key);
  if (lock.locked) {
    return NextResponse.json(
      { error: "Too many wrong passcodes. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(lock.retryInMs / 1000)) } },
    );
  }

  const body = (await request.json().catch(() => null)) as { passcode?: unknown } | null;
  const passcode = typeof body?.passcode === "string" ? body.passcode : "";

  if (!checkAdminPasscode(passcode)) {
    const state = registerFailure(key);
    return NextResponse.json(
      { error: state.allowed ? "That passcode is not right." : "Too many wrong passcodes. Try again shortly." },
      { status: state.allowed ? 403 : 429 },
    );
  }

  clearFailures(key);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminCookieValue(), adminCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
