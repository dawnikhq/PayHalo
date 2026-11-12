import { NextResponse } from "next/server";
import { MAX_BYTES, verifyCertificate, type StoredReport } from "@/lib/certs";
import { existingHashes, getKeyholderView, submitClaimAction } from "@/lib/store";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/claim — multipart: `accessCode` + `file`.
 *
 * The document is verified here, on the server, before a claim exists. A file
 * that fails the checks never reaches the claim table, and the client cannot
 * talk it into accepting one — the verdict is computed from the bytes.
 *
 * A claim that passes starts in `review`: 72 hours of registry checking before
 * the owner is notified.
 */
async function handlePOST(request: Request) {
  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {
    form = null;
  }

  if (!form) {
    return NextResponse.json(
      { error: "Send the certificate as a multipart upload (accessCode + file)." },
      { status: 400 },
    );
  }

  const accessCode = String(form.get("accessCode") ?? "");
  const note = String(form.get("note") ?? "");
  const assetIds = String(form.get("assetIds") ?? "")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Attach the death certificate." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is over the 4 MB limit." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const [view, usedHashes] = await Promise.all([getKeyholderView(), existingHashes()]);
  if (!view) return NextResponse.json({ error: "This link is not valid." }, { status: 401 });

  const report = await verifyCertificate({
    bytes,
    fileName: file.name || "certificate",
    ownerName: view.ownerName,
    usedHashes,
  });

  if (report.verdict === "rejected") {
    return NextResponse.json(
      {
        error: `That document can't start a claim. ${report.summary}`,
        report,
      },
      { status: 422 },
    );
  }

  const stored: StoredReport = { ...report };
  delete stored.textPreview; // the transcript is already long enough
  const result = await submitClaimAction(accessCode, stored, { assetIds, note });
  if (!result.ok) return NextResponse.json({ ...result, report }, { status: 400 });

  return NextResponse.json({ ...result, report });
}

export const POST = guarded(handlePOST);
