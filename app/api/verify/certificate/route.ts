import { NextResponse } from "next/server";
import { MAX_BYTES, verifyCertificate, verifierStatus } from "@/lib/certs";
import { existingHashes, getSnapshot } from "@/lib/store";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET — is the verifier wired up in this runtime? */
async function handleGET() {
  return NextResponse.json(await verifierStatus());
}

/**
 * POST /api/verify/certificate
 *
 * Multipart upload (`file`). Reads the actual bytes and returns the full
 * verification transcript: verdict, per-check results, extracted fields and
 * the SHA-256 of the document. Nothing about the plan changes here — this is
 * the "is this really a death certificate?" endpoint.
 */
async function handlePOST(request: Request) {
  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {
    form = null;
  }

  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Attach a document to check." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 4 MB.` },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const [snapshot, usedHashes] = await Promise.all([getSnapshot(), existingHashes()]);

  const report = await verifyCertificate({
    bytes,
    fileName: file.name || "certificate",
    ownerName: snapshot.user.name,
    usedHashes,
  });

  return NextResponse.json(report);
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
