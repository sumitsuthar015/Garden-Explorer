import { NextResponse, type NextRequest } from "next/server";

import { findQrCodeByPublicCode } from "@/db/queries/qr";
import { logServerEvent } from "@/lib/errors";
import { generateQrSvg } from "@/lib/qr/generate";
import { getAdminSession } from "@/lib/permissions";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import { getSiteOrigin, qrTargetPath } from "@/lib/site-url";
import { qrLookupSchema } from "@/lib/validation";

/**
 * Downloadable SVG for large printed signs.
 *
 * Vector output scales to any poster size without blurring, which matters for
 * signs mounted at the far end of a garden path.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const limited = await checkRateLimit({ ...RATE_LIMITS.scanResolve, key: "qr-svg" });
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
    const svg = await generateQrSvg(`${origin}${qrTargetPath(record.publicCode)}`);

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${record.publicCode}.svg"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logServerEvent("error", "QR_RESOLUTION_FAILED", {
      stage: "svg-generation",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Could not generate the QR image" }, { status: 500 });
  }
}
