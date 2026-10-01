import { QR_CODE_PATTERN } from "@/lib/constants";

/**
 * Turn whatever a QR reader decoded into a Garden Explorer public code.
 *
 * Accepts, in order of preference:
 *  1. a full URL containing /q/CODE   (what our printed signs contain)
 *  2. a bare public code              (typed manually from the sign)
 *  3. a small JSON payload            (useful for custom-printed signs)
 *  4. a URL with ?code=CODE           (query-string variant)
 *
 * Returns null when the payload is not a Garden Explorer code, so the UI can
 * show the "QR Code Not Found" screen instead of navigating somewhere odd.
 * Pure and synchronous — covered directly by unit tests.
 */
export function extractQrCode(payload: string | null | undefined): string | null {
  if (typeof payload !== "string") return null;

  const text = payload.trim();
  if (text.length === 0 || text.length > 2048) return null;

  const fromUrl = extractFromUrl(text);
  if (fromUrl) return fromUrl;

  const fromJson = extractFromJson(text);
  if (fromJson) return fromJson;

  return normalizeCode(text);
}

function extractFromUrl(text: string): string | null {
  if (!/^https?:\/\//i.test(text) && !text.startsWith("/")) return null;

  try {
    const url = new URL(text, "https://garden-explorer.invalid");
    const pathMatch = url.pathname.match(/\/q\/([^/?#]+)/i);
    if (pathMatch) {
      const code = normalizeCode(decodeURIComponent(pathMatch[1]));
      if (code) return code;
    }

    const queryCode = url.searchParams.get("code");
    if (queryCode) {
      const code = normalizeCode(queryCode);
      if (code) return code;
    }
  } catch {
    return null;
  }

  return null;
}

function extractFromJson(text: string): string | null {
  if (!text.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && "code" in parsed) {
      const value = (parsed as { code?: unknown }).code;
      if (typeof value === "string") return normalizeCode(value);
    }
  } catch {
    return null;
  }
  return null;
}

/** Uppercase, trim and reject anything that is not a well-formed public code. */
export function normalizeCode(value: string): string | null {
  const candidate = value.trim().toUpperCase().replace(/\s+/g, "");
  if (!candidate) return null;
  if (!QR_CODE_PATTERN.test(candidate)) return null;
  return candidate;
}

/** Human-readable explanation used by the scanner when decoding fails. */
export function describeScanFailure(payload: string | null): string {
  if (!payload) {
    return "That QR code could not be read. Move a little closer and try again, or make sure the whole square is inside the frame.";
  }
  if (/^https?:\/\//i.test(payload.trim())) {
    return "That QR code belongs to a different website. Garden Explorer signs contain a link that ends with /q/ and a short code.";
  }
  return "That code is not recognised. Check that you scanned a Garden Explorer sign, then try again.";
}
