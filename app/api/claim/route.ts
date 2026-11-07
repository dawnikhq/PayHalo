import { NextResponse } from "next/server";
import { MAX_BYTES, verifyCertificate, type StoredReport } from "@/lib/certs";
import { existingHashes, getSnapshot, submitClaimAction } from "@/lib/store";

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
export async function POST(request: Request) {
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
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Attach the death certificate." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is over the 4 MB limit." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const [snapshot, usedHashes] = await Promise.all([getSnapshot(), existingHashes()]);

  const report = await verifyCertificate({
    bytes,
    fileName: file.name || "certificate",
    ownerName: snapshot.user.name,
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
  const result = await submitClaimAction(accessCode, stored);
  if (!result.ok) return NextResponse.json({ ...result, report }, { status: 400 });

  return NextResponse.json({ ...result, report });
}
