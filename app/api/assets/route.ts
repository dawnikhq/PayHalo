import { NextResponse } from "next/server";
import { addAssetAction, removeAssetAction, updateAssetAction } from "@/lib/store";
import type { AssetKind } from "@/lib/types";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

const KINDS: AssetKind[] = ["paypal", "crypto", "business"];

async function handlePOST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const kind = KINDS.includes(body?.kind) ? (body.kind as AssetKind) : "paypal";
  const result = await addAssetAction({
    kind,
    label: String(body?.label ?? ""),
    provider: String(body?.provider ?? ""),
    balanceCents: Math.round(Number(body?.value ?? 0) * 100),
    detail: String(body?.detail ?? ""),
    url: String(body?.url ?? ""),
    handoverNote: String(body?.handoverNote ?? ""),
    accessNote: String(body?.accessNote ?? ""),
    monthlyCents: body?.monthly !== undefined ? Math.round(Number(body.monthly) * 100) : null,
    customers: body?.customers !== undefined ? Number(body.customers) : null,
  });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

async function handlePATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "Missing asset id." }, { status: 400 });

  const result = await updateAssetAction(id, {
    label: body?.label !== undefined ? String(body.label) : undefined,
    provider: body?.provider !== undefined ? String(body.provider) : undefined,
    balanceCents: body?.value !== undefined ? Math.round(Number(body.value) * 100) : undefined,
    detail: body?.detail !== undefined ? String(body.detail) : undefined,
    url: body?.url !== undefined ? String(body.url) : undefined,
    handoverNote: body?.handoverNote !== undefined ? String(body.handoverNote) : undefined,
    accessNote: body?.accessNote !== undefined ? String(body.accessNote) : undefined,
    monthlyCents: body?.monthly !== undefined ? Math.round(Number(body.monthly) * 100) : undefined,
    customers: body?.customers !== undefined ? Number(body.customers) : undefined,
  });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

async function handleDELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await removeAssetAction(Number(body?.id));
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

export const POST = guarded(handlePOST);
export const PATCH = guarded(handlePATCH);
export const DELETE = guarded(handleDELETE);
