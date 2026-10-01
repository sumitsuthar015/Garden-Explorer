import QRCode from "qrcode";

import { AppError } from "@/lib/errors";

/**
 * QR image generation (server-side).
 *
 * Print reliability is the priority:
 *  - error correction level "M" survives a scuffed sticker while keeping the
 *    module count low enough to print crisply at small sizes.
 *  - a 4-module quiet zone is included; QR readers need that white margin.
 *  - pure black on pure white for maximum contrast on cheap printers.
 */

const PRINT_DEFAULTS = {
  errorCorrectionLevel: "M" as const,
  margin: 4,
  color: { dark: "#000000", light: "#FFFFFF" },
};

export interface QrRenderOptions {
  /** Pixel width for raster output. */
  width?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  margin?: number;
}

export function assertQrPayload(payload: string): void {
  if (!payload || payload.trim().length === 0) {
    throw new AppError("BAD_REQUEST", { message: "Nothing to encode in this QR code." });
  }
  if (payload.length > 900) {
    throw new AppError("BAD_REQUEST", {
      message: "That URL is too long to encode reliably in a QR code.",
    });
  }
}

/** PNG buffer — served by /api/qr/[code]/png for downloads. */
export async function generateQrPng(
  payload: string,
  options: QrRenderOptions = {},
): Promise<Buffer> {
  assertQrPayload(payload);
  return QRCode.toBuffer(payload, {
    type: "png",
    ...PRINT_DEFAULTS,
    errorCorrectionLevel: options.errorCorrectionLevel ?? PRINT_DEFAULTS.errorCorrectionLevel,
    margin: options.margin ?? PRINT_DEFAULTS.margin,
    width: options.width ?? 1024,
  });
}

/** SVG string — infinitely scalable, ideal for large printed signs. */
export async function generateQrSvg(
  payload: string,
  options: QrRenderOptions = {},
): Promise<string> {
  assertQrPayload(payload);
  return QRCode.toString(payload, {
    type: "svg",
    ...PRINT_DEFAULTS,
    errorCorrectionLevel: options.errorCorrectionLevel ?? PRINT_DEFAULTS.errorCorrectionLevel,
    margin: options.margin ?? PRINT_DEFAULTS.margin,
    width: options.width ?? 512,
  });
}

/** Inline data URL used for on-screen previews in the admin QR table. */
export async function generateQrDataUrl(
  payload: string,
  options: QrRenderOptions = {},
): Promise<string> {
  assertQrPayload(payload);
  return QRCode.toDataURL(payload, {
    type: "image/png",
    ...PRINT_DEFAULTS,
    errorCorrectionLevel: options.errorCorrectionLevel ?? PRINT_DEFAULTS.errorCorrectionLevel,
    margin: options.margin ?? PRINT_DEFAULTS.margin,
    width: options.width ?? 256,
  });
}

/** Escape text for safe interpolation into an SVG string. */
export function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
