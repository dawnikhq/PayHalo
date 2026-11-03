import { NextResponse } from "next/server";
import { savePlan, getSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();

  if (!body?.name || !body?.primary?.name || !body?.charity?.name || !body?.keyholder?.accessCode) {
    return NextResponse.json(
      { ok: false, error: "A plan needs an owner, a primary beneficiary, a fallback cause and a keyholder." },
      { status: 400 },
    );
  }

  savePlan({
    name: body.name,
    email: body.email ?? "",
    assets: body.assets ?? [],
    primary: {
      name: body.primary.name,
      email: body.primary.email ?? "",
      relationship: body.primary.relationship ?? "",
      note: body.primary.note ?? "",
    },
    backups: (body.backups ?? []).map((b: { name: string; email?: string; relationship?: string; share: number; note?: string }) => ({
      name: b.name,
      email: b.email ?? "",
      relationship: b.relationship ?? "",
      share: Number(b.share) || 0,
      note: b.note ?? "",
    })),
    charity: {
      name: body.charity.name,
      email: body.charity.email ?? "",
      note: body.charity.note ?? "",
    },
    keyholder: {
      name: body.keyholder.name ?? "Keyholder",
      email: body.keyholder.email ?? "",
      relationship: body.keyholder.relationship ?? "",
      accessCode: body.keyholder.accessCode,
    },
  });

  return NextResponse.json({ ok: true, snapshot: getSnapshot() });
}
