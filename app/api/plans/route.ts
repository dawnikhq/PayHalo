import { NextResponse } from "next/server";
import { createPlanAction, listPlans, planKey, PLAN_COOKIE, renamePlanAction } from "@/lib/store";
import { requireOwner, UnauthorizedError } from "@/lib/scope";

export const dynamic = "force-dynamic";

/**
 * The arrangements an account holds. Creating one writes a new document; the
 * cookie only ever records which of them is on screen, and it is checked against
 * the real list before it is written.
 */
export async function GET() {
  try {
    const plans = await listPlans();
    return NextResponse.json({ ok: true, plans });
  } catch (err) {
    const message = err instanceof UnauthorizedError ? "Sign in to continue." : "Could not read your arrangements.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: string; no?: number; name?: string };

  try {
    const user = await requireOwner();

    if (body.action === "switch") {
      const plans = await listPlans();
      const target = plans.find((p) => p.no === Number(body.no));
      if (!target) return NextResponse.json({ ok: false, error: "That arrangement no longer exists." }, { status: 404 });

      const res = NextResponse.json({ ok: true, no: target.no });
      res.cookies.set(PLAN_COOKIE, String(target.no === 1 ? "" : target.no), {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return res;
    }

    if (body.action === "rename") {
      const result = await renamePlanAction(Number(body.no), String(body.name ?? ""));
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    const created = await createPlanAction(String(body.name ?? ""));
    if (!created.ok || !created.no) {
      return NextResponse.json(created, { status: 400 });
    }

    // the new arrangement is also the one on screen
    const res = NextResponse.json({ ok: true, no: created.no, key: planKey(user.id, created.no) });
    res.cookies.set(PLAN_COOKIE, String(created.no), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "Sign in to continue." }, { status: 401 });
    }
    console.error("[plans]", err);
    return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
  }
}
