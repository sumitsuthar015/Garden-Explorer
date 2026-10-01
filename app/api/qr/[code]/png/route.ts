import { NextResponse, type NextRequest } from "next/server";

import { findQrCodeByPublicCode } from "@/db/queries/qr";
import { logServerEvent } from "@/lib/errors";
import { generateQrPng } from "@/lib/qr/generate";
import { getAdminSession } from "@/lib/permissions";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import { getSiteOrigin, qrTargetPath } from "@/lib/site-url";
import { qrLookupSchema } from "@/lib/validation";

/**
 * Downloadable PNG for a QR sign.
 *
 * Admin-only: creating printable signage is a staff action. The payload is the
 * canonical public URL of the sign, built from the configured site origin so the
 * printed code always points at production.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const limited = await checkRateLimit({ ...RATE_LIMITS.scanResolve, key: "qr-png" });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await context.params;
  const parsed = qrLookupSchema.safeParse({ code: decodeURIComponent(code) });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  try {
    const record = await findQrCodeByPublicCode(parsed.data.code);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const origin = await getSiteOrigin();
    const size = Number(request.nextUrl.searchParams.get("size") ?? 1024);
    const width = Number.isFinite(size) ? Math.min(Math.max(size, 256), 4096) : 1024;

    const png = await generateQrPng(`${origin}${qrTargetPath(record.publicCode)}`, { width });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${record.publicCode}.png"`,
        // Signage images are regenerated on request, never cached publicly.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logServerEvent("error", "QR_RESOLUTION_FAILED", {
      stage: "png-generation",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Could not generate the QR image" }, { status: 500 });
  }
}
